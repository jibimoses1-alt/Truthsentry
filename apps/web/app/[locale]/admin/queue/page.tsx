import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AdminQueuePageClient } from '@/components/admin/admin-queue-page-client';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'admin' });
    return {
        title: t('queueTitle'),
        robots: { index: false, follow: false },
    };
}

export default async function AdminQueuePage({ params }: Props): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale as AppLocale);
    return <AdminQueuePageClient />;
}
