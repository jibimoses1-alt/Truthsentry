import type * as React from 'react';
import { MessageSquare, PanelLeftClose, Plus, Search } from 'lucide-react';

import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type ChatThread = {
    id: string;
    title: string;
    updatedLabel?: string;
};

export type ChatSidebarProps = {
    threads?: ChatThread[];
    onNewChat?: () => void;
    onThreadSelect?: (threadId: string) => void;
    onToggleCollapse?: () => void;
    collapsed?: boolean;
    className?: string;
    /** Primary sidebar utilities (clear history, theme, account, FAQ, sign out). Rendered above optional footer. */
    navigationFooter?: React.ReactNode;
    /** Optional small print or status below navigation. */
    footer?: React.ReactNode;
};

export function ChatSidebar({
    threads = [],
    onNewChat,
    onThreadSelect,
    onToggleCollapse,
    collapsed = false,
    className,
    navigationFooter,
    footer,
}: ChatSidebarProps): React.ReactElement {
    if (collapsed) {
        return (
            <aside
                className={cn(
                    'flex w-14 shrink-0 flex-col border-r border-[var(--chat-border-subtle)] bg-[var(--chat-sidebar-bg)]',
                    className,
                )}
            >
                <div className="flex flex-col items-center gap-2 p-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                        aria-label="Developper la barre laterale"
                        onClick={onToggleCollapse}
                    >
                        <PanelLeftClose className="size-4 rotate-180" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                        aria-label="Nouveau chat"
                        onClick={onNewChat}
                    >
                        <Plus className="size-4" />
                    </Button>
                </div>
            </aside>
        );
    }

    return (
        <aside
            className={cn(
                'flex w-[var(--chat-sidebar-width)] shrink-0 flex-col border-r border-[var(--chat-border-subtle)] bg-[var(--chat-sidebar-bg)]',
                className,
            )}
        >
            <div className="flex items-center gap-1 p-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-item-hover)] hover:text-[var(--chat-sidebar-foreground)]"
                    aria-label="Reduire la barre laterale"
                    onClick={onToggleCollapse}
                >
                    <PanelLeftClose className="size-4" />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1 justify-start gap-2 rounded-[var(--chat-radius-md)] border-[var(--chat-border-subtle)] bg-transparent text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)]"
                    onClick={onNewChat}
                >
                    <Plus className="size-4 shrink-0 opacity-90" />
                    Nouveau chat
                </Button>
            </div>
            <div className="px-2 pb-2">
                <div className="flex h-9 items-center gap-2 rounded-[var(--chat-radius-md)] border border-[var(--chat-border-subtle)] bg-[var(--chat-surface-raised)] px-2 text-sm text-[var(--chat-sidebar-muted)]">
                    <Search className="size-4 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Rechercher des chats</span>
                </div>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Historique des chats">
                <ul className="flex flex-col gap-0.5">
                    {threads.map((t) => (
                        <li key={t.id}>
                            <button
                                type="button"
                                onClick={() => onThreadSelect?.(t.id)}
                                className="flex w-full items-start gap-2 rounded-[var(--chat-radius-md)] px-2.5 py-2 text-left text-sm text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-item-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--chat-composer-ring)]"
                            >
                                <MessageSquare
                                    className="mt-0.5 size-4 shrink-0 text-[var(--chat-sidebar-muted)]"
                                    aria-hidden
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">{t.title}</span>
                                    {t.updatedLabel ? (
                                        <span className="block truncate text-xs text-[var(--chat-sidebar-muted)]">
                                            {t.updatedLabel}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            {navigationFooter ? (
                <div className="border-t border-[var(--chat-border-subtle)] p-2">{navigationFooter}</div>
            ) : null}
            {footer ? (
                <div className="border-t border-[var(--chat-border-subtle)] p-2 text-xs text-[var(--chat-sidebar-muted)]">
                    {footer}
                </div>
            ) : null}
        </aside>
    );
}
