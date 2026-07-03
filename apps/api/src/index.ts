import { createHash, randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { appRouter } from '@truthsentry/trpc';
import { prisma } from '@truthsentry/prisma';
import type { TrpcContext, ClaimContext, ExtractedMetadata } from '@truthsentry/trpc';
import {
    sendClaimQueuedEmail,
    sendClaimResolvedEmail,
    sendPasswordResetEmail,
    sendVerifyEmail,
} from '@truthsentry/emails';
import { cleanupOrphans } from './cleanup-orphans';
import { buildOpenAiMessages } from './multimodal-messages';

const scrypt = promisify(nodeScrypt);
const SESSION_COOKIE = process.env.AUTH_COOKIE_NAME ?? 'truthsentry_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const CHAT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS ?? 'chat-uploads';
const CHAT_IMAGE_MAX_BYTES = Number(process.env.CHAT_IMAGE_MAX_BYTES ?? 5 * 1024 * 1024);
const CHAT_ALLOWED_IMAGE_MIME_TYPES = (process.env.CHAT_ALLOWED_IMAGE_MIME_TYPES ?? 'image/png,image/jpeg,image/webp')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SIGNING_SECRET ?? '';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(';').map((pair) => {
            const [k, ...rest] = pair.trim().split('=');
            return [k, decodeURIComponent(rest.join('='))];
        }),
    );
}

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hex] = storedHash.split(':');
    if (!salt || !hex) return false;
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hex, 'hex');
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
}

function buildCookie(token: string, expiresAt: Date): string {
    const secure = process.env.AUTH_COOKIE_SECURE === 'true';
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}; Expires=${expiresAt.toUTCString()}${secure ? '; Secure' : ''}`;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for uploads.');
    }
    supabaseClient = createClient(supabaseUrl, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return supabaseClient;
}

function parseUiLocale(header: string | string[] | undefined): TrpcContext['uiLocale'] {
    const raw = Array.isArray(header) ? header[0] : header;
    return raw === 'en' ? 'en' : 'ar';
}

async function createContext(opts: CreateHTTPContextOptions): Promise<TrpcContext> {
    const cookies = parseCookies(opts.req.headers.cookie);
    const rawToken = cookies[SESSION_COOKIE];
    const uiLocale = parseUiLocale(opts.req.headers['x-locale']);

    let sessionUser: TrpcContext['sessionUser'] = null;
    let currentSessionTokenHash: string | null = null;
    if (rawToken) {
        const tokenHash = hashToken(rawToken);
        const session = await prisma.session.findFirst({
            where: { tokenHash, expiresAt: { gt: new Date() } },
            include: { user: true },
        });
        if (session) {
            currentSessionTokenHash = tokenHash;
            sessionUser = {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
            };
        }
    }

    return {
        prisma,
        uiLocale,
        sessionUser,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        setSessionCookie: (token, expiresAt) => {
            opts.res.setHeader('Set-Cookie', buildCookie(token, expiresAt));
        },
        clearSessionCookie: () => {
            opts.res.setHeader(
                'Set-Cookie',
                `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
            );
        },
        invalidateCurrentSession: async () => {
            if (!currentSessionTokenHash) return;
            await prisma.session.deleteMany({ where: { tokenHash: currentSessionTokenHash } });
        },
        hashPassword,
        verifyPassword,
        hashToken,
        sendVerifyEmail,
        sendPasswordResetEmail,
        sendClaimQueuedEmail,
        sendClaimResolvedEmail,
        chatUploadLimits: {
            maxBytes: CHAT_IMAGE_MAX_BYTES,
            allowedMimeTypes: CHAT_ALLOWED_IMAGE_MIME_TYPES,
        },
        createSignedUploadUrl: async ({ claimId, filename, mimeType, sizeBytes }) => {
            if (sizeBytes !== undefined && sizeBytes > CHAT_IMAGE_MAX_BYTES) {
                throw new Error('CLAIM_UPLOAD_TOO_LARGE');
            }
            if (!CHAT_ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
                throw new Error('CLAIM_UPLOAD_FORMAT_UNSUPPORTED');
            }
            const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const uploadPath = `claims/${claimId}/${Date.now()}-${safeName}`;
            const storage = getSupabaseClient().storage.from(CHAT_BUCKET);
            const signed = await storage.createSignedUploadUrl(uploadPath);
            if (signed.error || !signed.data) {
                console.error('[upload] createSignedUploadUrl failed', {
                    claimId,
                    uploadPath,
                    message: signed.error?.message,
                });
                throw new Error('CLAIM_UPLOAD_PREPARE_FAILED');
            }
            const readSigned = await storage.createSignedUrl(uploadPath, 3600);
            if (readSigned.error || !readSigned.data?.signedUrl) {
                console.error('[upload] createSignedUrl failed', {
                    claimId,
                    uploadPath,
                    message: readSigned.error?.message,
                });
                throw new Error('CLAIM_UPLOAD_PREPARE_FAILED');
            }
            return {
                uploadPath,
                uploadUrl: signed.data.signedUrl,
                readUrl: readSigned.data.signedUrl,
            };
        },
        createSignedReadUrl: async ({ uploadPath }) => {
            const readSigned = await getSupabaseClient()
                .storage.from(CHAT_BUCKET)
                .createSignedUrl(uploadPath, 3600);
            if (readSigned.error || !readSigned.data?.signedUrl) {
                throw new Error(readSigned.error?.message ?? 'Could not create signed read URL.');
            }
            return readSigned.data.signedUrl;
        },
        broadcastToClaimSubscribers,
        generateAssistantText: async ({ claim, thread }) => {
            const key = process.env.AI_API_KEY;
            if (!key) {
                throw new Error('AI_API_KEY is missing');
            }
            const model = process.env.AI_MODEL ?? 'gpt-4.1-mini';

            const claimContext = [
                claim.sourceName && `Source: ${claim.sourceName} (${claim.sourceType ?? 'unknown'})`,
                claim.platform && `Platform: ${claim.platform}`,
                claim.sourceUrl && `Original URL: ${claim.sourceUrl}`,
                claim.topicCategory && `Topic: ${claim.topicCategory}`,
                claim.location && `Location: ${claim.location}`,
                claim.claimLanguage && `Claim language: ${claim.claimLanguage}`,
                claim.claimDate && `Claim date: ${claim.claimDate.toISOString().split('T')[0]}`,
                claim.mediaType && `Media type: ${claim.mediaType}`,
            ]
                .filter(Boolean)
                .join('\n');

            const hasImages = thread.some((m) =>
                m.attachments?.some((a) => a.mimeType.startsWith('image/')),
            );

            const systemPrompt = `You are a fact-checking assistant for TruthSentry, helping users in Africa verify claims and combat misinformation. Your role:

1. Analyze claims against known facts, context, and logical reasoning.
2. Provide a clear verdict: VERIFIED, DEBUNKED, MISLEADING, or PARTIALLY_TRUE. If uncertain, say so explicitly.
3. Cite reasoning and suggest where users can find authoritative sources.
4. Be culturally aware of the African context (local politics, health campaigns, regional events).
5. Respond in Modern Standard Arabic or English based on the claim language.
${hasImages ? '6. When screenshot or image evidence is attached, describe what you see and factor it into your verdict.' : ''}

Claim metadata:
${claimContext || 'No metadata provided.'}`;

            const openAiMessages = await buildOpenAiMessages({
                systemPrompt,
                thread,
                resolveImageUrl: async (uploadPath) => {
                    const readSigned = await getSupabaseClient()
                        .storage.from(CHAT_BUCKET)
                        .createSignedUrl(uploadPath, 3600);
                    if (readSigned.error || !readSigned.data?.signedUrl) {
                        throw new Error('CLAIM_UPLOAD_PREPARE_FAILED');
                    }
                    return readSigned.data.signedUrl;
                },
            });

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30_000);
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${key}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model,
                        messages: openAiMessages,
                    }),
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error(`AI request failed with ${response.status}`);
                }
                const json = (await response.json()) as {
                    choices?: Array<{ message?: { content?: string } }>;
                };
                const text = json.choices?.[0]?.message?.content?.trim();
                if (!text) {
                    throw new Error('Empty AI response');
                }
                return text;
            } finally {
                clearTimeout(timeout);
            }
        },
        transcribeAudio: async ({ audioBase64, mimeType, language }) => {
            const key = process.env.AI_API_KEY;
            if (!key) {
                throw new Error('AI_API_KEY is missing');
            }
            const buffer = Buffer.from(audioBase64, 'base64');
            const maxBytes = 10 * 1024 * 1024;
            if (buffer.length > maxBytes) {
                throw new Error('CLAIM_AUDIO_TOO_LARGE');
            }

            const normalizedMime = mimeType.split(';')[0]?.trim() || 'audio/webm';
            const allowed = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']);
            if (!allowed.has(normalizedMime)) {
                throw new Error('CLAIM_AUDIO_FORMAT_UNSUPPORTED');
            }

            const form = new FormData();
            form.append('file', new Blob([buffer], { type: normalizedMime }), 'recording.webm');
            form.append('model', 'whisper-1');
            if (language) {
                form.append('language', language);
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60_000);
            try {
                const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${key}` },
                    body: form,
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error(`Whisper request failed with ${response.status}`);
                }
                const json = (await response.json()) as { text?: string };
                return json.text?.trim() ?? '';
            } finally {
                clearTimeout(timeout);
            }
        },
        extractClaimMetadata: async ({ text }): Promise<ExtractedMetadata> => {
            const key = process.env.AI_API_KEY;
            if (!key) return {};
            const model = process.env.AI_MODEL ?? 'gpt-4.1-mini';

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${key}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role: 'system',
                                content: `You are a metadata classifier for fact-checking claims in Africa. Given a user's message, extract structured metadata. Return ONLY a JSON object with these optional fields:
- topicCategory: one of POLITICS, HEALTH, FINANCE, TECH, SECURITY, EDUCATION, ENVIRONMENT (or omit if unclear)
- sourceType: one of POLITICIAN, MEDIA, SOCIAL_MEDIA, BLOG, NGO, CITIZEN (or omit if unclear)
- sourceName: the person/org who made the claim (or omit if not mentioned)
- location: country or region (or omit if not mentioned)
- platform: where the claim was seen, e.g. twitter, whatsapp, facebook, tv, radio, tiktok (or omit if not mentioned)
Return ONLY valid JSON, no explanation.`,
                            },
                            { role: 'user', content: text },
                        ],
                        temperature: 0,
                    }),
                    signal: controller.signal,
                });
                if (!response.ok) return {};

                const json = (await response.json()) as {
                    choices?: Array<{ message?: { content?: string } }>;
                };
                const raw = json.choices?.[0]?.message?.content?.trim();
                if (!raw) return {};

                const parsed = JSON.parse(raw) as Record<string, unknown>;
                const result: ExtractedMetadata = {};

                const validTopics = new Set(['POLITICS', 'HEALTH', 'FINANCE', 'TECH', 'SECURITY', 'EDUCATION', 'ENVIRONMENT']);
                const validSources = new Set(['POLITICIAN', 'MEDIA', 'SOCIAL_MEDIA', 'BLOG', 'NGO', 'CITIZEN']);

                if (typeof parsed.topicCategory === 'string' && validTopics.has(parsed.topicCategory)) {
                    result.topicCategory = parsed.topicCategory as ExtractedMetadata['topicCategory'];
                }
                if (typeof parsed.sourceType === 'string' && validSources.has(parsed.sourceType)) {
                    result.sourceType = parsed.sourceType as ExtractedMetadata['sourceType'];
                }
                if (typeof parsed.sourceName === 'string' && parsed.sourceName.length > 0) {
                    result.sourceName = parsed.sourceName.slice(0, 200);
                }
                if (typeof parsed.location === 'string' && parsed.location.length > 0) {
                    result.location = parsed.location.slice(0, 200);
                }
                if (typeof parsed.platform === 'string' && parsed.platform.length > 0) {
                    result.platform = parsed.platform.slice(0, 100).toLowerCase();
                }

                return result;
            } catch {
                return {};
            } finally {
                clearTimeout(timeout);
            }
        },
    };
}

const trpcHandler = createHTTPHandler({
    router: appRouter,
    createContext,
});

async function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

async function handleResendWebhook(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
): Promise<void> {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
    }
    const signature = req.headers['x-resend-signature'];
    if (!RESEND_WEBHOOK_SECRET || signature !== RESEND_WEBHOOK_SECRET) {
        res.statusCode = 401;
        res.end('Invalid signature');
        return;
    }

    const raw = await readBody(req);
    let payload: {
        id?: string;
        type?: string;
        data?: { email_id?: string };
    };
    try {
        payload = JSON.parse(raw);
    } catch {
        res.statusCode = 400;
        res.end('Invalid JSON');
        return;
    }

    const eventId = payload.id ?? `unknown-${createHash('sha256').update(raw).digest('hex')}`;
    const eventType = payload.type ?? 'unknown';
    const payloadHash = createHash('sha256').update(raw).digest('hex');

    const existing = await prisma.resendWebhookEvent.findUnique({ where: { eventId } });
    if (existing) {
        res.statusCode = 200;
        res.end('ok');
        return;
    }

    await prisma.resendWebhookEvent.create({
        data: {
            eventId,
            eventType,
            payloadHash,
        },
    });

    const messageId = payload.data?.email_id;
    if (messageId) {
        const status = mapWebhookEventToDeliveryStatus(eventType);

        await prisma.emailDelivery.updateMany({
            where: { providerMessageId: messageId },
            data: {
                status,
                lastAttemptAt: new Date(),
            },
        });
    }

    res.statusCode = 200;
    res.end('ok');
}

const ENV_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    production:  { label: 'PRODUCTION',  color: '#dc2626', bg: '#fef2f2' },
    staging:     { label: 'STAGING',     color: '#d97706', bg: '#fffbeb' },
    development: { label: 'DEVELOPMENT', color: '#2563eb', bg: '#eff6ff' },
};

function getEnvironment(): string {
    const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
}

function buildHealthHtml(environment: string): string {
    const env = ENV_LABELS[environment] ?? ENV_LABELS['development']!;
    const now = new Date().toLocaleString('en-GB', {
        dateStyle: 'long',
        timeStyle: 'medium',
    });
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeDisplay =
        uptimeSeconds < 60
            ? `${uptimeSeconds}s`
            : uptimeSeconds < 3600
              ? `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`
              : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>TruthSentry API - Health Check</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      max-width: 600px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .healthy-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #10b981;
      color: #fff;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #fff;
      opacity: 0.85;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50%       { opacity: 0.4;  transform: scale(0.75); }
    }
    h1 { font-size: 30px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .version { font-size: 15px; color: #6b7280; margin-bottom: 28px; }
    .message {
      background: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 28px;
      text-align: left;
      font-size: 15px;
      color: #374151;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 14px;
    }
    .tile {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 18px 14px;
    }
    .tile-label {
      font-size: 11px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
    }
    .tile-value {
      font-size: 17px;
      font-weight: 600;
      color: #111827;
    }
    .env-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: ${env.color};
      background: ${env.bg};
    }
    .footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 13px;
      line-height: 1.8;
    }
    @media (max-width: 480px) {
      .card { padding: 24px; }
      h1 { font-size: 22px; }
      .grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="healthy-badge"><span class="dot"></span> Healthy</div>
    <h1>TruthSentry API</h1>
    <p class="version">Version 01.00.00</p>

    <div class="message">
      truthsentry-api is running in <strong>${environment}</strong> mode
    </div>

    <div class="grid">
      <div class="tile">
        <div class="tile-label">Status</div>
        <div class="tile-value">200 OK</div>
      </div>
      <div class="tile">
        <div class="tile-label">Environment</div>
        <div class="tile-value"><span class="env-pill">${env.label}</span></div>
      </div>
      <div class="tile">
        <div class="tile-label">Uptime</div>
        <div class="tile-value">${uptimeDisplay}</div>
      </div>
      <div class="tile">
        <div class="tile-label">Errors</div>
        <div class="tile-value">None</div>
      </div>
    </div>

    <div class="footer">
      <p>API Health Check Endpoint</p>
      <p>Generated at ${now}</p>
    </div>
  </div>
</body>
</html>`;
}

export const server = createServer(async (req, res) => {
    if (!req.url) {
        res.statusCode = 400;
        res.end('Bad request');
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
        const environment = getEnvironment();
        const html = buildHealthHtml(environment);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
        return;
    }

    if (req.url.startsWith('/webhooks/resend')) {
        await handleResendWebhook(req, res);
        return;
    }

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'content-type, x-trpc-source');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.statusCode = 204;
        res.end();
        return;
    }

    res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Strip the /trpc mount prefix so the standalone handler receives the
    // bare procedure path, e.g. /trpc/auth.login -> /auth.login.
    const originalUrl = req.url;
    if (req.url?.startsWith('/trpc')) {
        req.url = req.url.slice(5) || '/';
    }
    trpcHandler(req, res);
    req.url = originalUrl;
});

// ---------------------------------------------------------------------------
// WebSocket server for real-time updates
// ---------------------------------------------------------------------------

interface WSClient {
    ws: WebSocket;
    userId: string;
    userRole: 'USER' | 'ADMIN';
    subscribedClaimIds: Set<string>;
}

interface WSMessage {
    type: string;
    payload: Record<string, unknown>;
    ts: number;
    seq?: number;
}

const wss = new WebSocketServer({ noServer: true });
const wsClients = new Map<string, WSClient>();
let globalSeq = 0;

function broadcastToClaimSubscribers(claimId: string, msg: Omit<WSMessage, 'ts' | 'seq'>): void {
    globalSeq += 1;
    const frame = JSON.stringify({ ...msg, ts: Date.now(), seq: globalSeq });
    for (const client of wsClients.values()) {
        if (client.subscribedClaimIds.has(claimId) && client.ws.readyState === 1) {
            client.ws.send(frame);
        }
    }
}

export { broadcastToClaimSubscribers };

server.on('upgrade', async (req, socket, head) => {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const rawToken = cookies[SESSION_COOKIE];
        if (!rawToken) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        const tokenHash = hashToken(rawToken);
        const session = await prisma.session.findFirst({
            where: { tokenHash, expiresAt: { gt: new Date() } },
            include: { user: true },
        });
        if (!session) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            const clientId = randomUUID();
            const client: WSClient = {
                ws,
                userId: session.user.id,
                userRole: session.user.role,
                subscribedClaimIds: new Set(),
            };
            wsClients.set(clientId, client);

            ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
                void (async () => {
                    try {
                        const msg = JSON.parse(raw.toString());
                        if (msg.type === 'subscribe' && Array.isArray(msg.payload?.claimIds)) {
                            const claimIds = msg.payload.claimIds.filter(
                                (id: unknown): id is string => typeof id === 'string' && id.length > 0,
                            );
                            if (claimIds.length === 0) return;

                            if (client.userRole === 'ADMIN') {
                                for (const id of claimIds) {
                                    client.subscribedClaimIds.add(id);
                                }
                                return;
                            }

                            const owned = await prisma.claim.findMany({
                                where: {
                                    id: { in: claimIds },
                                    createdByUserId: client.userId,
                                },
                                select: { id: true },
                            });
                            for (const claim of owned) {
                                client.subscribedClaimIds.add(claim.id);
                            }
                        }
                        if (msg.type === 'unsubscribe' && Array.isArray(msg.payload?.claimIds)) {
                            for (const id of msg.payload.claimIds) {
                                client.subscribedClaimIds.delete(id);
                            }
                        }
                        if (msg.type === 'ping') {
                            ws.send(JSON.stringify({ type: 'pong', payload: {}, ts: Date.now() }));
                        }
                    } catch {
                        // ignore malformed messages
                    }
                })();
            });

            ws.on('close', () => {
                wsClients.delete(clientId);
            });
        });
    } catch {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
    }
});

const port = Number(process.env.API_PORT ?? 4000);
const isMainModule = process.argv[1]
    ? import.meta.url === new URL(`file://${process.argv[1]}`).href
    : false;

const HEARTBEAT_INTERVAL = 30_000;
if (isMainModule) {
    setInterval(() => {
        for (const client of wsClients.values()) {
            if (client.ws.readyState === 1) {
                client.ws.ping();
            }
        }
    }, HEARTBEAT_INTERVAL);
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

if (isMainModule) {
    server.listen(port);
    console.log(`@truthsentry/api listening on :${port}`);

    setInterval(async () => {
        try {
            const result = await cleanupOrphans();
            if (result.deleted > 0) {
                console.log(`Orphan cleanup: checked ${result.checked}, deleted ${result.deleted}`);
            }
        } catch (err) {
            console.error('Orphan cleanup failed:', err);
        }
    }, 60 * 60 * 1_000);
}
export const chatUploadLimits = {
    maxBytes: CHAT_IMAGE_MAX_BYTES,
    allowedMimeTypes: CHAT_ALLOWED_IMAGE_MIME_TYPES,
};

export function mapWebhookEventToDeliveryStatus(eventType: string): string {
    if (eventType.includes('delivered')) return 'delivered';
    if (eventType.includes('bounced')) return 'bounced';
    if (eventType.includes('failed')) return 'failed';
    if (eventType.includes('complained')) return 'complained';
    return 'received';
}
