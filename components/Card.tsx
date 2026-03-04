import React from 'react';
import type { Card as CardType, Suit } from '../lib/api';

const SUIT_SYMBOL: Record<Suit, string> = {
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
    SPADES: '♠',
};

const RED_SUITS: Suit[] = ['HEARTS', 'DIAMONDS'];

const RANK_LABEL: Record<string, string> = {
    TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6',
    SEVEN: '7', EIGHT: '8', NINE: '9', TEN: '10',
    JACK: 'J', QUEEN: 'Q', KING: 'K', ACE: 'A',
};

interface CardProps {
    card?: CardType;
    faceDown?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const SIZE: Record<string, React.CSSProperties> = {
    sm: { width: 38, height: 54, fontSize: '.65rem' },
    md: {},
    lg: { width: 64, height: 90, fontSize: '.95rem' },
};

export default function Card({ card, faceDown = false, size = 'md' }: CardProps) {
    if (faceDown || !card) {
        return (
            <span className="card-wrap card-back" style={SIZE[size]} aria-label="Card face down" />
        );
    }

    const isRed = RED_SUITS.includes(card.suit);
    return (
        <span
            className={`card-wrap card-face ${isRed ? 'red' : 'black'}`}
            style={SIZE[size]}
            title={`${card.rank} of ${card.suit}`}
        >
            <span className="card-rank">{RANK_LABEL[card.rank] ?? card.rank}</span>
            <span className="card-suit">{SUIT_SYMBOL[card.suit]}</span>
        </span>
    );
}
