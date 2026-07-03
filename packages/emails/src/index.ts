import { Resend } from 'resend';
import { claimQueuedHtml, claimQueuedSubject, claimQueuedText } from './templates/claim-queued';
import { claimResolvedHtml, claimResolvedSubject, claimResolvedText } from './templates/claim-resolved';
import { passwordResetHtml, passwordResetSubject, passwordResetText } from './templates/password-reset';
import { verifyEmailHtml, verifyEmailSubject, verifyEmailText } from './templates/verify-email';

type SendEmailSuccess = {
    ok: true;
    providerMessageId: string;
};

type SendEmailFailure = {
    ok: false;
    errorCode: string;
    errorMessage: string;
};

export type SendEmailResult = SendEmailSuccess | SendEmailFailure;

export type CommonSendArgs = {
    to: string;
    idempotencyKey: string;
};

type SendPayload = {
    to: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
};

function getResendClient(): Resend {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        throw new Error('RESEND_API_KEY is required');
    }
    return new Resend(key);
}

function getFromAddress(): string {
    const from = process.env.EMAIL_FROM;
    if (!from) {
        throw new Error('EMAIL_FROM is required');
    }
    return from;
}

async function sendEmail(payload: SendPayload): Promise<SendEmailResult> {
    const resend = getResendClient();
    const from = getFromAddress();
    const response = await resend.emails.send({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
    }, {
        idempotencyKey: payload.idempotencyKey,
    });

    if (response.error) {
        return {
            ok: false,
            errorCode: 'RESEND_SEND_FAILED',
            errorMessage: response.error.message,
        };
    }

    return {
        ok: true,
        providerMessageId: response.data?.id ?? 'unknown',
    };
}

export function getEmailProvider(): string {
    return 'resend';
}

export async function sendVerifyEmail(
    args: CommonSendArgs & { otpCode: string; locale?: string },
): Promise<SendEmailResult> {
    return sendEmail({
        to: args.to,
        idempotencyKey: args.idempotencyKey,
        subject: verifyEmailSubject(args.locale),
        html: verifyEmailHtml({ otpCode: args.otpCode, locale: args.locale }),
        text: verifyEmailText({ otpCode: args.otpCode, locale: args.locale }),
    });
}

export async function sendPasswordResetEmail(
    args: CommonSendArgs & { resetUrl: string; locale?: string },
): Promise<SendEmailResult> {
    return sendEmail({
        to: args.to,
        idempotencyKey: args.idempotencyKey,
        subject: passwordResetSubject(args.locale),
        html: passwordResetHtml({ resetUrl: args.resetUrl, locale: args.locale }),
        text: passwordResetText({ resetUrl: args.resetUrl, locale: args.locale }),
    });
}

export async function sendClaimQueuedEmail(
    args: CommonSendArgs & { claimId: string; locale?: string },
): Promise<SendEmailResult> {
    return sendEmail({
        to: args.to,
        idempotencyKey: args.idempotencyKey,
        subject: claimQueuedSubject(args.locale),
        html: claimQueuedHtml({ claimId: args.claimId, locale: args.locale }),
        text: claimQueuedText({ claimId: args.claimId, locale: args.locale }),
    });
}

export async function sendClaimResolvedEmail(
    args: CommonSendArgs & { claimId: string; locale?: string },
): Promise<SendEmailResult> {
    return sendEmail({
        to: args.to,
        idempotencyKey: args.idempotencyKey,
        subject: claimResolvedSubject(args.locale),
        html: claimResolvedHtml({ claimId: args.claimId, locale: args.locale }),
        text: claimResolvedText({ claimId: args.claimId, locale: args.locale }),
    });
}
