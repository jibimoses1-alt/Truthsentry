'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { LogOut, Shield, Trash2, User } from 'lucide-react';
import {
    ChatAppShell,
    ChatComposer,
    ChatHomeEmpty,
    type ChatHomeEmptyColumn,
    ChatKitRoot,
    ChatMessageList,
    ChatMessageRow,
    ChatSidebar,
    type ChatThread,
    ChatThreadDivider,
    ChatTopBar,
    ChatTypingIndicator,
    type PendingFile,
} from '@truthsentry/ui/chat';
import { Button } from '@truthsentry/ui/components/button';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { useApiToast } from '@/hooks/use-api-toast';
import { siteIconPath, siteLogoOnDarkPath, siteLogoPath, siteName } from '@/lib/site';
import { trpc } from '@/lib/trpc';
import { inferMimeType, validateImage } from '@/lib/image-validation';
import { useAudioRecording } from '@/hooks/use-audio-recording';
import { useMessageOutbox, clearMessageOutbox, type OutboxEntry } from '@/hooks/use-message-outbox';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useRealtime } from '@/hooks/use-realtime';
import { blobToBase64 } from '@/lib/audio-utils';
import { detectLanguageFromText, detectUserLanguage } from '@/lib/language-detection';

// ---------------------------------------------------------------------------
// Verdict display helpers
// ---------------------------------------------------------------------------

const VERDICT_STYLES: Record<string, string> = {
    VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    DEBUNKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    MISLEADING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    PARTIALLY_TRUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    PENDING: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
};

function verdictLabel(t: (key: string) => string, status: string): string {
    const labels: Record<string, string> = {
        VERIFIED: t('verdicts.verified'),
        DEBUNKED: t('verdicts.debunked'),
        MISLEADING: t('verdicts.misleading'),
        PARTIALLY_TRUE: t('verdicts.partiallyTrue'),
        PENDING: t('verdicts.pending'),
    };
    return labels[status] ?? status;
}

// ---------------------------------------------------------------------------
// Metadata header
// ---------------------------------------------------------------------------

function ClaimMetadataHeader({ claim }: {
    claim: {
        sourceName?: string | null;
        platform?: string | null;
        topicCategory?: string | null;
        location?: string | null;
        claimLanguage?: string | null;
        factCheckStatus?: string | null;
        mediaType?: string | null;
    };
}): ReactElement | null {
    const t = useTranslations('chat.metadata');
    const tChat = useTranslations('chat');
    const tVerdicts = useTranslations('chat');

    const tags = [
        claim.sourceName && `${t('source')}: ${claim.sourceName}`,
        claim.platform && `${t('platform')}: ${claim.platform}`,
        claim.topicCategory && `${t('topic')}: ${claim.topicCategory}`,
        claim.location && `${t('location')}: ${claim.location}`,
        claim.claimLanguage && `${t('language')}: ${claim.claimLanguage}`,
    ].filter(Boolean) as string[];

    if (tags.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 px-4 py-2 text-xs text-[var(--chat-text-tertiary)] border-b border-[var(--chat-border-subtle)]">
            {tags.map((tag) => (
                <span key={tag}>{tag}</span>
            ))}
            {claim.mediaType === 'TEXT_IMAGE' ? (
                <span className="text-[var(--chat-sidebar-muted)]">{tChat('imageEvidenceNote')}</span>
            ) : null}
            {claim.factCheckStatus && claim.factCheckStatus !== 'PENDING' && (
                <span className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${VERDICT_STYLES[claim.factCheckStatus] ?? ''}`}>
                    {verdictLabel(tVerdicts, claim.factCheckStatus)}
                </span>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatPageClient(): ReactElement {
    const t = useTranslations('chat');
    const tCommon = useTranslations('common');
    const tErrors = useTranslations('errors');
    const { notifyApiException, notifyApiInfo, notifyApiWarning } = useApiToast();
    const router = useRouter();
    const isOnline = useOnlineStatus();
    const [collapsed, setCollapsed] = useState(false);
    const [composer, setComposer] = useState('');
    const [started, setStarted] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const trpcUtils = trpc.useUtils();
    const session = trpc.session.me.useQuery(undefined, { retry: false });
    const threadsQuery = trpc.claim.listMine.useQuery(
        { search: searchQuery || undefined },
        { enabled: session.isSuccess },
    );
    const threadQuery = trpc.claim.byId.useQuery(
        { claimId: activeThreadId ?? '' },
        { enabled: Boolean(activeThreadId) },
    );
    const createClaim = trpc.claim.create.useMutation();
    const appendMessage = trpc.claim.appendUserMessage.useMutation();
    const generateAssistantReply = trpc.claim.generateAssistantReply.useMutation();
    const transcribeAudioMutation = trpc.claim.transcribeAudio.useMutation();
    const requestUpload = trpc.claim.requestUpload.useMutation();
    const logout = trpc.auth.logout.useMutation({
        onSuccess: () => {
            clearMessageOutbox();
            router.push('/sign-in');
        },
    });

    const homeColumns: ChatHomeEmptyColumn[] = useMemo(
        () => [
            {
                id: 'examples',
                title: t('home.examples'),
                tone: 'examples',
                lines: [
                    t('home.examplesLines.0'),
                    t('home.examplesLines.1', { brand: siteName }),
                    t('home.examplesLines.2'),
                    t('home.examplesLines.3'),
                ],
            },
            {
                id: 'capabilities',
                title: t('home.capabilities'),
                tone: 'capabilities',
                lines: [
                    t('home.capabilitiesLines.0'),
                    t('home.capabilitiesLines.1'),
                    t('home.capabilitiesLines.2'),
                    t('home.capabilitiesLines.3'),
                ],
            },
            {
                id: 'limitations',
                title: t('home.limitations'),
                tone: 'limitations',
                lines: [
                    t('home.limitationsLines.0'),
                    t('home.limitationsLines.1'),
                    t('home.limitationsLines.2'),
                    t('home.limitationsLines.3'),
                ],
            },
        ],
        [t],
    );

    const sidebarLabels = useMemo(
        () => ({
            newChat: t('sidebar.newChat'),
            searchPlaceholder: t('sidebar.searchPlaceholder'),
            expandSidebar: t('sidebar.expandSidebar'),
            collapseSidebar: t('sidebar.collapseSidebar'),
            chatHistory: t('sidebar.chatHistory'),
        }),
        [t],
    );

    // -----------------------------------------------------------------------
    // Message outbox (first message and follow-ups)
    // -----------------------------------------------------------------------

    const outbox = useMessageOutbox(async (entry: OutboxEntry) => {
        if (!entry.claimId) {
            const created = await createClaim.mutateAsync({
                content: entry.content,
                title: entry.title,
                clientRequestId: entry.id,
                attachments: entry.attachments.length > 0 ? entry.attachments : undefined,
                metadata: entry.metadata,
            });
            setActiveThreadId(created.claimId);
            setStarted(true);
            await generateAssistantReply.mutateAsync({ claimId: created.claimId });
            await trpcUtils.claim.listMine.invalidate();
            await trpcUtils.claim.byId.invalidate({ claimId: created.claimId });
            return;
        }

        await appendMessage.mutateAsync({
            claimId: entry.claimId,
            content: entry.content,
            clientRequestId: entry.id,
            attachments: entry.attachments.length > 0 ? entry.attachments : undefined,
        });
        await generateAssistantReply.mutateAsync({ claimId: entry.claimId });
        await trpcUtils.claim.listMine.invalidate();
        await trpcUtils.claim.byId.invalidate({ claimId: entry.claimId });
    });

    // -----------------------------------------------------------------------
    // Audio recording
    // -----------------------------------------------------------------------

    const { isRecording, isTranscribing, isSpeechSupported, toggleListening } = useAudioRecording({
        transcribeAudio: async (blob: Blob) => {
            const base64 = await blobToBase64(blob);
            const result = await transcribeAudioMutation.mutateAsync({
                audioBase64: base64,
                mimeType: blob.type || 'audio/webm',
                language: detectUserLanguage(composer),
            });
            return result.text;
        },
        onTranscriptionComplete: (text: string) => {
            setComposer((prev) => (prev ? `${prev} ${text}` : text));
        },
    });

    // -----------------------------------------------------------------------
    // Real-time
    // -----------------------------------------------------------------------

    useRealtime({
        claimId: activeThreadId,
        enabled: Boolean(activeThreadId),
        onMessage: () => {
            if (activeThreadId) void trpcUtils.claim.byId.invalidate({ claimId: activeThreadId });
        },
        onStatusChange: () => {
            if (activeThreadId) void trpcUtils.claim.byId.invalidate({ claimId: activeThreadId });
            void trpcUtils.claim.listMine.invalidate();
        },
        onTypingChange: () => {
            // typing state now comes from generateAssistantReply.isPending
        },
        onGapDetected: () => {
            if (activeThreadId) void trpcUtils.claim.byId.invalidate({ claimId: activeThreadId });
        },
    });

    // -----------------------------------------------------------------------
    // Auth redirects
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (session.error?.data?.code === 'UNAUTHORIZED') {
            router.replace('/sign-in');
        }
    }, [router, session.error]);

    useEffect(() => {
        if (session.data && !session.data.emailVerifiedAt) {
            router.replace('/sign-up/verify');
        }
    }, [router, session.data]);

    // -----------------------------------------------------------------------
    // Threads
    // -----------------------------------------------------------------------

    const threads: ChatThread[] = useMemo(
        () =>
            (threadsQuery.data ?? []).map((thread) => ({
                id: thread.id,
                title: thread.title ?? t('untitledThread'),
                updatedLabel: new Date(thread.updatedAt).toLocaleString(),
            })),
        [threadsQuery.data, t],
    );

    // -----------------------------------------------------------------------
    // Image handling
    // -----------------------------------------------------------------------

    const handleImageSelect = useCallback(async (file: File) => {
        const result = await validateImage(file, pendingFiles.length);
        if (!result.valid) {
            notifyApiWarning({
                title: t('toasts.imageRejected'),
                description: tErrors(result.error),
            });
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setPendingFiles((prev) => [...prev, { file, previewUrl }]);
    }, [notifyApiWarning, pendingFiles.length, t, tErrors]);

    const handleRemovePendingFile = useCallback((index: number) => {
        setPendingFiles((prev) => {
            const removed = prev[index];
            if (removed) URL.revokeObjectURL(removed.previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    // -----------------------------------------------------------------------
    // Upload attachments
    // -----------------------------------------------------------------------

    async function uploadPendingFiles(
        claimId?: string,
    ): Promise<
        Array<{ url: string; mimeType: string; sizeBytes: number; uploadPath?: string }> | undefined
    > {
        if (pendingFiles.length === 0) return undefined;

        const attachments: Array<{
            url: string;
            mimeType: string;
            sizeBytes: number;
            uploadPath?: string;
        }> = [];
        for (const pf of pendingFiles) {
            const mimeType = inferMimeType(pf.file);
            const uploadTarget = await requestUpload.mutateAsync({
                claimId: claimId ?? undefined,
                filename: pf.file.name,
                mimeType,
                sizeBytes: pf.file.size,
            });
            const uploadResult = await fetch(uploadTarget.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': mimeType },
                body: pf.file,
            });
            if (!uploadResult.ok) {
                throw new Error('CLAIM_UPLOAD_PREPARE_FAILED');
            }
            attachments.push({
                url: uploadTarget.readUrl,
                mimeType,
                sizeBytes: pf.file.size,
                uploadPath: uploadTarget.uploadPath,
            });
        }
        return attachments;
    }

    // -----------------------------------------------------------------------
    // Submit message
    // -----------------------------------------------------------------------

    const handleSubmit = useCallback(() => {
        const text = composer.trim();
        if (!text && pendingFiles.length === 0) {
            notifyApiWarning({
                title: t('toasts.nothingToSend'),
                description: t('toasts.enterClaim'),
            });
            return;
        }

        void (async () => {
            try {
                const detectedLang = text ? detectLanguageFromText(text) : 'ar';
                const hasImages = pendingFiles.length > 0;
                const mediaType = hasImages ? 'TEXT_IMAGE' : 'TEXT';
                const attachments = await uploadPendingFiles(activeThreadId ?? undefined);

                if (!activeThreadId) {
                    outbox.enqueue({
                        id: crypto.randomUUID(),
                        content: text || t('attachmentFallback'),
                        attachments: attachments ?? [],
                        title: text ? text.slice(0, 60) : t('imageLabel'),
                        metadata: {
                            claimLanguage: detectedLang,
                            mediaType: mediaType as 'TEXT' | 'TEXT_IMAGE',
                        },
                    });
                } else {
                    outbox.enqueue({
                        id: crypto.randomUUID(),
                        claimId: activeThreadId,
                        content: text || t('attachmentFallback'),
                        attachments: attachments ?? [],
                    });
                }

                setComposer('');
                for (const pf of pendingFiles) URL.revokeObjectURL(pf.previewUrl);
                setPendingFiles([]);
                void outbox.flush();
                setStarted(true);
            } catch (error) {
                notifyApiException(error, 'chat.toasts.sendFailed');
            }
        })();
    }, [
        activeThreadId,
        composer,
        notifyApiException,
        notifyApiWarning,
        outbox,
        pendingFiles,
        t,
    ]);

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    const handleExampleLine = useCallback((line: string) => {
        setComposer(line);
    }, []);

    const handleClearConversations = useCallback(() => {
        setActiveThreadId(null);
        setStarted(false);
        setComposer('');
        setPendingFiles([]);
        notifyApiInfo({
            title: t('toasts.selectionCleared'),
            description: t('toasts.pickThread'),
        });
    }, [notifyApiInfo, t]);

    // -----------------------------------------------------------------------
    // Navigation footer
    // -----------------------------------------------------------------------

    const navigationFooter = useMemo(
        () => (
            <div className="flex flex-col gap-0.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                    onClick={handleClearConversations}
                >
                    <Trash2 className="size-4 shrink-0 opacity-90" />
                    {t('clearConversations')}
                </Button>
                <div className="flex h-9 w-full items-center justify-between gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)]">
                    <span className="text-xs text-[var(--chat-sidebar-muted)]">{tCommon('theme')}</span>
                    <div className="flex items-center gap-1">
                        <LocaleSwitcher />
                        <ThemeToggle className="text-[var(--chat-control-icon)] hover:bg-[var(--chat-sidebar-item-hover)] hover:text-[var(--chat-control-icon-hover)]" />
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href="/sign-in" />}
                    className="h-9 w-full justify-start gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                >
                    <User className="size-4 shrink-0 opacity-90" />
                    {t('myAccount')}
                </Button>
                {session.data?.role === 'ADMIN' ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href="/admin/queue" />}
                        className="h-9 w-full justify-start gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                    >
                        <Shield className="size-4 shrink-0 opacity-90" />
                        {t('adminLink')}
                    </Button>
                ) : null}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout.mutate()}
                    className="h-9 w-full justify-start gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                >
                    <LogOut className="size-4 shrink-0 opacity-90" />
                    {t('signOut')}
                </Button>
            </div>
        ),
        [handleClearConversations, logout, session.data?.role, t, tCommon],
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    const claimData = threadQuery.data;
    const messages = claimData?.messages ?? [];

    const sidebar = (
        <ChatSidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            threads={threads}
            onThreadSelect={(threadId) => {
                setActiveThreadId(threadId);
                setStarted(true);
            }}
            onNewChat={() => {
                setStarted(false);
                setComposer('');
                setActiveThreadId(null);
                setPendingFiles([]);
            }}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            labels={sidebarLabels}
            navigationFooter={navigationFooter}
            footer={
                <span className="leading-relaxed">
                    {t('privacyNote')}
                </span>
            }
        />
    );

    return (
        <ChatKitRoot>
            <ChatAppShell sidebar={sidebar}>
                <ChatTopBar
                    title={siteName}
                    subtitle={t('subtitle')}
                    brandLogoSrc={siteLogoPath}
                    brandLogoDarkSrc={siteLogoOnDarkPath}
                    brandLogoAlt={siteName}
                />

                {claimData && started && (
                    <ClaimMetadataHeader claim={claimData} />
                )}

                <ChatMessageList innerClassName={started ? undefined : 'max-w-6xl'}>
                    {!started ? (
                        <ChatHomeEmpty
                            columns={homeColumns}
                            onLineClick={handleExampleLine}
                        />
                    ) : (
                        <>
                            <ChatThreadDivider label={t('today')} />
                            {messages.map((message) => (
                                <ChatMessageRow
                                    key={message.id}
                                    role={message.role.toLowerCase() as 'user' | 'assistant' | 'system'}
                                    showAssistantActions={message.role === 'ASSISTANT'}
                                    assistantIconSrc={message.role === 'ASSISTANT' ? siteIconPath : undefined}
                                    assistantIconAlt={siteName}
                                >
                                    {message.role === 'ASSISTANT' &&
                                        claimData?.factCheckStatus &&
                                        claimData.factCheckStatus !== 'PENDING' && (
                                            <span className={`mb-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${VERDICT_STYLES[claimData.factCheckStatus] ?? ''}`}>
                                                {verdictLabel(t, claimData.factCheckStatus)}
                                            </span>
                                        )}

                                    <p className="whitespace-pre-wrap">{message.content}</p>

                                    {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {message.attachments.map((attachment: { url: string; mimeType: string }) =>
                                                attachment.mimeType?.startsWith('image/') ? (
                                                    <a
                                                        key={attachment.url}
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <img
                                                            src={attachment.url}
                                                            alt={t('imageAlt')}
                                                            className="max-h-48 max-w-48 rounded-lg border border-[var(--chat-border-subtle)] object-contain"
                                                        />
                                                    </a>
                                                ) : null,
                                            )}
                                        </div>
                                    )}
                                </ChatMessageRow>
                            ))}
                            {generateAssistantReply.isPending && (
                                <div className="pl-1">
                                    <ChatTypingIndicator
                                        assistantIconSrc={siteIconPath}
                                        assistantIconAlt={siteName}
                                        ariaLabel={t('typing')}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </ChatMessageList>

                {outbox.failedCount > 0 && (
                    <div className="flex items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                        <span>{t('outboxPending', { count: outbox.failedCount })}</span>
                        <button
                            type="button"
                            className="font-medium underline hover:no-underline"
                            onClick={() => {
                                for (const entry of outbox.entries) {
                                    if (entry.status === 'failed') outbox.retry(entry.id);
                                }
                            }}
                        >
                            {t('retry')}
                        </button>
                    </div>
                )}

                <ChatComposer
                    value={composer}
                    onChange={setComposer}
                    onSubmit={handleSubmit}
                    placeholder={t('placeholder')}
                    offlineMessage={t('offline')}
                    disabled={
                        session.isLoading ||
                        createClaim.isPending ||
                        appendMessage.isPending ||
                        generateAssistantReply.isPending
                    }
                    onImageSelect={handleImageSelect}
                    pendingFiles={pendingFiles}
                    onRemovePendingFile={handleRemovePendingFile}
                    onMicToggle={toggleListening}
                    isRecording={isRecording}
                    isTranscribing={isTranscribing}
                    isMicSupported={isSpeechSupported}
                    isOffline={!isOnline}
                />
            </ChatAppShell>
        </ChatKitRoot>
    );
}
