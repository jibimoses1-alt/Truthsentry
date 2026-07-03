import { getTranslations } from 'next-intl/server';

import type { AppLocale } from '@/i18n/routing';

export const siteName = 'TruthSentry';

/** Square icon for favicon and PWA (`public/truthsentry-icon.png`). */
export const siteIconPath = '/truthsentry-icon.png';

/** Horizontal wordmark for light backgrounds (`public/truthsentry.png`). */
export const siteLogoPath = '/truthsentry.png';

/** White wordmark for dark backgrounds (`public/truthsentry-white.png`). */
export const siteLogoOnDarkPath = '/truthsentry-white.png';

/** Browser chrome / PWA theme (brand teal). */
export const siteThemeColor = '#42acb5';

/** Fallback description for root-level metadata routes (manifest, OG image). */
export const siteDefaultDescription =
    'Submit claims in Arabic or English. When the system can verify against selected sources, you get a clear answer; otherwise your dossier is queued for human review.';

export function getMetadataBase(): URL {
    const raw = process.env.NEXT_PUBLIC_APP_URL;
    if (!raw) {
        return new URL('http://localhost:3000');
    }
    return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw);
}

export function shouldAllowIndexing(): boolean {
    return process.env.VERCEL_ENV === 'production';
}

export async function getSiteMetadata(locale: AppLocale): Promise<{
    siteName: string;
    description: string;
    keywords: string[];
    openGraphLocale: string;
    openGraphAlternateLocale: string[];
}> {
    const t = await getTranslations({ locale, namespace: 'metadata' });
    const keywords = t('keywords').split(',').map((k) => k.trim());
    return {
        siteName,
        description: t('description'),
        keywords,
        openGraphLocale: locale === 'ar' ? 'ar_SA' : 'en_US',
        openGraphAlternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'],
    };
}

export function buildJsonLd(overrides?: {
    name?: string;
    description?: string;
    url?: string;
    locale?: AppLocale;
}): Record<string, unknown> {
    const base = getMetadataBase().toString().replace(/\/$/, '');
    const locale = overrides?.locale ?? 'ar';
    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: overrides?.name ?? siteName,
        description: overrides?.description ?? siteDefaultDescription,
        url: overrides?.url ?? `${base}/${locale}`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        inLanguage: ['ar', 'en'],
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
    };
}
