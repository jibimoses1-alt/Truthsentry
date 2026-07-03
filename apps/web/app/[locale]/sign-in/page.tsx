import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { AuthCardFooter, AuthPageShell } from '@truthsentry/ui/auth';
import { AuthTopBackLink } from '@/components/auth-top-back-link';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { SignInForm } from '@/components/auth/sign-in-form';
import { Link } from '@/i18n/navigation';
import { getSiteMetadata } from '@/lib/site';
import type { AppLocale } from '@/i18n/routing';

type Props = {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function flatParams(raw: Record<string, string | string[] | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string') out[k] = v;
    }
    return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'auth.signIn' });
    const meta = await getSiteMetadata(locale as AppLocale);
    return {
        title: t('title'),
        description: meta.description,
        robots: { index: false, follow: false },
    };
}

export default async function SignInPage({ params, searchParams }: Props): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations('auth.signIn');
    const tCommon = await getTranslations('common');
    const query = flatParams(await searchParams);

    return (
        <AuthPageShell
            topStartSlot={<AuthTopBackLink href="/" />}
            topEndSlot={
                <>
                    <LocaleSwitcher />
                    <ThemeToggle />
                </>
            }
            logo={<BrandLogo className="h-7 max-w-[10rem] sm:h-8 sm:max-w-[11rem]" width={160} height={35} priority />}
            title={t('title')}
            description={t('description')}
        >
            <SignInForm searchParams={query} />
            <AuthCardFooter>
                <p>
                    {t('noAccount')}{' '}
                    <Link
                        href={{ pathname: '/sign-up', query }}
                        className="font-medium text-[var(--lp-accent)] hover:underline"
                    >
                        {tCommon('signUp')}
                    </Link>
                </p>
            </AuthCardFooter>
        </AuthPageShell>
    );
}
