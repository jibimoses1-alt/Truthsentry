import { useCallback, useEffect, useRef } from 'react';

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
  ts: number;
  seq?: number;
}

interface UseRealtimeOptions {
  claimId: string | null;
  enabled: boolean;
  onMessage?: (payload: Record<string, unknown>) => void;
  onStatusChange?: (payload: Record<string, unknown>) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onGapDetected?: () => void;
}

const RECONNECT_CONFIG = {
  baseDelay: 1_000,
  maxDelay: 30_000,
  backoffMultiplier: 2,
} as const;

function getWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const parsed = new URL(apiUrl);
    const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${parsed.host}/ws`;
  } catch {
    const protocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//localhost:4000/ws`;
  }
}

function sendSubscriptionUpdate(ws: WebSocket, previousClaimId: string | null, claimId: string | null): void {
  if (previousClaimId && previousClaimId !== claimId) {
    ws.send(JSON.stringify({ type: 'unsubscribe', payload: { claimIds: [previousClaimId] } }));
  }
  if (claimId) {
    ws.send(JSON.stringify({ type: 'subscribe', payload: { claimIds: [claimId] } }));
  }
}

export function useRealtime({
  claimId,
  enabled,
  onMessage,
  onStatusChange,
  onTypingChange,
  onGapDetected,
}: UseRealtimeOptions): void {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeqRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const activeClaimIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        if (claimId) {
          sendSubscriptionUpdate(ws, null, claimId);
          activeClaimIdRef.current = claimId;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data as string);

          if (msg.seq !== undefined) {
            if (lastSeqRef.current > 0 && msg.seq > lastSeqRef.current + 1) {
              onGapDetected?.();
            }
            lastSeqRef.current = msg.seq;
          }

          switch (msg.type) {
            case 'message.created':
              onMessage?.(msg.payload);
              break;
            case 'claim.statusChanged':
              onStatusChange?.(msg.payload);
              break;
            case 'typing.start':
              onTypingChange?.(true);
              break;
            case 'typing.stop':
              onTypingChange?.(false);
              break;
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        activeClaimIdRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      scheduleReconnect();
    }
  }, [claimId, enabled, onMessage, onStatusChange, onTypingChange, onGapDetected]);

  const scheduleReconnect = useCallback(() => {
    if (!enabled) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.backoffMultiplier, attempt),
      RECONNECT_CONFIG.maxDelay,
    );
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    reconnectAttemptRef.current = attempt + 1;
    reconnectTimerRef.current = setTimeout(connect, delay + jitter);
  }, [connect, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      activeClaimIdRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    sendSubscriptionUpdate(ws, activeClaimIdRef.current, claimId);
    activeClaimIdRef.current = claimId;
  }, [claimId]);
}
