import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from './rate-limit';

test('checkRateLimit allows requests within window', () => {
    const key = `test-allow-${Date.now()}`;
    assert.equal(checkRateLimit(key, 3, 60_000), true);
    assert.equal(checkRateLimit(key, 3, 60_000), true);
    assert.equal(checkRateLimit(key, 3, 60_000), true);
});

test('checkRateLimit blocks after max requests', () => {
    const key = `test-block-${Date.now()}`;
    assert.equal(checkRateLimit(key, 2, 60_000), true);
    assert.equal(checkRateLimit(key, 2, 60_000), true);
    assert.equal(checkRateLimit(key, 2, 60_000), false);
});
