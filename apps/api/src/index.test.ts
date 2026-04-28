import test from 'node:test';
import assert from 'node:assert/strict';
import { chatUploadLimits, mapWebhookEventToDeliveryStatus } from './index';

test('chat upload limits expose sane defaults', () => {
    assert.equal(chatUploadLimits.maxBytes > 0, true);
    assert.equal(chatUploadLimits.allowedMimeTypes.length > 0, true);
});

test('webhook status mapper covers known event classes', () => {
    assert.equal(mapWebhookEventToDeliveryStatus('email.delivered'), 'delivered');
    assert.equal(mapWebhookEventToDeliveryStatus('email.bounced'), 'bounced');
    assert.equal(mapWebhookEventToDeliveryStatus('email.failed'), 'failed');
    assert.equal(mapWebhookEventToDeliveryStatus('email.complained'), 'complained');
    assert.equal(mapWebhookEventToDeliveryStatus('email.opened'), 'received');
});
