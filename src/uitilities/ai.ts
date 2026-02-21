import type { Player, Board, Position } from './types';
import {ROWS, COLS} from './types';

export class Connect4AI {
    private readonly maxDepth: number;
    private readonly player: Player;
    private readonly opponent: Player;

    constructor(difficulty: 'easy' | 'medium' | 'hard') {
        this.maxDepth = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6;
        this.player = 'yellow';
        this.opponent = 'red';
    }

    getBestMove(board: Player[][]): number {
        let bestScore = -Infinity;
        let bestCol = 3;

        for (let col = 0; col < COLS; col++) {
            const row = this.getLowestEmptyRow(board, col);
            if (row === -1) continue;

            const newBoard = this.cloneBoard(board);
            newBoard[row][col] = this.player;
            const score = this.minimax(newBoard, this.maxDepth - 1, -Infinity, Infinity, false);

            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }

        return bestCol;
    }

    private minimax(
        board: Player[][],
        depth: number,
        alpha: number,
        beta: number,
        isMaximizing: boolean
    ): number {
        const winner = this.checkWinner(board);
        if (winner === this.player) return 1000000;
        if (winner === this.opponent) return -1000000;
        if (this.isDraw(board) || depth === 0) {
            return this.evaluateBoard(board);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let col = 0; col < COLS; col++) {
                const row = this.getLowestEmptyRow(board, col);
                if (row === -1) continue;

                const newBoard = this.cloneBoard(board);
                newBoard[row][col] = this.player;
                const eval_ = this.minimax(newBoard, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let col = 0; col < COLS; col++) {
                const row = this.getLowestEmptyRow(board, col);
                if (row === -1) continue;

                const newBoard = this.cloneBoard(board);
                newBoard[row][col] = this.opponent;
                const eval_ = this.minimax(newBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    private evaluateBoard(board: Player[][]): number {
        let score = 0;

        // Center column preference
        const centerCol = Math.floor(COLS / 2);
        for (let row = 0; row < ROWS; row++) {
            if (board[row][centerCol] === this.player) score += 3;
        }

        // Evaluate all possible windows
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (col <= COLS - 4) {
                    score += this.evaluateWindow(board, row, col, 0, 1); // Horizontal
                }
                if (row <= ROWS - 4) {
                    score += this.evaluateWindow(board, row, col, 1, 0); // Vertical
                    if (col <= COLS - 4) {
                        score += this.evaluateWindow(board, row, col, 1, 1); // Diagonal \
                    }
                    if (col >= 3) {
                        score += this.evaluateWindow(board, row, col, 1, -1); // Diagonal /
                    }
                }
            }
        }

        return score;
    }

    private evaluateWindow(
        board: Player[][],
        startRow: number,
        startCol: number,
        dRow: number,
        dCol: number
    ): number {
        let playerCount = 0;
        let opponentCount = 0;
        let emptyCount = 0;

        for (let i = 0; i < 4; i++) {
            const row = startRow + i * dRow;
            const col = startCol + i * dCol;
            const cell = board[row][col];

            if (cell === this.player) playerCount++;
            else if (cell === this.opponent) opponentCount++;
            else emptyCount++;
        }

        if (playerCount === 4) return 100;
        if (opponentCount === 4) return -100;
        if (playerCount === 3 && emptyCount === 1) return 10;
        if (opponentCount === 3 && emptyCount === 1) return -8;
        if (playerCount === 2 && emptyCount === 2) return 4;
        if (opponentCount === 2 && emptyCount === 2) return -2;

        return 0;
    }

    private getLowestEmptyRow(board: Player[][], col: number): number {
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === null) return row;
        }
        return -1;
    }

    private cloneBoard(board: Player[][]): Player[][] {
        return board.map(row => [...row]);
    }

    private checkWinner(board: Player[][]): Player | null {
        // Check all directions for a win
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const player = board[row][col];
                if (!player) continue;

                if (this.checkDirection(board, row, col, 0, 1) ||
                    this.checkDirection(board, row, col, 1, 0) ||
                    this.checkDirection(board, row, col, 1, 1) ||
                    this.checkDirection(board, row, col, 1, -1)) {
                    return player;
                }
            }
        }
        return null;
    }

    private checkDirection(
        board: Player[][],
        row: number,
        col: number,
        dRow: number,
        dCol: number
    ): boolean {
        const player = board[row][col];
        for (let i = 1; i < 4; i++) {
            const newRow = row + i * dRow;
            const newCol = col + i * dCol;
            if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) return false;
            if (board[newRow][newCol] !== player) return false;
        }
        return true;
    }

    private isDraw(board: Player[][]): boolean {
        return board.every(row => row.every(cell => cell !== null));
    }
}