import type * as React from 'react'

import { cn } from '../../lib/utils'
import { LandingHeroDashboardPreview } from './landing-hero-dashboard-preview'
import { LandingSectionBadge } from './landing-section-badge'

export type LandingDynamicFeaturesProps = {
    badge?: string
    title: string
    className?: string
}

export function LandingDynamicFeatures({
    badge = 'Feature',
    title,
    className,
}: LandingDynamicFeaturesProps): React.ReactElement {
    return (
        <section
            className={cn(
                'border-b border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-16 sm:px-6 sm:py-24',
                className,
            )}
        >
            <div className="mx-auto max-w-[var(--lp-max-width)]">
                <div className="text-center">
                    <LandingSectionBadge>{badge}</LandingSectionBadge>
                    <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-[var(--lp-fg)] sm:text-4xl">
                        {title}
                    </h2>
                </div>
                <LandingHeroDashboardPreview className="mt-14" />
            </div>
        </section>
    )
}
