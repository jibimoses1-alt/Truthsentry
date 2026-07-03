import { Link } from '@/i18n/navigation'
import type { ReactElement } from 'react'

export type AuthTopBackLinkProps = {
    href: string
    /** Visible label after the arrow (default "Back"). */
    label?: string
}

function ArrowLeftIcon(): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0"
            aria-hidden
        >
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    )
}

/**
 * Compact back control for the auth shell top bar (pairs with theme toggle).
 */
export function AuthTopBackLink({ href, label = 'Back' }: AuthTopBackLinkProps): ReactElement {
    return (
        <Link
            href={href}
            className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--lp-fg-muted)] no-underline transition-colors hover:bg-[var(--lp-border)]/50 hover:text-[var(--lp-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-ring)] sm:px-2.5"
        >
            <ArrowLeftIcon />
            <span>{label}</span>
        </Link>
    )
}
