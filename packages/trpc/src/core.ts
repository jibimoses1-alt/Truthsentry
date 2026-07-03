import { TRPCError, initTRPC } from '@trpc/server';
import type { TrpcContext } from './types';

const t = initTRPC.context<TrpcContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.sessionUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'AUTH_SIGN_IN_REQUIRED' });
    }
    return next({ ctx: { ...ctx, sessionUser: ctx.sessionUser } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
    if (ctx.sessionUser.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'AUTH_ADMIN_REQUIRED' });
    }
    return next();
});
