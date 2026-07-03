'use client';

import type { ReactNode, ReactElement } from 'react';
import {
    AnchoredToastProvider,
    ToastProvider,
} from '@truthsentry/ui/components/toast';

/**
 * Global toast stack (coss / Base UI). Required before calling `toastManager` / `anchoredToastManager`.
 * @see `lib/api-toast.ts` for default API-style notifications.
 */
export function AppToastProviders({
    children,
}: {
    children: ReactNode;
}): ReactElement {
    return (
        <ToastProvider position="top-right">
            <AnchoredToastProvider>{children}</AnchoredToastProvider>
        </ToastProvider>
    );
}
