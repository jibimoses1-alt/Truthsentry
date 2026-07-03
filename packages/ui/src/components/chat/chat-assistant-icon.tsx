import type * as React from 'react'

import { cn } from '../../lib/utils'

export type ChatAssistantIconProps = {
    src: string
    alt: string
    className?: string
}

export function ChatAssistantIcon({
    src,
    alt,
    className,
}: ChatAssistantIconProps): React.ReactElement {
    return (
        <img
            src={src}
            alt={alt}
            width={28}
            height={28}
            className={cn('size-7 shrink-0 rounded-full object-cover', className)}
            decoding="async"
        />
    )
}
