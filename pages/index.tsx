import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { createRoom, joinRoom } from '../lib/api';

export default function HomePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const save = (playerId: string, playerName: string) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('playerId', playerId);
            sessionStorage.setItem('playerName', playerName);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) { setError('Enter your name first'); return; }
        setLoading(true); setError('');
        try {
            const room = await createRoom();
            const player = await joinRoom(room.code, name.trim());
            save(player.id, player.name);
            router.push(`/room/${room.code}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error');
        } finally { setLoading(false); }
    };

    const handleJoin = async () => {
        if (!name.trim()) { setError('Enter your name first'); return; }
        if (!code.trim()) { setError('Enter a room code'); return; }
        setLoading(true); setError('');
        try {
            const player = await joinRoom(code.trim().toUpperCase(), name.trim());
            save(player.id, player.name);
            router.push(`/room/${code.trim().toUpperCase()}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            gap: '2rem',
        }}>
            {/* Logo */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '.25rem' }}>♠♥♦♣</div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-.02em' }}>
                    Poker Playground
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
                    Create or join a table to play Texas Hold&apos;em
                </p>
            </div>

            {/* Card */}
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                width: '100%',
                maxWidth: 400,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: 'var(--shadow)',
            }}>
                {/* Name input */}
                <div>
                    <label htmlFor="player-name">Your Name</label>
                    <input
                        id="player-name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Alice"
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        maxLength={20}
                    />
                </div>

                <button
                    id="create-room-btn"
                    className="btn-primary"
                    style={{ width: '100%', padding: '.75rem', fontSize: '1rem' }}
                    onClick={handleCreate}
                    disabled={loading}
                >
                    {loading ? 'Creating…' : '🎲 Create Room'}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                    <hr style={{ flex: 1, borderColor: 'var(--border)', borderWidth: '1px 0 0' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>or join</span>
                    <hr style={{ flex: 1, borderColor: 'var(--border)', borderWidth: '1px 0 0' }} />
                </div>

                {/* Join */}
                <div style={{ display: 'flex', gap: '.5rem' }}>
                    <input
                        id="room-code-input"
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        placeholder="Room code"
                        maxLength={6}
                        onKeyDown={e => e.key === 'Enter' && handleJoin()}
                        style={{ flex: 1, textAlign: 'center', letterSpacing: '.12em', fontWeight: 700 }}
                    />
                    <button
                        id="join-room-btn"
                        className="btn-ghost"
                        onClick={handleJoin}
                        disabled={loading}
                    >
                        Join
                    </button>
                </div>

                {error && (
                    <p style={{ color: 'var(--red-light)', fontSize: '.85rem', textAlign: 'center', margin: 0 }}>
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
