import type * as React from 'react'

import { cn } from '../../lib/utils'

export type LandingKitRootProps = {
    children: React.ReactNode
    className?: string
}

/** Opt-in root for marketing landing tokens (`landing-kit.css`). Follows `html.dark` via next-themes. */
export function LandingKitRoot({ children, className }: LandingKitRootProps): React.ReactElement {
    return (
        <div data-ui-kit="landing" className={cn('min-h-dvh w-full', className)}>
            {children}
        </div>
    )
}
