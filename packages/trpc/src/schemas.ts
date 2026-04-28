import { randomBytes } from 'node:crypto';
import { z } from 'zod';

export const signInSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export const signUpSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
    email: z.email(),
    otpCode: z.string().length(6).regex(/^\d+$/),
});

export const requestPasswordResetSchema = z.object({
    email: z.email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(32),
    newPassword: z.string().min(8),
});

export const chatMessageInput = z.object({
    claimId: z.string().cuid(),
    content: z.string().trim().min(1).max(4000),
    clientRequestId: z.string().uuid().optional(),
    attachments: z
        .array(
            z.object({
                url: z.string().url(),
                mimeType: z.string(),
                sizeBytes: z.number().int().positive(),
            }),
        )
        .max(4)
        .optional(),
});

export function createRawToken(): string {
    return randomBytes(32).toString('hex');
}

export function createOtpCode(): string {
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}
