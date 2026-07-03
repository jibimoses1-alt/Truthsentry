const IMAGE_LIMITS = {
  maxBytes: Number(process.env.NEXT_PUBLIC_CHAT_IMAGE_MAX_BYTES ?? 5_242_880),
  allowedTypes: ['image/png', 'image/jpeg', 'image/webp'] as string[],
  maxDimension: 4096,
  maxPerMessage: 4,
} as const;

const EXTENSION_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

export const IMAGE_VALIDATION_CODES = {
  HEIC_UNSUPPORTED: 'CLAIM_UPLOAD_HEIC_UNSUPPORTED',
  FORMAT_UNSUPPORTED: 'CLAIM_UPLOAD_FORMAT_UNSUPPORTED',
  TOO_LARGE: 'CLAIM_UPLOAD_TOO_LARGE',
  TOO_MANY: 'CLAIM_UPLOAD_TOO_MANY',
  DIMENSIONS_TOO_LARGE: 'CLAIM_UPLOAD_DIMENSIONS_TOO_LARGE',
  UNREADABLE: 'CLAIM_UPLOAD_UNREADABLE',
} as const;

export type ImageValidationCode =
  (typeof IMAGE_VALIDATION_CODES)[keyof typeof IMAGE_VALIDATION_CODES];

export { IMAGE_LIMITS };

export type ValidationResult = { valid: true } | { valid: false; error: ImageValidationCode };

export function inferMimeType(file: File): string {
  const trimmed = file.type.trim().toLowerCase();
  if (trimmed && trimmed !== 'application/octet-stream') {
    return trimmed;
  }
  const match = file.name.toLowerCase().match(/\.[^.]+$/);
  const ext = match?.[0] ?? '';
  return EXTENSION_TO_MIME[ext] ?? trimmed;
}

export function validateImageFile(file: File): ValidationResult {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  if (HEIC_EXTENSIONS.has(ext)) {
    return { valid: false, error: IMAGE_VALIDATION_CODES.HEIC_UNSUPPORTED };
  }

  const mimeType = inferMimeType(file);
  if (!IMAGE_LIMITS.allowedTypes.includes(mimeType)) {
    return { valid: false, error: IMAGE_VALIDATION_CODES.FORMAT_UNSUPPORTED };
  }
  if (file.size > IMAGE_LIMITS.maxBytes) {
    return { valid: false, error: IMAGE_VALIDATION_CODES.TOO_LARGE };
  }
  return { valid: true };
}

export function validateImageCount(currentCount: number): ValidationResult {
  if (currentCount >= IMAGE_LIMITS.maxPerMessage) {
    return { valid: false, error: IMAGE_VALIDATION_CODES.TOO_MANY };
  }
  return { valid: true };
}

export function validateImageDimensions(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > IMAGE_LIMITS.maxDimension || img.height > IMAGE_LIMITS.maxDimension) {
        resolve({ valid: false, error: IMAGE_VALIDATION_CODES.DIMENSIONS_TOO_LARGE });
        return;
      }
      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: IMAGE_VALIDATION_CODES.UNREADABLE });
    };

    img.src = url;
  });
}

export async function validateImage(file: File, currentCount: number): Promise<ValidationResult> {
  const countCheck = validateImageCount(currentCount);
  if (!countCheck.valid) return countCheck;

  const fileCheck = validateImageFile(file);
  if (!fileCheck.valid) return fileCheck;

  const dimCheck = await validateImageDimensions(file);
  if (!dimCheck.valid) return dimCheck;

  return { valid: true };
}
