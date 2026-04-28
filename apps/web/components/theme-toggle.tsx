'use client';

import { Button } from '@afalambe/ui/components/button';
import { cn } from '@afalambe/ui/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLayoutEffect, useState, type ReactElement } from 'react';

export type ThemeToggleProps = {
    className?: string;
};

/**
 * Toggles between light and dark. Use after mount to avoid hydration mismatch.
 */
export function ThemeToggle({ className }: ThemeToggleProps): ReactElement {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useLayoutEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('pointer-events-none opacity-64', className)}
                aria-hidden
                tabIndex={-1}
            >
                <Moon className="size-4" />
            </Button>
        );
    }

    const isDark = resolvedTheme === 'dark';

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={className}
            aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
    );
}
