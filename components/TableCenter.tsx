import React from 'react';
import type { GameState } from '../lib/api';
import Card from './Card';

interface TableCenterProps {
    gameState: GameState;
}

const STAGE_LABEL: Record<string, string> = {
    WAITING_FOR_PLAYERS: 'Waiting',
    PRE_FLOP: 'Pre-Flop',
    FLOP: 'Flop',
    TURN: 'Turn',
    RIVER: 'River',
    SHOWDOWN: 'Showdown',
    GAME_OVER: 'Game Over',
};

export default function TableCenter({ gameState }: TableCenterProps) {
    const { stage, communityCards, pot, players, winners, winnerId } = gameState;

    const winnerIds = winners && winners.length > 0 ? winners : winnerId ? [winnerId] : [];
    const winnerNames = winnerIds.map(id => players[id]?.name ?? id);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
        }}>
            {/* Stage badge */}
            <span style={{
                fontSize: '.72rem',
                fontWeight: 700,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                background: 'rgba(0,0,0,.35)',
                borderRadius: 999,
                padding: '.2rem .7rem',
            }}>
                {STAGE_LABEL[stage] ?? stage}
            </span>

            {/* Community cards */}
            <div style={{ display: 'flex', gap: 6 }}>
                {communityCards.length > 0
                    ? communityCards.map((c, i) => <Card key={i} card={c} size="md" />)
                    : [0, 1, 2, 3, 4].map(i => (
                        <span key={i} style={{
                            width: 52, height: 74, borderRadius: 6,
                            border: '1.5px dashed rgba(255,255,255,.12)',
                        }} />
                    ))
                }
            </div>

            {/* Pot */}
            <div style={{
                background: 'rgba(0,0,0,.4)',
                borderRadius: 999,
                padding: '.3rem 1rem',
                fontSize: '.85rem',
                fontWeight: 700,
                color: 'var(--gold)',
                letterSpacing: '.02em',
            }}>
                Pot: {pot.toLocaleString()}
            </div>

            {/* Winner banner */}
            {winnerNames.length > 0 && (
                <div className="winner-banner">
                    🏆 {winnerNames.join(' & ')} {winnerNames.length > 1 ? 'split the pot!' : 'wins!'}
                </div>
            )}
        </div>
    );
}
