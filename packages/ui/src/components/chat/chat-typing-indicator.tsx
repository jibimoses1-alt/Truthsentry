import type * as React from 'react'

import { cn } from '../../lib/utils'

import { ChatAssistantIcon } from './chat-assistant-icon'

export type ChatTypingIndicatorProps = {
    className?: string
    assistantIconSrc?: string
    assistantIconAlt?: string
    ariaLabel?: string
}

export function ChatTypingIndicator({
    className,
    assistantIconSrc,
    assistantIconAlt = '',
    ariaLabel = 'Assistant is typing',
}: ChatTypingIndicatorProps): React.ReactElement {
    return (
        <div
            className={cn('flex items-center gap-3 px-1 py-2', className)}
            role="status"
            aria-label={ariaLabel}
        >
            {assistantIconSrc ? (
                <ChatAssistantIcon src={assistantIconSrc} alt={assistantIconAlt} />
            ) : null}
            <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="size-2 animate-pulse rounded-full bg-[var(--chat-text-tertiary)]"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
    )
}
