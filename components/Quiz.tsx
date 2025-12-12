
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HINDU_GODS, DIFFICULTY_SETTINGS } from '../constants';
import { generateGodImage } from '../services/geminiService';
import { playCorrectSound, playIncorrectSound, playTransitionSound } from '../services/soundService';
import { God, ImageSize, QuizState, Difficulty, Language, GameHistoryEntry } from '../types';
import Button from './Button';

interface QuizProps {
  imageSize: ImageSize;
  difficulty: Difficulty;
  language: Language;
  onGameComplete: (score: number, totalRounds: number) => void;
  onExit: () => void;
  playerName: string;
}

type DeityTheme = 'fire' | 'water' | 'nature' | 'cosmic' | 'wealth' | 'knowledge' | 'default';

const getDeityTheme = (god: God | null): DeityTheme => {
  if (!god) return 'default';
  const name = god.names.English.toLowerCase();
  
  // Fire / Sun
  if (name.includes('agni') || name.includes('surya') || name.includes('aditya') || name.includes('fire')) return 'fire';
  
  // Water
  if (name.includes('varuna') || name.includes('water') || name.includes('matsya') || name.includes('ganga')) return 'water';
  
  // Nature / Forest / Earth
  if (name.includes('hanuman') || name.includes('varaha') || name.includes('bhoomi') || name.includes('maruti')) return 'nature';
  
  // Cosmic / Sky / Destruction / Preservation
  if (name.includes('shiva') || name.includes('vishnu') || name.includes('krishna') || name.includes('indra') || name.includes('bramha') || name.includes('chandra')) return 'cosmic';
  
  // Wealth / Gold
  if (name.includes('lakshmi') || name.includes('kubera') || name.includes('venkatesha') || name.includes('balaji')) return 'wealth';

  // Knowledge / Arts
  if (name.includes('saraswati') || name.includes('hayagriva')) return 'knowledge';
  
  return 'default';
};

const DeityBackground: React.FC<{ theme: DeityTheme }> = ({ theme }) => {
  let gradientClass = "bg-stone-50";
  let animationClass = "";
  let particles = null;

  switch (theme) {
    case 'fire':
      gradientClass = "bg-gradient-to-t from-orange-100 via-amber-50 to-white";
      animationClass = "animate-pulse-slow"; // Gentle heat pulse
      break;
    case 'water':
      gradientClass = "bg-gradient-to-br from-cyan-50 via-blue-50 to-white";
      animationClass = "animate-wave-slow"; // Gentle drifting
      break;
    case 'nature':
      gradientClass = "bg-gradient-to-b from-emerald-50 via-green-50 to-stone-50";
      animationClass = "animate-breathe";
      break;
    case 'cosmic':
      gradientClass = "bg-gradient-to-tr from-indigo-50 via-purple-50 to-slate-50";
      animationClass = "animate-twinkle-slow";
      break;
    case 'wealth':
      gradientClass = "bg-gradient-to-br from-yellow-50 via-amber-50 to-white";
      animationClass = "animate-shimmer";
      break;
    case 'knowledge':
        gradientClass = "bg-gradient-to-t from-slate-50 via-white to-sky-50";
        animationClass = "animate-float";
        break;
    default:
      gradientClass = "bg-gradient-to-b from-stone-50 to-white";
      break;
  }

  return (
    <div className={`absolute inset-0 z-0 transition-all duration-1000 ease-in-out overflow-hidden pointer-events-none ${gradientClass} ${animationClass} opacity-40`}>
        {/* Abstract shapes for texture */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/subtle-white-feathers.png')] mix-blend-multiply"></div>
        {theme === 'fire' && <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-orange-200/20 to-transparent animate-pulse"></div>}
        {theme === 'water' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100/20 to-transparent animate-pulse-slow"></div>}
        {theme === 'cosmic' && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/10 to-transparent"></div>}
    </div>
  );
};

const Quiz: React.FC<QuizProps> = ({ imageSize, difficulty, language, onGameComplete, onExit, playerName }) => {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  const [gameState, setGameState] = useState<QuizState>({
    currentGod: null,
    imageUrl: null,
    options: [],
    score: 0,
    totalRounds: 0,
    isLoading: true,
    gameStatus: 'idle',
    selectedOptionId: null,
    feedback: null
  });

  const [highScore, setHighScore] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imgFadeIn, setImgFadeIn] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // Fullscreen logic
  const quizRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref to hold the data for the next round
  // Now stores text data directly + a promise for the image
  const nextRoundRef = useRef<{ 
      currentGod: God; 
      options: God[]; 
      imagePromise: Promise<{ imageUrl: string; description?: string }> 
  } | null>(null);

  useEffect(() => {
    const storedScore = localStorage.getItem(`divine_quiz_highscore_${difficulty}`);
    if (storedScore) {
        setHighScore(parseInt(storedScore, 10));
    } else {
        setHighScore(0);
    }
  }, [difficulty]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!quizRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await quizRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle failed", err);
    }
  };

  // Helper to get random options based on difficulty count
  const getRandomOptions = useCallback((correctGod: God): God[] => {
    const others = HINDU_GODS.filter(g => g.id !== correctGod.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
    const selectedOthers = shuffledOthers.slice(0, settings.options - 1);
    return [correctGod, ...selectedOthers].sort(() => 0.5 - Math.random());
  }, [settings.options]);

  // Helper to generate data for a single round (Sync + Async Promise)
  const generateRoundData = useCallback(() => {
      const randomGod = HINDU_GODS[Math.floor(Math.random() * HINDU_GODS.length)];
      const options = getRandomOptions(randomGod);
      // Initiate image generation but don't await it here
      const imagePromise = generateGodImage(randomGod.names.English, imageSize, difficulty, language);
      
      return { currentGod: randomGod, options, imagePromise };
  }, [difficulty, imageSize, language, getRandomOptions]);

  // Helper to start preloading in background
  const triggerPreload = useCallback(() => {
      const nextGod = HINDU_GODS[Math.floor(Math.random() * HINDU_GODS.length)];
      const nextOptions = getRandomOptions(nextGod);
      const imagePromise = generateGodImage(nextGod.names.English, imageSize, difficulty, language);
      
      // Store future data
      nextRoundRef.current = { 
          currentGod: nextGod, 
          options: nextOptions, 
          imagePromise 
      };
      
      // Prevent unhandled rejection logging in console if users quit before this is consumed
      imagePromise.catch(() => {}); 
  }, [difficulty, imageSize, language, getRandomOptions]);

  const startNewRound = useCallback(async () => {
    // Check if we've reached the round limit
    if (gameState.totalRounds >= settings.rounds) {
        setGameState(prev => ({ ...prev, gameStatus: 'finished' }));
        return;
    }

    if (gameState.totalRounds > 0) {
      playTransitionSound();
    }

    setImgFadeIn(false);
    setImageLoadError(false);

    // 1. Get Text Data (Instant)
    let data;
    if (nextRoundRef.current) {
        data = nextRoundRef.current;
        nextRoundRef.current = null;
    } else {
        data = generateRoundData();
    }

    // 2. Update State Immediatey to show Options
    setGameState(prev => ({ 
      ...prev, 
      currentGod: data.currentGod,
      options: data.options,
      imageUrl: null, // Image is loading
      isLoading: false, // UI is active (but image section loads)
      gameStatus: 'playing',
      selectedOptionId: null,
      feedback: null
    }));
    
    // 3. Handle Image Loading
    setImageLoading(true);

    try {
      const { imageUrl, description } = await data.imagePromise;
      
      // Update state with loaded image
      setGameState(prev => {
        // Safety: Ensure we are still on the same god (in case of rapid skips)
        if (prev.currentGod?.id === data.currentGod.id) {
           return {
               ...prev,
               imageUrl,
               currentGod: { ...prev.currentGod, description }
           };
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to load image", error);
      setImageLoadError(true);
    } finally {
        setImageLoading(false);
    }
  }, [gameState.totalRounds, settings.rounds, generateRoundData]);

  const handleSkip = async () => {
    if (gameState.gameStatus !== 'playing') return;

    playTransitionSound();
    
    const nextRound = gameState.totalRounds + 1;
    if (nextRound >= settings.rounds) {
         setGameState(prev => ({ ...prev, totalRounds: nextRound, gameStatus: 'finished' }));
         return;
    }

    setImgFadeIn(false);
    setImageLoadError(false);

    // Get Text Data (Instant)
    let data;
    if (nextRoundRef.current) {
        data = nextRoundRef.current;
        nextRoundRef.current = null;
    } else {
        data = generateRoundData();
    }

    setGameState(prev => ({ 
      ...prev, 
      totalRounds: nextRound,
      currentGod: data.currentGod,
      options: data.options,
      imageUrl: null,
      isLoading: false,
      gameStatus: 'playing',
      selectedOptionId: null,
      feedback: null
    }));
    
    setImageLoading(true);

    try {
        const { imageUrl, description } = await data.imagePromise;
        setGameState(prev => {
            if (prev.currentGod?.id === data.currentGod.id) {
                return {
                    ...prev,
                    imageUrl,
                    currentGod: { ...prev.currentGod, description }
                };
            }
            return prev;
        });
        
        // Trigger next preload
        if (nextRound + 1 < settings.rounds) {
            triggerPreload();
        }

    } catch (e) {
        console.error("Skip failed", e);
        setImageLoadError(true);
    } finally {
        setImageLoading(false);
    }
  };

  const handleRetry = async () => {
      playTransitionSound();
      
      if (!gameState.currentGod) {
          startNewRound();
      } else {
          setImgFadeIn(false);
          setImageLoadError(false);
          setImageLoading(true);
          setGameState(prev => ({ ...prev, imageUrl: null, feedback: null })); // Clear image to show loader

          try {
              const { imageUrl, description } = await generateGodImage(
                  gameState.currentGod.names.English, 
                  imageSize, 
                  difficulty,
                  language
              );
              setGameState(prev => ({ 
                  ...prev, 
                  imageUrl, 
                  currentGod: prev.currentGod ? { ...prev.currentGod, description } : null
              }));
          } catch (e) {
              console.error("Retry failed", e);
              setImageLoadError(true);
          } finally {
              setImageLoading(false);
          }
      }
  };

  const restartGame = () => {
      playTransitionSound();
      setGameState({
        currentGod: null,
        imageUrl: null,
        options: [],
        score: 0,
        totalRounds: 0,
        isLoading: true,
        gameStatus: 'idle',
        selectedOptionId: null,
        feedback: null
      });
      nextRoundRef.current = null;
      // Triggers the initial useEffect below
  };

  const finishGameAndExit = () => {
      onGameComplete(gameState.score, settings.rounds);
  };

  // Initial load or restart
  useEffect(() => {
    if (gameState.gameStatus === 'idle') {
      startNewRound();
    }
  }, [gameState.gameStatus, startNewRound]);

  const handleOptionClick = (god: God) => {
    if (gameState.gameStatus !== 'playing') return;

    const isCorrect = god.id === gameState.currentGod?.id;
    
    // Play feedback sound
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    // Display feedback in selected language if available, fallback to English
    const nameToDisplay = gameState.currentGod?.names[language] || gameState.currentGod?.names.English;

    const feedback = isCorrect 
      ? `Correct! It is ${nameToDisplay}.` 
      : `Incorrect. This is ${nameToDisplay}.`;

    const points = isCorrect ? settings.points : 0;
    const newScore = gameState.score + points;
    const newRoundsPlayed = gameState.totalRounds + 1;
    
    if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem(`divine_quiz_highscore_${difficulty}`, newScore.toString());
    }

    setGameState(prev => ({
      ...prev,
      score: newScore,
      totalRounds: newRoundsPlayed,
      gameStatus: 'revealed',
      selectedOptionId: god.id,
      feedback
    }));

    // Start preloading the next round immediately if game isn't over
    if (newRoundsPlayed < settings.rounds) {
        triggerPreload();
    }
  };

  if (gameState.gameStatus === 'finished') {
      return (
          <div className="max-w-2xl mx-auto w-full p-8 flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-3xl shadow-xl border border-orange-100 text-center relative z-10">
              <DeityBackground theme="wealth" />
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-4xl mb-6 relative z-10">
                🎉
              </div>
              <h2 className="text-3xl font-bold serif text-stone-800 mb-2 relative z-10">Game Complete!</h2>
              <p className="text-stone-500 mb-8 relative z-10">You have completed the {settings.label} path.</p>
              
              <div className="grid grid-cols-2 gap-8 w-full max-w-md mb-8 relative z-10">
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                      <div className="text-sm text-stone-500 font-bold uppercase tracking-wider mb-1">Final Score</div>
                      <div className="text-4xl font-bold text-orange-600 font-mono">{gameState.score}</div>
                  </div>
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                      <div className="text-sm text-stone-500 font-bold uppercase tracking-wider mb-1">High Score</div>
                      <div className="text-4xl font-bold text-stone-700 font-mono">{highScore}</div>
                  </div>
              </div>

              <div className="flex gap-4 relative z-10 w-full max-w-xs flex-col">
                  <Button onClick={restartGame} className="w-full py-3 text-lg">
                      Play Again
                  </Button>
                  <Button onClick={finishGameAndExit} variant="outline" className="w-full py-3 text-lg">
                      Exit to Menu
                  </Button>
              </div>
          </div>
      );
  }

  const currentTheme = getDeityTheme(gameState.currentGod);

  return (
    <div ref={quizRef} className={`w-full flex flex-col items-center transition-all duration-300 relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-8 overflow-y-auto' : 'max-w-4xl mx-auto p-4 rounded-xl'}`}>
      
      {/* Dynamic Background */}
      <DeityBackground theme={currentTheme} />
      
      {/* Inject Keyframes */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes wave-slow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes twinkle-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.02); }
        }
      `}</style>

      {/* Control Bar */}
      <div className="w-full flex justify-between items-center mb-4 relative z-10">
          {!isFullscreen && (
            <div className="flex gap-4 items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-stone-200">
                <Button variant="ghost" className="!p-1 h-8 w-8 rounded-full" onClick={onExit} title="Exit Game">
                    <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </Button>
                <div>
                  <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Player</div>
                  <div className="font-bold text-stone-800 text-sm">{playerName}</div>
                </div>
                <div className="h-6 w-px bg-stone-200"></div>
                <div>
                <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider block">Score</span>
                <div className="text-xl font-bold text-orange-600 font-mono leading-none">
                    {gameState.score}
                </div>
                </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 ml-auto">
             <div className="flex flex-col items-end mr-2">
                <span className="px-2 py-0.5 bg-orange-100/90 text-orange-800 rounded-full text-[10px] font-bold uppercase tracking-wide mb-1">
                    {settings.label}
                </span>
                <span className="text-xs text-stone-500 font-mono font-bold">
                    {gameState.totalRounds} / {settings.rounds}
                </span>
             </div>
             <button 
                onClick={toggleFullscreen}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors bg-white/50 backdrop-blur-sm"
                title="Toggle Fullscreen"
             >
                {isFullscreen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-1.447-.894L15 7m0 13V7" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                )}
             </button>
          </div>
      </div>

      {/* Main Game Area */}
      <div className={`w-full grid gap-8 items-start transition-all duration-500 relative z-10 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-2 max-w-6xl' : 'grid-cols-1 lg:grid-cols-2'}`}>
        
        {/* Image Section */}
        <div className={`relative aspect-square w-full bg-stone-200 rounded-2xl overflow-hidden shadow-lg border-4 border-white group ${isFullscreen ? 'shadow-2xl' : ''}`}>
          {imageLoading || !gameState.imageUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100/90 backdrop-blur-sm text-stone-400">
               <svg className="w-24 h-24 mb-6 text-orange-500 animate-pulse" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="50" cy="45" rx="15" ry="30" />
                    <ellipse cx="30" cy="55" rx="15" ry="25" transform="rotate(-45 30 55)" opacity="0.75" />
                    <ellipse cx="70" cy="55" rx="15" ry="25" transform="rotate(45 70 55)" opacity="0.75" />
                    <path d="M20 75 Q50 90 80 75" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
               </svg>
               <p className="animate-pulse serif text-orange-800 font-bold">Manifesting Divine Form...</p>
            </div>
          ) : (imageLoadError) ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-stone-500 p-6 text-center">
                 <span className="text-4xl mb-4">⚠️</span>
                 <p className="mb-4 font-bold text-stone-600">Divine vision clouded.</p>
                 <Button onClick={handleRetry} variant="outline" className="border-orange-400 text-orange-600 hover:bg-orange-50">
                    <span className="mr-1">↻</span> Retry Generation
                 </Button>
             </div>
          ) : (
            <img 
              src={gameState.imageUrl} 
              alt="Divine Form" 
              className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${imgFadeIn ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgFadeIn(true)}
              onError={() => setImageLoadError(true)}
            />
          )}
          
          {/* Status Overlay */}
          {gameState.feedback && !gameState.isLoading && gameState.imageUrl && !imageLoadError && (
            <div className={`absolute bottom-0 left-0 right-0 p-4 text-white text-center backdrop-blur-md font-bold text-lg animate-in fade-in slide-in-from-bottom-4 duration-300
              ${gameState.selectedOptionId === gameState.currentGod?.id ? 'bg-green-600/80' : 'bg-red-600/80'}
            `}>
              {gameState.feedback}
            </div>
          )}
        </div>

        {/* Interaction Section */}
        <div className="flex flex-col gap-4 justify-center h-full">
            <div className="mb-2">
                <h2 className={`font-bold serif text-stone-800 mb-1 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>Who is this Deity?</h2>
                <p className="text-stone-500 text-sm">Select the correct name from the options below.</p>
            </div>

            <div className="grid gap-3 grid-cols-2">
            {gameState.isLoading ? (
                 // Loading Placeholders with Blinking Om
                 Array.from({ length: settings.options }).map((_, i) => (
                    <Button
                        key={`loading-${i}`}
                        variant="secondary"
                        disabled
                        className="h-12 text-xl flex items-center justify-center bg-stone-100/50 border border-stone-200"
                    >
                        <span className="animate-pulse text-orange-400">🕉️</span>
                    </Button>
                 ))
            ) : (
                gameState.options.map((god) => {
                    let btnVariant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'secondary';
                    
                    if (gameState.gameStatus === 'revealed') {
                        if (god.id === gameState.currentGod?.id) {
                            btnVariant = 'primary';
                        } else if (god.id === gameState.selectedOptionId) {
                            btnVariant = 'outline';
                        } else {
                            btnVariant = 'ghost';
                        }
                    }

                    let extraClasses = "";
                    if (gameState.gameStatus === 'revealed') {
                        if (god.id === gameState.currentGod?.id) {
                            // Correct Answer: Scale up, Green, Shadow, Ring
                            extraClasses = "!bg-green-600 !text-white !border-green-600 transform scale-105 shadow-xl ring-2 ring-green-300 ring-offset-1 z-10";
                        } else if (god.id === gameState.selectedOptionId) {
                            // Incorrect Selected Answer: Scale down, Red
                            extraClasses = "!bg-red-500 !text-white !border-red-500 transform scale-95 opacity-90";
                        } else {
                            // Incorrect Unselected: Fade out and shrink
                            extraClasses = "opacity-40 grayscale transform scale-95";
                        }
                    }

                    const displayName = god.names[language] || god.names.English;

                    return (
                    <Button
                        key={god.id}
                        onClick={() => handleOptionClick(god)}
                        variant={btnVariant}
                        // Disable buttons while image is loading to prevent blind guessing
                        disabled={gameState.gameStatus !== 'playing' || !gameState.imageUrl}
                        className={`h-12 text-sm serif tracking-wide ${extraClasses}`}
                    >
                        {displayName}
                    </Button>
                    );
                })
            )}
            </div>

            {/* Skip Button */}
            {gameState.gameStatus === 'playing' && !gameState.isLoading && (
                <div className="flex justify-center mt-2">
                    <Button 
                        variant="ghost" 
                        onClick={handleSkip} 
                        disabled={gameState.isLoading}
                        className="text-stone-400 hover:text-orange-600 hover:bg-orange-50 text-sm py-2 px-4"
                    >
                        Skip Question <span className="ml-1">⏭️</span>
                    </Button>
                </div>
            )}

            {gameState.gameStatus === 'revealed' && (
                <div className="mt-6 pt-6 border-t border-stone-200 animate-in fade-in zoom-in-95 duration-300">
                    {gameState.currentGod?.description && (
                        <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-4 text-left">
                            <h3 className="font-bold text-orange-800 mb-2 text-xs uppercase tracking-wider flex items-center gap-1">
                                ℹ️ Divine Knowledge
                            </h3>
                            <p className="text-stone-700 text-sm leading-relaxed font-serif">
                                {gameState.currentGod?.description}
                            </p>
                        </div>
                    )}
                    <Button onClick={startNewRound} className="w-full py-4 text-lg shadow-xl shadow-orange-200">
                        {gameState.totalRounds >= settings.rounds ? "Finish Game" : "Next Question"}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
