'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ExternalLink,
    LogOut,
    Trash2,
    User,
} from 'lucide-react';
import {
    ChatAppShell,
    ChatCodeSnippet,
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
} from '@afalambe/ui/chat';
import { Button } from '@afalambe/ui/components/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { notifyApiError, notifyApiInfo, notifyApiWarning } from '@/lib/api-toast';
import { siteLogoDarkPath, siteLogoPath, siteName } from '@/lib/site';
import { trpc } from '@/lib/trpc';

const homeColumns: ChatHomeEmptyColumn[] = [
    {
        id: 'examples',
        title: 'Exemples',
        tone: 'examples',
        lines: [
            'Expliquez un dossier avec des mots simples',
            'Que peut verifier Afalambe pour moi ?',
            "Comparez deux versions d'une histoire que j'ai entendue",
            'Comment envoyer une capture d’ecran ou un lien ?',
        ],
    },
    {
        id: 'capabilities',
        title: 'Capacites',
        tone: 'capabilities',
        lines: [
            'Conserve les echanges precedents de cette session pour le contexte',
            "Envoie les dossiers incertains en verification humaine si necessaire",
            'Accepte du texte en plusieurs langues, y compris le fula et le peul',
            'Appuie les reponses sur des sources selectionnees quand la confiance est elevee',
        ],
    },
    {
        id: 'limitations',
        title: 'Limites',
        tone: 'limitations',
        lines: [
            'Peut manquer des nuances si le dossier manque de details',
            "Ne remplace pas un avis juridique, medical ou administratif officiel",
            "Ne parcourt pas le web ouvert comme un moteur de recherche generaliste",
            "Les reponses peuvent etre retardees lors d'un trafic eleve",
        ],
    },
];

export function ChatPageClient(): ReactElement {
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [composer, setComposer] = useState('');
    const [started, setStarted] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [pendingUpload, setPendingUpload] = useState<File | null>(null);

    const trpcUtils = trpc.useUtils();
    const session = trpc.session.me.useQuery(undefined, {
        retry: false,
    });
    const threadsQuery = trpc.claim.listMine.useQuery(undefined, {
        enabled: session.isSuccess,
    });
    const threadQuery = trpc.claim.byId.useQuery(
        { claimId: activeThreadId ?? '' },
        { enabled: Boolean(activeThreadId) },
    );
    const createClaim = trpc.claim.create.useMutation();
    const appendMessage = trpc.claim.appendUserMessage.useMutation();
    const generateAssistantReply = trpc.claim.generateAssistantReply.useMutation();
    const requestUpload = trpc.claim.requestUpload.useMutation();
    const logout = trpc.auth.logout.useMutation({
        onSuccess: () => {
            router.push('/sign-in');
        },
    });

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

    const threads: ChatThread[] = useMemo(
        () =>
            (threadsQuery.data ?? []).map((thread) => ({
                id: thread.id,
                title: thread.title ?? 'Conversation sans titre',
                updatedLabel: new Date(thread.updatedAt).toLocaleString(),
            })),
        [threadsQuery.data],
    );

    const handleSubmit = useCallback(() => {
        const text = composer.trim();
        if (!text) {
            notifyApiWarning({
                title: 'Rien a envoyer',
                description: 'Saisissez votre dossier ou votre question avant envoi.',
            });
            return;
        }

        const uploadAndBuildAttachments = async () => {
            if (!pendingUpload) return undefined;
            const filename = pendingUpload.name;
            const mimeType = pendingUpload.type;
            if (!mimeType.startsWith('image/')) {
                notifyApiWarning({
                    title: 'Fichier non pris en charge',
                    description: "Seuls les fichiers d'image sont acceptes.",
                });
                return undefined;
            }
            if (pendingUpload.size > 5 * 1024 * 1024) {
                notifyApiWarning({
                    title: 'Fichier trop volumineux',
                    description: 'La taille maximale est de 5 Mo.',
                });
                return undefined;
            }

            const uploadTarget = await requestUpload.mutateAsync({
                claimId: activeThreadId ?? undefined,
                filename,
                mimeType,
            });
            const uploadResult = await fetch(uploadTarget.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': mimeType },
                body: pendingUpload,
            });
            if (!uploadResult.ok) {
                throw new Error("Echec de l'envoi.");
            }
            return [{ url: uploadTarget.publicUrl, mimeType, sizeBytes: pendingUpload.size }];
        };

        void (async () => {
            try {
                let attachments = undefined;
                if (pendingUpload && activeThreadId) {
                    attachments = await uploadAndBuildAttachments();
                }

                if (!activeThreadId) {
                    const created = await createClaim.mutateAsync({
                        content: text,
                        title: text.slice(0, 60),
                        clientRequestId: crypto.randomUUID(),
                        attachments,
                    });
                    setActiveThreadId(created.claimId);
                    setStarted(true);
                    await generateAssistantReply.mutateAsync({ claimId: created.claimId });
                } else {
                    await appendMessage.mutateAsync({
                        claimId: activeThreadId,
                        content: text,
                        clientRequestId: crypto.randomUUID(),
                        attachments,
                    });
                    await generateAssistantReply.mutateAsync({ claimId: activeThreadId });
                }
                setComposer('');
                setPendingUpload(null);
                setStarted(true);
                await trpcUtils.claim.listMine.invalidate();
                if (activeThreadId) {
                    await trpcUtils.claim.byId.invalidate({ claimId: activeThreadId });
                }
            } catch (error) {
                notifyApiError({
                    title: "Envoi du message impossible",
                    description: error instanceof Error ? error.message : 'Erreur inattendue',
                });
            }
        })();
    }, [
        activeThreadId,
        appendMessage,
        composer,
        createClaim,
        generateAssistantReply,
        pendingUpload,
        requestUpload,
        trpcUtils.claim.byId,
        trpcUtils.claim.listMine,
    ]);

    const handleExampleLine = useCallback((line: string) => {
        setComposer(line);
    }, []);

    const handleClearConversations = useCallback(() => {
        setActiveThreadId(null);
        setStarted(false);
        setComposer('');
        notifyApiInfo({
            title: 'Selection effacee',
            description: 'Choisissez un fil existant ou demarrez-en un nouveau.',
        });
    }, []);

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
                    Effacer les conversations
                </Button>
                <div className="flex h-9 w-full items-center justify-between gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)]">
                    <span className="text-xs text-[var(--chat-sidebar-muted)]">Theme</span>
                    <ThemeToggle className="text-[var(--chat-control-icon)] hover:bg-[var(--chat-sidebar-item-hover)] hover:text-[var(--chat-control-icon-hover)]" />
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href="/sign-in" />}
                    className="h-9 w-full justify-start gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                >
                    <User className="size-4 shrink-0 opacity-90" />
                    Mon compte
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout.mutate()}
                    className="h-9 w-full justify-start gap-2 rounded-[var(--chat-radius-sm)] px-2 text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                >
                    <LogOut className="size-4 shrink-0 opacity-90" />
                    Se deconnecter
                </Button>
            </div>
        ),
        [handleClearConversations],
    );

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
            }}
            navigationFooter={navigationFooter}
            footer={
                <span className="leading-relaxed">
                    Votre chat est prive et lie a votre compte connecte.
                </span>
            }
        />
    );

    return (
        <ChatKitRoot>
            <ChatAppShell sidebar={sidebar}>
                <ChatTopBar
                    title={siteName}
                    subtitle="Assistant de verification"
                    brandLogoSrc={siteLogoPath}
                    brandLogoDarkSrc={siteLogoDarkPath}
                    brandLogoAlt={siteName}
                />
                <ChatMessageList innerClassName={started ? undefined : 'max-w-6xl'}>
                    {!started ? (
                        <ChatHomeEmpty
                            columns={homeColumns}
                            onLineClick={handleExampleLine}
                        />
                    ) : (
                        <>
                            <ChatThreadDivider label="Aujourd'hui" />
                            {(threadQuery.data?.messages ?? []).map((message) => (
                                <ChatMessageRow
                                    key={message.id}
                                    role={message.role.toLowerCase() as 'user' | 'assistant' | 'system'}
                                    showAssistantActions={message.role === 'ASSISTANT'}
                                >
                                    <p>{message.content}</p>
                                    {Array.isArray(message.attachments)
                                        ? message.attachments.map((attachment: { url: string; mimeType: string }) =>
                                              attachment.mimeType.startsWith('image/') ? (
                                                  <img
                                                      key={attachment.url}
                                                      src={attachment.url}
                                                      alt="Preuve televersee"
                                                      className="mt-2 max-h-64 rounded-md border border-[var(--chat-border-subtle)] object-contain"
                                                  />
                                              ) : null,
                                          )
                                        : null}
                                </ChatMessageRow>
                            ))}
                            {generateAssistantReply.isPending ? (
                                <div className="pl-1">
                                    <ChatTypingIndicator />
                                </div>
                            ) : null}
                        </>
                    )}
                </ChatMessageList>
                <ChatComposer
                    value={composer}
                    onChange={setComposer}
                    onSubmit={handleSubmit}
                    placeholder="Saisir un message"
                    disabled={session.isLoading || createClaim.isPending || appendMessage.isPending}
                />
                <div className="px-6 pb-4">
                    <label className="text-xs text-[var(--chat-text-tertiary)]">
                        Joindre une image
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="mt-1 block text-xs"
                            onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setPendingUpload(file);
                            }}
                        />
                    </label>
                </div>
            </ChatAppShell>
        </ChatKitRoot>
    );
}
