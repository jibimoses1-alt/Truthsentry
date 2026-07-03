import { ArrowUpRight, Bot, Layers, MessageSquare, Puzzle } from 'lucide-react'
import type * as React from 'react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { LandingSectionBadge } from './landing-section-badge'

export type LandingSkillBlock = {
    id: string
    title: string
    description: string
    icon?: React.ReactNode
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
    prompts: <Bot className="size-6" />,
    outputs: <Puzzle className="size-6" />,
    response: <MessageSquare className="size-6" />,
    evidence: <Layers className="size-6" />,
}

const DEFAULT_BLOCKS: LandingSkillBlock[] = [
    {
        id: 'prompts',
        title: 'Guided claim prompts',
        description:
            'Structured prompts help users describe rumors, forwards, and headlines so reviewers get complete context.',
        icon: <Bot className="size-6" />,
    },
    {
        id: 'outputs',
        title: 'Clear verdict outputs',
        description:
            'Every reply states verified, debunked, misleading, or partial, with reasoning tied to selected sources.',
        icon: <Puzzle className="size-6" />,
    },
    {
        id: 'response',
        title: 'Instant triage signals',
        description:
            'See confidence in real time and know immediately when a dossier is queued for human review.',
        icon: <MessageSquare className="size-6" />,
    },
    {
        id: 'evidence',
        title: 'Rich evidence intake',
        description:
            'Attach links, screenshots, and text in one thread so fact-checkers never lose the original claim.',
        icon: <Layers className="size-6" />,
    },
]

export type LandingSkillsSuiteProps = {
    id?: string
    badge?: string
    title: string
    subtitle: string
    blocks?: LandingSkillBlock[]
    ctaHref: string
    ctaLabel: string
    className?: string
}

export function LandingSkillsSuite({
    id,
    badge = 'Capabilities',
    title,
    subtitle,
    blocks = DEFAULT_BLOCKS,
    ctaHref,
    ctaLabel,
    className,
}: LandingSkillsSuiteProps): React.ReactElement {
    const resolvedBlocks = blocks.map((block) => ({
        ...block,
        icon: block.icon ?? SKILL_ICONS[block.id] ?? <Bot className="size-6" />,
    }));

    return (
        <section
            id={id}
            className={cn(
                'scroll-mt-20 border-b border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-16 sm:px-6 sm:py-24',
                className,
            )}
        >
            <div className="mx-auto max-w-[var(--lp-max-width)] text-center">
                <LandingSectionBadge>{badge}</LandingSectionBadge>
                <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-[var(--lp-fg)] sm:text-4xl">
                    {title}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-pretty text-[var(--lp-fg-muted)] sm:text-lg">
                    {subtitle}
                </p>
                <div className="mt-14 grid gap-8 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-10 lg:gap-x-16">
                    {resolvedBlocks.map((block) => (
                        <div key={block.id} className="flex gap-4 text-start sm:gap-5">
                            <div
                                className={cn(
                                    'flex size-14 shrink-0 items-center justify-center rounded-2xl',
                                    'bg-[var(--lp-surface-inset)] text-[var(--lp-accent)] ring-1 ring-[var(--lp-border)]',
                                )}
                                aria-hidden
                            >
                                {block.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--lp-fg)]">{block.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-fg-muted)]">
                                    {block.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <Button
                    size="xl"
                    render={<a href={ctaHref} />}
                    className="landing-hero-primary-btn mt-12 rounded-full px-6"
                >
                    <span>{ctaLabel}</span>
                    <ArrowUpRight className="size-5 opacity-90" />
                </Button>
            </div>
        </section>
    )
}
