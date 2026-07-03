'use client'

import { CircleHelp } from 'lucide-react'
import type { ReactElement } from 'react'

import {
    Accordion,
    AccordionItem,
    AccordionPanel,
    AccordionTrigger,
} from '../ui/accordion'
import { cn } from '../../lib/utils'
import { LandingSectionBadge } from './landing-section-badge'

export type LandingFaqSplitItem = {
    question: string
    answer: string
}

export type LandingFaqSplitProps = {
    id?: string
    badge?: string
    introTitle: string
    introDescription: string
    items: LandingFaqSplitItem[]
    /** Index of the panel open on first render; omit or pass -1 for all collapsed. */
    defaultOpenIndex?: number
    className?: string
}

function faqItemValue(index: number): string {
    return `faq-${index}`
}

export function LandingFaqSplit({
    id = 'faq',
    badge = 'FAQs',
    introTitle,
    introDescription,
    items,
    defaultOpenIndex = 0,
    className,
}: LandingFaqSplitProps): ReactElement {
    const defaultValue =
        defaultOpenIndex >= 0 && defaultOpenIndex < items.length
            ? [faqItemValue(defaultOpenIndex)]
            : []

    return (
        <section
            id={id}
            className={cn(
                'scroll-mt-20 border-t border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-16 sm:px-6 sm:py-24',
                className,
            )}
        >
            <div className="mx-auto grid max-w-[var(--lp-max-width)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12">
                <div
                    className={cn(
                        'flex flex-col justify-between rounded-[var(--lp-radius-xl)] border border-[var(--lp-border)]',
                        'bg-[var(--lp-surface-card)] p-8 lg:min-h-[28rem]',
                    )}
                >
                    <CircleHelp className="size-12 text-[var(--lp-fg)]" strokeWidth={1.25} aria-hidden />
                    <div className="mt-auto pt-12">
                        <LandingSectionBadge>{badge}</LandingSectionBadge>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--lp-fg)] sm:text-4xl">
                            {introTitle}
                        </h2>
                        <p className="mt-4 text-[var(--lp-fg-muted)]">{introDescription}</p>
                    </div>
                </div>
                <Accordion defaultValue={defaultValue} className="flex flex-col gap-3">
                    {items.map((item, i) => (
                        <AccordionItem
                            key={item.question}
                            value={faqItemValue(i)}
                            className="overflow-hidden rounded-[var(--lp-radius-md)] border border-[var(--lp-border)] bg-[var(--lp-surface-card)] last:border-b"
                        >
                            <AccordionTrigger
                                className={cn(
                                    'px-4 py-4 text-base font-medium text-[var(--lp-fg)]',
                                    'hover:no-underline focus-visible:ring-[var(--lp-ring)]',
                                    'data-panel-open:text-[var(--lp-fg)]',
                                )}
                            >
                                <span className="flex items-start gap-3 pe-2">
                                    <span className="text-sm font-medium text-[var(--lp-fg-subtle)]">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <span>{item.question}</span>
                                </span>
                            </AccordionTrigger>
                            <AccordionPanel className="px-4 text-[var(--lp-fg-muted)]">
                                <p className="border-t border-[var(--lp-border)] pt-3 pb-4 ps-9 text-sm leading-relaxed">
                                    {item.answer}
                                </p>
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    )
}
