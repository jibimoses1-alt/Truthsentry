import { ArrowUpRight } from 'lucide-react'
import type * as React from 'react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { LandingHeroDashboardPreview, type LandingHeroSkill } from './landing-hero-dashboard-preview'

export type LandingHeroProps = {
    id?: string
    title: string
    subtitle: string
    primaryHref: string
    primaryLabel: string
    secondaryHref: string
    secondaryLabel: string
    skills?: LandingHeroSkill[]
    productName?: string
    assistantMessage?: string
    userMessage?: string
    className?: string
}

export function LandingHero({
    id,
    title,
    subtitle,
    primaryHref,
    primaryLabel,
    secondaryHref,
    secondaryLabel,
    skills,
    productName,
    assistantMessage,
    userMessage,
    className,
}: LandingHeroProps): React.ReactElement {
    return (
        <section id={id} className={cn('landing-hero-section scroll-mt-20', className)}>
            <div className="relative z-10 mx-auto w-full max-w-[var(--lp-max-width)] px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
                <div className="mx-auto max-w-3xl text-center">
                    <h1 className="text-balance text-4xl font-semibold tracking-tight text-[var(--lp-fg)] sm:text-5xl md:text-6xl">
                        {title}
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-[var(--lp-fg-muted)] sm:text-lg">
                        {subtitle}
                    </p>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Button
                            size="xl"
                            render={<a href={primaryHref} />}
                            className="landing-hero-primary-btn rounded-full px-6"
                        >
                            <span className="text-nowrap">{primaryLabel}</span>
                            <ArrowUpRight className="size-5 opacity-90" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            render={<a href={secondaryHref} />}
                            className="rounded-full border-[var(--lp-border-strong)] bg-transparent text-[var(--lp-fg)] hover:bg-[var(--lp-border)]/40"
                        >
                            {secondaryLabel}
                        </Button>
                    </div>
                </div>
                <LandingHeroDashboardPreview
                    skills={skills}
                    productName={productName}
                    assistantMessage={assistantMessage}
                    userMessage={userMessage}
                    className="mt-14 w-full sm:mt-16"
                />
            </div>
        </section>
    )
}
