/**
 * Language detection for claim text and browser preferences.
 */

import { franc } from 'franc';

import type { SupportedLanguage } from './languages';
import { DEFAULT_LANGUAGE, FRANC_TO_SUPPORTED_LANGUAGE } from './languages';

const SUPPORTED_LANG_SET = new Set<string>(['ar', 'en']);

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function toSupportedLanguage(code: string): SupportedLanguage | null {
    return SUPPORTED_LANG_SET.has(code) ? (code as SupportedLanguage) : null;
}

function hasArabicScript(text: string): boolean {
    return ARABIC_SCRIPT_RE.test(text);
}

export const detectLanguageFromText = (text: string): SupportedLanguage => {
    if (!text || text.trim().length < 5) {
        return DEFAULT_LANGUAGE;
    }

    if (hasArabicScript(text)) {
        return 'ar';
    }

    try {
        const detected = franc(text);
        const supported = FRANC_TO_SUPPORTED_LANGUAGE[detected];
        return supported ?? DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE;
    }
};

export const getBrowserLanguage = (): SupportedLanguage => {
    if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

    const browserLang = navigator.language || navigator.languages?.[0] || '';
    const langCode = (browserLang.split('-')[0] ?? '').toLowerCase();

    if (langCode === 'ar') return 'ar';
    if (langCode === 'en') return 'en';
    return DEFAULT_LANGUAGE;
};

/**
 * Comprehensive language detection with fallback hierarchy:
 * audio detection > text detection > browser language > default (Arabic)
 */
export const detectUserLanguage = (
    textInput?: string,
    audioLanguage?: string,
): SupportedLanguage => {
    if (audioLanguage) {
        const resolved = toSupportedLanguage(audioLanguage.toLowerCase());
        if (resolved) return resolved;
    }

    if (textInput && textInput.trim().length > 10) {
        return detectLanguageFromText(textInput);
    }

    return getBrowserLanguage();
};

export const formatLanguageCode = (code: SupportedLanguage): string => {
    return code.toUpperCase();
};
