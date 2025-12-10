import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HINDU_GODS, DIFFICULTY_SETTINGS } from '../constants';
import { generateGodImage } from '../services/geminiService';
import { playCorrectSound, playIncorrectSound, playTransitionSound } from '../services/soundService';
import { God, ImageSize, QuizState, Difficulty, Language } from '../types';
import Button from './Button';

interface QuizProps {
  imageSize: ImageSize;
  difficulty: Difficulty;
  language: Language;
}

const Quiz: React.FC<QuizProps> = ({ imageSize, difficulty, language }) => {
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
  
  // Fullscreen logic
  const quizRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref to hold the promise for the next round's data
  const nextRoundPromise = useRef<Promise<{ currentGod: God; imageUrl: string; options: God[] }> | null>(null);

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

  // Helper to generate data for a single round
  const generateRoundData = useCallback(async () => {
      const randomGod = HINDU_GODS[Math.floor(Math.random() * HINDU_GODS.length)];
      const options = getRandomOptions(randomGod);
      const { imageUrl, description } = await generateGodImage(randomGod.names.English, imageSize, difficulty);
      const godWithDescription = { ...randomGod, description };
      return { currentGod: godWithDescription, options, imageUrl };
  }, [difficulty, imageSize, getRandomOptions]);

  // Helper to fetch data (either from preload or fresh)
  const fetchNextRoundData = useCallback(async () => {
      if (nextRoundPromise.current) {
          const data = await nextRoundPromise.current;
          nextRoundPromise.current = null; // Clear consumed promise
          return data;
      }
      return await generateRoundData();
  }, [generateRoundData]);

  // Helper to start preloading in background
  const triggerPreload = useCallback(() => {
      // Don't preload if we are about to finish the game
      const nextGod = HINDU_GODS[Math.floor(Math.random() * HINDU_GODS.length)];
      const nextOptions = getRandomOptions(nextGod);
      nextRoundPromise.current = generateGodImage(nextGod.names.English, imageSize, difficulty)
          .then(({ imageUrl, description }) => ({ 
              currentGod: { ...nextGod, description }, 
              options: nextOptions, 
              imageUrl 
          }))
          .catch(err => {
              console.error("Background generation failed:", err);
              throw err;
          });
  }, [difficulty, imageSize, getRandomOptions]);

  const startNewRound = useCallback(async () => {
    // Check if we've reached the round limit
    if (gameState.totalRounds >= settings.rounds) {
        setGameState(prev => ({ ...prev, gameStatus: 'finished' }));
        return;
    }

    // Play subtle sound if moving to next round (user interaction)
    if (gameState.totalRounds > 0) {
      playTransitionSound();
    }

    setImgFadeIn(false);
    setGameState(prev => ({ 
      ...prev, 
      isLoading: true, 
      gameStatus: 'playing', 
      selectedOptionId: null, 
      feedback: null,
      imageUrl: null,
      currentGod: null,
      options: []
    }));
    setImageLoading(true);

    try {
      const data = await fetchNextRoundData();

      setGameState(prev => ({
        ...prev,
        currentGod: data.currentGod,
        imageUrl: data.imageUrl,
        options: data.options,
        isLoading: false
      }));
    } catch (error) {
      console.error("Failed to start round", error);
      setGameState(prev => ({ 
        ...prev, 
        isLoading: false, 
        feedback: "Failed to generate image. Please try again." 
      }));
    } finally {
        setImageLoading(false);
    }
  }, [gameState.totalRounds, settings.rounds, fetchNextRoundData]);

  const handleSkip = async () => {
    if (gameState.gameStatus !== 'playing') return;

    playTransitionSound();
    
    // Increment rounds, don't change score
    const nextRound = gameState.totalRounds + 1;

    // Check if this skip ends the game
    if (nextRound >= settings.rounds) {
         setGameState(prev => ({ ...prev, totalRounds: nextRound, gameStatus: 'finished' }));
         return;
    }

    setImgFadeIn(false);
    setGameState(prev => ({ 
      ...prev, 
      totalRounds: nextRound,
      isLoading: true, 
      gameStatus: 'playing', 
      selectedOptionId: null, 
      feedback: null,
      imageUrl: null,
      currentGod: null,
      options: []
    }));
    setImageLoading(true);

    try {
        const data = await fetchNextRoundData();
        setGameState(prev => ({
            ...prev,
            currentGod: data.currentGod,
            imageUrl: data.imageUrl,
            options: data.options,
            isLoading: false
        }));
        
        // Trigger preload for the subsequent question since we skipped the 'revealed' phase
        if (nextRound + 1 < settings.rounds) {
            triggerPreload();
        }

    } catch (e) {
        console.error("Skip failed", e);
        setGameState(prev => ({ ...prev, feedback: "Error loading next question." }));
    } finally {
        setImageLoading(false);
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
      nextRoundPromise.current = null;
      // Triggers the initial useEffect below
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
          <div className="max-w-2xl mx-auto w-full p-8 flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-3xl shadow-xl border border-orange-100 text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-4xl mb-6">
                🎉
              </div>
              <h2 className="text-3xl font-bold serif text-stone-800 mb-2">Game Complete!</h2>
              <p className="text-stone-500 mb-8">You have completed the {settings.label} path.</p>
              
              <div className="grid grid-cols-2 gap-8 w-full max-w-md mb-8">
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                      <div className="text-sm text-stone-500 font-bold uppercase tracking-wider mb-1">Final Score</div>
                      <div className="text-4xl font-bold text-orange-600 font-mono">{gameState.score}</div>
                  </div>
                  <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                      <div className="text-sm text-stone-500 font-bold uppercase tracking-wider mb-1">High Score</div>
                      <div className="text-4xl font-bold text-stone-700 font-mono">{highScore}</div>
                  </div>
              </div>

              <Button onClick={restartGame} className="w-full max-w-xs py-3 text-lg">
                  Play Again
              </Button>
          </div>
      );
  }

  return (
    <div ref={quizRef} className={`w-full flex flex-col items-center transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-8 overflow-y-auto' : 'max-w-4xl mx-auto p-4'}`}>
      
      {/* Control Bar */}
      <div className="w-full flex justify-between items-center mb-4">
          {!isFullscreen && (
            <div className="flex gap-6 items-center bg-white px-4 py-2 rounded-xl shadow-sm border border-stone-200">
                <div>
                <span className="text-stone-500 text-xs font-semibold uppercase tracking-wider block">Score</span>
                <div className="text-xl font-bold text-orange-600 font-mono leading-none">
                    {gameState.score}
                </div>
                </div>
                <div className="h-6 w-px bg-stone-200"></div>
                <div>
                <span className="text-stone-500 text-xs font-semibold uppercase tracking-wider block">High Score</span>
                <div className="text-xl font-bold text-stone-700 font-mono leading-none">{highScore}</div>
                </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 ml-auto">
             <div className="flex flex-col items-end mr-2">
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-[10px] font-bold uppercase tracking-wide mb-1">
                    {settings.label}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                    {gameState.totalRounds} / {settings.rounds}
                </span>
             </div>
             <button 
                onClick={toggleFullscreen}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
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
      <div className={`w-full grid gap-8 items-start transition-all duration-500 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-2 max-w-6xl' : 'grid-cols-1 lg:grid-cols-2'}`}>
        
        {/* Image Section */}
        <div className={`relative aspect-square w-full bg-stone-200 rounded-2xl overflow-hidden shadow-lg border-4 border-white group ${isFullscreen ? 'shadow-2xl' : ''}`}>
          {imageLoading || !gameState.imageUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-stone-400">
               <svg className="w-24 h-24 mb-6 text-orange-500 animate-pulse" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="50" cy="45" rx="15" ry="30" />
                    <ellipse cx="30" cy="55" rx="15" ry="25" transform="rotate(-45 30 55)" opacity="0.75" />
                    <ellipse cx="70" cy="55" rx="15" ry="25" transform="rotate(45 70 55)" opacity="0.75" />
                    <path d="M20 75 Q50 90 80 75" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
               </svg>
               <p className="animate-pulse serif text-orange-800 font-bold">Manifesting Divine Form...</p>
            </div>
          ) : (
            <img 
              src={gameState.imageUrl} 
              alt="Divine Form" 
              className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${imgFadeIn ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgFadeIn(true)}
            />
          )}
          
          {/* Status Overlay */}
          {gameState.feedback && (
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

            <div className={`grid gap-3 ${settings.options > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {gameState.isLoading ? (
                 // Loading Placeholders with Blinking Om
                 Array.from({ length: settings.options }).map((_, i) => (
                    <Button
                        key={`loading-${i}`}
                        variant="secondary"
                        disabled
                        className="h-16 text-2xl flex items-center justify-center bg-stone-100/50 border border-stone-200"
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

                    // Render name in selected language, fallback to English if missing
                    const displayName = god.names[language] || god.names.English;

                    return (
                    <Button
                        key={god.id}
                        onClick={() => handleOptionClick(god)}
                        variant={btnVariant}
                        disabled={gameState.gameStatus !== 'playing'}
                        className={`h-16 text-lg serif tracking-wide ${extraClasses}`}
                    >
                        {displayName}
                    </Button>
                    );
                })
            )}
            </div>

            {/* Skip Button */}
            {gameState.gameStatus === 'playing' && (
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