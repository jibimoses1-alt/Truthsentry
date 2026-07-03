import type { MessageRole, UserRole, SourceType, MediaType, TopicCategory } from '@prisma/client';
import type { prisma } from '@truthsentry/prisma';
import type { SendEmailResult } from '@truthsentry/emails';

export type SessionUser = {
    id: string;
    email: string;
    role: UserRole;
};

export type ClaimContext = {
    claimText?: string | null;
    claimLanguage: string;
    claimDate?: Date | null;
    sourceName?: string | null;
    sourceType?: SourceType | null;
    sourceUrl?: string | null;
    mediaType: MediaType;
    topicCategory?: TopicCategory | null;
    location?: string | null;
    platform?: string | null;
};

export type ExtractedMetadata = {
    topicCategory?: TopicCategory;
    sourceType?: SourceType;
    sourceName?: string;
    location?: string;
    platform?: string;
};

export type UiLocale = 'ar' | 'en';

export type ThreadMessage = {
    role: MessageRole;
    content: string;
    attachments?: Array<{
        mimeType: string;
        url?: string;
        uploadPath?: string;
    }>;
};

export type TrpcContext = {
    prisma: typeof prisma;
    uiLocale: UiLocale;
    sessionUser: SessionUser | null;
    setSessionCookie: (token: string, expiresAt: Date) => void;
    clearSessionCookie: () => void;
    invalidateCurrentSession?: () => Promise<void>;
    hashPassword: (password: string) => Promise<string>;
    verifyPassword: (password: string, hash: string) => Promise<boolean>;
    hashToken: (token: string) => string;
    createSignedUploadUrl: (args: {
        claimId: string;
        filename: string;
        mimeType: string;
        sizeBytes?: number;
    }) => Promise<{ uploadPath: string; uploadUrl: string; readUrl: string }>;
    createSignedReadUrl?: (args: { uploadPath: string }) => Promise<string>;
    chatUploadLimits: {
        maxBytes: number;
        allowedMimeTypes: string[];
    };
    generateAssistantText: (args: {
        claim: ClaimContext;
        thread: ThreadMessage[];
    }) => Promise<string>;
    transcribeAudio?: (args: {
        audioBase64: string;
        mimeType: string;
        language?: UiLocale;
    }) => Promise<string>;
    extractClaimMetadata?: (args: { text: string }) => Promise<ExtractedMetadata>;
    appUrl: string;
    sendVerifyEmail: (args: {
        to: string;
        otpCode: string;
        idempotencyKey: string;
        locale?: UiLocale;
    }) => Promise<SendEmailResult>;
    sendPasswordResetEmail: (args: {
        to: string;
        resetUrl: string;
        idempotencyKey: string;
        locale?: UiLocale;
    }) => Promise<SendEmailResult>;
    sendClaimQueuedEmail: (args: {
        to: string;
        claimId: string;
        idempotencyKey: string;
        locale?: UiLocale;
    }) => Promise<SendEmailResult>;
    sendClaimResolvedEmail: (args: {
        to: string;
        claimId: string;
        idempotencyKey: string;
        locale?: UiLocale;
    }) => Promise<SendEmailResult>;
    broadcastToClaimSubscribers?: (
        claimId: string,
        msg: { type: string; payload: Record<string, unknown> },
    ) => void;
};
