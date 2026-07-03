import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import { AuthCardFooter, AuthPageShell } from '@truthsentry/ui/auth';
import { AuthTopBackLink } from '@/components/auth-top-back-link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getSiteMetadata } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'auth.resetPassword' });
    const meta = await getSiteMetadata(locale as AppLocale);
    return {
        title: t('title'),
        description: meta.description,
        robots: { index: false, follow: false },
    };
}

export default async function ResetPasswordPage({ params, searchParams }: Props): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations('auth.resetPassword');
    const resolved = await searchParams;
    const token = typeof resolved.token === 'string' ? resolved.token : null;

    return (
        <AuthPageShell
            topStartSlot={<AuthTopBackLink href="/sign-in" />}
            topEndSlot={
                <>
                    <LocaleSwitcher />
                    <ThemeToggle />
                </>
            }
            title={t('title')}
            description={t('description')}
        >
            <ResetPasswordForm token={token} />
            <AuthCardFooter>
                <Link href="/sign-in" className="text-[var(--lp-fg-subtle)] hover:text-[var(--lp-fg-muted)]">
                    {t('backToSignIn')}
                </Link>
            </AuthCardFooter>
        </AuthPageShell>
    );
}
