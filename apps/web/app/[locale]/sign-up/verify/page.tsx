import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import { AuthCardFooter, AuthPageShell } from '@truthsentry/ui/auth';
import { AuthTopBackLink } from '@/components/auth-top-back-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { getSiteMetadata } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'auth.verify' });
    const meta = await getSiteMetadata(locale as AppLocale);
    return {
        title: t('title'),
        description: meta.description,
        robots: { index: false, follow: false },
    };
}

export default async function VerifyEmailPage({ params, searchParams }: Props): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations('auth.verify');
    const resolved = await searchParams;
    const email = typeof resolved.email === 'string' ? resolved.email : null;

    return (
        <AuthPageShell
            topStartSlot={<AuthTopBackLink href="/sign-up" />}
            topEndSlot={
                <>
                    <LocaleSwitcher />
                    <ThemeToggle />
                </>
            }
            title={t('title')}
            description={t('description')}
        >
            <VerifyEmailForm email={email} />
            <AuthCardFooter>
                <Link href="/sign-up" className="text-[var(--lp-fg-subtle)] hover:text-[var(--lp-fg-muted)]">
                    {t('backToSignUp')}
                </Link>
            </AuthCardFooter>
        </AuthPageShell>
    );
}
