import { NextRequest, NextResponse } from 'next/server';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const COOKIE_NAME = 'ts_campaign';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type CampaignResolveResult = {
    slug: string;
    title: string;
    targetPath: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
};

async function fetchCampaign(slug: string): Promise<CampaignResolveResult | null> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const input = encodeURIComponent(JSON.stringify({ slug }));
    const res = await fetch(`${apiUrl}/trpc/campaign.resolve?input=${input}`, {
        cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: { data?: CampaignResolveResult } };
    return body.result?.data ?? null;
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
    const { slug } = await context.params;
    if (!SLUG_PATTERN.test(slug)) {
        return NextResponse.redirect(new URL('/ar', req.url));
    }

    const campaign = await fetchCampaign(slug);
    if (!campaign) {
        return NextResponse.redirect(new URL('/ar/sign-up', req.url));
    }

    const target = new URL(campaign.targetPath, req.url);
    const response = NextResponse.redirect(target);
    const attribution = JSON.stringify({
        campaignSlug: campaign.slug,
        utmSource: campaign.utmSource ?? undefined,
        utmMedium: campaign.utmMedium ?? undefined,
        utmCampaign: campaign.utmCampaign ?? undefined,
        landingPath: campaign.targetPath,
    });
    response.cookies.set(COOKIE_NAME, attribution, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
    });
    return response;
}
