/**
 * Claim / AI language configuration (Arabic MSA + English).
 */

export type SupportedLanguage = 'ar' | 'en';

export const LANGUAGES: Record<SupportedLanguage, { name: string; label: string; code: string }> = {
    ar: { name: 'Arabic', label: 'العربية', code: 'ar' },
    en: { name: 'English', label: 'English', code: 'en' },
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';

export const LANGUAGE_SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
    ar: [
        'أنت مساعد للتحقق من الحقائق على منصة TruthSentry.',
        'أجب دائمًا بالعربية الفصحى الحديثة.',
        'حلّل الادعاءات بموضوعية ودقة.',
        'استشهد بالمصادر عند الإمكان.',
        'اذكر مستوى اليقين بوضوح: مؤكد، مكذوب، مضلل، أو جزئي.',
        'إذا لم تتمكن من التحقق، قل ذلك صراحة.',
    ].join(' '),
    en: [
        'You are a fact-checking assistant for the TruthSentry platform.',
        'Always respond in English.',
        'Analyze claims factually and rigorously.',
        'Cite sources when possible.',
        'Clearly state your confidence level: verified, debunked, misleading, or partially true.',
        'If you cannot verify, say so explicitly.',
    ].join(' '),
};

export const PROMPT_SUGGESTIONS: Record<SupportedLanguage, string[]> = {
    ar: [
        'التحقق من تصريح سياسي حديث',
        'هل رسالة واتساب هذه صحيحة؟',
        'تحليل صورة منتشرة على وسائل التواصل',
        'التحقق من معلومة صحية',
    ],
    en: [
        'Verify a recent political statement',
        'Is this WhatsApp message true?',
        'Analyze an image shared on social media',
        'Check a health-related claim',
    ],
};

export const UI_LABELS: Record<SupportedLanguage, Record<string, string>> = {
    ar: {
        startConversation: 'ابدأ بأحد هذه الاقتراحات:',
        placeholder: 'صف الادعاء المراد التحقق منه...',
        detected: 'مكتشف',
        newClaim: 'تحقق جديد',
        verified: 'مؤكد',
        debunked: 'مكذوب',
        misleading: 'مضلل',
        partiallyTrue: 'جزئي',
        pending: 'قيد الانتظار',
    },
    en: {
        startConversation: 'Start with one of these suggestions:',
        placeholder: 'Describe the claim to verify...',
        detected: 'Detected',
        newClaim: 'New verification',
        verified: 'Verified',
        debunked: 'Debunked',
        misleading: 'Misleading',
        partiallyTrue: 'Partially true',
        pending: 'Pending',
    },
};

export const WHISPER_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
    ar: 'ar',
    en: 'en',
};

export const FRANC_TO_SUPPORTED_LANGUAGE: Record<string, SupportedLanguage> = {
    ara: 'ar',
    eng: 'en',
};

export const getLanguageName = (code: SupportedLanguage): string => {
    return LANGUAGES[code]?.name ?? 'Unknown';
};

export const getSystemPrompt = (language: SupportedLanguage): string => {
    return LANGUAGE_SYSTEM_PROMPTS[language] ?? LANGUAGE_SYSTEM_PROMPTS.ar;
};

export const getPromptSuggestions = (language: SupportedLanguage): string[] => {
    return PROMPT_SUGGESTIONS[language] ?? PROMPT_SUGGESTIONS.ar;
};

export const getUILabel = (language: SupportedLanguage, key: string): string => {
    const labels = UI_LABELS[language];
    return labels[key] ?? UI_LABELS.ar[key] ?? '';
};
