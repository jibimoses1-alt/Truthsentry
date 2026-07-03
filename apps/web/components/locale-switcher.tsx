'use client';

import { useLocale } from 'next-intl';
import type { ReactElement } from 'react';

import { Button } from '@truthsentry/ui/components/button';
import { cn } from '@truthsentry/ui/lib/utils';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

export type LocaleSwitcherProps = {
    className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps): ReactElement {
    const locale = useLocale() as AppLocale;
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div
            className={cn('inline-flex items-center rounded-full border border-[var(--lp-border)] p-0.5', className)}
            role="group"
            aria-label="Language"
        >
            {routing.locales.map((code) => (
                <Button
                    key={code}
                    type="button"
                    variant={locale === code ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 min-w-9 rounded-full px-2 text-xs font-medium"
                    aria-pressed={locale === code}
                    onClick={() => router.replace(pathname, { locale: code })}
                >
                    {code.toUpperCase()}
                </Button>
            ))}
        </div>
    );
}
