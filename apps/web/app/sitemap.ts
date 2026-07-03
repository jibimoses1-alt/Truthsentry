import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { getMetadataBase } from '@/lib/site';

const PUBLIC_PATHS = ['', '/legal/privacy', '/legal/terms'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
    const base = getMetadataBase().toString().replace(/\/$/, '');
    const now = new Date();

    return routing.locales.flatMap((locale) =>
        PUBLIC_PATHS.map((path) => ({
            url: `${base}/${locale}${path}`,
            lastModified: now,
            changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
            priority: path === '' ? 1 : 0.3,
        })),
    );
}
