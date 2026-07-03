const ALLOWED_PREFIXES = ['/sign-in', '/sign-up', '/chat', '/admin', '/'] as const;

const DEFAULT_REDIRECT = '/chat';

export function resolveSafeRedirectPath(next: string | undefined | null): string {
    if (!next) return DEFAULT_REDIRECT;
    if (!next.startsWith('/') || next.startsWith('//')) return DEFAULT_REDIRECT;

    const [pathname] = next.split('?');
    if (!pathname) return DEFAULT_REDIRECT;

    const allowed = ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`)),
    );
    if (!allowed) return DEFAULT_REDIRECT;

    return next;
}
