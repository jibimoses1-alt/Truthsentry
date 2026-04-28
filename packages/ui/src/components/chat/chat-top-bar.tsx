import type * as React from 'react'
import { Bot, ChevronDown, MoreHorizontal } from 'lucide-react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export type ChatTopBarProps = {
    title?: string
    subtitle?: string
    /** Optional wordmark or icon URL (served from app `public/`). */
    brandLogoSrc?: string
    /** Dark-mode wordmark; paired with `brandLogoSrc` for theme swap. */
    brandLogoDarkSrc?: string
    brandLogoAlt?: string
    className?: string
    trailing?: React.ReactNode
}

export function ChatTopBar({
    title,
    subtitle,
    brandLogoSrc,
    brandLogoDarkSrc,
    brandLogoAlt,
    className,
    trailing,
}: ChatTopBarProps): React.ReactElement {
    return (
        <header
            className={cn(
                'flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--chat-border-subtle)] px-3',
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 max-w-[min(100%,18rem)] gap-2 px-2 font-medium text-[var(--chat-text-primary)] hover:bg-[var(--chat-surface-hover)]"
                >
                    {brandLogoSrc ? (
                        brandLogoDarkSrc ? (
                            <>
                                <img
                                    src={brandLogoSrc}
                                    alt={brandLogoAlt ?? ''}
                                    width={112}
                                    height={28}
                                    className="h-7 w-auto max-w-[7rem] shrink-0 object-contain object-left dark:hidden sm:max-w-[9rem]"
                                    decoding="async"
                                />
                                <img
                                    src={brandLogoDarkSrc}
                                    alt={brandLogoAlt ?? ''}
                                    width={112}
                                    height={28}
                                    className="hidden h-7 w-auto max-w-[7rem] shrink-0 object-contain object-left dark:block sm:max-w-[9rem]"
                                    decoding="async"
                                />
                            </>
                        ) : (
                            <img
                                src={brandLogoSrc}
                                alt={brandLogoAlt ?? ''}
                                width={112}
                                height={28}
                                className="h-7 w-auto max-w-[7rem] shrink-0 object-contain object-left sm:max-w-[9rem]"
                                decoding="async"
                            />
                        )
                    ) : (
                        <Bot className="size-4 shrink-0 opacity-70" aria-hidden />
                    )}
                    <span className="truncate">{title}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                </Button>
                {subtitle ? (
                    <span className="hidden text-xs text-[var(--chat-text-tertiary)] sm:inline">{subtitle}</span>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
                {trailing}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-[var(--chat-control-icon)] hover:bg-[var(--chat-surface-hover)] hover:text-[var(--chat-control-icon-hover)]"
                    aria-label="Plus d'options"
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </div>
        </header>
    )
}
