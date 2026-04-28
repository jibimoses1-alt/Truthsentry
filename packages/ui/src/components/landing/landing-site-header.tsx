import { ArrowUpRight } from 'lucide-react'
import type * as React from 'react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export type LandingNavItem = {
    href: string
    label: string
}

export type LandingSiteHeaderProps = {
    brand: string
    brandHref?: string
    /** Optional horizontal logo (e.g. wordmark URL from `public/`). */
    brandLogoSrc?: string
    /** Optional dark-mode wordmark; when set with `brandLogoSrc`, swaps by theme. */
    brandLogoDarkSrc?: string
    brandLogoAlt?: string
    /** Extra controls before sign-in (e.g. theme toggle). */
    headerActions?: React.ReactNode
    navItems?: LandingNavItem[]
    signInHref: string
    primaryCtaHref: string
    primaryCtaLabel: string
    className?: string
}

const defaultNav: LandingNavItem[] = [
    { href: '#how', label: 'Fonctionnement' },
    { href: '#why', label: 'Pourquoi Afalambè' },
    { href: '#faq', label: 'FAQ' },
]

export function LandingSiteHeader({
    brand,
    brandHref = '/',
    brandLogoSrc,
    brandLogoDarkSrc,
    brandLogoAlt,
    headerActions,
    navItems = defaultNav,
    signInHref,
    primaryCtaHref,
    primaryCtaLabel,
    className,
}: LandingSiteHeaderProps): React.ReactElement {
    return (
        <header
            className={cn(
                'sticky top-0 z-[70] border-b border-[var(--lp-border)] bg-[var(--lp-bg-elevated)]/85 backdrop-blur-md',
                className,
            )}
        >
            <div className="mx-auto flex h-14 max-w-[var(--lp-max-width)] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6 lg:gap-8">
                    <a
                        href={brandHref}
                        className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-[var(--lp-fg)] no-underline hover:opacity-90"
                    >
                        {brandLogoSrc ? (
                            brandLogoDarkSrc ? (
                                <>
                                    <img
                                        src={brandLogoSrc}
                                        alt={brandLogoAlt ?? brand}
                                        width={160}
                                        height={36}
                                        className="h-8 w-auto max-w-[min(100%,11rem)] object-contain object-left dark:hidden sm:h-9 sm:max-w-[13rem]"
                                        decoding="async"
                                    />
                                    <img
                                        src={brandLogoDarkSrc}
                                        alt={brandLogoAlt ?? brand}
                                        width={160}
                                        height={36}
                                        className="hidden h-8 w-auto max-w-[min(100%,11rem)] object-contain object-left dark:block sm:h-9 sm:max-w-[13rem]"
                                        decoding="async"
                                    />
                                </>
                            ) : (
                                <img
                                    src={brandLogoSrc}
                                    alt={brandLogoAlt ?? brand}
                                    width={160}
                                    height={36}
                                    className="h-8 w-auto max-w-[min(100%,11rem)] object-contain object-left sm:h-9 sm:max-w-[13rem]"
                                    decoding="async"
                                />
                            )
                        ) : (
                            <span className="truncate">{brand}</span>
                        )}
                    </a>
                    <nav
                        className="hidden min-w-0 items-center gap-4 md:flex lg:gap-5"
                        aria-label="Navigation principale"
                    >
                        {navItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="shrink-0 text-sm font-medium text-[var(--lp-fg-muted)] no-underline transition-colors hover:text-[var(--lp-fg)]"
                            >
                                {item.label}
                            </a>
                        ))}
                        <a
                            href="/chat"
                            className="shrink-0 text-sm font-medium text-[var(--lp-fg-muted)] no-underline transition-colors hover:text-[var(--lp-fg)]"
                        >
                            Chat
                        </a>
                    </nav>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {headerActions}
                    <Button variant="ghost" size="sm" render={<a href={signInHref} />} className="hidden sm:inline-flex">
                        Connexion
                    </Button>
                    <Button
                        size="sm"
                        render={<a href={primaryCtaHref} />}
                        className="border-none bg-[image:var(--lp-cta-gradient)] text-white shadow-sm hover:bg-[image:var(--lp-cta-gradient-hover)]"
                    >
                        {primaryCtaLabel}
                        <ArrowUpRight className="size-4 opacity-90" />
                    </Button>
                </div>
            </div>
        </header>
    )
}
