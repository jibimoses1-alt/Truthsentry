import type { Prisma } from '@prisma/client';

/** Claims that may need human attention (feat-0018). */
export const humanReviewQueueWhere: Prisma.ClaimWhereInput = {
    OR: [
        { status: 'FAILED' },
        { status: 'OPEN' },
        {
            AND: [{ status: 'PROCESSING' }, { factCheckStatus: 'PENDING' }],
        },
    ],
};
