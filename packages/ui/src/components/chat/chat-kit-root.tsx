import type * as React from 'react'

import { cn } from '../../lib/utils'

export type ChatKitRootProps = {
    children: React.ReactNode
    className?: string
}

/**
 * Opt-in root for ChatGPT-style kit tokens (`chat-gpt-kit.css`).
 * Sets `data-ui-kit="chatgpt"`. Use `html` theme from next-themes for `dark:`; palette stays on `--chat-*` tokens.
 */
export function ChatKitRoot({ children, className }: ChatKitRootProps): React.ReactElement {
    return (
        <div data-ui-kit="chatgpt" className={cn('min-h-dvh w-full bg-[var(--chat-canvas)]', className)}>
            {children}
        </div>
    )
}
