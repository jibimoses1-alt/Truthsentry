'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { getApiErrorMessage } from '@/lib/api-error';
import {
    notifyApiError,
    notifyApiInfo,
    notifyApiSuccess,
    notifyApiWarning,
    type ApiToastPayload,
} from '@/lib/api-toast';

export function useApiToast() {
    const t = useTranslations();

    const translateError = useCallback(
        (error: unknown) => getApiErrorMessage(error, (key) => t(key as never)),
        [t],
    );

    return {
        notifyApiSuccess,
        notifyApiInfo,
        notifyApiWarning,
        notifyApiError,
        translateError,
        notifyApiException: (error: unknown, titleKey = 'errors.requestFailed') => {
            notifyApiError({
                title: t(titleKey as never),
                description: translateError(error),
            });
        },
        notifyApiErrorT: (payload: ApiToastPayload) => notifyApiError(payload),
    };
}
