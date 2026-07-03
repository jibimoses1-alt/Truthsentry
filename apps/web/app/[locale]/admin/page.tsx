import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
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

export default async function AdminIndexPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale as AppLocale);
    return redirect({ href: '/admin/queue', locale: locale as AppLocale });
}
