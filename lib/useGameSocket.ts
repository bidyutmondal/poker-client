import { useEffect, useRef, useCallback } from 'react';
import type { GameState } from './api';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';

export type WsAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'BET' | 'ALL_IN';

interface WsMessage {
    action: string;
    payload?: GameState | string | null;
}

interface UseGameSocketOptions {
    code: string | null;
    playerId: string | null;
    onUpdate: (gs: GameState) => void;
    onError?: (msg: string) => void;
    onPlayerJoined?: () => void;
}

export function useGameSocket({
    code,
    playerId,
    onUpdate,
    onError,
    onPlayerJoined,
}: UseGameSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!code || !mountedRef.current) return;

        const ws = new WebSocket(`${WS_BASE}/ws/game/${code}`);
        wsRef.current = ws;

        ws.onmessage = (ev) => {
            try {
                const msg: WsMessage = JSON.parse(ev.data);
                if (msg.action === 'GAME_STATE_UPDATE' && msg.payload) {
                    onUpdate(msg.payload as GameState);
                } else if (msg.action === 'PLAYER_JOINED') {
                    onPlayerJoined?.();
                } else if (msg.action === 'ERROR' && typeof msg.payload === 'string') {
                    onError?.(msg.payload);
                }
            } catch {
                // ignore malformed
            }
        };

        ws.onclose = () => {
            if (!mountedRef.current) return;
            reconnTimer.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            if (reconnTimer.current) clearTimeout(reconnTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const send = useCallback(
        (action: WsAction, amount = 0) => {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN || !playerId) return;
            ws.send(JSON.stringify({ action, playerId, amount }));
        },
        [playerId],
    );

    return { send };
}
