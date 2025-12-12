
import React, { useState } from 'react';
import { Difficulty, Language, UserProfile } from '../types';
import Button from './Button';

interface WelcomeScreenProps {
  initialProfile: UserProfile;
  onStart: (profile: UserProfile) => void;
  onViewHistory: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialProfile, onStart, onViewHistory }) => {
  const [name, setName] = useState(initialProfile.name);
  const [language, setLanguage] = useState<Language>(initialProfile.language);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialProfile.difficulty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onStart({ name, language, difficulty });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-orange-100">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🕉️</span>
          <h1 className="text-3xl font-bold serif text-orange-600">Divine Quiz</h1>
          <p className="text-stone-500 mt-2">Discover the deities of Hindu Mythology</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-stone-600 mb-1">YOUR NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full border border-stone-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-stone-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-600 mb-1">LANGUAGE</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full border border-stone-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-stone-50 cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Kannada">Kannada</option>
              <option value="Tamil">Tamil</option>
              <option value="Malayalam">Malayalam</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-600 mb-1">DIFFICULTY LEVEL</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`py-2 px-1 rounded-lg text-sm font-bold capitalize transition-all ${
                    difficulty === level
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-stone-100 text-stone-500 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full py-3 text-lg justify-center shadow-lg shadow-orange-200 mt-4">
            Start Journey
          </Button>

          <div className="pt-4 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={onViewHistory}
              className="text-stone-400 hover:text-stone-600 text-sm font-semibold underline decoration-dotted"
            >
              View Past Games
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WelcomeScreen;
