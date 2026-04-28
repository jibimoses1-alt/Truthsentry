import type { MessageRole, UserRole } from '@prisma/client';
import type { prisma } from '@afalambe/prisma';
import type { SendEmailResult } from '@afalambe/emails';

export type SessionUser = {
    id: string;
    email: string;
    role: UserRole;
};

export type TrpcContext = {
    prisma: typeof prisma;
    sessionUser: SessionUser | null;
    setSessionCookie: (token: string, expiresAt: Date) => void;
    clearSessionCookie: () => void;
    hashPassword: (password: string) => Promise<string>;
    verifyPassword: (password: string, hash: string) => Promise<boolean>;
    hashToken: (token: string) => string;
    createSignedUploadUrl: (args: {
        claimId: string;
        filename: string;
        mimeType: string;
    }) => Promise<{ uploadPath: string; uploadUrl: string }>;
    generateAssistantText: (args: {
        thread: Array<{ role: MessageRole; content: string }>;
    }) => Promise<string>;
    appUrl: string;
    sendVerifyEmail: (args: {
        to: string;
        otpCode: string;
        idempotencyKey: string;
    }) => Promise<SendEmailResult>;
    sendPasswordResetEmail: (args: {
        to: string;
        resetUrl: string;
        idempotencyKey: string;
    }) => Promise<SendEmailResult>;
    sendClaimQueuedEmail: (args: {
        to: string;
        claimId: string;
        idempotencyKey: string;
    }) => Promise<SendEmailResult>;
    sendClaimResolvedEmail: (args: {
        to: string;
        claimId: string;
        idempotencyKey: string;
    }) => Promise<SendEmailResult>;
};
