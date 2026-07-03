import type * as React from 'react'

import { cn } from '../../lib/utils'

import { ChatMessageActions } from './chat-message-actions'
import { ChatAssistantIcon } from './chat-assistant-icon'
import { ChatMessageBubble, type ChatMessageBubbleProps } from './chat-message-bubble'

export type ChatMessageRowProps = {
    role: ChatMessageBubbleProps['role']
    children: React.ReactNode
    showAssistantActions?: boolean
    assistantIconSrc?: string
    assistantIconAlt?: string
    className?: string
}

export function ChatMessageRow({
    role,
    children,
    showAssistantActions = false,
    assistantIconSrc,
    assistantIconAlt = '',
    className,
}: ChatMessageRowProps): React.ReactElement {
    const isAssistant = role === 'assistant'

    return (
        <div
            className={cn(
                'group flex w-full max-w-3xl gap-3 py-4',
                role === 'user' ? 'ml-auto flex-row-reverse' : 'flex-row',
                className,
            )}
        >
            {isAssistant && assistantIconSrc ? (
                <ChatAssistantIcon
                    src={assistantIconSrc}
                    alt={assistantIconAlt}
                    className="mt-0.5"
                />
            ) : null}
            <div
                className={cn(
                    'flex min-w-0 flex-1 flex-col gap-1',
                    role === 'user' ? 'items-end' : 'items-start',
                )}
            >
                <ChatMessageBubble role={role}>{children}</ChatMessageBubble>
                {isAssistant && showAssistantActions ? <ChatMessageActions /> : null}
            </div>
        </div>
    )
}
