import {
    ArrowUpRight,
    Bell,
    FileSearch,
    Flag,
    HelpCircle,
    ImageIcon,
    LayoutGrid,
    LogOut,
    MessageCircle,
    Plus,
    Search,
    Settings,
} from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/utils'

export type LandingHeroSkill = {
    id: string
    title: string
    icon?: React.ReactNode
}

const DEFAULT_SKILLS: LandingHeroSkill[] = [
    { id: 'verify', title: 'Claim verification', icon: <FileSearch className="size-5" /> },
    { id: 'sources', title: 'Source search', icon: <Search className="size-5" /> },
    { id: 'image', title: 'Image evidence', icon: <ImageIcon className="size-5" /> },
    { id: 'report', title: 'Review queue', icon: <LayoutGrid className="size-5" /> },
]

const MENU_ITEMS = [
    { label: 'Chat Bot', icon: MessageCircle, active: true },
    { label: 'Help Center', icon: HelpCircle, active: false },
    { label: 'Report', icon: Flag, active: false },
    { label: 'Settings', icon: Settings, active: false },
    { label: 'Logout', icon: LogOut, active: false },
] as const

const TRENDING = ['TruthSentry', 'Verification', 'WhatsApp', 'Fact-check'] as const

const CHAT_HISTORY = {
    today: [
        'Is this vaccine message accurate?',
        'Verify a headline from social media',
        'Can you check this screenshot?',
        'What sources support this claim?',
    ],
    older: [
        'How do I submit image evidence?',
        'Queue my dossier for human review',
        'What is TruthSentry?',
    ],
} as const

const SKILL_ICON_BY_ID: Record<string, LandingHeroSkill> = Object.fromEntries(
    DEFAULT_SKILLS.map((skill) => [skill.id, skill]),
) as Record<string, LandingHeroSkill>

function SkillCard({ skill }: { skill: LandingHeroSkill }): React.ReactElement {
    const icon = skill.icon ?? SKILL_ICON_BY_ID[skill.id]?.icon ?? DEFAULT_SKILLS[0]?.icon

    return (
        <div
            className={cn(
                'flex min-h-[7.5rem] flex-col rounded-[var(--lp-radius-md)] border border-[var(--lp-border)]',
                'bg-[var(--lp-surface-inset)] p-3',
            )}
        >
            <div
                className={cn(
                    'mb-3 flex size-9 items-center justify-center rounded-lg',
                    'bg-[var(--lp-accent)]/15 text-[var(--lp-accent)]',
                )}
            >
                {icon}
            </div>
            <div className="mb-3 flex-1 space-y-1.5">
                <div className="h-1 w-full rounded-full bg-[var(--lp-border)]" />
                <div className="h-1 w-[85%] rounded-full bg-[var(--lp-border)]" />
                <div className="h-1 w-[65%] rounded-full bg-[var(--lp-border)]" />
            </div>
            <p className="text-[11px] font-medium leading-tight text-[var(--lp-fg)] sm:text-xs">
                {skill.title}
            </p>
        </div>
    )
}

export type LandingHeroDashboardPreviewProps = {
    className?: string
    skills?: LandingHeroSkill[]
    productName?: string
    assistantMessage?: string
    userMessage?: string
}

/**
 * Full-width decorative app shell for the marketing hero (non-interactive).
 */
export function LandingHeroDashboardPreview({
    className,
    skills = DEFAULT_SKILLS,
    productName = 'TruthSentry',
    assistantMessage = `When a claim matches curated sources, you get a clear verdict. If confidence is low, your dossier is queued for human review with full context preserved. Ready to submit your first claim?`,
    userMessage = 'Can you verify this WhatsApp forward about local health guidance?',
}: LandingHeroDashboardPreviewProps): React.ReactElement {
    return (
        <div
            aria-hidden
            className={cn(
                'mx-auto w-full max-w-6xl overflow-hidden rounded-[var(--lp-radius-xl)]',
                'border border-[var(--lp-border)] bg-[var(--lp-surface-mock)] shadow-[var(--lp-shadow-hero)]',
                className,
            )}
        >
            <div className="flex min-h-[22rem] sm:min-h-[26rem]">
                {/* Left sidebar */}
                <aside className="hidden w-[11.5rem] shrink-0 flex-col border-e border-[var(--lp-border)] bg-[var(--lp-surface-mock)] md:flex">
                    <div className="border-b border-[var(--lp-border)] px-4 py-3">
                        <span className="text-sm font-semibold text-[var(--lp-fg)]">{productName}</span>
                    </div>
                    <nav className="flex flex-1 flex-col gap-0.5 p-2">
                        {MENU_ITEMS.map((item) => {
                            const Icon = item.icon
                            return (
                                <div
                                    key={item.label}
                                    className={cn(
                                        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                                        item.active
                                            ? 'bg-[var(--lp-accent)] text-[var(--lp-accent-fg)]'
                                            : 'text-[var(--lp-fg-muted)]',
                                    )}
                                >
                                    <Icon className="size-3.5 shrink-0" />
                                    {item.label}
                                </div>
                            )
                        })}
                    </nav>
                    <div className="border-t border-[var(--lp-border)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--lp-fg-subtle)]">
                            Trending
                        </p>
                        <ul className="mt-2 space-y-1.5">
                            {TRENDING.map((tag) => (
                                <li
                                    key={tag}
                                    className="flex items-center justify-between text-[11px] text-[var(--lp-fg-muted)]"
                                >
                                    {tag}
                                    <ArrowUpRight className="size-3 opacity-50" />
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="m-2 rounded-[var(--lp-radius-md)] border border-[var(--lp-border)] bg-[var(--lp-surface-card)] p-3">
                        <p className="text-xs font-semibold text-[var(--lp-fg)]">Maria Hill</p>
                        <span className="mt-1 inline-block rounded bg-[var(--lp-border)] px-1.5 py-0.5 text-[10px] text-[var(--lp-fg-muted)]">
                            Free
                        </span>
                        <div className="mt-2 w-full rounded-full bg-[var(--lp-accent)] py-1.5 text-center text-[10px] font-medium text-[var(--lp-accent-fg)]">
                            Upgrade to Plus
                        </div>
                    </div>
                </aside>

                {/* Main chat workspace */}
                <main className="flex min-w-0 flex-1 flex-col bg-[var(--lp-surface-mock-main)]">
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--lp-border)] px-3 py-2.5 sm:px-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] sm:text-xs">
                            <span className="font-medium text-[var(--lp-fg-muted)]">
                                Plugins · <span className="text-[var(--lp-fg)]">GPT-4</span>
                            </span>
                            <span className="hidden rounded-full bg-[var(--lp-accent)]/15 px-2 py-0.5 font-medium text-[var(--lp-accent)] sm:inline">
                                Enabled: Fact-check
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Bell className="size-4 text-[var(--lp-fg-muted)]" />
                            <span className="size-7 rounded-full bg-[var(--lp-border)]" />
                            <span className="size-7 rounded-full bg-[var(--lp-accent)]/30 ring-2 ring-[var(--lp-accent)]/50" />
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {skills.map((skill) => (
                                <SkillCard key={skill.id} skill={skill} />
                            ))}
                        </div>

                        <div className="mt-4 flex flex-1 flex-col justify-end gap-3 overflow-hidden">
                            <div className="max-w-[92%] rounded-2xl rounded-es-sm border border-[var(--lp-border)] bg-[var(--lp-surface-inset)] px-3 py-2.5 sm:max-w-[85%] sm:px-4 sm:py-3">
                                <p className="text-[11px] leading-relaxed text-[var(--lp-fg-muted)] sm:text-xs">
                                    {assistantMessage}
                                </p>
                            </div>
                            <div className="ms-auto flex max-w-[78%] items-end gap-2">
                                <p className="rounded-2xl rounded-ee-sm bg-[var(--lp-accent)]/20 px-3 py-2 text-[11px] text-[var(--lp-fg)] sm:text-xs">
                                    {userMessage}
                                </p>
                                <span className="size-8 shrink-0 rounded-full bg-[var(--lp-border)]" />
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-[var(--lp-border)] pt-3">
                            <div className="min-w-0 flex-1 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface-inset)] px-4 py-2.5 text-[11px] text-[var(--lp-fg-subtle)] sm:text-xs">
                                Hi, how can I help you? Enter a claim to verify...
                            </div>
                            <span className="shrink-0 rounded-full bg-[var(--lp-surface-mock-send)] px-4 py-2.5 text-[11px] font-medium text-[var(--lp-fg)]">
                                Send
                            </span>
                            <span className="shrink-0 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface-inset)] px-3 py-2.5 text-[11px] text-[var(--lp-fg-muted)]">
                                Clear
                            </span>
                        </div>
                    </div>
                </main>

                {/* Right sidebar — chat history */}
                <aside className="hidden w-[11rem] shrink-0 flex-col border-s border-[var(--lp-border)] bg-[var(--lp-surface-mock)] lg:flex xl:w-[12.5rem]">
                    <div className="flex items-center justify-between border-b border-[var(--lp-border)] px-3 py-3">
                        <span className="text-sm font-semibold text-[var(--lp-fg)]">Chats</span>
                        <Plus className="size-4 text-[var(--lp-fg-muted)]" />
                    </div>
                    <div className="flex-1 overflow-hidden p-2">
                        <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--lp-fg-subtle)]">
                            Chat history
                        </p>
                        <div className="mt-3 space-y-4">
                            <div>
                                <p className="px-1 text-[10px] text-[var(--lp-fg-subtle)]">Today</p>
                                <ul className="mt-1 space-y-0.5">
                                    {CHAT_HISTORY.today.map((line) => (
                                        <li
                                            key={line}
                                            className="truncate rounded-md px-2 py-1.5 text-[11px] text-[var(--lp-fg-muted)]"
                                        >
                                            {line}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="px-1 text-[10px] text-[var(--lp-fg-subtle)]">Earlier</p>
                                <ul className="mt-1 space-y-0.5">
                                    {CHAT_HISTORY.older.map((line) => (
                                        <li
                                            key={line}
                                            className="truncate rounded-md px-2 py-1.5 text-[11px] text-[var(--lp-fg-muted)]"
                                        >
                                            {line}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 border-t border-[var(--lp-border)] p-2">
                        <span className="flex-1 rounded-full bg-[var(--lp-accent)] py-2 text-center text-[10px] font-medium text-[var(--lp-accent-fg)]">
                            New chat
                        </span>
                        <span className="rounded-full border border-[var(--lp-border)] px-2 py-2 text-[10px] text-[var(--lp-fg-muted)]">
                            Delete all
                        </span>
                    </div>
                </aside>
            </div>
            <p className="sr-only">{productName} product preview</p>
        </div>
    )
}
