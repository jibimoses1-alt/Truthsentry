import type { ReactNode } from 'react';

import '@truthsentry/ui/styles.css';
import './globals.css';

/** Root layout: locale-specific shell lives in `app/[locale]/layout.tsx`. */
export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
    return children;
}
