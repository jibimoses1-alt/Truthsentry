import { TRPCError } from '@trpc/server';
import type { TrpcContext } from './types';

export async function requireVerifiedEmail(ctx: TrpcContext): Promise<void> {
    const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.sessionUser?.id },
        select: { emailVerifiedAt: true },
    });
    if (!user?.emailVerifiedAt) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'AUTH_EMAIL_NOT_VERIFIED' });
    }
}
