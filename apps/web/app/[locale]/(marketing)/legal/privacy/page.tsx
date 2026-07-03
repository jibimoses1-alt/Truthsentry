import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { LandingKitRoot } from '@truthsentry/ui/landing';

import { ThemeToggle } from '@/components/theme-toggle';
import { siteName } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal.privacy' });
    return {
        title: t('title'),
        description: t('description', { brand: siteName }),
        alternates: {
            canonical: '/legal/privacy',
        },
        robots: { index: false, follow: true },
    };
}

export default async function PrivacyPage({ params }: Props): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale as AppLocale);
    const t = await getTranslations('legal.privacy');

    return (
        <LandingKitRoot className="relative">
            <div className="fixed right-4 top-4 z-[70] flex justify-end">
                <ThemeToggle />
            </div>
            <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
                <h1 className="text-3xl font-semibold text-[var(--lp-fg)]">{t('title')}</h1>
                <p className="mt-4 text-[var(--lp-fg-muted)]">{t('stub')}</p>
            </article>
        </LandingKitRoot>
    );
}
