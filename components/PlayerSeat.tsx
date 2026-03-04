import React from 'react';
import type { PlayerState, Card as CardType } from '../lib/api';
import Card from './Card';

interface PlayerSeatProps {
    ps: PlayerState;
    isMe: boolean;
    isActive: boolean;
    isDealer: boolean;
    position?: React.CSSProperties;
}

export default function PlayerSeat({ ps, isMe, isActive, isDealer, position }: PlayerSeatProps) {
    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        minWidth: 100,
        transform: 'translate(-50%, -50%)',
        ...position,
    };

    const boxStyle: React.CSSProperties = {
        background: isMe ? 'rgba(56,139,253,.18)' : 'rgba(22,27,34,.85)',
        border: `1.5px solid ${isActive ? 'var(--green-light)' : isMe ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '.4rem .7rem',
        textAlign: 'center',
        backdropFilter: 'blur(4px)',
        boxShadow: isActive ? '0 0 12px rgba(64,145,108,.55)' : 'none',
        transition: 'box-shadow .3s ease, border-color .3s ease',
    };

    return (
        <div style={containerStyle} className={isActive ? 'active-seat' : ''}>
            {/* Hole cards */}
            <div style={{ display: 'flex', gap: 4 }}>
                {(isMe && ps.holeCards?.length > 0)
                    ? ps.holeCards.map((c: CardType, i: number) => <Card key={i} card={c} size="sm" />)
                    : [0, 1].map((i) => <Card key={i} faceDown size="sm" />)
                }
            </div>

            {/* Info box */}
            <div style={boxStyle}>
                {/* Name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {isDealer && (
                        <span style={{
                            background: 'var(--gold)', color: '#111',
                            borderRadius: '50%', width: 16, height: 16,
                            fontSize: '.65rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }} title="Dealer">D</span>
                    )}
                    <span style={{ fontSize: '.8rem', fontWeight: 600, color: isMe ? '#9ecbff' : 'var(--text)' }}>
                        {ps.name}{isMe ? ' (you)' : ''}
                    </span>
                </div>

                {/* Chips */}
                <div className="chip-badge" style={{ marginTop: 2, justifyContent: 'center' }}>
                    {ps.totalChips.toLocaleString()}
                </div>

                {/* Status badges */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 3 }}>
                    {ps.folded && <Badge color="#c62828">Folded</Badge>}
                    {ps.allIn && <Badge color="#f4c430" textColor="#111">All-In</Badge>}
                    {ps.currentBet > 0 && !ps.folded && (
                        <Badge color="var(--green-light)">Bet {ps.currentBet}</Badge>
                    )}
                </div>
            </div>
        </div>
    );
}

function Badge({ children, color, textColor = '#fff' }: { children: React.ReactNode; color: string; textColor?: string }) {
    return (
        <span style={{
            background: color, color: textColor,
            borderRadius: 999, padding: '1px 7px',
            fontSize: '.65rem', fontWeight: 700,
        }}>{children}</span>
    );
}
