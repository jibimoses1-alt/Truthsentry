import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../core';

export const sessionRouter = createTRPCRouter({
    me: protectedProcedure
        .output(
            z.object({
                id: z.string(),
                email: z.email(),
                role: z.enum(['USER', 'ADMIN']),
                emailVerifiedAt: z.date().nullable(),
            }),
        )
        .query(async ({ ctx }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: ctx.sessionUser.id },
                select: { id: true, email: true, role: true, emailVerifiedAt: true },
            });
            if (!user) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session user missing.' });
            }
            return user;
        }),
});
