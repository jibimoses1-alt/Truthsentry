import Image from 'next/image'
import type { ReactElement } from 'react'

import { cn } from '@truthsentry/ui/lib/utils'
import { siteLogoOnDarkPath, siteLogoPath, siteName } from '@/lib/site'

export type BrandLogoProps = {
    className?: string
    width?: number
    height?: number
    priority?: boolean
}

/** Horizontal TruthSentry wordmark (`truthsentry.png` / `truthsentry-white.png`). */
export function BrandLogo({
    className,
    width = 200,
    height = 44,
    priority = false,
}: BrandLogoProps): ReactElement {
    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center justify-center [&>img]:h-full [&>img]:w-auto [&>img]:max-w-full [&>img]:object-contain [&>img]:object-left',
                className,
            )}
        >
            <Image
                src={siteLogoPath}
                alt={siteName}
                width={width}
                height={height}
                className="dark:hidden"
                priority={priority}
            />
            <Image
                src={siteLogoOnDarkPath}
                alt={siteName}
                width={width}
                height={height}
                className="hidden dark:block"
                priority={priority}
            />
        </span>
    )
}
