import assert from 'node:assert/strict';
import test from 'node:test';

import { detectLanguageFromText } from './language-detection';

test('detectLanguageFromText returns ar for Arabic script', () => {
    assert.equal(detectLanguageFromText('هذا نص عربي للاختبار'), 'ar');
});

test('detectLanguageFromText returns en for English', () => {
    assert.equal(detectLanguageFromText('This is an English claim about health policy.'), 'en');
});

test('detectLanguageFromText falls back to ar for short text', () => {
    assert.equal(detectLanguageFromText('hi'), 'ar');
});
