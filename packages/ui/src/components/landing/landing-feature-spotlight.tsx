import { Check } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/utils'
import { LandingSectionBadge } from './landing-section-badge'

export type LandingFeatureSpotlightProps = {
    badge?: string
    title: string
    subtitle: string
    bullets: string[]
    className?: string
}

const SAMPLE_CLAIM = `{
  "claimId": "clm_8f2a…",
  "claimLanguage": "en",
  "mediaType": "text_image",
  "sourceName": "@health_updates",
  "platform": "whatsapp",
  "topicCategory": "health",
  "factCheckStatus": "PENDING"
}`

export function LandingFeatureSpotlight({
    badge = 'Feature',
    title,
    subtitle,
    bullets,
    className,
}: LandingFeatureSpotlightProps): React.ReactElement {
    return (
        <section
            className={cn(
                'border-b border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-16 sm:px-6 sm:py-24',
                className,
            )}
        >
            <div className="mx-auto grid max-w-[var(--lp-max-width)] items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                    <LandingSectionBadge>{badge}</LandingSectionBadge>
                    <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-[var(--lp-fg)] sm:text-4xl">
                        {title}
                    </h2>
                    <p className="mt-4 text-pretty text-[var(--lp-fg-muted)] sm:text-lg">{subtitle}</p>
                    <ul className="mt-8 space-y-4">
                        {bullets.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-[var(--lp-fg)]">
                                <span
                                    className={cn(
                                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                                        'bg-[var(--lp-accent)] text-[var(--lp-accent-fg)]',
                                    )}
                                    aria-hidden
                                >
                                    <Check className="size-3.5 stroke-[3]" />
                                </span>
                                <span className="text-sm sm:text-base">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div
                    aria-hidden
                    className={cn(
                        'overflow-hidden rounded-[var(--lp-radius-lg)] border border-[var(--lp-border)]',
                        'bg-[var(--lp-surface-mock-main)] shadow-[var(--lp-shadow-hero)]',
                    )}
                >
                    <div className="flex items-center gap-2 border-b border-[var(--lp-border)] px-4 py-3">
                        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                        <span className="size-2.5 rounded-full bg-[#febc2e]" />
                        <span className="size-2.5 rounded-full bg-[#28c840]" />
                        <span className="ms-2 text-xs text-[var(--lp-fg-muted)]">claim.json</span>
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[var(--lp-fg-muted)] sm:text-sm">
                        <code>{SAMPLE_CLAIM}</code>
                    </pre>
                </div>
            </div>
        </section>
    )
}
