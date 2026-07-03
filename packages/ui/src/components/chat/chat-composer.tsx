'use client';

import { useRef, type ReactElement, type ChangeEvent, type KeyboardEvent } from 'react';
import { Image, Mic, MicOff, Send, X, Loader2, Paperclip } from 'lucide-react';

import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type PendingFile = {
    file: File;
    previewUrl: string;
};

export type ChatComposerProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onImageSelect?: (file: File) => void;
    pendingFiles?: PendingFile[];
    onRemovePendingFile?: (index: number) => void;
    onMicToggle?: () => void;
    isRecording?: boolean;
    isTranscribing?: boolean;
    isMicSupported?: boolean;
    isOffline?: boolean;
    offlineMessage?: string;
};

export function ChatComposer({
    value,
    onChange,
    onSubmit,
    placeholder = 'Saisir un message',
    disabled = false,
    className,
    onImageSelect,
    pendingFiles = [],
    onRemovePendingFile,
    onMicToggle,
    isRecording = false,
    isTranscribing = false,
    isMicSupported = false,
    isOffline = false,
    offlineMessage,
}: ChatComposerProps): ReactElement {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && (value.trim() || pendingFiles.length > 0)) {
                onSubmit?.();
            }
        }
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0];
        if (file) {
            onImageSelect?.(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const canSend = (Boolean(value.trim()) || pendingFiles.length > 0) && !disabled;

    return (
        <div
            className={cn(
                'border-t border-[var(--chat-border-subtle)] bg-[var(--chat-canvas)] px-4 pb-4 pt-2 shadow-[var(--chat-shadow-composer)]',
                className,
            )}
        >
            <div className="mx-auto w-full max-w-3xl">
                {isOffline && (
                    <div className="mb-2 rounded-[var(--chat-radius-sm)] bg-amber-100 px-3 py-1.5 text-center text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        {offlineMessage ?? 'You are offline. Messages will send automatically when you reconnect.'}
                    </div>
                )}

                {pendingFiles.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                        {pendingFiles.map((pf, idx) => (
                            <div
                                key={pf.previewUrl}
                                className="relative h-16 w-16 overflow-hidden rounded-[var(--chat-radius-sm)] border border-[var(--chat-border-subtle)]"
                            >
                                <img
                                    src={pf.previewUrl}
                                    alt={pf.file.name}
                                    className="h-full w-full object-cover"
                                />
                                {onRemovePendingFile && (
                                    <button
                                        type="button"
                                        onClick={() => onRemovePendingFile(idx)}
                                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                                        aria-label="Retirer"
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div
                    className={cn(
                        'flex items-end gap-2 rounded-[var(--chat-radius-composer)] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-2 py-1.5 shadow-sm',
                        'focus-within:border-[var(--chat-composer-ring)] focus-within:ring-1 focus-within:ring-[var(--chat-composer-ring)]/40',
                        isRecording && 'border-red-400 ring-1 ring-red-400/40',
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                        aria-hidden="true"
                    />

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-[var(--chat-control-icon)] hover:bg-[var(--chat-surface-hover)] hover:text-[var(--chat-control-icon-hover)]"
                        aria-label="Joindre une image"
                        disabled={disabled || !onImageSelect}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Image className="size-4" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'shrink-0',
                            isRecording
                                ? 'text-red-500 hover:text-red-600'
                                : 'text-[var(--chat-control-icon)] hover:bg-[var(--chat-surface-hover)] hover:text-[var(--chat-control-icon-hover)]',
                        )}
                        aria-label={isRecording ? 'Arreter' : 'Enregistrer'}
                        disabled={disabled || !isMicSupported || isTranscribing}
                        onClick={onMicToggle}
                    >
                        {isTranscribing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isRecording ? (
                            <MicOff className="size-4" />
                        ) : (
                            <Mic className="size-4" />
                        )}
                    </Button>

                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isRecording ? 'Enregistrement en cours...' : placeholder}
                        disabled={disabled || isRecording}
                        rows={1}
                        className={cn(
                            'max-h-48 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-[var(--chat-text-primary)] placeholder:text-[var(--chat-composer-placeholder)] outline-none',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                        aria-label="Message input"
                    />

                    <Button
                        type="button"
                        variant="default"
                        size="icon"
                        className={cn(
                            'shrink-0 rounded-[var(--chat-radius-md)]',
                            canSend
                                ? 'bg-[var(--chat-send-bg)] text-[var(--chat-send-fg)] hover:opacity-90'
                                : 'bg-[var(--chat-send-disabled-bg)] text-[var(--chat-send-disabled-fg)]',
                        )}
                        aria-label="Envoyer"
                        disabled={!canSend}
                        onClick={() => onSubmit?.()}
                    >
                        <Send className="size-4" />
                    </Button>
                </div>
                <p className="mt-2 text-center text-xs text-[var(--chat-text-tertiary)]">
                    L'IA peut faire des erreurs. Verifiez les informations importantes.
                </p>
            </div>
        </div>
    );
}
