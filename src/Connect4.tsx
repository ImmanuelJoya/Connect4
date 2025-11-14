import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaGithub } from 'react-icons/fa';
import dropSound from './connect4drop.mp3';

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

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('connect4-muted');
    return saved === 'true';
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(dropSound);
    audioRef.current.volume = 0.3;
    audioRef.current.muted = isMuted;
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
    localStorage.setItem('connect4-muted', isMuted.toString());
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const playDropSound = useCallback(() => {
    if (!audioRef.current || isMuted) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(err => {
      console.warn('Sound playback failed:', err);
    });
  }, [isMuted]);

  const getBotMove = useCallback((board: Board, botPlayer: Player): number => {
    const opponent = botPlayer === '🔴' ? '🟡' : '🔴';

    // Win check
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

    // Block opponent win
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

    // Center priority
    const centerCols = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerCols) {
      if (getLowestEmptyRow(board, col) !== -1) {
        return col;
      }
    }

    // Random fallback
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
      [[0, 1], [0, -1]],  // Horizontal
      [[1, 0], [-1, 0]],  // Vertical
      [[1, 1], [-1, -1]], // Diagonal \
      [[1, -1], [-1, 1]]  // Diagonal /
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
    playDropSound();

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
  }, [gameState, checkWinner, playDropSound]);

  useEffect(() => {
    if (!gameState.isBotThinking || gameState.winner) return;

    const timer = setTimeout(() => {
      const botMove = getBotMove(gameState.board, '🟡');
      const row = getLowestEmptyRow(gameState.board, botMove);
      if (row === -1) return;

      setGameState(prev => ({ ...prev, animatingPiece: { row, col: botMove } }));
      playDropSound();

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
  }, [gameState.isBotThinking, gameState.board, getBotMove, checkWinner, playDropSound]);

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
      <nav>
        <h1 className="title">CONNECT 4</h1>
        <a
          href="https://github.com/ImmanuelJoya/Connect4.git"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed top-5 right-5 z-50 text-slate-200 hover:text-white transition-all duration-300 group opacity-80 hover:opacity-100"
          aria-label="View on GitHub"
        >
          <div className="p-2 rounded-full bg-slate-800/50 backdrop-blur-sm group-hover:bg-slate-700/70 transition-colors duration-300">
            <FaGithub className="text-3xl md:text-4xl hover:scale-110 transition-transform duration-300" />
          </div>
        </a>
      </nav>

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

      <button
        onClick={toggleMute}
        className="mute-button"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};

export default Connect4;