import type * as React from 'react'

import { cn } from '../../lib/utils'

export type LandingSectionBadgeProps = {
    children: React.ReactNode
    className?: string
}

export function LandingSectionBadge({ children, className }: LandingSectionBadgeProps): React.ReactElement {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border border-[var(--lp-border)]',
                'bg-[var(--lp-bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--lp-accent)]',
                className,
            )}
        >
            {children}
        </span>
    )
}
