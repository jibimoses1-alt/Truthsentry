import test from 'node:test';
import assert from 'node:assert/strict';
import { getMetadataBase } from './site';

test('getMetadataBase falls back to localhost', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const url = getMetadataBase();
    assert.equal(url.toString(), 'http://localhost:3000/');
    if (previous) {
        process.env.NEXT_PUBLIC_APP_URL = previous;
    }
});
