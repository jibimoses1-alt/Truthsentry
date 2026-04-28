export const siteName = 'Afalambe'

/** Served from `public/` (literal `@` in filename). */
export const siteIconPath = '/@afalambe-icon.png'

/** Horizontal wordmark for headers and auth (light surfaces). */
export const siteLogoPath = '/@afalambe-logo.png'

/** Wordmark for dark mode (`public/@afalambe-logo-dark.png`). */
export const siteLogoDarkPath = '/@afalambe-logo-dark.png'

/** Marketing landing hero (`public/@afalambe-hero.png`). */
export const siteHeroImagePath = '/@afalambe-hero.png'

export const siteDefaultDescription =
    'Soumettez des dossiers dans votre langue, y compris le fula et le peul. Quand le systeme peut verifier avec des sources selectionnees, vous obtenez une reponse claire ; sinon votre dossier est place en file d’attente pour verification humaine.'

export const siteKeywords = [
    'verification des faits',
    'verification des dossiers',
    'Fula',
    'Peul',
    'verification par IA',
    'verification humaine',
    'multilingue',
]

/** Browser chrome / PWA theme (brand red from Afalambe identity). */
export const siteThemeColor = '#9B1B30'

export function getMetadataBase(): URL {
    const raw = process.env.NEXT_PUBLIC_APP_URL
    if (!raw) {
        return new URL('http://localhost:3000')
    }
    return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw)
}

export function shouldAllowIndexing(): boolean {
    return process.env.VERCEL_ENV === 'production'
}

export function buildJsonLd(overrides?: {
    name?: string
    description?: string
    url?: string
}): Record<string, unknown> {
    const base = getMetadataBase().toString().replace(/\/$/, '')
    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: overrides?.name ?? siteName,
        description: overrides?.description ?? siteDefaultDescription,
        url: overrides?.url ?? base,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        inLanguage: ['fr', 'en'],
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
    }
}
