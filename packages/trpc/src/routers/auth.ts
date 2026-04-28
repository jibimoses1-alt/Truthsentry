import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../core';
import {
    createOtpCode,
    createRawToken,
    requestPasswordResetSchema,
    resetPasswordSchema,
    signInSchema,
    signUpSchema,
    verifyEmailSchema,
} from '../schemas';

export const authRouter = createTRPCRouter({
    register: publicProcedure
        .input(signUpSchema)
        .output(z.object({ userId: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } });
            if (existing) {
                throw new TRPCError({ code: 'CONFLICT', message: "Cet e-mail est deja utilise." });
            }

            const passwordHash = await ctx.hashPassword(input.password);
            const user = await ctx.prisma.user.create({
                data: { email: input.email, passwordHash, role: 'USER' },
            });

            const rawVerificationOtp = createOtpCode();
            const tokenHash = ctx.hashToken(rawVerificationOtp);
            const tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 15);
            await ctx.prisma.emailVerificationToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt: tokenExpiresAt,
                },
            });
            const verificationIdempotencyKey = `verify:${user.id}:${tokenHash}`;
            const verifySend = await ctx.sendVerifyEmail({
                to: user.email,
                otpCode: rawVerificationOtp,
                idempotencyKey: verificationIdempotencyKey,
            });
            await ctx.prisma.emailDelivery.create({
                data: {
                    userId: user.id,
                    templateKey: 'verify-email',
                    idempotencyKey: verificationIdempotencyKey,
                    status: verifySend.ok ? 'sent' : 'failed',
                    providerMessageId: verifySend.ok ? verifySend.providerMessageId : null,
                    errorCode: verifySend.ok ? null : verifySend.errorCode,
                },
            });

            const token = randomUUID();
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
            await ctx.prisma.session.create({
                data: {
                    userId: user.id,
                    tokenHash: ctx.hashToken(token),
                    expiresAt,
                },
            });
            ctx.setSessionCookie(token, expiresAt);
            return { userId: user.id };
        }),
    login: publicProcedure
        .input(signInSchema)
        .output(z.object({ userId: z.string().cuid(), email: z.email() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({ where: { email: input.email } });
            if (!user) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Identifiants invalides.' });
            }
            const ok = await ctx.verifyPassword(input.password, user.passwordHash);
            if (!ok) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Identifiants invalides.' });
            }
            const token = randomUUID();
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
            await ctx.prisma.session.create({
                data: {
                    userId: user.id,
                    tokenHash: ctx.hashToken(token),
                    expiresAt,
                },
            });
            ctx.setSessionCookie(token, expiresAt);
            return { userId: user.id, email: user.email };
        }),
    verifyEmail: publicProcedure
        .input(verifyEmailSchema)
        .output(z.object({ ok: z.literal(true) }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { email: input.email },
                select: { id: true },
            });
            if (!user) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Le code de verification est invalide ou expire.' });
            }
            const tokenHash = ctx.hashToken(input.otpCode);
            const record = await ctx.prisma.emailVerificationToken.findFirst({
                where: { tokenHash, userId: user.id },
            });
            if (!record || record.usedAt || record.expiresAt <= new Date()) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Le code de verification est invalide ou expire.' });
            }
            await ctx.prisma.$transaction([
                ctx.prisma.user.update({
                    where: { id: record.userId },
                    data: { emailVerifiedAt: new Date() },
                }),
                ctx.prisma.emailVerificationToken.update({
                    where: { tokenHash },
                    data: { usedAt: new Date() },
                }),
            ]);
            return { ok: true };
        }),
    resendVerification: protectedProcedure
        .output(z.object({ ok: z.literal(true) }))
        .mutation(async ({ ctx }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.sessionUser.id },
                select: { id: true, email: true, emailVerifiedAt: true },
            });
            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
            }
            if (user.emailVerifiedAt) return { ok: true };

            const rawOtp = createOtpCode();
            const tokenHash = ctx.hashToken(rawOtp);
            const expiresAt = new Date(Date.now() + 1000 * 60 * 15);
            await ctx.prisma.emailVerificationToken.create({
                data: { userId: user.id, tokenHash, expiresAt },
            });

            const idempotencyKey = `verify-resend:${user.id}:${tokenHash}`;
            const sent = await ctx.sendVerifyEmail({
                to: user.email,
                otpCode: rawOtp,
                idempotencyKey,
            });
            await ctx.prisma.emailDelivery.create({
                data: {
                    userId: user.id,
                    templateKey: 'verify-email',
                    idempotencyKey,
                    status: sent.ok ? 'sent' : 'failed',
                    providerMessageId: sent.ok ? sent.providerMessageId : null,
                    errorCode: sent.ok ? null : sent.errorCode,
                },
            });
            return { ok: true };
        }),
    requestPasswordReset: publicProcedure
        .input(requestPasswordResetSchema)
        .output(z.object({ ok: z.literal(true) }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { email: input.email },
                select: { id: true, email: true },
            });
            if (!user) return { ok: true };

            const rawToken = createRawToken();
            const tokenHash = ctx.hashToken(rawToken);
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
            await ctx.prisma.passwordResetToken.create({
                data: { userId: user.id, tokenHash, expiresAt },
            });

            const resetUrl = `${ctx.appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
            const idempotencyKey = `password-reset:${user.id}:${tokenHash}`;
            const sent = await ctx.sendPasswordResetEmail({
                to: user.email,
                resetUrl,
                idempotencyKey,
            });
            await ctx.prisma.emailDelivery.create({
                data: {
                    userId: user.id,
                    templateKey: 'password-reset',
                    idempotencyKey,
                    status: sent.ok ? 'sent' : 'failed',
                    providerMessageId: sent.ok ? sent.providerMessageId : null,
                    errorCode: sent.ok ? null : sent.errorCode,
                },
            });
            return { ok: true };
        }),
    resetPassword: publicProcedure
        .input(resetPasswordSchema)
        .output(z.object({ ok: z.literal(true) }))
        .mutation(async ({ ctx, input }) => {
            const tokenHash = ctx.hashToken(input.token);
            const tokenRecord = await ctx.prisma.passwordResetToken.findUnique({
                where: { tokenHash },
            });
            if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Le jeton de reinitialisation est invalide ou expire.' });
            }
            const newHash = await ctx.hashPassword(input.newPassword);
            await ctx.prisma.$transaction([
                ctx.prisma.user.update({
                    where: { id: tokenRecord.userId },
                    data: { passwordHash: newHash },
                }),
                ctx.prisma.passwordResetToken.update({
                    where: { tokenHash },
                    data: { usedAt: new Date() },
                }),
            ]);
            return { ok: true };
        }),
    logout: protectedProcedure
        .output(z.object({ ok: z.literal(true) }))
        .mutation(async ({ ctx }) => {
            ctx.clearSessionCookie();
            return { ok: true };
        }),
});
