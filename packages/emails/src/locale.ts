export type EmailLocale = 'ar' | 'en';

export function resolveEmailLocale(locale?: string): EmailLocale {
    return locale === 'en' ? 'en' : 'ar';
}
