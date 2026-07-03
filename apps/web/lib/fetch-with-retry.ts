export const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
} as const;

export function calculateDelay(attempt: number): number {
    const exponentialDelay = RETRY_CONFIG.baseDelay * RETRY_CONFIG.backoffMultiplier ** attempt;
    const capped = Math.min(exponentialDelay, RETRY_CONFIG.maxDelay);

    if (!RETRY_CONFIG.jitter) return capped;

    const jitterFactor = 0.8 + Math.random() * 0.4;
    return Math.round(capped * jitterFactor);
}

export async function fetchWithRetry(
    url: URL | RequestInfo,
    options?: RequestInit,
): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (
                attempt < RETRY_CONFIG.maxRetries &&
                (RETRY_CONFIG.retryableStatusCodes as readonly number[]).includes(response.status)
            ) {
                lastError = response;
                await new Promise((resolve) => setTimeout(resolve, calculateDelay(attempt)));
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;

            if (attempt < RETRY_CONFIG.maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, calculateDelay(attempt)));
                continue;
            }
        }
    }

    if (lastError instanceof Response) return lastError;
    throw lastError;
}
