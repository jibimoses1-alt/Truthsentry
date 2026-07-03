'use client'

import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useCallback, useState, type ReactElement } from 'react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { LandingSectionBadge } from './landing-section-badge'

export type LandingTestimonial = {
    id: string
    quote: string
    name: string
    role: string
}

const DEFAULT_TESTIMONIALS: LandingTestimonial[] = [
    {
        id: '1',
        quote:
            'TruthSentry helped our team triage viral claims in hours instead of days. The human queue keeps sensitive dossiers accountable.',
        name: 'Amira Hassan',
        role: 'Program lead, civic media network',
    },
    {
        id: '2',
        quote:
            'Clear verdict labels and source citations made it easier to explain decisions to partners who do not work with AI every day.',
        name: 'James Okonkwo',
        role: 'Editor, regional news desk',
    },
    {
        id: '3',
        quote:
            'We finally have one place for WhatsApp forwards, screenshots, and follow-up questions without losing context.',
        name: 'Fatou Diallo',
        role: 'Verification coordinator',
    },
]

function StarRow(): ReactElement {
    return (
        <div className="mt-4 flex gap-0.5 text-amber-400" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4 fill-current" />
            ))}
        </div>
    )
}

export type LandingTestimonialsProps = {
    badge?: string
    title: string
    items?: LandingTestimonial[]
    className?: string
}

export function LandingTestimonials({
    badge = 'Customer reviews',
    title,
    items = DEFAULT_TESTIMONIALS,
    className,
}: LandingTestimonialsProps): ReactElement {
    const [index, setIndex] = useState(0)
    const count = items.length

    const goPrev = useCallback(() => {
        setIndex((i) => (i - 1 + count) % count)
    }, [count])

    const goNext = useCallback(() => {
        setIndex((i) => (i + 1) % count)
    }, [count])

    const visible = [
        items[index]!,
        items[(index + 1) % count]!,
        items[(index + 2) % count]!,
    ]

    return (
        <section
            className={cn(
                'border-b border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-16 sm:px-6 sm:py-24',
                className,
            )}
        >
            <div className="mx-auto max-w-[var(--lp-max-width)] text-center">
                <LandingSectionBadge>{badge}</LandingSectionBadge>
                <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-[var(--lp-fg)] sm:text-4xl">
                    {title}
                </h2>
                <div className="mt-12 grid gap-4 md:grid-cols-3">
                    {visible.map((item) => (
                        <article
                            key={item.id}
                            className={cn(
                                'rounded-[var(--lp-radius-lg)] border border-[var(--lp-border)]',
                                'bg-[var(--lp-surface-card)] p-6 text-start shadow-[var(--lp-shadow-sm)]',
                            )}
                        >
                            <Quote className="size-8 text-[var(--lp-accent)]" aria-hidden />
                            <p className="mt-4 text-sm leading-relaxed text-[var(--lp-fg-muted)]">
                                {item.quote}
                            </p>
                            <StarRow />
                            <p className="mt-3 font-semibold text-[var(--lp-fg)]">{item.name}</p>
                            <p className="text-sm text-[var(--lp-fg-subtle)]">{item.role}</p>
                        </article>
                    ))}
                </div>
                <div className="mt-8 flex justify-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={goPrev}
                        aria-label="Previous reviews"
                        className="rounded-full border-[var(--lp-border)] bg-[var(--lp-surface-inset)]"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={goNext}
                        aria-label="Next reviews"
                        className="rounded-full border-[var(--lp-border)] bg-[var(--lp-surface-inset)]"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </section>
    )
}
