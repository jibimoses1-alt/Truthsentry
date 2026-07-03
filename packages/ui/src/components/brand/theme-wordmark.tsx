import type * as React from 'react'

import { cn } from '../../lib/utils'

export type ThemeWordmarkProps = {
    lightSrc: string
    darkSrc: string
    alt: string
    width?: number
    height?: number
    className?: string
    imgClassName?: string
    priority?: boolean
}

const defaultImgClass =
    'h-full w-auto max-w-full object-contain object-left'

/**
 * Swaps wordmark by theme: `lightSrc` on light backgrounds, `darkSrc` on dark (`html.dark`).
 */
export function ThemeWordmark({
    lightSrc,
    darkSrc,
    alt,
    width = 160,
    height = 36,
    className,
    imgClassName,
}: ThemeWordmarkProps): React.ReactElement {
    const imgClass = cn(defaultImgClass, imgClassName)

    return (
        <span className={cn('inline-flex max-w-full items-center justify-center', className)}>
            <img
                src={lightSrc}
                alt={alt}
                width={width}
                height={height}
                className={cn(imgClass, 'dark:hidden')}
                decoding="async"
            />
            <img
                src={darkSrc}
                alt={alt}
                width={width}
                height={height}
                className={cn(imgClass, 'hidden dark:block')}
                decoding="async"
            />
        </span>
    )
}
