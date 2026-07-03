import path from 'node:path';
import { fileURLToPath } from 'node:url';

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
    transpilePackages: ['@truthsentry/ui'],
    // Hide the route dev indicator; reduces noise from dev-only UI that can interact badly with some RSC trees.
    devIndicators: false,
    webpack(config) {
        const alias = config.resolve.alias as
            | Record<string, unknown>
            | undefined;
        config.resolve.alias = {
            ...alias,
            // apps/web only — `@truthsentry/ui` must use relative imports so transpile resolves without a second `@` root.
            '@': path.resolve(__dirname),
        };
        return config;
    },
};

export default withNextIntl(nextConfig);
