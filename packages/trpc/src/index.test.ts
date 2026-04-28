import test from 'node:test';
import assert from 'node:assert/strict';
import { appRouter, type TrpcContext } from './index';

test('health.ping returns ok', async () => {
    const ctx = {
        prisma: {} as TrpcContext['prisma'],
        sessionUser: null,
        setSessionCookie: () => undefined,
        clearSessionCookie: () => undefined,
        hashPassword: async () => '',
        verifyPassword: async () => false,
        hashToken: () => '',
        appUrl: 'http://localhost:3000',
        sendVerifyEmail: async () => ({ ok: true, providerMessageId: 'msg_1' }),
        sendPasswordResetEmail: async () => ({ ok: true, providerMessageId: 'msg_2' }),
        sendClaimQueuedEmail: async () => ({ ok: true, providerMessageId: 'msg_3' }),
        sendClaimResolvedEmail: async () => ({ ok: true, providerMessageId: 'msg_4' }),
        createSignedUploadUrl: async () => ({ uploadPath: '', uploadUrl: 'https://example.com/upload' }),
        generateAssistantText: async () => 'ok',
    } satisfies TrpcContext;

    const caller = appRouter.createCaller(ctx);
    const result = await caller.health.ping();
    assert.equal(result.ok, true);
});
