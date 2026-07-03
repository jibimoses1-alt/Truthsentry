'use client';

import type { AppRouter } from '@truthsentry/trpc';
import { TRPCClientError } from '@trpc/client';
import { toastManager } from '@truthsentry/ui/components/toast';

export type ApiToastPayload = {
    title: string;
    description?: string;
};

/**
 * Default success feedback after a mutation or API call completes.
 */
export function notifyApiSuccess(payload: ApiToastPayload): void {
    toastManager.add({
        type: 'success',
        title: payload.title,
        description: payload.description,
    });
}

/**
 * Default error feedback for failed requests or thrown errors.
 */
export function notifyApiError(payload: ApiToastPayload): void {
    toastManager.add({
        type: 'error',
        title: payload.title,
        description: payload.description,
    });
}

export function notifyApiInfo(payload: ApiToastPayload): void {
    toastManager.add({
        type: 'info',
        title: payload.title,
        description: payload.description,
    });
}

export function notifyApiWarning(payload: ApiToastPayload): void {
    toastManager.add({
        type: 'warning',
        title: payload.title,
        description: payload.description,
    });
}

function getTrpcClientErrorMessage(error: TRPCClientError<AppRouter>): string {
    const data = error.data as
        | { zodError?: { fieldErrors?: Record<string, string[] | undefined> } }
        | undefined;
    const fieldErrors = data?.zodError?.fieldErrors;
    if (fieldErrors) {
        const parts = Object.entries(fieldErrors).flatMap(([field, messages]) =>
            (messages ?? []).map((message) => `${field}: ${message}`),
        );
        if (parts.length > 0) {
            return parts.join('; ');
        }
    }

    const shape = error.shape as { message?: string } | undefined;
    if (typeof shape?.message === 'string' && shape.message.trim().length > 0) {
        return shape.message;
    }

    return error.message || 'Une erreur est survenue.';
}

/**
 * Map unknown errors (Error, string, tRPC errors) to a single message.
 */
export function getApiErrorMessage(error: unknown): string {
    if (error instanceof TRPCClientError) {
        return getTrpcClientErrorMessage(error);
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string' && error.trim().length > 0) {
        return error;
    }
    return 'An unexpected error occurred.';
}

/**
 * Preferred entry for catch blocks once fetch/tRPC is wired.
 */
export function notifyApiException(
    error: unknown,
    title = 'Request failed',
): void {
    notifyApiError({
        title,
        description: getApiErrorMessage(error),
    });
}
