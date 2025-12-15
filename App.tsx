
import React, { useState } from 'react';
import Quiz from './components/Quiz';
import ChatBot from './components/ChatBot';
import AdPlaceholder from './components/AdPlaceholder';
import WelcomeScreen from './components/WelcomeScreen';
import GameHistory from './components/GameHistory';
import ApiKeyWall from './components/ApiKeyWall';
import { ImageSize, UserProfile, ViewState, GameHistoryEntry } from './types';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('welcome');
  const [isApiKeyReady, setIsApiKeyReady] = useState(false);
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    language: 'English',
    difficulty: 'medium'
  });

  // Game History State
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);

  // Fixed Image Size
  const imageSize = ImageSize.Size1K;

  const handleStartGame = (profile: UserProfile) => {
    setUserProfile(profile);
    setViewState('game');
  };

  const handleGameComplete = (score: number, totalRounds: number) => {
    // Add to history
    const newEntry: GameHistoryEntry = {
      id: Date.now().toString(),
      date: new Date(),
      score,
      totalRounds,
      difficulty: userProfile.difficulty,
      language: userProfile.language
    };
    setGameHistory(prev => [...prev, newEntry]);
    
    // Return to history screen or welcome screen? History seems appropriate after finishing.
    setViewState('history');
  };

  const handleExitGame = () => {
    setViewState('welcome');
  };

  if (!isApiKeyReady) {
    return <ApiKeyWall onKeySelected={() => setIsApiKeyReady(true)} />;
  }

  return (
    <div className="h-full flex flex-col bg-stone-50 text-stone-900 overflow-hidden relative">
      
      {/* Dynamic Header - Hidden in Welcome Screen to keep it clean */}
      {viewState !== 'welcome' && (
        <header className="bg-white border-b border-orange-100 px-6 py-4 flex items-center justify-between z-10 shadow-sm shrink-0 flex-wrap gap-4">
          <div className="flex items-center gap-2">
              <span className="text-3xl">🕉️</span>
              <h1 className="text-2xl font-bold serif text-orange-600 hidden sm:block">Divine Quiz</h1>
          </div>
          
          <button 
              onClick={() => setIsChatOpen(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center gap-2 ml-auto"
          >
              <span className="hidden sm:inline">Ask Guru</span>
              <span className="sm:hidden">Guru</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </button>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        
        {viewState === 'game' && (
           <AdPlaceholder className="w-full max-w-4xl h-14 shrink-0 shadow-sm mb-6" text="Top Banner Ad" />
        )}

        <div className="w-full flex-1 flex flex-col items-center">
          {viewState === 'welcome' && (
            <WelcomeScreen 
              initialProfile={userProfile} 
              onStart={handleStartGame}
              onViewHistory={() => setViewState('history')}
            />
          )}

          {viewState === 'game' && (
            <Quiz 
              key={`${userProfile.difficulty}-${userProfile.language}`} // Force remount if settings change
              imageSize={imageSize} 
              difficulty={userProfile.difficulty} 
              language={userProfile.language}
              onGameComplete={handleGameComplete}
              onExit={handleExitGame}
              playerName={userProfile.name}
            />
          )}

          {viewState === 'history' && (
            <GameHistory 
              history={gameHistory} 
              onBack={() => setViewState('welcome')} 
            />
          )}
        </div>

        {viewState === 'game' && (
           <AdPlaceholder className="w-full max-w-4xl h-14 shrink-0 shadow-sm mt-6" text="Bottom Banner Ad" />
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-4 text-center text-stone-400 text-xs bg-stone-50 border-t border-stone-200">
        <p>&copy; {new Date().getFullYear()} Divine Quiz. Powered by Google Gemini 3 Pro Preview.</p>
      </footer>

      {/* Chat Bot Overlay */}
      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

    </div>
  );
}

export default App;
