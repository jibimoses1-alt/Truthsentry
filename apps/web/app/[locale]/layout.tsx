import { Noto_Sans_Arabic, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { AppToastProviders } from '@/components/app-toast-providers';
import { CampaignAttributionCapture } from '@/components/campaign-attribution-capture';
import { ThemeProvider } from '@/components/theme-provider';
import { TrpcProvider } from '@/components/trpc-provider';
import { routing, type AppLocale } from '@/i18n/routing';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

const notoSansArabic = Noto_Sans_Arabic({
    subsets: ['arabic'],
    variable: '--font-arabic',
    display: 'swap',
});

export function generateStaticParams(): { locale: AppLocale }[] {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
    const { locale } = await params;

    if (!routing.locales.includes(locale as AppLocale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();
    const isRtl = locale === 'ar';

    return (
        <html
            lang={locale}
            dir={isRtl ? 'rtl' : 'ltr'}
            suppressHydrationWarning
            className={`${inter.variable} ${notoSansArabic.variable}`}
        >
            <body
                className={`min-h-dvh antialiased ${isRtl ? 'font-[family-name:var(--font-arabic)]' : 'font-sans'}`}
            >
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider>
                        <TrpcProvider locale={locale as AppLocale}>
                            <Suspense fallback={null}>
                                <CampaignAttributionCapture />
                            </Suspense>
                            <AppToastProviders>{children}</AppToastProviders>
                        </TrpcProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
