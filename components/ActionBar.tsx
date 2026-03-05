import React, { useState } from 'react';
import type { WsAction } from '../lib/useGameSocket';
import type { GameState } from '../lib/api';

interface ActionBarProps {
    gameState: GameState;
    myPlayerId: string;
    onAction: (action: WsAction, amount?: number) => void;
}

export default function ActionBar({ gameState, myPlayerId, onAction }: ActionBarProps) {
    const [raiseAmount, setRaiseAmount] = useState<number>(0);

    const me = gameState.players[myPlayerId];
    if (!me) return null;

    const activePlayers = Object.values(gameState.players).filter(p => !p.folded);
    const currentPlayer = activePlayers[gameState.currentPlayerIndex % activePlayers.length];
    const isMyTurn = currentPlayer?.playerId === myPlayerId;

    if (!isMyTurn || me.folded || me.allIn) return null;

    const maxBet = Math.max(...Object.values(gameState.players).map(p => p.currentBet));
    const amountToCall = Math.max(0, maxBet - me.currentBet);
    const canCheck = amountToCall === 0;
    const minRaise = gameState.minRaise ?? gameState.bigBlind;

    // Initialize raise amount default
    const raiseDefault = Math.max(minRaise, amountToCall + gameState.bigBlind);
    const effectiveRaise = raiseAmount > 0 ? raiseAmount : raiseDefault;

    const handleRaise = () => {
        onAction('RAISE', effectiveRaise);
        setRaiseAmount(0);
    };

    const btnStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 80,
        padding: '.65rem .5rem',
        fontSize: '.9rem',
    };

    return (
        <div style={{
            width: '100%',
            background: 'rgba(13,17,23,.92)',
            borderTop: '1px solid var(--border)',
            backdropFilter: 'blur(8px)',
            padding: '1rem 1.5rem',
        }}>
            {/* My turn indicator */}
            <p style={{ fontSize: '.75rem', color: 'var(--green-light)', fontWeight: 600, marginBottom: '.5rem', textAlign: 'center' }}>
                ✦ Your turn
            </p>

            {/* Primary actions */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn-danger" style={btnStyle} onClick={() => onAction('FOLD')}>
                    Fold
                </button>

                {canCheck ? (
                    <button className="btn-ghost" style={btnStyle} onClick={() => onAction('CHECK')}>
                        Check
                    </button>
                ) : (
                    <button className="btn-blue" style={btnStyle} onClick={() => onAction('CALL')}>
                        Call {amountToCall}
                    </button>
                )}

                {/* Raise block */}
                <div style={{ display: 'flex', gap: '.4rem', alignItems: 'stretch', flex: 2, minWidth: 200 }}>
                    <input
                        type="number"
                        min={raiseDefault}
                        max={me.totalChips}
                        step={gameState.bigBlind}
                        placeholder={`Raise (min ${raiseDefault})`}
                        value={raiseAmount || ''}
                        onChange={e => setRaiseAmount(Number(e.target.value))}
                        style={{ flex: 1, padding: '.55rem .75rem' }}
                    />
                    <button
                        className="btn-primary"
                        style={{ whiteSpace: 'nowrap', minWidth: 70 }}
                        disabled={me.totalChips < raiseDefault}
                        onClick={handleRaise}
                    >
                        Raise
                    </button>
                </div>

                <button
                    className="btn-gold"
                    style={btnStyle}
                    onClick={() => onAction('ALL_IN')}
                >
                    All-In
                </button>
            </div>
        </div>
    );
}
