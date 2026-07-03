import type * as React from 'react';

import { ThemeWordmark } from '../brand/theme-wordmark';
import { cn } from '../../lib/utils';

const linkColumns = {
    product: [
        { label: 'Features', href: '/#why' },
        { label: 'Integrations', href: '#' },
        { label: 'Pricing', href: '#' },
        { label: 'Changelog', href: '#' },
    ],
    company: [
        { label: 'About', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact', href: '#' },
    ],
    resources: [
        { label: 'Documentation', href: '#' },
        { label: 'Help Center', href: '#' },
        { label: 'Community', href: '#' },
        { label: 'Templates', href: '#' },
    ],
    legal: [
        { label: 'Privacy', href: '/legal/privacy' },
        { label: 'Terms', href: '/legal/terms' },
        { label: 'Cookie Policy', href: '#' },
    ],
} as const;

export type LandingFooterLink = {
    label: string;
    href: string;
};

export type LandingSiteFooterColumns = {
    tagline: string;
    productHeading: string;
    product: LandingFooterLink[];
    companyHeading: string;
    company: LandingFooterLink[];
    resourcesHeading: string;
    resources: LandingFooterLink[];
    legal: LandingFooterLink[];
    copyrightSuffix: string;
};

export type LandingSiteFooterProps = {
    brand: string;
    brandHref?: string;
    brandLogoSrc?: string;
    brandLogoDarkSrc?: string;
    brandLogoAlt?: string;
    /** When set, overrides default English column copy. */
    columns?: LandingSiteFooterColumns;
    /** Short supporting line under the logo (defaults to a product-safe line). */
    tagline?: string;
    /** Display name after the copyright symbol (e.g. product or legal entity). */
    copyrightHolder?: string;
    className?: string;
};

const defaultTagline =
    'Claims intake with human oversight. Verify against curated sources, with clear confidence and escalation when it matters.';

export function LandingSiteFooter({
    brand,
    brandHref = '/',
    brandLogoSrc,
    brandLogoDarkSrc,
    brandLogoAlt,
    columns,
    tagline = defaultTagline,
    copyrightHolder,
    className,
}: LandingSiteFooterProps): React.ReactElement {
    const year = new Date().getFullYear();
    const holder = copyrightHolder ?? brand;
    const resolvedTagline = columns?.tagline ?? tagline;
    const productLinks = columns?.product ?? linkColumns.product;
    const companyLinks = columns?.company ?? linkColumns.company;
    const resourcesLinks = columns?.resources ?? linkColumns.resources;
    const legalLinks = columns?.legal ?? linkColumns.legal;
    const productHeading = columns?.productHeading ?? 'Product';
    const companyHeading = columns?.companyHeading ?? 'Company';
    const resourcesHeading = columns?.resourcesHeading ?? 'Resources';
    const copyrightSuffix = columns?.copyrightSuffix ?? 'All rights reserved.';

    return (
        <footer
            className={cn(
                '@container border-t border-[var(--lp-border)] bg-[var(--lp-bg-elevated)] py-12',
                className,
            )}
        >
            <div className="mx-auto max-w-[var(--lp-max-width)] px-6">
                <div className="grid grid-cols-2 gap-8 @sm:grid-cols-3">
                    <div className="col-span-full">
                        <a
                            href={brandHref}
                            className="flex items-center gap-2 text-[var(--lp-fg)] no-underline hover:opacity-90"
                        >
                            {brandLogoSrc ? (
                                brandLogoDarkSrc ? (
                                    <ThemeWordmark
                                        lightSrc={brandLogoSrc}
                                        darkSrc={brandLogoDarkSrc}
                                        alt={brandLogoAlt ?? brand}
                                        imgClassName="h-5 max-w-[min(100%,12rem)]"
                                    />
                                ) : (
                                    <img
                                        src={brandLogoSrc}
                                        alt={brandLogoAlt ?? brand}
                                        width={160}
                                        height={36}
                                        className="h-5 w-auto max-w-[min(100%,12rem)] object-contain object-left"
                                        decoding="async"
                                    />
                                )
                            ) : (
                                <span className="text-sm font-semibold">{brand}</span>
                            )}
                        </a>
                        <p className="mt-4 max-w-xs text-sm text-[var(--lp-fg-muted)]">{resolvedTagline}</p>
                    </div>
                    <div>
                        <h3 className="mb-3 text-sm font-medium text-[var(--lp-fg)]">{productHeading}</h3>
                        <ul className="space-y-2">
                            {productLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-sm text-[var(--lp-fg-muted)] no-underline transition-colors hover:text-[var(--lp-fg)]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-3 text-sm font-medium text-[var(--lp-fg)]">{companyHeading}</h3>
                        <ul className="space-y-2">
                            {companyLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-sm text-[var(--lp-fg-muted)] no-underline transition-colors hover:text-[var(--lp-fg)]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-3 text-sm font-medium text-[var(--lp-fg)]">{resourcesHeading}</h3>
                        <ul className="space-y-2">
                            {resourcesLinks.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        className="text-sm text-[var(--lp-fg-muted)] no-underline transition-colors hover:text-[var(--lp-fg)]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--lp-border)] pt-8">
                    <p className="text-sm text-[var(--lp-fg-muted)]">
                        &copy; {year} {holder}. {copyrightSuffix}
                    </p>
                    <nav className="flex flex-wrap gap-4" aria-label="Legal">
                        {legalLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-sm text-[var(--lp-fg-muted)] no-underline transition-colors hover:text-[var(--lp-fg)]"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </footer>
    );
}
