import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../core';

const slugSchema = z.string().regex(/^[a-z0-9-]+$/).max(64);

export const campaignRouter = createTRPCRouter({
    resolve: publicProcedure
        .input(z.object({ slug: slugSchema }))
        .output(
            z.object({
                slug: z.string(),
                title: z.string(),
                targetPath: z.string(),
                utmSource: z.string().nullable(),
                utmMedium: z.string().nullable(),
                utmCampaign: z.string().nullable(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const campaign = await ctx.prisma.campaign.findUnique({
                where: { slug: input.slug },
            });
            if (!campaign) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'CAMPAIGN_NOT_FOUND' });
            }
            return {
                slug: campaign.slug,
                title: campaign.title,
                targetPath: campaign.targetPath,
                utmSource: campaign.utmSource,
                utmMedium: campaign.utmMedium,
                utmCampaign: campaign.utmCampaign,
            };
        }),
});
