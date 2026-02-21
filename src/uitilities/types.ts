export type Player = 'red' | 'yellow' | null;
export type Board = Player[][];
export type GameMode = 'pvp' | 'ai-easy' | 'ai-medium' | 'ai-hard';
export type GameState = 'playing' | 'won' | 'draw' | 'paused';

export interface Position {
    row: number;
    col: number;
}

export interface GameStats {
    redWins: number;
    yellowWins: number;
    draws: number;
    totalGames: number;
    currentStreak: number;
    bestStreak: number;
}

export interface Move {
    player: Player;
    position: Position;
    timestamp: number;
}

export interface GameConfig {
    mode: GameMode;
    soundEnabled: boolean;
    animationsEnabled: boolean;
    showHints: boolean;
}

export const ROWS = 6;
export const COLS = 7;
export const WINNING_LENGTH = 4;