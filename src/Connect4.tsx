import React, { useState, useEffect, useCallback } from 'react';

type Player = '🔴' | '🟡' | null;
type Board = Player[][];
type GameMode = 'two-player' | 'single-player';

interface GameState {
    board: Board;
    currentPlayer: Player;
    winner: Player;
    winningLine: [number, number][] | null;
    gameMode: GameMode;
    isBotThinking: boolean;
    animatingPiece: { row: number; col: number } | null;
}

const ROWS = 6;
const COLS = 7;

const Connect4: React.FC = () => {
    const initializeBoard = (): Board =>
        Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    const [gameState, setGameState] = useState<GameState>({
        board: initializeBoard(),
        currentPlayer: '🔴',
        winner: null,
        winningLine: null,
        gameMode: 'two-player',
        isBotThinking: false,
        animatingPiece: null
    });

    const getBotMove = useCallback((board: Board, botPlayer: Player): number => {
        const opponent = botPlayer === '🔴' ? '🟡' : '🔴';

        for (let col = 0; col < COLS; col++) {
            const testBoard = board.map(row => [...row]);
            const row = getLowestEmptyRow(testBoard, col);
            if (row !== -1) {
                testBoard[row][col] = botPlayer;
                if (checkWinnerStatic(testBoard, row, col)) {
                    return col;
                }
            }
        }

        for (let col = 0; col < COLS; col++) {
            const testBoard = board.map(row => [...row]);
            const row = getLowestEmptyRow(testBoard, col);
            if (row !== -1) {
                testBoard[row][col] = opponent;
                if (checkWinnerStatic(testBoard, row, col)) {
                    return col;
                }
            }
        }

        const centerCols = [3, 2, 4, 1, 5, 0, 6];
        for (const col of centerCols) {
            if (getLowestEmptyRow(board, col) !== -1) {
                return col;
            }
        }

        const validCols = [];
        for (let col = 0; col < COLS; col++) {
            if (getLowestEmptyRow(board, col) !== -1) {
                validCols.push(col);
            }
        }
        return validCols[Math.floor(Math.random() * validCols.length)];
    }, []);

    const getLowestEmptyRow = (board: Board, col: number): number => {
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === null) return row;
        }
        return -1;
    };

    const checkWinnerStatic = (board: Board, row: number, col: number): boolean => {
        const player = board[row][col];
        if (!player) return false;

        const directions = [
            [[0, 1], [0, -1]],
            [[1, 0], [-1, 0]],
            [[1, 1], [-1, -1]],
            [[1, -1], [-1, 1]]
        ];

        for (const direction of directions) {
            let count = 1;
            for (const [dr, dc] of direction) {
                let r = row + dr;
                let c = col + dc;
                while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
                    count++;
                    r += dr;
                    c += dc;
                }
            }
            if (count >= 4) return true;
        }
        return false;
    };

    const checkWinner = useCallback((board: Board, row: number, col: number): [number, number][] | null => {
        const player = board[row][col];
        if (!player) return null;

        const directions = [
            [[0, 1], [0, -1]],
            [[1, 0], [-1, 0]],
            [[1, 1], [-1, -1]],
            [[1, -1], [-1, 1]]
        ];

        for (const direction of directions) {
            const line: [number, number][] = [[row, col]];
            for (const [dr, dc] of direction) {
                let r = row + dr;
                let c = col + dc;
                while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
                    line.push([r, c]);
                    r += dr;
                    c += dc;
                }
            }
            if (line.length >= 4) {
                return line;
            }
        }
        return null;
    }, []);

    const dropPiece = useCallback((col: number) => {
        if (gameState.winner || gameState.isBotThinking || gameState.animatingPiece) return;

        const newBoard = gameState.board.map(row => [...row]);
        const row = getLowestEmptyRow(newBoard, col);
        if (row === -1) return;

        setGameState(prev => ({ ...prev, animatingPiece: { row, col } }));

        setTimeout(() => {
            newBoard[row][col] = gameState.currentPlayer;
            const winningLine = checkWinner(newBoard, row, col);
            const nextPlayer = gameState.currentPlayer === '🔴' ? '🟡' : '🔴';
            const isGameOver = winningLine !== null || newBoard.every(r => r.every(c => c !== null));

            setGameState(prev => ({
                ...prev,
                board: newBoard,
                currentPlayer: nextPlayer,
                winner: winningLine ? gameState.currentPlayer : null,
                winningLine,
                animatingPiece: null,
                isBotThinking: prev.gameMode === 'single-player' && !isGameOver && nextPlayer === '🟡'
            }));
        }, 600);
    }, [gameState, checkWinner]);

    useEffect(() => {
        if (!gameState.isBotThinking || gameState.winner) return;

        const timer = setTimeout(() => {
            const botMove = getBotMove(gameState.board, '🟡');
            const row = getLowestEmptyRow(gameState.board, botMove);
            if (row === -1) return;

            setGameState(prev => ({ ...prev, animatingPiece: { row, col: botMove } }));

            setTimeout(() => {
                setGameState(prev => {
                    const newBoard = prev.board.map(row => [...row]);
                    const targetRow = getLowestEmptyRow(newBoard, botMove);
                    if (targetRow === -1) return prev;

                    newBoard[targetRow][botMove] = '🟡';
                    const winningLine = checkWinner(newBoard, targetRow, botMove);

                    return {
                        ...prev,
                        board: newBoard,
                        currentPlayer: '🔴',
                        winner: winningLine ? '🟡' : null,
                        winningLine,
                        isBotThinking: false,
                        animatingPiece: null
                    };
                });
            }, 600);
        }, 500);

        return () => clearTimeout(timer);
    }, [gameState.isBotThinking, gameState.board, getBotMove, checkWinner]);

    const resetGame = () => {
        setGameState(prev => ({
            ...prev,
            board: initializeBoard(),
            currentPlayer: '🔴',
            winner: null,
            winningLine: null,
            isBotThinking: false,
            animatingPiece: null
        }));
    };

    const setGameMode = (mode: GameMode) => {
        setGameState({
            board: initializeBoard(),
            currentPlayer: '🔴',
            winner: null,
            winningLine: null,
            gameMode: mode,
            isBotThinking: false,
            animatingPiece: null
        });
    };

    const isDraw = !gameState.winner &&
        gameState.board.every(row => row.every(cell => cell !== null));

    return (
        <div className="game-container">
            <style>{`
        :root {
          --cell-size: clamp(42px, 10vmin, 60px);
          --gap-size: clamp(6px, 1.5vmin, 8px);
          --piece-size: calc(var(--cell-size) * 0.8);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
background: linear-gradient(90deg, rgba(9, 11, 10, 1.000) 0.000%, rgba(9, 11, 10, 1.000) 7.692%, rgba(23, 19, 15, 1.000) 7.692%, rgba(23, 19, 15, 1.000) 15.385%, rgba(38, 27, 21, 1.000) 15.385%, rgba(38, 27, 21, 1.000) 23.077%, rgba(50, 35, 26, 1.000) 23.077%, rgba(50, 35, 26, 1.000) 30.769%, rgba(59, 40, 32, 1.000) 30.769%, rgba(59, 40, 32, 1.000) 38.462%, rgba(62, 44, 35, 1.000) 38.462%, rgba(62, 44, 35, 1.000) 46.154%, rgba(62, 46, 38, 1.000) 46.154%, rgba(62, 46, 38, 1.000) 53.846%, rgba(57, 46, 39, 1.000) 53.846%, rgba(57, 46, 39, 1.000) 61.538%, rgba(47, 44, 39, 1.000) 61.538%, rgba(47, 44, 39, 1.000) 69.231%, rgba(35, 40, 37, 1.000) 69.231%, rgba(35, 40, 37, 1.000) 76.923%, rgba(20, 34, 34, 1.000) 76.923%, rgba(20, 34, 34, 1.000) 84.615%, rgba(5, 26, 29, 1.000) 84.615%, rgba(5, 26, 29, 1.000) 92.308%, rgba(0, 19, 24, 1.000) 92.308% 100.000%);          min-height: 100vh;
          overflow: hidden;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: #e2e8f0;
        }

        .game-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: clamp(10px, 2vmin, 20px);
          gap: clamp(12px, 2vmin, 20px);
        }

        .title {
          color: #f8fafc;
          font-size: clamp(28px, 6vmin, 42px);
          font-weight: 700;
          letter-spacing: 1px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          margin: 0;
        }

        .mode-selector {
          display: flex;
          gap: 8px;
          background: rgba(15, 23, 42, 0.6);
          padding: 6px;
          border-radius: 50px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .mode-button {
          padding: clamp(8px, 1.5vmin, 12px) clamp(16px, 3vmin, 24px);
          font-size: clamp(12px, 2vmin, 16px);
          font-weight: 600;
          border: none;
          background: transparent;
          color: #94a3b8;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mode-button:hover {
          color: #e2e8f0;
          background: rgba(30, 41, 59, 0.5);
        }

        .mode-button.active {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .status {
          font-size: clamp(16px, 3vmin, 22px);
          font-weight: 600;
          min-height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.5);
          padding: clamp(8px, 1.5vmin, 12px) clamp(20px, 4vmin, 30px);
          border-radius: 50px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          margin: 0;
        }

        .player {
          font-size: clamp(24px, 5vmin, 32px);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .winner {
          color: #4ade80;
          font-size: clamp(18px, 3.5vmin, 24px);
          animation: celebrate 0.6s ease-in-out;
        }

        .draw {
          color: #fbbf24;
          font-size: clamp(18px, 3.5vmin, 24px);
        }

        .thinking {
          color: #94a3b8;
          font-style: italic;
        }

        .thinking::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #64748b;
          border-top: 2px solid #e2e8f0;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-left: 8px;
        }

        .board {
          position: relative;
          display: grid;
          grid-template-rows: repeat(6, var(--cell-size));
          gap: var(--gap-size);
          background: linear-gradient(145deg, #1e293b, #0f172a);
          padding: var(--gap-size);
          border-radius: clamp(12px, 2vmin, 16px);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            inset 0 2px 4px rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.1);
          max-width: 100%;
          touch-action: manipulation;
        }

        .row {
          display: grid;
          grid-template-columns: repeat(7, var(--cell-size));
          gap: var(--gap-size);
        }

        .cell {
          width: var(--cell-size);
          height: var(--cell-size);
          background: radial-gradient(circle at 30% 30%, #334155, #1e293b);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
          position: relative;
          box-shadow: 
            inset 0 4px 6px rgba(0, 0, 0, 0.3),
            inset 0 -2px 3px rgba(148, 163, 184, 0.1);
        }

        .cell:hover:not(.filled) {
          background: radial-gradient(circle at 30% 30%, #475569, #334155);
          transform: scale(1.05);
        }

        .cell.winning {
          background: radial-gradient(circle at 30% 30%, #fde047, #f59e0b);
          animation: winGlow 1s ease-in-out infinite;
        }

        .piece {
          width: var(--piece-size);
          height: var(--piece-size);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(24px, 5vmin, 36px);
          position: relative;
          animation: pieceAppear 0.3s ease-out;
          filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
          z-index: 1;
        }

        .piece::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.3), transparent 60%);
          pointer-events: none;
        }

        .dropping-piece {
          position: absolute;
          width: var(--piece-size);
          height: var(--piece-size);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(24px, 5vmin, 36px);
          z-index: 100;
          animation: drop 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
          pointer-events: none;
        }

        .dropping-piece::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.4), transparent 60%);
          pointer-events: none;
        }

        .reset-button {
          padding: clamp(10px, 2vmin, 14px) clamp(24px, 4vmin, 36px);
          font-size: clamp(14px, 2.5vmin, 18px);
          font-weight: 600;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }

        .reset-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
        }

        @keyframes drop {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            transform: translateY(var(--drop-distance));
          }
          95% {
            transform: translateY(calc(var(--drop-distance) - 4px));
          }
          100% {
            transform: translateY(var(--drop-distance));
          }
        }

        @keyframes pieceAppear {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes winGlow {
          0%, 100% {
            filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 15px rgba(253, 224, 71, 0.8)) drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
          }
        }

        @keyframes celebrate {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile optimizations */
        @media (max-width: 600px) {
          .game-container {
            justify-content: flex-start;
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .title {
            margin-bottom: 0;
          }

          :root {
            --cell-size: clamp(38px, 11vw, 48px);
          }
        }

        /* Small phones */
        @media (max-width: 380px) {
          :root {
            --cell-size: 36px;
          }
        }

        /* Landscape mode */
        @media (max-height: 500px) and (orientation: landscape) {
          .game-container {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 16px;
            padding: 10px;
          }

          .title {
            width: 100%;
            text-align: center;
            margin-bottom: 0;
          }

          .mode-selector,
          .status,
          .reset-button {
            position: absolute;
          }

          .mode-selector {
            top: 10px;
            right: 10px;
          }

          .status {
            top: 10px;
            left: 10px;
          }

          .reset-button {
            bottom: 10px;
            right: 10px;
          }
        }

        /* Reduced motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Touch feedback for mobile */
        @media (hover: none) {
          .cell:active {
            transform: scale(0.95);
          }
        }
      `}
            </style>

            <h1 className="title">CONNECT 4</h1>

            <div className="mode-selector">
                <button
                    className={`mode-button ${gameState.gameMode === 'two-player' ? 'active' : ''}`}
                    onClick={() => setGameMode('two-player')}
                >
                    Two Player
                </button>
                <button
                    className={`mode-button ${gameState.gameMode === 'single-player' ? 'active' : ''}`}
                    onClick={() => setGameMode('single-player')}
                >
                    Single Player
                </button>
            </div>

            <div className="status">
                {gameState.winner ? (
                    <span className="winner">PLAYER {gameState.winner} WINS!</span>
                ) : isDraw ? (
                    <span className="draw">IT'S A DRAW!</span>
                ) : gameState.isBotThinking ? (
                    <span className="thinking">BOT THINKING</span>
                ) : (
                    <span><span className="player">{gameState.currentPlayer}</span> TO MOVE</span>
                )}
            </div>

            <div className="board">
                {gameState.animatingPiece && (
                    <div
                        className="dropping-piece"
                        style={{
                            left: `calc(${gameState.animatingPiece.col} * (var(--cell-size) + var(--gap-size)) + var(--gap-size) + (var(--cell-size) - var(--piece-size)) / 2)`,
                            ['--drop-distance' as any]: `calc(${gameState.animatingPiece.row} * (var(--cell-size) + var(--gap-size)) + var(--gap-size))`
                        }}
                    >
                        {gameState.currentPlayer}
                    </div>
                )}
                {gameState.board.map((row, rowIdx) => (
                    <div key={rowIdx} className="row">
                        {row.map((cell, colIdx) => {
                            const isWinningCell = gameState.winningLine?.some(
                                ([r, c]) => r === rowIdx && c === colIdx
                            );

                            return (
                                <div
                                    key={colIdx}
                                    className={`cell ${cell ? 'filled' : ''} ${isWinningCell ? 'winning' : ''}`}
                                    onClick={() => dropPiece(colIdx)}
                                >
                                    {cell && <div className="piece">{cell}</div>}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <button onClick={resetGame} className="reset-button">
                NEW GAME
            </button>
        </div>
    );
};

export default Connect4;