import { createTRPCRouter } from './core';
import { adminRouter } from './routers/admin';
import { authRouter } from './routers/auth';
import { campaignRouter } from './routers/campaign';
import { claimRouter } from './routers/claim';
import { healthRouter } from './routers/health';
import { sessionRouter } from './routers/session';

export const appRouter = createTRPCRouter({
    health: healthRouter,
    auth: authRouter,
    session: sessionRouter,
    claim: claimRouter,
    admin: adminRouter,
    campaign: campaignRouter,
});

export type AppRouter = typeof appRouter;
export type { ClaimContext, ExtractedMetadata, SessionUser, ThreadMessage, TrpcContext } from './types';
export { createTRPCRouter, publicProcedure } from './core';
