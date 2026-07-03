import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { humanReviewQueueWhere } from '../admin-queue';
import { adminProcedure, createTRPCRouter } from '../core';
import { factCheckStatusValues } from '../schemas';

const queueItemSchema = z.object({
    id: z.string().cuid(),
    title: z.string().nullable(),
    status: z.enum(['OPEN', 'PROCESSING', 'RESOLVED', 'FAILED']),
    factCheckStatus: z.enum(factCheckStatusValues),
    claimLanguage: z.string(),
    createdAt: z.date(),
    userEmail: z.string().email(),
});

const claimMessageSchema = z.object({
    id: z.string().cuid(),
    role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
    content: z.string(),
    createdAt: z.date(),
});

export const adminRouter = createTRPCRouter({
    queueCount: adminProcedure.output(z.object({ total: z.number() })).query(async ({ ctx }) => {
        const total = await ctx.prisma.claim.count({ where: humanReviewQueueWhere });
        return { total };
    }),

    listQueue: adminProcedure
        .input(
            z
                .object({
                    cursor: z.string().cuid().optional(),
                    take: z.number().int().min(1).max(100).default(50),
                })
                .optional(),
        )
        .output(
            z.object({
                items: z.array(queueItemSchema),
                nextCursor: z.string().cuid().nullable(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const take = input?.take ?? 50;
            const claims = await ctx.prisma.claim.findMany({
                where: humanReviewQueueWhere,
                take: take + 1,
                ...(input?.cursor
                    ? { cursor: { id: input.cursor }, skip: 1, orderBy: { createdAt: 'desc' } }
                    : { orderBy: { createdAt: 'desc' } }),
                include: {
                    user: { select: { email: true } },
                },
            });

            let nextCursor: string | null = null;
            if (claims.length > take) {
                const next = claims.pop();
                nextCursor = next?.id ?? null;
            }

            return {
                items: claims.map((claim) => ({
                    id: claim.id,
                    title: claim.title,
                    status: claim.status,
                    factCheckStatus: claim.factCheckStatus,
                    claimLanguage: claim.claimLanguage,
                    createdAt: claim.createdAt,
                    userEmail: claim.user.email,
                })),
                nextCursor,
            };
        }),

    claimById: adminProcedure
        .input(z.object({ claimId: z.string().cuid() }))
        .output(
            z.object({
                id: z.string().cuid(),
                title: z.string().nullable(),
                status: z.enum(['OPEN', 'PROCESSING', 'RESOLVED', 'FAILED']),
                factCheckStatus: z.enum(factCheckStatusValues),
                factCheckText: z.string().nullable(),
                claimText: z.string().nullable(),
                claimLanguage: z.string(),
                createdAt: z.date(),
                userEmail: z.string().email(),
                messages: z.array(claimMessageSchema),
            }),
        )
        .query(async ({ ctx, input }) => {
            const claim = await ctx.prisma.claim.findUnique({
                where: { id: input.claimId },
                include: {
                    user: { select: { email: true } },
                    messages: { orderBy: { createdAt: 'asc' } },
                },
            });
            if (!claim) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_NOT_FOUND' });
            }
            return {
                id: claim.id,
                title: claim.title,
                status: claim.status,
                factCheckStatus: claim.factCheckStatus,
                factCheckText: claim.factCheckText,
                claimText: claim.claimText,
                claimLanguage: claim.claimLanguage,
                createdAt: claim.createdAt,
                userEmail: claim.user.email,
                messages: claim.messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    createdAt: m.createdAt,
                })),
            };
        }),

    resolveClaim: adminProcedure
        .input(
            z.object({
                claimId: z.string().cuid(),
                factCheckStatus: z.enum(factCheckStatusValues),
                factCheckText: z.string().trim().min(1).max(8000),
            }),
        )
        .output(z.object({ ok: z.literal(true), messageId: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            const claim = await ctx.prisma.claim.findUnique({
                where: { id: input.claimId },
                include: { user: { select: { id: true, email: true } } },
            });
            if (!claim) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'CLAIM_NOT_FOUND' });
            }

            const now = new Date();
            const message = await ctx.prisma.claimMessage.create({
                data: {
                    claimId: claim.id,
                    role: 'ASSISTANT',
                    content: input.factCheckText,
                },
            });

            await ctx.prisma.claim.update({
                where: { id: claim.id },
                data: {
                    status: 'RESOLVED',
                    factCheckText: input.factCheckText,
                    factCheckStatus: input.factCheckStatus,
                    factCheckDate: now,
                },
            });

            ctx.broadcastToClaimSubscribers?.(claim.id, {
                type: 'message.created',
                payload: { claimId: claim.id, messageId: message.id },
            });
            ctx.broadcastToClaimSubscribers?.(claim.id, {
                type: 'claim.statusChanged',
                payload: { claimId: claim.id, factCheckStatus: input.factCheckStatus },
            });

            const resolvedIdempotencyKey = `claim-resolved:admin:${claim.id}:${input.factCheckStatus}`;
            try {
                const resolvedSend = await ctx.sendClaimResolvedEmail({
                    to: claim.user.email,
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
                        userId: claim.user.id,
                        claimId: claim.id,
                        templateKey: 'claim-resolved',
                        idempotencyKey: resolvedIdempotencyKey,
                        status: resolvedSend.ok ? 'sent' : 'failed',
                        providerMessageId: resolvedSend.ok ? resolvedSend.providerMessageId : null,
                        errorCode: resolvedSend.ok ? null : resolvedSend.errorCode,
                    },
                });
            } catch (err) {
                console.error('[admin.resolveClaim] resolved email failed', {
                    claimId: claim.id,
                    message: err instanceof Error ? err.message : err,
                });
            }

            return { ok: true as const, messageId: message.id };
        }),
});
