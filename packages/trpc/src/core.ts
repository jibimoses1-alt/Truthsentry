import { TRPCError, initTRPC } from '@trpc/server';
import type { TrpcContext } from './types';

const t = initTRPC.context<TrpcContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.sessionUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required.' });
    }
    return next({ ctx: { ...ctx, sessionUser: ctx.sessionUser } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
    if (ctx.sessionUser.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin role required.' });
    }
    return next();
});
