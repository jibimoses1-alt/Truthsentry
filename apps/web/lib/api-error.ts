import type { AppRouter } from '@truthsentry/trpc';
import { TRPCClientError } from '@trpc/client';

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;

type ErrorTranslator = (key: string) => string;

function getTrpcFieldErrors(error: TRPCClientError<AppRouter>): string | null {
    const data = error.data as
        | { zodError?: { fieldErrors?: Record<string, string[] | undefined> } }
        | undefined;
    const fieldErrors = data?.zodError?.fieldErrors;
    if (!fieldErrors) return null;

    const parts = Object.entries(fieldErrors).flatMap(([field, messages]) =>
        (messages ?? []).map((message) => `${field}: ${message}`),
    );
    return parts.length > 0 ? parts.join('; ') : null;
}

function resolveCodeMessage(message: string, t: ErrorTranslator): string {
    if (ERROR_CODE_PATTERN.test(message)) {
        const translated = t(`errors.${message}`);
        if (translated !== `errors.${message}`) {
            return translated;
        }
    }
    return message;
}

export function getApiErrorMessage(error: unknown, t: ErrorTranslator): string {
    if (error instanceof TRPCClientError) {
        const fieldMessage = getTrpcFieldErrors(error);
        if (fieldMessage) return fieldMessage;

        const shape = error.shape as { message?: string } | undefined;
        const raw =
            typeof shape?.message === 'string' && shape.message.trim().length > 0
                ? shape.message
                : error.message;

        if (raw) {
            return resolveCodeMessage(raw, t);
        }
        return t('errors.generic');
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return resolveCodeMessage(error.message, t);
    }

    if (typeof error === 'string' && error.trim().length > 0) {
        return resolveCodeMessage(error, t);
    }

    return t('errors.unexpected');
}
