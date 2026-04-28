import { createTRPCRouter } from './core';
import { adminRouter } from './routers/admin';
import { authRouter } from './routers/auth';
import { claimRouter } from './routers/claim';
import { healthRouter } from './routers/health';
import { sessionRouter } from './routers/session';

export const appRouter = createTRPCRouter({
    health: healthRouter,
    auth: authRouter,
    session: sessionRouter,
    claim: claimRouter,
    admin: adminRouter,
});

export type AppRouter = typeof appRouter;
export type { SessionUser, TrpcContext } from './types';
export { createTRPCRouter, publicProcedure } from './core';
