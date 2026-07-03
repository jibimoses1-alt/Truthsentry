import type { MetadataRoute } from 'next'

import { siteDefaultDescription, siteIconPath, siteName, siteThemeColor } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: siteName,
        short_name: siteName,
        description: siteDefaultDescription,
        start_url: '/ar',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: siteThemeColor,
        icons: [
            {
                src: siteIconPath,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: siteIconPath,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
