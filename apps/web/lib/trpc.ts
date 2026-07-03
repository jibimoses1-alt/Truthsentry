'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@truthsentry/trpc';

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();
