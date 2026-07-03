import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AdminClaimPageClient } from '@/components/admin/admin-claim-page-client';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'admin' });
    return {
        title: t('review'),
        robots: { index: false, follow: false },
    };
}

export default async function AdminClaimPage({ params }: Props): Promise<ReactElement> {
    const { locale, id } = await params;
    setRequestLocale(locale as AppLocale);
    return <AdminClaimPageClient claimId={id} />;
}
