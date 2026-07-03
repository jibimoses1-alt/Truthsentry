import { randomBytes } from 'node:crypto';
import { z } from 'zod';

export const signInSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export const signUpSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    attribution: z
        .object({
            utmSource: z.string().trim().max(120).optional(),
            utmMedium: z.string().trim().max(120).optional(),
            utmCampaign: z.string().trim().max(120).optional(),
            campaignSlug: z.string().trim().max(64).optional(),
            landingPath: z.string().trim().max(500).optional(),
        })
        .optional(),
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

export const transcribeAudioInput = z.object({
    audioBase64: z.string().min(1).max(14_000_000),
    mimeType: z.string().min(1).max(120),
    language: z.enum(['ar', 'en']).optional(),
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
                uploadPath: z.string().min(1).optional(),
            }),
        )
        .max(4)
        .optional(),
});

export const sourceTypeValues = [
    'POLITICIAN',
    'MEDIA',
    'SOCIAL_MEDIA',
    'BLOG',
    'NGO',
    'CITIZEN',
] as const;

export const mediaTypeValues = [
    'TEXT',
    'IMAGE',
    'VIDEO',
    'AUDIO',
    'TEXT_IMAGE',
    'TEXT_VIDEO',
    'TEXT_AUDIO',
] as const;

export const topicCategoryValues = [
    'POLITICS',
    'HEALTH',
    'FINANCE',
    'TECH',
    'SECURITY',
    'EDUCATION',
    'ENVIRONMENT',
] as const;

export const factCheckStatusValues = [
    'PENDING',
    'VERIFIED',
    'DEBUNKED',
    'MISLEADING',
    'PARTIALLY_TRUE',
] as const;

export const claimMetadataInput = z.object({
    claimText: z.string().trim().max(4000).optional(),
    claimLanguage: z.string().max(10).optional(),
    claimDate: z.coerce.date().optional(),
    sourceName: z.string().trim().max(200).optional(),
    sourceType: z.enum(sourceTypeValues).optional(),
    sourceUrl: z.string().url().optional(),
    mediaType: z.enum(mediaTypeValues).optional(),
    topicCategory: z.enum(topicCategoryValues).optional(),
    location: z.string().trim().max(200).optional(),
    platform: z.string().trim().max(100).optional(),
});

export function createRawToken(): string {
    return randomBytes(32).toString('hex');
}

export function createOtpCode(): string {
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}
