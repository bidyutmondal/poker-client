import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { Room, Player, GameState } from '../../lib/api';
import {
    getRoom, startGame, stopGame, leaveRoom,
    updateSettings, distributeChips,
} from '../../lib/api';
import { useGameSocket } from '../../lib/useGameSocket';
import type { WsAction } from '../../lib/useGameSocket';
import PlayerSeat from '../../components/PlayerSeat';
import TableCenter from '../../components/TableCenter';
import ActionBar from '../../components/ActionBar';

// ── Seat placement around an ellipse ─────────────────────────────────────────

function getSeatPosition(index: number, total: number): React.CSSProperties {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const rx = 46; // % of table width
    const ry = 40; // % of table height
    const cx = 50, cy = 50;
    return {
        left: `${cx + rx * Math.cos(angle)}%`,
        top: `${cy + ry * Math.sin(angle)}%`,
    };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoomPage() {
    const router = useRouter();
    const code = typeof router.query.code === 'string' ? router.query.code : null;

    const [room, setRoom] = useState<Room | null>(null);
    const [myId, setMyId] = useState<string | null>(null);
    const [myName, setMyName] = useState<string | null>(null);
    const [gsLocal, setGsLocal] = useState<GameState | null>(null);
    const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
    const [loading, setLoading] = useState(false);

    // Admin panel state
    const [sbInput, setSbInput] = useState(10);
    const [bbInput, setBbInput] = useState(20);
    const [biInput, setBiInput] = useState(1000);
    const [giveChips, setGiveChips] = useState<Record<string, number>>({});
    const [showAdmin, setShowAdmin] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const showToast = (msg: string, err = false) => {
        setToast({ msg, err });
        setTimeout(() => setToast(null), 3000);
    };

    const loadRoom = useCallback(async () => {
        if (!code) return;
        try {
            const r = await getRoom(code);
            setRoom(r);
            if (r.gameState) setGsLocal(r.gameState);
            setSbInput(r.smallBlind);
            setBbInput(r.bigBlind);
            setBiInput(r.defaultBuyIn);
        } catch {
            // ignore
        }
    }, [code]);

    // ── Session storage ───────────────────────────────────────────────────────

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const id = sessionStorage.getItem('playerId');
        const name = sessionStorage.getItem('playerName');
        if (!id || !name) { router.push('/'); return; }
        setMyId(id);
        setMyName(name);
    }, [router]);

    // ── Initial load + polling while in lobby ─────────────────────────────────

    useEffect(() => {
        loadRoom();
        pollRef.current = setInterval(loadRoom, 3000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [loadRoom]);

    // Stop polling once game starts (WS takes over)
    useEffect(() => {
        if (room?.gameStarted && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, [room?.gameStarted]);

    // ── WebSocket ─────────────────────────────────────────────────────────────

    const { send } = useGameSocket({
        code,
        playerId: myId,
        onUpdate: (gs) => setGsLocal(gs),
        onError: (msg) => showToast(msg, true),
        onPlayerJoined: loadRoom,
    });

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleAction = (action: WsAction, amount = 0) => {
        send(action, amount);
    };

    const handleStartGame = async () => {
        if (!code || !myId) return;
        setLoading(true);
        try {
            const r = await startGame(code, myId);
            setRoom(r);
            setGsLocal(r.gameState);
            showToast('Game started!');
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Error', true);
        } finally { setLoading(false); }
    };

    const handleStopGame = async () => {
        if (!code || !myId) return;
        setLoading(true);
        try {
            const r = await stopGame(code, myId);
            setRoom(r);
            setGsLocal(r.gameState);
            showToast('Game stopped.');
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Error', true);
        } finally { setLoading(false); }
    };

    const handleLeave = async () => {
        if (!code || !myId) return;
        await leaveRoom(code, myId).catch(() => { });
        sessionStorage.removeItem('playerId');
        sessionStorage.removeItem('playerName');
        router.push('/');
    };

    const handleUpdateSettings = async () => {
        if (!code || !myId) return;
        try {
            const r = await updateSettings(code, myId, sbInput, bbInput, biInput);
            setRoom(r);
            showToast('Settings updated!');
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Error', true);
        }
    };

    const handleGiveChips = async (targetId: string) => {
        if (!code || !myId) return;
        const chips = giveChips[targetId] ?? 500;
        try {
            const r = await distributeChips(code, myId, targetId, chips);
            setRoom(r);
            showToast(`Gave ${chips} chips!`);
        } catch (e: unknown) {
            showToast(e instanceof Error ? e.message : 'Error', true);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    if (!room || !myId) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Connecting…</p>
            </div>
        );
    }

    const gs = gsLocal ?? room.gameState;
    const isOwner = room.ownerId === myId;
    const gameActive = room.gameStarted && gs.stage !== 'WAITING_FOR_PLAYERS';

    // ── Lobby View ────────────────────────────────────────────────────────────

    if (!gameActive) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '2rem 1rem',
                gap: '1.5rem',
                maxWidth: 640,
                margin: '0 auto',
            }}>
                {/* Header */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Room Lobby</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                            Waiting for players to join
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn-ghost btn-sm" onClick={handleLeave}>Leave</button>
                    </div>
                </div>

                {/* Room code */}
                <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    width: '100%',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.4rem' }}>Room Code</p>
                    <p
                        style={{
                            fontSize: '2.5rem', fontWeight: 700, letterSpacing: '.16em',
                            cursor: 'pointer', color: 'var(--gold)',
                        }}
                        title="Click to copy"
                        onClick={() => {
                            navigator.clipboard.writeText(room.code).then(() => showToast('Copied!'));
                        }}
                    >
                        {room.code}
                    </p>
                    <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
                        Share this code — click to copy
                    </p>
                </div>

                {/* Blinds info */}
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    {[
                        { label: 'Small Blind', val: room.smallBlind },
                        { label: 'Big Blind', val: room.bigBlind },
                        { label: 'Buy-In', val: room.defaultBuyIn },
                    ].map(item => (
                        <div key={item.label} style={{
                            flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', padding: '.75rem', textAlign: 'center',
                        }}>
                            <p style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{item.label}</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>{item.val}</p>
                        </div>
                    ))}
                </div>

                {/* Players */}
                <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', width: '100%', overflow: 'hidden',
                }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '.95rem', fontWeight: 600 }}>
                            Players ({room.players.length})
                        </h2>
                    </div>
                    {room.players.length === 0 ? (
                        <p style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                            No players yet…
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {room.players.map((p: Player) => (
                                <li key={p.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '.75rem 1.25rem',
                                    borderBottom: '1px solid rgba(48,54,61,.5)',
                                    gap: '1rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                        <span style={{ fontSize: '.9rem', fontWeight: 500 }}>
                                            {p.name}
                                            {p.id === myId && ' (you)'}
                                        </span>
                                        {p.id === room.ownerId && (
                                            <span style={{
                                                fontSize: '.65rem', fontWeight: 700,
                                                background: 'var(--gold)', color: '#111',
                                                borderRadius: 999, padding: '1px 7px',
                                            }}>Owner</span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                        <span className="chip-badge">{p.chips.toLocaleString()}</span>

                                        {/* Owner: give chips */}
                                        {isOwner && p.id !== myId && (
                                            <div style={{ display: 'flex', gap: '.3rem' }}>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    style={{ width: 70, padding: '.3rem .45rem', fontSize: '.75rem' }}
                                                    value={giveChips[p.id] ?? 500}
                                                    onChange={e => setGiveChips(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                                                />
                                                <button className="btn-primary btn-sm" onClick={() => handleGiveChips(p.id)}>
                                                    +Chips
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Owner controls */}
                {isOwner && (
                    <div style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', width: '100%', overflow: 'hidden',
                    }}>
                        <button
                            style={{
                                width: '100%', padding: '1rem 1.25rem',
                                background: 'none', borderRadius: 0,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                color: 'var(--text)', fontWeight: 600, fontSize: '.9rem',
                                borderBottom: showAdmin ? '1px solid var(--border)' : 'none',
                            }}
                            onClick={() => setShowAdmin(v => !v)}
                        >
                            <span>⚙ Room Settings</span>
                            <span>{showAdmin ? '▲' : '▼'}</span>
                        </button>

                        {showAdmin && (
                            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
                                    <div>
                                        <label>Small Blind</label>
                                        <input type="number" value={sbInput} min={1}
                                            onChange={e => setSbInput(Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <label>Big Blind</label>
                                        <input type="number" value={bbInput} min={1}
                                            onChange={e => setBbInput(Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <label>Default Buy-In</label>
                                        <input type="number" value={biInput} min={1}
                                            onChange={e => setBiInput(Number(e.target.value))} />
                                    </div>
                                </div>
                                <button className="btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }}
                                    onClick={handleUpdateSettings}>Save Settings</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Start game */}
                {isOwner && (
                    <button
                        id="start-game-btn"
                        className="btn-primary"
                        style={{ width: '100%', padding: '.9rem', fontSize: '1rem' }}
                        disabled={loading || room.players.length < 2}
                        onClick={handleStartGame}
                    >
                        {loading ? 'Starting…' : '▶ Start Game'}
                    </button>
                )}
                {!isOwner && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                        Waiting for the room owner to start the game…
                    </p>
                )}

                {toast && (
                    <div className={`toast${toast.err ? ' error' : ''}`}>
                        {toast.msg}
                    </div>
                )}
            </div>
        );
    }

    // ── Game Table View ───────────────────────────────────────────────────────

    const players = Object.values(gs.players);
    const total = players.length;

    // Determine which playerState is me
    const myPs = gs.players[myId] ?? null;

    // Dealer player index (within active players)
    const dealerPlayer = players[gs.dealerIndex % total];
    const dealerId = dealerPlayer?.playerId;

    // Current player
    const activePlayers = players.filter(p => !p.folded);
    const currentPlayer = activePlayers[gs.currentPlayerIndex % Math.max(activePlayers.length, 1)];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '.75rem 1.25rem',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        ♠ {room.code}
                    </span>
                    {myPs && (
                        <span className="chip-badge">{myPs.totalChips.toLocaleString()} chips</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                    {isOwner && (
                        <button className="btn-danger btn-sm" disabled={loading} onClick={handleStopGame}>
                            Stop Game
                        </button>
                    )}
                    <button className="btn-ghost btn-sm" onClick={handleLeave}>Leave</button>
                </div>
            </div>

            {/* Table  */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1rem',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div
                    className="felt-table"
                    style={{
                        width: 'min(700px, 92vw)',
                        height: 'min(420px, 55vw)',
                        position: 'relative',
                    }}
                >
                    {/* Center */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        zIndex: 2,
                    }}>
                        <TableCenter gameState={gs} />
                    </div>

                    {/* Player seats */}
                    {players.map((ps, idx) => (
                        <PlayerSeat
                            key={ps.playerId}
                            ps={ps}
                            isMe={ps.playerId === myId}
                            isActive={currentPlayer?.playerId === ps.playerId}
                            isDealer={ps.playerId === dealerId}
                            position={getSeatPosition(idx, total)}
                        />
                    ))}
                </div>
            </div>

            {/* Action bar (fixed at bottom) */}
            {myPs && !myPs.folded && !myPs.allIn &&
                currentPlayer?.playerId === myId && (
                    <ActionBar
                        gameState={gs}
                        myPlayerId={myId}
                        onAction={handleAction}
                    />
                )}

            {/* Name tag for spectating */}
            {myName && (
                <div style={{
                    position: 'fixed', bottom: myPs && currentPlayer?.playerId === myId ? 'auto' : '1rem',
                    right: '1rem',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '.35rem .75rem',
                    fontSize: '.78rem',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                }}>
                    You: <strong style={{ color: 'var(--text)' }}>{myName}</strong>
                </div>
            )}

            {toast && (
                <div className={`toast${toast.err ? ' error' : ''}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
