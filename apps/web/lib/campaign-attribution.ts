export type CampaignAttribution = {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    campaignSlug?: string;
    landingPath?: string;
};

const STORAGE_KEY = 'truthsentry_campaign_attribution';
const COOKIE_NAME = 'ts_campaign';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hasValues(data: CampaignAttribution): boolean {
    return Boolean(
        data.utmSource ||
            data.utmMedium ||
            data.utmCampaign ||
            data.campaignSlug ||
            data.landingPath,
    );
}

export function mergeAttribution(
    current: CampaignAttribution | null,
    incoming: CampaignAttribution,
): CampaignAttribution {
    return {
        utmSource: incoming.utmSource ?? current?.utmSource,
        utmMedium: incoming.utmMedium ?? current?.utmMedium,
        utmCampaign: incoming.utmCampaign ?? current?.utmCampaign,
        campaignSlug: incoming.campaignSlug ?? current?.campaignSlug,
        landingPath: incoming.landingPath ?? current?.landingPath,
    };
}

export function readAttributionFromCookie(cookieHeader: string | null | undefined): CampaignAttribution | null {
    if (!cookieHeader) return null;
    const match = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    try {
        const parsed = JSON.parse(raw) as CampaignAttribution;
        return hasValues(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function readAttribution(): CampaignAttribution | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return readAttributionFromCookie(document.cookie);
        }
        const parsed = JSON.parse(raw) as CampaignAttribution;
        return hasValues(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function persistAttribution(data: CampaignAttribution): void {
    if (typeof window === 'undefined' || !hasValues(data)) return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // storage unavailable
    }
    const encoded = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function captureAttributionFromSearchParams(
    searchParams: URLSearchParams,
    pathname: string,
): CampaignAttribution | null {
    const incoming: CampaignAttribution = {
        utmSource: searchParams.get('utm_source') ?? undefined,
        utmMedium: searchParams.get('utm_medium') ?? undefined,
        utmCampaign: searchParams.get('utm_campaign') ?? undefined,
        campaignSlug: searchParams.get('campaign') ?? undefined,
        landingPath: pathname,
    };
    if (!hasValues(incoming)) return readAttribution();
    const merged = mergeAttribution(readAttribution(), incoming);
    persistAttribution(merged);
    return merged;
}

export function captureAttributionFromCampaign(args: {
    slug: string;
    targetPath: string;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
}): CampaignAttribution {
    const merged = mergeAttribution(readAttribution(), {
        campaignSlug: args.slug,
        landingPath: args.targetPath,
        utmSource: args.utmSource ?? undefined,
        utmMedium: args.utmMedium ?? undefined,
        utmCampaign: args.utmCampaign ?? undefined,
    });
    persistAttribution(merged);
    return merged;
}

export function attributionForRegister(): CampaignAttribution | undefined {
    const data = readAttribution();
    if (!data || !hasValues(data)) return undefined;
    return data;
}
