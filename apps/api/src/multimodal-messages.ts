export type ThreadMessage = {
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    attachments?: ThreadAttachment[];
};

export type ThreadAttachment = {
    mimeType: string;
    url?: string;
    uploadPath?: string;
};

type OpenAiContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

const MAX_IMAGES_PER_REQUEST = 2;

export async function buildOpenAiMessages(args: {
    systemPrompt: string;
    thread: ThreadMessage[];
    resolveImageUrl: (uploadPath: string) => Promise<string>;
}): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string | OpenAiContentPart[] }>> {
    const messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string | OpenAiContentPart[];
    }> = [{ role: 'system', content: args.systemPrompt }];

    let imagesUsed = 0;

    for (const msg of args.thread) {
        const role = msg.role === 'ASSISTANT' ? 'assistant' : 'user';
        if (role === 'assistant' || !msg.attachments?.length) {
            messages.push({ role, content: msg.content });
            continue;
        }

        const imageUrls: string[] = [];
        for (const att of msg.attachments) {
            if (imagesUsed >= MAX_IMAGES_PER_REQUEST) break;
            if (!att.mimeType.startsWith('image/')) continue;

            try {
                if (att.uploadPath) {
                    imageUrls.push(await args.resolveImageUrl(att.uploadPath));
                    imagesUsed += 1;
                } else if (att.url) {
                    imageUrls.push(att.url);
                    imagesUsed += 1;
                }
            } catch {
                // Skip images that cannot be signed; continue with text-only context.
            }
        }

        if (imageUrls.length === 0) {
            messages.push({ role, content: msg.content });
            continue;
        }

        const parts: OpenAiContentPart[] = [];
        const text = msg.content.trim();
        if (text) {
            parts.push({ type: 'text', text });
        }
        for (const url of imageUrls) {
            parts.push({ type: 'image_url', image_url: { url, detail: 'auto' } });
        }
        messages.push({ role, content: parts });
    }

    return messages;
}
