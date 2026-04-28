import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../core';

export const healthRouter = createTRPCRouter({
    ping: publicProcedure
        .output(z.object({ ok: z.literal(true) }))
        .query(() => ({ ok: true })),
});
