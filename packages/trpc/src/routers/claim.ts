import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../core';
import { requireVerifiedEmail } from '../guards';
import { checkRateLimit } from '../rate-limit';
import {
    chatMessageInput,
    claimMetadataInput,
    factCheckStatusValues,
    topicCategoryValues,
    transcribeAudioInput,
} from '../schemas';
import type { TrpcContext } from '../types';
import { validateUploadFile, UploadValidationError } from '../upload-validation';

type StoredAttachment = {
    url: string;
    mimeType: string;
    sizeBytes: number;
    uploadPath?: string;
};

async function refreshMessageAttachments(
    attachments: unknown,
    ctx: TrpcContext,
): Promise<unknown> {
    if (!Array.isArray(attachments) || !ctx.createSignedReadUrl) {
        return attachments;
    }

    return Promise.all(
        attachments.map(async (raw) => {
            if (!raw || typeof raw !== 'object') return raw;
            const att = raw as StoredAttachment;
            if (!att.uploadPath) return att;
            try {
                const url = await ctx.createSignedReadUrl!({ uploadPath: att.uploadPath });
                return { ...att, url };
            } catch {
                return att;
            }
        }),
    );
}

function assistantFailureMessage(claimLanguage: string): string {
    return claimLanguage === 'en'
        ? 'I cannot process your request right now. Please try again.'
        : 'لا يمكنني معالجة طلبك في الوقت الحالي. يرجى المحاولة مرة أخرى.';
}

const VERDICT_PATTERN =
    /\b(verified|debunked|misleading|partially[_ ]true)\b/i;

function parseVerdict(
    text: string,
): (typeof factCheckStatusValues)[number] | null {
    const match = text.match(VERDICT_PATTERN);
    if (!match?.[1]) return null;
    const raw = match[1].toUpperCase().replace(/\s+/g, '_');
    if (
        (factCheckStatusValues as readonly string[]).includes(raw)
    ) {
        return raw as (typeof factCheckStatusValues)[number];
    }
    return null;
}

export const claimRouter = createTRPCRouter({
    listMine: protectedProcedure
        .input(
            z
                .object({
                    search: z.string().trim().max(200).optional(),
                    factCheckStatus: z.enum(factCheckStatusValues).optional(),
                    topicCategory: z.enum(topicCategoryValues).optional(),
                })
                .optional(),
        )
        .output(
            z.array(
                z.object({
                    id: z.string().cuid(),
                    title: z.string().nullable(),
                    status: z.enum(['OPEN', 'PROCESSING', 'RESOLVED', 'FAILED']),
                    factCheckStatus: z.enum(factCheckStatusValues),
                    topicCategory: z
                        .enum([
                            'POLITICS',
                            'HEALTH',
                            'FINANCE',
                            'TECH',
                            'SECURITY',
                            'EDUCATION',
                            'ENVIRONMENT',
                        ])
                        .nullable(),
                    claimLanguage: z.string().nullable(),
                    updatedAt: z.date(),
                }),
            ),
        )
        .query(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);

            const where: Record<string, unknown> = {
                createdByUserId: ctx.sessionUser.id,
            };

            if (input?.search) {
                where.OR = [
                    { title: { contains: input.search, mode: 'insensitive' } },
                    { claimText: { contains: input.search, mode: 'insensitive' } },
                ];
            }

            if (input?.factCheckStatus) {
                where.factCheckStatus = input.factCheckStatus;
            }

            if (input?.topicCategory) {
                where.topicCategory = input.topicCategory;
            }

            const claims = await ctx.prisma.claim.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                take: 50,
            });
            return claims;
        }),

    byId: protectedProcedure
        .input(z.object({ claimId: z.string().cuid() }))
        .output(
            z.object({
                id: z.string().cuid(),
                status: z.enum(['OPEN', 'PROCESSING', 'RESOLVED', 'FAILED']),
                factCheckStatus: z.enum(factCheckStatusValues),
                claimText: z.string().nullable(),
                claimLanguage: z.string().nullable(),
                claimDate: z.date().nullable(),
                sourceName: z.string().nullable(),
                sourceType: z
                    .enum([
                        'POLITICIAN',
                        'MEDIA',
                        'SOCIAL_MEDIA',
                        'BLOG',
                        'NGO',
                        'CITIZEN',
                    ])
                    .nullable(),
                sourceUrl: z.string().nullable(),
                mediaType: z.enum([
                    'TEXT',
                    'IMAGE',
                    'VIDEO',
                    'AUDIO',
                    'TEXT_IMAGE',
                    'TEXT_VIDEO',
                    'TEXT_AUDIO',
                ]),
                factCheckText: z.string().nullable(),
                factCheckDate: z.date().nullable(),
                topicCategory: z
                    .enum([
                        'POLITICS',
                        'HEALTH',
                        'FINANCE',
                        'TECH',
                        'SECURITY',
                        'EDUCATION',
                        'ENVIRONMENT',
                    ])
                    .nullable(),
                location: z.string().nullable(),
                platform: z.string().nullable(),
                messages: z.array(
                    z.object({
                        id: z.string().cuid(),
                        role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
                        content: z.string(),
                        attachments: z.any().nullable(),
                        createdAt: z.date(),
                    }),
                ),
            }),
        )
        .query(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);
            const claim = await ctx.prisma.claim.findFirst({
                where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
            if (!claim) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_THREAD_NOT_FOUND' });
            }

            const messages = await Promise.all(
                claim.messages.map(async (msg) => ({
                    ...msg,
                    attachments: await refreshMessageAttachments(msg.attachments, ctx),
                })),
            );

            return { ...claim, messages };
        }),

    create: protectedProcedure
        .input(
            z.object({
                title: z.string().trim().min(1).max(120).optional(),
                content: z.string().trim().min(1).max(4000),
                clientRequestId: z.string().uuid().optional(),
                attachments: chatMessageInput.shape.attachments,
                metadata: claimMetadataInput.optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);

            const rateLimitKey = `claim-create:${ctx.sessionUser.id}`;
            if (!checkRateLimit(rateLimitKey, 5, 60_000)) {
                throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'CLAIM_RATE_LIMIT' });
            }

            const meta = input.metadata;
            const claim = await ctx.prisma.claim.create({
                data: {
                    createdByUserId: ctx.sessionUser.id,
                    title: input.title ?? input.content.slice(0, 80),
                    status: 'OPEN',
                    claimText: meta?.claimText ?? input.content,
                    claimLanguage: meta?.claimLanguage ?? 'ar',
                    claimDate: meta?.claimDate ?? null,
                    sourceName: meta?.sourceName ?? null,
                    sourceType: meta?.sourceType ?? null,
                    sourceUrl: meta?.sourceUrl ?? null,
                    mediaType: meta?.mediaType ?? 'TEXT',
                    topicCategory: meta?.topicCategory ?? null,
                    location: meta?.location ?? null,
                    platform: meta?.platform ?? null,
                },
            });

            const message = await ctx.prisma.claimMessage.create({
                data: {
                    claimId: claim.id,
                    role: 'USER',
                    content: input.content,
                    clientReqId: input.clientRequestId,
                    attachments: input.attachments ? input.attachments : undefined,
                },
            });

            ctx.broadcastToClaimSubscribers?.(claim.id, {
                type: 'message.created',
                payload: { claimId: claim.id, messageId: message.id },
            });

            return { claimId: claim.id };
        }),

    updateMetadata: protectedProcedure
        .input(
            z.object({
                claimId: z.string().cuid(),
                metadata: claimMetadataInput,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);
            const claim = await ctx.prisma.claim.findFirst({
                where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
                select: { id: true },
            });
            if (!claim) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_THREAD_NOT_FOUND' });
            }

            const data: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(input.metadata)) {
                if (value !== undefined) {
                    data[key] = value;
                }
            }

            if (Object.keys(data).length > 0) {
                await ctx.prisma.claim.update({
                    where: { id: claim.id },
                    data,
                });
            }

            return { ok: true };
        }),

    appendUserMessage: protectedProcedure.input(chatMessageInput).mutation(async ({ ctx, input }) => {
        await requireVerifiedEmail(ctx);
        const claim = await ctx.prisma.claim.findFirst({
            where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
            select: { id: true },
        });
        if (!claim) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_THREAD_NOT_FOUND' });
        }
        const message = await ctx.prisma.claimMessage.create({
            data: {
                claimId: input.claimId,
                role: 'USER',
                content: input.content,
                clientReqId: input.clientRequestId,
                attachments: input.attachments ? input.attachments : undefined,
            },
        });
        ctx.broadcastToClaimSubscribers?.(input.claimId, {
            type: 'message.created',
            payload: { claimId: input.claimId, messageId: message.id },
        });
        return { messageId: message.id };
    }),

    requestUpload: protectedProcedure
        .input(
            z.object({
                claimId: z.string().cuid().optional(),
                filename: z.string().min(1),
                mimeType: z.string().min(1),
                sizeBytes: z.number().int().positive().optional(),
            }),
        )
        .output(
            z.object({
                uploadPath: z.string(),
                uploadUrl: z.string().url(),
                readUrl: z.string().url(),
                publicUrl: z.string().url(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);

            const rateLimitKey = `upload:${ctx.sessionUser.id}:${input.claimId ?? 'general'}`;
            if (!checkRateLimit(rateLimitKey, 10, 60_000)) {
                throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'CLAIM_RATE_LIMIT' });
            }

            if (input.claimId) {
                const claim = await ctx.prisma.claim.findFirst({
                    where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
                    select: { id: true },
                });
                if (!claim) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_THREAD_NOT_FOUND' });
                }
            }

            let normalizedMime: string;
            try {
                ({ mimeType: normalizedMime } = validateUploadFile({
                    mimeType: input.mimeType,
                    filename: input.filename,
                    sizeBytes: input.sizeBytes,
                    allowedMimeTypes: ctx.chatUploadLimits.allowedMimeTypes,
                    maxBytes: ctx.chatUploadLimits.maxBytes,
                }));
            } catch (err) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message:
                        err instanceof UploadValidationError
                            ? err.code
                            : err instanceof Error
                              ? err.message
                              : 'CLAIM_UPLOAD_INVALID',
                });
            }

            try {
                const signed = await ctx.createSignedUploadUrl({
                    claimId: input.claimId ?? ctx.sessionUser.id,
                    filename: input.filename,
                    mimeType: normalizedMime,
                    sizeBytes: input.sizeBytes,
                });
                return {
                    ...signed,
                    publicUrl: signed.readUrl,
                };
            } catch (err) {
                console.error('[claim.requestUpload]', {
                    userId: ctx.sessionUser.id,
                    claimId: input.claimId,
                    filename: input.filename,
                    message: err instanceof Error ? err.message : err,
                });
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'CLAIM_UPLOAD_PREPARE_FAILED',
                });
            }
        }),

    generateAssistantReply: protectedProcedure
        .input(z.object({ claimId: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);
            const claim = await ctx.prisma.claim.findFirst({
                where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
                include: {
                    messages: { orderBy: { createdAt: 'asc' }, take: 20 },
                },
            });
            if (!claim) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_THREAD_NOT_FOUND' });
            }

            await ctx.prisma.claim.update({
                where: { id: claim.id },
                data: { status: 'PROCESSING' },
            });

            const queuedIdempotencyKey = `claim-queued:${ctx.sessionUser.id}:${claim.id}:processing`;
            try {
                const queuedSend = await ctx.sendClaimQueuedEmail({
                    to: ctx.sessionUser.email,
                    claimId: claim.id,
                    idempotencyKey: queuedIdempotencyKey,
                    locale: ctx.uiLocale,
                });
                await ctx.prisma.emailDelivery.upsert({
                    where: { idempotencyKey: queuedIdempotencyKey },
                    update: {
                        status: queuedSend.ok ? 'sent' : 'failed',
                        providerMessageId: queuedSend.ok ? queuedSend.providerMessageId : null,
                        errorCode: queuedSend.ok ? null : queuedSend.errorCode,
                        attemptCount: { increment: 1 },
                        lastAttemptAt: new Date(),
                    },
                    create: {
                        userId: ctx.sessionUser.id,
                        claimId: claim.id,
                        templateKey: 'claim-queued',
                        idempotencyKey: queuedIdempotencyKey,
                        status: queuedSend.ok ? 'sent' : 'failed',
                        providerMessageId: queuedSend.ok ? queuedSend.providerMessageId : null,
                        errorCode: queuedSend.ok ? null : queuedSend.errorCode,
                    },
                });
            } catch (err) {
                console.error('[generateAssistantReply] queued email failed', {
                    claimId: claim.id,
                    message: err instanceof Error ? err.message : err,
                });
            }

            const needsMetadata =
                !claim.topicCategory && !claim.sourceName && !claim.location && !claim.platform;
            const firstUserMessage = claim.messages.find((m) => m.role === 'USER')?.content ?? '';

            const claimCtx = {
                claimText: claim.claimText,
                claimLanguage: claim.claimLanguage,
                claimDate: claim.claimDate,
                sourceName: claim.sourceName,
                sourceType: claim.sourceType,
                sourceUrl: claim.sourceUrl,
                mediaType: claim.mediaType,
                topicCategory: claim.topicCategory,
                location: claim.location,
                platform: claim.platform,
            };

            let assistantText = '';
            let aiFailed = false;
            try {
                const thread = await Promise.all(
                    claim.messages.map(async (msg) => {
                        const refreshed = await refreshMessageAttachments(msg.attachments, ctx);
                        const attachments = Array.isArray(refreshed)
                            ? (refreshed as StoredAttachment[])
                            : undefined;
                        return {
                            role: msg.role,
                            content: msg.content,
                            attachments,
                        };
                    }),
                );

                const [text, extracted] = await Promise.all([
                    ctx.generateAssistantText({
                        claim: claimCtx,
                        thread,
                    }),
                    needsMetadata && ctx.extractClaimMetadata
                        ? ctx.extractClaimMetadata({ text: firstUserMessage })
                        : Promise.resolve(undefined),
                ]);
                assistantText = text;

                if (extracted && Object.keys(extracted).length > 0) {
                    const metaUpdate: Record<string, unknown> = {};
                    if (extracted.topicCategory) metaUpdate.topicCategory = extracted.topicCategory;
                    if (extracted.sourceType) metaUpdate.sourceType = extracted.sourceType;
                    if (extracted.sourceName) metaUpdate.sourceName = extracted.sourceName;
                    if (extracted.location) metaUpdate.location = extracted.location;
                    if (extracted.platform) metaUpdate.platform = extracted.platform;
                    if (Object.keys(metaUpdate).length > 0) {
                        try {
                            await ctx.prisma.claim.update({
                                where: { id: claim.id },
                                data: metaUpdate,
                            });
                        } catch (err) {
                            console.error('[generateAssistantReply] metadata update failed', {
                                claimId: claim.id,
                                message: err instanceof Error ? err.message : err,
                            });
                        }
                    }
                }
            } catch {
                aiFailed = true;
                assistantText = assistantFailureMessage(claim.claimLanguage);
            }

            const verdict = parseVerdict(assistantText);
            const now = new Date();
            const nextFactCheckStatus = verdict ?? claim.factCheckStatus;
            const nextStatus = verdict ? 'RESOLVED' : aiFailed ? 'FAILED' : 'OPEN';

            const message = await ctx.prisma.claimMessage.create({
                data: {
                    claimId: claim.id,
                    role: 'ASSISTANT',
                    content: assistantText,
                },
            });

            await ctx.prisma.claim.update({
                where: { id: claim.id },
                data: {
                    status: nextStatus,
                    factCheckText: assistantText,
                    factCheckStatus: nextFactCheckStatus,
                    factCheckDate: verdict ? now : claim.factCheckDate,
                },
            });

            ctx.broadcastToClaimSubscribers?.(claim.id, {
                type: 'message.created',
                payload: { claimId: claim.id, messageId: message.id },
            });
            ctx.broadcastToClaimSubscribers?.(claim.id, {
                type: 'claim.statusChanged',
                payload: { claimId: claim.id, factCheckStatus: nextFactCheckStatus },
            });

            if (!verdict) {
                return {
                    messageId: message.id,
                    content: assistantText,
                    factCheckStatus: nextFactCheckStatus,
                };
            }

            const resolvedIdempotencyKey = `claim-resolved:${ctx.sessionUser.id}:${claim.id}:resolved`;
            try {
                const resolvedSend = await ctx.sendClaimResolvedEmail({
                    to: ctx.sessionUser.email,
                    claimId: claim.id,
                    idempotencyKey: resolvedIdempotencyKey,
                    locale: ctx.uiLocale,
                });
                await ctx.prisma.emailDelivery.upsert({
                    where: { idempotencyKey: resolvedIdempotencyKey },
                    update: {
                        status: resolvedSend.ok ? 'sent' : 'failed',
                        providerMessageId: resolvedSend.ok ? resolvedSend.providerMessageId : null,
                        errorCode: resolvedSend.ok ? null : resolvedSend.errorCode,
                        attemptCount: { increment: 1 },
                        lastAttemptAt: new Date(),
                    },
                    create: {
                        userId: ctx.sessionUser.id,
                        claimId: claim.id,
                        templateKey: 'claim-resolved',
                        idempotencyKey: resolvedIdempotencyKey,
                        status: resolvedSend.ok ? 'sent' : 'failed',
                        providerMessageId: resolvedSend.ok ? resolvedSend.providerMessageId : null,
                        errorCode: resolvedSend.ok ? null : resolvedSend.errorCode,
                    },
                });
            } catch (err) {
                console.error('[generateAssistantReply] resolved email failed', {
                    claimId: claim.id,
                    message: err instanceof Error ? err.message : err,
                });
            }

            return {
                messageId: message.id,
                content: assistantText,
                factCheckStatus: nextFactCheckStatus,
            };
        }),

    transcribeAudio: protectedProcedure
        .input(transcribeAudioInput)
        .output(z.object({ text: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);
            if (!checkRateLimit(`transcribe:${ctx.sessionUser.id}`, 10, 60_000)) {
                throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'CLAIM_RATE_LIMIT' });
            }
            if (!ctx.transcribeAudio) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'TRANSCRIBE_UNAVAILABLE',
                });
            }

            try {
                const text = await ctx.transcribeAudio({
                    audioBase64: input.audioBase64,
                    mimeType: input.mimeType,
                    language: input.language,
                });
                return { text };
            } catch (err) {
                const message = err instanceof Error ? err.message : 'TRANSCRIBE_FAILED';
                throw new TRPCError({ code: 'BAD_REQUEST', message });
            }
        }),
});
