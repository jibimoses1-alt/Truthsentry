import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../core';
import { requireVerifiedEmail } from '../guards';
import { chatMessageInput } from '../schemas';

export const claimRouter = createTRPCRouter({
    listMine: protectedProcedure
        .output(
            z.array(
                z.object({
                    id: z.string().cuid(),
                    title: z.string().nullable(),
                    status: z.enum(['OPEN', 'PROCESSING', 'RESOLVED', 'FAILED']),
                    updatedAt: z.date(),
                }),
            ),
        )
        .query(async ({ ctx }) => {
            await requireVerifiedEmail(ctx);
            const claims = await ctx.prisma.claim.findMany({
                where: { createdByUserId: ctx.sessionUser.id },
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
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Fil introuvable.' });
            }
            return claim;
        }),
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().trim().min(1).max(120).optional(),
                content: z.string().trim().min(1).max(4000),
                clientRequestId: z.string().uuid().optional(),
                attachments: chatMessageInput.shape.attachments,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);
            const claim = await ctx.prisma.claim.create({
                data: {
                    createdByUserId: ctx.sessionUser.id,
                    title: input.title ?? input.content.slice(0, 80),
                    status: 'OPEN',
                },
            });
            await ctx.prisma.claimMessage.create({
                data: {
                    claimId: claim.id,
                    role: 'USER',
                    content: input.content,
                    clientReqId: input.clientRequestId,
                    attachments: input.attachments ? input.attachments : undefined,
                },
            });
            return { claimId: claim.id };
        }),
    appendUserMessage: protectedProcedure.input(chatMessageInput).mutation(async ({ ctx, input }) => {
        await requireVerifiedEmail(ctx);
        const claim = await ctx.prisma.claim.findFirst({
            where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
            select: { id: true },
        });
        if (!claim) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Fil introuvable.' });
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
        return { messageId: message.id };
    }),
    requestUpload: protectedProcedure
        .input(
            z.object({
                claimId: z.string().cuid().optional(),
                filename: z.string().min(1),
                mimeType: z.string().min(1),
            }),
        )
        .output(
            z.object({
                uploadPath: z.string(),
                uploadUrl: z.string().url(),
                publicUrl: z.string().url(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await requireVerifiedEmail(ctx);
            if (input.claimId) {
                const claim = await ctx.prisma.claim.findFirst({
                    where: { id: input.claimId, createdByUserId: ctx.sessionUser.id },
                    select: { id: true },
                });
                if (!claim) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Fil introuvable.' });
                }
            }

            const signed = await ctx.createSignedUploadUrl({
                claimId: input.claimId ?? ctx.sessionUser.id,
                filename: input.filename,
                mimeType: input.mimeType,
            });
            return {
                ...signed,
                publicUrl: signed.uploadUrl.split('?')[0] ?? signed.uploadUrl,
            };
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
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Fil introuvable.' });
            }

            await ctx.prisma.claim.update({
                where: { id: claim.id },
                data: { status: 'PROCESSING' },
            });
            const queuedIdempotencyKey = `claim-queued:${ctx.sessionUser.id}:${claim.id}:processing`;
            const queuedSend = await ctx.sendClaimQueuedEmail({
                to: ctx.sessionUser.email,
                claimId: claim.id,
                idempotencyKey: queuedIdempotencyKey,
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

            let assistantText = '';
            try {
                assistantText = await ctx.generateAssistantText({
                    thread: claim.messages.map((msg: { role: 'USER' | 'ASSISTANT' | 'SYSTEM'; content: string }) => ({
                        role: msg.role,
                        content: msg.content,
                    })),
                });
            } catch {
                assistantText = 'Je ne peux pas traiter votre demande pour le moment. Veuillez reessayer.';
            }

            const message = await ctx.prisma.claimMessage.create({
                data: {
                    claimId: claim.id,
                    role: 'ASSISTANT',
                    content: assistantText,
                },
            });
            await ctx.prisma.claim.update({
                where: { id: claim.id },
                data: { status: 'RESOLVED' },
            });
            const resolvedIdempotencyKey = `claim-resolved:${ctx.sessionUser.id}:${claim.id}:resolved`;
            const resolvedSend = await ctx.sendClaimResolvedEmail({
                to: ctx.sessionUser.email,
                claimId: claim.id,
                idempotencyKey: resolvedIdempotencyKey,
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
            return { messageId: message.id, content: assistantText };
        }),
});
