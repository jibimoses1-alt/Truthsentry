const EXTENSION_TO_MIME: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
};

const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

export const UPLOAD_ERROR_CODES = {
    HEIC_UNSUPPORTED: 'CLAIM_UPLOAD_HEIC_UNSUPPORTED',
    FORMAT_UNSUPPORTED: 'CLAIM_UPLOAD_FORMAT_UNSUPPORTED',
    MIME_MISMATCH: 'CLAIM_UPLOAD_MIME_MISMATCH',
    TOO_LARGE: 'CLAIM_UPLOAD_TOO_LARGE',
} as const;

export type UploadErrorCode = (typeof UPLOAD_ERROR_CODES)[keyof typeof UPLOAD_ERROR_CODES];

export class UploadValidationError extends Error {
    readonly code: UploadErrorCode;

    constructor(code: UploadErrorCode) {
        super(code);
        this.name = 'UploadValidationError';
        this.code = code;
    }
}

export function extensionFromFilename(filename: string): string {
    const match = filename.toLowerCase().match(/\.[^.]+$/);
    return match?.[0] ?? '';
}

export function mimeFromFilename(filename: string): string | null {
    const ext = extensionFromFilename(filename);
    return EXTENSION_TO_MIME[ext] ?? null;
}

export function normalizeUploadMimeType(mimeType: string, filename: string): string {
    const trimmed = mimeType.trim().toLowerCase();
    if (trimmed && trimmed !== 'application/octet-stream') {
        return trimmed;
    }
    return mimeFromFilename(filename) ?? trimmed;
}

export function validateUploadFile(args: {
    mimeType: string;
    filename: string;
    sizeBytes?: number;
    allowedMimeTypes: string[];
    maxBytes: number;
}): { mimeType: string } {
    const ext = extensionFromFilename(args.filename);
    if (HEIC_EXTENSIONS.has(ext)) {
        throw new UploadValidationError(UPLOAD_ERROR_CODES.HEIC_UNSUPPORTED);
    }

    const normalized = normalizeUploadMimeType(args.mimeType, args.filename);
    if (!args.allowedMimeTypes.includes(normalized)) {
        throw new UploadValidationError(UPLOAD_ERROR_CODES.FORMAT_UNSUPPORTED);
    }

    const expectedFromExt = mimeFromFilename(args.filename);
    if (expectedFromExt && expectedFromExt !== normalized) {
        throw new UploadValidationError(UPLOAD_ERROR_CODES.MIME_MISMATCH);
    }

    if (args.sizeBytes !== undefined && args.sizeBytes > args.maxBytes) {
        throw new UploadValidationError(UPLOAD_ERROR_CODES.TOO_LARGE);
    }

    return { mimeType: normalized };
}
