import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Users, 
  Bot, 
  ChevronDown,
  Sparkles,
  Timer,
  Target
} from 'lucide-react';
import type { Player, GameMode, GameStats, Position} from './uitilities/types';
import {ROWS, COLS} from './uitilities/types';
import { Connect4AI } from './uitilities/ai';
import { SoundEngine } from './uitilities/sound';
import './Connect4.css';

const Connect4Pro: React.FC = () => {
  // Game State
  const [board, setBoard] = useState<Player[][]>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>('red');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winner, setWinner] = useState<Player>(null);
  const [winningLine, setWinningLine] = useState<Position[]>([]);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ col: number; row: number } | null>(null);
  
  // Stats & Settings
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('connect4-stats');
    return saved ? JSON.parse(saved) : {
      redWins: 0,
      yellowWins: 0,
      draws: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0
    };
  });
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('connect4-sound') !== 'false';
  });
  
  const [showHints, setShowHints] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Position[]>([]);
  const [gameTime, setGameTime] = useState(0);
  
  // Refs
  const soundEngine = useRef<SoundEngine>(new SoundEngine());
  const ai = useRef<Connect4AI | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize AI based on mode
  useEffect(() => {
    if (gameMode.startsWith('ai-')) {
      const difficulty = gameMode.split('-')[1] as 'easy' | 'medium' | 'hard';
      ai.current = new Connect4AI(difficulty);
    } else {
      ai.current = null;
    }
  }, [gameMode]);

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Sound toggle
  useEffect(() => {
    soundEngine.current.setEnabled(soundEnabled);
    localStorage.setItem('connect4-sound', soundEnabled.toString());
  }, [soundEnabled]);

  // Save stats
  useEffect(() => {
    localStorage.setItem('connect4-stats', JSON.stringify(stats));
  }, [stats]);

  const getLowestEmptyRow = useCallback((boardState: Player[][], col: number): number => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (boardState[row][col] === null) return row;
    }
    return -1;
  }, []);

  const checkWinner = useCallback((boardState: Player[][], row: number, col: number): Position[] | null => {
    const player = boardState[row][col];
    if (!player) return null;

    const directions = [
      [[0, 1], [0, -1]],   // Horizontal
      [[1, 0], [-1, 0]],   // Vertical
      [[1, 1], [-1, -1]],  // Diagonal \
      [[1, -1], [-1, 1]]   // Diagonal /
    ];

    for (const direction of directions) {
      const line: Position[] = [{ row, col }];
      
      for (const [dr, dc] of direction) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && boardState[r][c] === player) {
          line.push({ row: r, col: c });
          r += dr;
          c += dc;
        }
      }
      
      if (line.length >= 4) return line;
    }
    return null;
  }, []);

  const isDraw = useCallback((boardState: Player[][]): boolean => {
    return boardState.every(row => row.every(cell => cell !== null));
  }, []);

  const makeMove = useCallback((col: number) => {
    if (gameState !== 'playing' || isAnimating) return;
    
    const row = getLowestEmptyRow(board, col);
    if (row === -1) {
      soundEngine.current.playError();
      return;
    }

    setIsAnimating(true);
    setDropPosition({ col, row });
    soundEngine.current.playDrop();

    setTimeout(() => {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = currentPlayer;
      setBoard(newBoard);
      setMoveHistory(prev => [...prev, { row, col }]);
      
      const winLine = checkWinner(newBoard, row, col);
      
      if (winLine) {
        setWinningLine(winLine);
        setWinner(currentPlayer);
        setGameState('won');
        soundEngine.current.playWin();
        
        setStats(prev => {
          const isRed = currentPlayer === 'red';
          const newStreak = isRed ? prev.currentStreak + 1 : 0;
          return {
            ...prev,
            redWins: isRed ? prev.redWins + 1 : prev.redWins,
            yellowWins: !isRed ? prev.yellowWins + 1 : prev.yellowWins,
            totalGames: prev.totalGames + 1,
            currentStreak: newStreak,
            bestStreak: Math.max(prev.bestStreak, newStreak)
          };
        });
      } else if (isDraw(newBoard)) {
        setGameState('draw');
        setStats(prev => ({
          ...prev,
          draws: prev.draws + 1,
          totalGames: prev.totalGames + 1,
          currentStreak: 0
        }));
      } else {
        setCurrentPlayer(prev => prev === 'red' ? 'yellow' : 'red');
      }
      
      setDropPosition(null);
      setIsAnimating(false);
    }, 600);
  }, [board, currentPlayer, gameState, isAnimating, getLowestEmptyRow, checkWinner, isDraw]);

  // AI Turn
  useEffect(() => {
    if (gameMode.startsWith('ai-') && currentPlayer === 'yellow' && gameState === 'playing' && !isAnimating) {
      const timer = setTimeout(() => {
        if (ai.current) {
          const col = ai.current.getBestMove(board);
          makeMove(col);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameState, isAnimating, board, gameMode, makeMove]);

  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer('red');
    setGameState('playing');
    setWinner(null);
    setWinningLine([]);
    setMoveHistory([]);
    setGameTime(0);
    setDropPosition(null);
    setIsAnimating(false);
  };

  const changeGameMode = (mode: GameMode) => {
    setGameMode(mode);
    resetGame();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHint = useCallback(() => {
    if (!showHints || gameState !== 'playing') return null;
    // Simple hint: find first winning move or block opponent
    const testAI = new Connect4AI('hard');
    return testAI.getBestMove(board);
  }, [showHints, gameState, board]);

  const hintCol = getHint();

  return (
    <div className="connect4-pro">
      {/* Background Effects */}
      <div className="bg-grid" />
      <div className="bg-glow" />
      
      {/* Header */}
      <header className="game-header">
        <div className="logo">
          <Sparkles className="logo-icon" />
          <h1>CONNECT<span className="accent">4</span> PRO</h1>
        </div>
        
        <div className="header-controls">
          <button 
            className="icon-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <a 
            href="https://github.com/ImmanuelJoya/Connect4"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn github"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </header>

      <main className="game-main">
        {/* Left Panel - Stats */}
        <aside className="side-panel left">
          <div className="panel-card">
            <h2><Trophy size={18} /> Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item red">
                <span className="stat-label">Red Wins</span>
                <span className="stat-value">{stats.redWins}</span>
              </div>
              <div className="stat-item yellow">
                <span className="stat-label">Yellow Wins</span>
                <span className="stat-value">{stats.yellowWins}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Draws</span>
                <span className="stat-value">{stats.draws}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Games</span>
                <span className="stat-value">{stats.totalGames}</span>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <h2><Target size={18} /> Current Game</h2>
            <div className="game-info">
              <div className="info-row">
                <Timer size={16} />
                <span>{formatTime(gameTime)}</span>
              </div>
              <div className="info-row">
                <span>Moves:</span>
                <span>{moveHistory.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center - Game Board */}
        <div className="game-center">
          {/* Mode Selector */}
          <div className="mode-tabs">
            {[
              { id: 'pvp', label: 'Two Player', icon: Users },
              { id: 'ai-easy', label: 'AI Easy', icon: Bot },
              { id: 'ai-medium', label: 'AI Medium', icon: Bot },
              { id: 'ai-hard', label: 'AI Hard', icon: Bot }
            ].map((mode) => (
              <button
                key={mode.id}
                className={`mode-tab ${gameMode === mode.id ? 'active' : ''}`}
                onClick={() => changeGameMode(mode.id as GameMode)}
              >
                <mode.icon size={16} />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Turn Indicator */}
          <div className="turn-indicator">
            <AnimatePresence mode="wait">
              {gameState === 'playing' ? (
                <motion.div
                  key={currentPlayer}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`turn-badge ${currentPlayer}`}
                >
                  <div className={`player-dot ${currentPlayer}`} />
                  <span>{currentPlayer === 'red' ? 'Red' : 'Yellow'}'s Turn</span>
                  {gameMode.startsWith('ai-') && currentPlayer === 'yellow' && (
                    <span className="ai-thinking">Thinking...</span>
                  )}
                </motion.div>
              ) : gameState === 'won' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="winner-banner"
                >
                  <Trophy size={32} />
                  <span>{winner === 'red' ? 'Red' : 'Yellow'} Wins!</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="draw-banner"
                >
                  <span>It's a Draw!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Game Board */}
          <div className="board-container">
            {/* Column Previews */}
            <div className="column-previews">
              {Array.from({ length: COLS }).map((_, col) => (
                <div
                  key={col}
                  className={`col-preview ${hoveredCol === col ? 'active' : ''} ${hintCol === col && showHints ? 'hint' : ''}`}
                  onMouseEnter={() => setHoveredCol(col)}
                  onMouseLeave={() => setHoveredCol(null)}
                  onClick={() => makeMove(col)}
                >
                  {hoveredCol === col && !isAnimating && gameState === 'playing' && (
                    <motion.div
                      layoutId="preview-piece"
                      className={`preview-piece ${currentPlayer}`}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Board Grid */}
            <div className="board">
              {board.map((row, rowIdx) => (
                <div key={rowIdx} className="board-row">
                  {row.map((cell, colIdx) => {
                    const isWinning = winningLine.some(
                      pos => pos.row === rowIdx && pos.col === colIdx
                    );
                    
                    return (
                      <div
                        key={colIdx}
                        className={`board-cell ${isWinning ? 'winning' : ''}`}
                        onClick={() => makeMove(colIdx)}
                        onMouseEnter={() => setHoveredCol(colIdx)}
                      >
                        <AnimatePresence>
                          {cell && (
                            <motion.div
                              initial={dropPosition?.col === colIdx && dropPosition?.row === rowIdx ? 
                                { y: -500, opacity: 0 } : { scale: 0 }}
                              animate={{ y: 0, scale: 1, opacity: 1 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: dropPosition?.col === colIdx && dropPosition?.row === rowIdx ? 0 : 0
                              }}
                              className={`game-piece ${cell} ${isWinning ? 'winning' : ''}`}
                            >
                              <div className="piece-inner" />
                              <div className="piece-shine" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="game-controls">
            <button className="btn btn-primary" onClick={resetGame}>
              <RotateCcw size={18} />
              New Game
            </button>
            <button 
              className={`btn btn-secondary ${showHints ? 'active' : ''}`}
              onClick={() => setShowHints(!showHints)}
            >
              <Target size={18} />
              {showHints ? 'Hide Hints' : 'Show Hints'}
            </button>
          </div>
        </div>

        {/* Right Panel - History & Settings */}
        <aside className="side-panel right">
          <div className="panel-card">
            <h2>Move History</h2>
            <div className="move-list">
              {moveHistory.length === 0 ? (
                <p className="empty-state">No moves yet</p>
              ) : (
                moveHistory.map((move, idx) => (
                  <div key={idx} className="move-item">
                    <span className="move-number">#{idx + 1}</span>
                    <span className={`move-player ${idx % 2 === 0 ? 'red' : 'yellow'}`} />
                    <span className="move-pos">Col {move.col + 1}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel-card">
            <h2>How to Play</h2>
            <ul className="rules-list">
              <li>Click a column to drop your piece</li>
              <li>Connect 4 pieces horizontally, vertically, or diagonally</li>
              <li>Block your opponent while building your line</li>
              <li>First to connect 4 wins!</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Connect4Pro;