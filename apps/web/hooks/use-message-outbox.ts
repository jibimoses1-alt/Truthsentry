import { useCallback, useEffect, useRef, useState } from 'react';

export interface OutboxEntry {
  id: string;
  claimId?: string;
  content: string;
  title?: string;
  metadata?: {
    claimLanguage?: string;
    mediaType?: 'TEXT' | 'TEXT_IMAGE' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT_VIDEO' | 'TEXT_AUDIO';
  };
  attachments: Array<{
    url: string;
    mimeType: string;
    sizeBytes: number;
    uploadPath?: string;
  }>;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  attempts: number;
  createdAt: number;
  lastAttemptAt?: number;
}

const OUTBOX_CONFIG = {
  maxRetries: 5,
  storageKey: 'truthsentry_message_outbox',
  flushInterval: 3_000,
  staleThreshold: 86_400_000,
} as const;

function loadOutbox(): OutboxEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_CONFIG.storageKey);
    if (!raw) return [];
    const entries = JSON.parse(raw) as OutboxEntry[];
    const cutoff = Date.now() - OUTBOX_CONFIG.staleThreshold;
    return entries.filter((e) => e.createdAt > cutoff);
  } catch {
    return [];
  }
}

function persistOutbox(entries: OutboxEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(OUTBOX_CONFIG.storageKey);
      return;
    }
    localStorage.setItem(OUTBOX_CONFIG.storageKey, JSON.stringify(entries));
  } catch {
    // storage full or unavailable
  }
}

export function clearMessageOutbox(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OUTBOX_CONFIG.storageKey);
}

type SendFn = (entry: OutboxEntry) => Promise<void>;

export function useMessageOutbox(sendFn: SendFn) {
  const [entries, setEntries] = useState<OutboxEntry[]>(() => loadOutbox());
  const entriesRef = useRef(entries);
  const sendFnRef = useRef(sendFn);
  const flushingRef = useRef(false);

  sendFnRef.current = sendFn;
  entriesRef.current = entries;

  useEffect(() => {
    persistOutbox(entries);
  }, [entries]);

  const enqueue = useCallback(
    (entry: Omit<OutboxEntry, 'status' | 'attempts' | 'createdAt'>) => {
      const newEntry: OutboxEntry = {
        ...entry,
        status: 'queued',
        attempts: 0,
        createdAt: Date.now(),
      };
      setEntries((prev) => [...prev, newEntry]);
    },
    [],
  );

  const markSent = useCallback((id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'sent' as const } : e)));
  }, []);

  const markFailed = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const attempts = e.attempts + 1;
        return {
          ...e,
          attempts,
          lastAttemptAt: Date.now(),
          status: attempts >= OUTBOX_CONFIG.maxRetries ? ('failed' as const) : ('queued' as const),
        };
      }),
    );
  }, []);

  const retry = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'queued' as const, attempts: 0 } : e)),
    );
  }, []);

  const removeCompleted = useCallback(() => {
    setEntries((prev) => prev.filter((e) => e.status !== 'sent'));
  }, []);

  const clear = useCallback(() => {
    clearMessageOutbox();
    setEntries([]);
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      const pending = entriesRef.current.filter((e) => e.status === 'queued');
      for (const entry of pending) {
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: 'sending' as const } : e)),
        );
        try {
          await sendFnRef.current(entry);
          markSent(entry.id);
        } catch {
          markFailed(entry.id);
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [markFailed, markSent]);

  useEffect(() => {
    const handle = setInterval(() => {
      const hasPending = entriesRef.current.some((e) => e.status === 'queued');
      if (hasPending && navigator.onLine) {
        void flush();
      }
    }, OUTBOX_CONFIG.flushInterval);
    return () => clearInterval(handle);
  }, [flush]);

  useEffect(() => {
    const handleOnline = () => void flush();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flush]);

  return {
    entries,
    enqueue,
    retry,
    removeCompleted,
    clear,
    flush,
    pendingCount: entries.filter((e) => e.status === 'queued' || e.status === 'sending').length,
    failedCount: entries.filter((e) => e.status === 'failed').length,
  };
}
