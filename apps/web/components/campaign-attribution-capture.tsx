'use client';

import { useEffect, type ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureAttributionFromSearchParams } from '@/lib/campaign-attribution';

/** Persists UTM and campaign params from the landing URL (feat-0019). */
export function CampaignAttributionCapture(): ReactElement | null {
    const searchParams = useSearchParams();
    const pathname = usePathname();

    useEffect(() => {
        captureAttributionFromSearchParams(searchParams, pathname);
    }, [pathname, searchParams]);

    return null;
}
