
import React, { useState } from 'react';
import Quiz from './components/Quiz';
import ChatBot from './components/ChatBot';
import ApiKeyWall from './components/ApiKeyWall';
import AdPlaceholder from './components/AdPlaceholder';
import { ImageSize, Difficulty, Language } from './types';

function App() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Image size is now fixed to 1K
  const imageSize = ImageSize.Size1K;
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [language, setLanguage] = useState<Language>('English');

  if (!hasApiKey) {
    return <ApiKeyWall onKeySelected={() => setHasApiKey(true)} />;
  }

  return (
    <div className="h-full flex flex-col bg-stone-50 text-stone-900 overflow-hidden relative">
      
      {/* Header */}
      <header className="bg-white border-b border-orange-100 px-6 py-4 flex items-center justify-between z-10 shadow-sm shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-2">
            <span className="text-3xl">🕉️</span>
            <h1 className="text-2xl font-bold serif text-orange-600 hidden sm:block">Divine Quiz</h1>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
                <span className="text-xs font-bold text-stone-500 px-2">LANG</span>
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-white text-sm font-bold text-stone-800 rounded-md py-1 px-2 border-none focus:ring-0 cursor-pointer hover:bg-orange-50 transition-colors"
                >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Malayalam">Malayalam</option>
                </select>
            </div>

            <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
                <span className="text-xs font-bold text-stone-500 px-2">LEVEL</span>
                <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="bg-white text-sm font-bold text-stone-800 rounded-md py-1 px-2 border-none focus:ring-0 cursor-pointer hover:bg-orange-50 transition-colors capitalize"
                >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            
            <button 
                onClick={() => setIsChatOpen(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center gap-2"
            >
                <span className="hidden sm:inline">Ask Guru</span>
                <span className="sm:hidden">Guru</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-6">
        
        {/* Top Ad Placeholder */}
        <AdPlaceholder className="w-full max-w-4xl h-24 shrink-0 shadow-sm" text="Top Banner Ad (728x90)" />

        <div className="w-full flex-1">
          <Quiz key={difficulty} imageSize={imageSize} difficulty={difficulty} language={language} />
        </div>

        {/* Bottom Ad Placeholder */}
        <AdPlaceholder className="w-full max-w-4xl h-24 shrink-0 shadow-sm" text="Bottom Banner Ad (728x90)" />
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