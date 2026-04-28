import { z } from 'zod';
import { adminProcedure, createTRPCRouter } from '../core';

export const adminRouter = createTRPCRouter({
    queueCount: adminProcedure.output(z.object({ total: z.number() })).query(async ({ ctx }) => {
        const total = await ctx.prisma.claim.count();
        return { total };
    }),
});
