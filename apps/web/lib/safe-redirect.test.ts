import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSafeRedirectPath } from './safe-redirect';

test('resolveSafeRedirectPath defaults to chat', () => {
    assert.equal(resolveSafeRedirectPath(undefined), '/chat');
    assert.equal(resolveSafeRedirectPath(''), '/chat');
});

test('resolveSafeRedirectPath allows internal paths', () => {
    assert.equal(resolveSafeRedirectPath('/chat'), '/chat');
    assert.equal(resolveSafeRedirectPath('/admin/queue'), '/admin/queue');
    assert.equal(resolveSafeRedirectPath('/sign-up?ref=wa'), '/sign-up?ref=wa');
});

test('resolveSafeRedirectPath rejects external targets', () => {
    assert.equal(resolveSafeRedirectPath('https://evil.com'), '/chat');
    assert.equal(resolveSafeRedirectPath('//evil.com'), '/chat');
    assert.equal(resolveSafeRedirectPath('/evil'), '/chat');
});
