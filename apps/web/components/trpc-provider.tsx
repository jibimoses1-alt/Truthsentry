'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
import type { AppLocale } from '@/i18n/routing';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export function TrpcProvider({ children, locale }: { children: ReactNode; locale: AppLocale }) {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${apiUrl}/trpc`,
                    headers() {
                        return { 'x-locale': locale };
                    },
                    fetch(url, options) {
                        return fetchWithRetry(url, {
                            ...options,
                            credentials: 'include',
                        });
                    },
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}
