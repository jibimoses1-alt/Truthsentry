import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { appRouter } from '@afalambe/trpc';
import { prisma } from '@afalambe/prisma';
import type { TrpcContext } from '@afalambe/trpc';
import {
    sendClaimQueuedEmail,
    sendClaimResolvedEmail,
    sendPasswordResetEmail,
    sendVerifyEmail,
} from '@afalambe/emails';

const scrypt = promisify(nodeScrypt);
const SESSION_COOKIE = process.env.AUTH_COOKIE_NAME ?? 'afalambe_session';
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

async function createContext(opts: CreateHTTPContextOptions): Promise<TrpcContext> {
    const cookies = parseCookies(opts.req.headers.cookie);
    const rawToken = cookies[SESSION_COOKIE];

    let sessionUser: TrpcContext['sessionUser'] = null;
    if (rawToken) {
        const tokenHash = hashToken(rawToken);
        const session = await prisma.session.findFirst({
            where: { tokenHash, expiresAt: { gt: new Date() } },
            include: { user: true },
        });
        if (session) {
            sessionUser = {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
            };
        }
    }

    return {
        prisma,
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
        hashPassword,
        verifyPassword,
        hashToken,
        sendVerifyEmail,
        sendPasswordResetEmail,
        sendClaimQueuedEmail,
        sendClaimResolvedEmail,
        createSignedUploadUrl: async ({ claimId, filename, mimeType }) => {
            if (!CHAT_ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
                throw new Error(`Unsupported mime type ${mimeType}`);
            }
            const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const uploadPath = `claims/${claimId}/${Date.now()}-${safeName}`;
            const signed = await getSupabaseClient().storage.from(CHAT_BUCKET).createSignedUploadUrl(uploadPath);
            if (signed.error || !signed.data) {
                throw new Error(signed.error?.message ?? 'Could not create signed upload URL.');
            }
            return {
                uploadPath,
                uploadUrl: signed.data.signedUrl,
            };
        },
        generateAssistantText: async ({ thread }) => {
            const key = process.env.AI_API_KEY;
            if (!key) {
                throw new Error('AI_API_KEY is missing');
            }
            const model = process.env.AI_MODEL ?? 'gpt-4.1-mini';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20_000);
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
                                content:
                                    'You are a factual assistant helping users validate claims. Be concise and explicit when uncertain.',
                            },
                            ...thread.map((m) => ({
                                role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
                                content: m.content,
                            })),
                        ],
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

export const server = createServer(async (req, res) => {
    if (!req.url) {
        res.statusCode = 400;
        res.end('Bad request');
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
    trpcHandler(req, res);
});

const port = Number(process.env.API_PORT ?? 4000);
const isMainModule = process.argv[1]
    ? import.meta.url === new URL(`file://${process.argv[1]}`).href
    : false;

if (isMainModule) {
    server.listen(port);
    console.log(`@afalambe/api listening on :${port}`);
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
