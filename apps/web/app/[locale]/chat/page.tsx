import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { ChatPageClient } from '@/components/chat-page-client';
import { siteName } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'chat' });
    return {
        title: t('subtitle'),
        description: `${t('subtitle')} — ${siteName}`,
        robots: { index: false, follow: false },
    };
}

export default async function ChatPage({ params }: Props): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale as AppLocale);
    return <ChatPageClient />;
}
