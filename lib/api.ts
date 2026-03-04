const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Types ────────────────────────────────────────────────────────────────────

export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type Rank =
  | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'SIX' | 'SEVEN' | 'EIGHT'
  | 'NINE' | 'TEN' | 'JACK' | 'QUEEN' | 'KING' | 'ACE';

export type GameStage =
  | 'WAITING_FOR_PLAYERS'
  | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER'
  | 'SHOWDOWN' | 'GAME_OVER';

export interface Card { suit: Suit; rank: Rank; }

export interface PlayerState {
  playerId: string;
  name: string;
  totalChips: number;
  chipsInPot: number;
  currentBet: number;
  folded: boolean;
  allIn: boolean;
  holeCards: Card[];
  bestHand?: string | null;
  actedThisRound: boolean;
}

export interface GameState {
  gameId: string;
  stage: GameStage;
  players: Record<string, PlayerState>;
  communityCards: Card[];
  pot: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  winnerId?: string | null;
  winners?: string[];
  lastActionTime: number;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  active: boolean;
}

export interface Room {
  code: string;
  players: Player[];
  gameState: GameState;
  gameStarted: boolean;
  dealerId?: string;
  ownerId?: string;
  smallBlind: number;
  bigBlind: number;
  defaultBuyIn: number;
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── API functions ─────────────────────────────────────────────────────────────

export interface CreateRoomOpts {
  smallBlind?: number;
  bigBlind?: number;
  defaultBuyIn?: number;
}

export const createRoom = (opts?: CreateRoomOpts) =>
  post<Room>('/api/rooms', opts ?? {});

export const joinRoom = (code: string, name: string) =>
  post<Player>(`/api/rooms/${code}/join`, { name });

export const leaveRoom = (code: string, playerId: string) =>
  post<unknown>(`/api/rooms/${code}/leave`, { playerId });

export const getRoom = (code: string) =>
  get<Room>(`/api/rooms/${code}`);

export const startGame = (code: string, playerId: string) =>
  post<Room>(`/api/rooms/${code}/start-game`, { playerId });

export const stopGame = (code: string, playerId: string) =>
  post<Room>(`/api/rooms/${code}/stop-game`, { playerId });

export const updateSettings = (
  code: string,
  playerId: string,
  smallBlind: number,
  bigBlind: number,
  defaultBuyIn: number,
) => post<Room>(`/api/rooms/${code}/settings`, { playerId, smallBlind, bigBlind, defaultBuyIn });

export const distributeChips = (
  code: string,
  ownerId: string,
  playerId: string,
  chips: number,
) => post<Room>(`/api/rooms/${code}/buy-in`, { ownerId, playerId, chips });
