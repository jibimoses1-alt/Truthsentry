import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpenAiMessages } from './multimodal-messages';

test('buildOpenAiMessages includes image_url for user attachments', async () => {
    const messages = await buildOpenAiMessages({
        systemPrompt: 'system',
        thread: [
            {
                role: 'USER',
                content: 'Is this screenshot true?',
                attachments: [
                    {
                        mimeType: 'image/png',
                        uploadPath: 'claims/abc/1.png',
                    },
                ],
            },
        ],
        resolveImageUrl: async () => 'https://example.com/signed.png',
    });

    assert.equal(messages.length, 2);
    const userMessage = messages[1];
    assert.ok(userMessage);
    assert.equal(userMessage.role, 'user');
    assert.ok(Array.isArray(userMessage.content));
    const parts = userMessage.content as Array<{ type: string }>;
    assert.equal(parts.length, 2);
    assert.equal(parts[0]?.type, 'text');
    assert.equal(parts[1]?.type, 'image_url');
});

test('buildOpenAiMessages caps images at two per request', async () => {
    let signCount = 0;
    const messages = await buildOpenAiMessages({
        systemPrompt: 'system',
        thread: [
            {
                role: 'USER',
                content: 'one',
                attachments: [
                    { mimeType: 'image/png', uploadPath: 'a.png' },
                    { mimeType: 'image/png', uploadPath: 'b.png' },
                    { mimeType: 'image/png', uploadPath: 'c.png' },
                ],
            },
        ],
        resolveImageUrl: async () => {
            signCount += 1;
            return `https://example.com/${signCount}.png`;
        },
    });

    const parts = messages[1]?.content as Array<{ type: string }>;
    const imageParts = parts.filter((p) => p.type === 'image_url');
    assert.equal(imageParts.length, 2);
    assert.equal(signCount, 2);
});
