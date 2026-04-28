import type { Metadata } from 'next'
import type { ReactElement } from 'react'

import { ChatPageClient } from '@/components/chat-page-client'

export const metadata: Metadata = {
    title: 'Chat',
    description: 'Assistant de verification des dossiers Afalambe.',
    robots: { index: false, follow: false },
}

export default function ChatPage(): ReactElement {
    return <ChatPageClient />
}
