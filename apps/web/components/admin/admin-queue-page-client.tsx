'use client';

import { useEffect, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@truthsentry/ui/components/button';
import { Link } from '@/i18n/navigation';
import { trpc } from '@/lib/trpc';

export function AdminQueuePageClient(): ReactElement {
    const t = useTranslations('admin');
    const session = trpc.session.me.useQuery();
    const queue = trpc.admin.listQueue.useQuery(undefined, {
        enabled: session.data?.role === 'ADMIN',
    });

    useEffect(() => {
        if (session.error?.data?.code === 'UNAUTHORIZED') {
            window.location.href = '/sign-in';
        }
    }, [session.error]);

    if (session.isLoading) {
        return <p className="text-muted-foreground text-sm">{t('loading')}</p>;
    }

    if (session.data?.role !== 'ADMIN') {
        return (
            <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
                <h1 className="text-xl font-semibold">{t('forbiddenTitle')}</h1>
                <p className="text-muted-foreground text-sm">{t('forbiddenDescription')}</p>
                <Button render={<Link href="/chat" />}>{t('backToChat')}</Button>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{t('queueTitle')}</h1>
                <p className="text-muted-foreground text-sm">{t('queueDescription')}</p>
            </header>

            {queue.isLoading ? (
                <p className="text-muted-foreground text-sm">{t('loading')}</p>
            ) : queue.data?.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('queueEmpty')}</p>
            ) : (
                <ul className="divide-border divide-y rounded-lg border">
                    {queue.data?.items.map((item) => (
                        <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                                <p className="truncate font-medium">{item.title ?? t('untitled')}</p>
                                <p className="text-muted-foreground text-xs">
                                    {item.userEmail} · {item.status} · {item.factCheckStatus} ·{' '}
                                    {item.claimLanguage}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                render={<Link href={`/admin/claims/${item.id}`} />}
                            >
                                {t('review')}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
