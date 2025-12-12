
import React from 'react';
import { GameHistoryEntry } from '../types';
import Button from './Button';

interface GameHistoryProps {
  history: GameHistoryEntry[];
  onBack: () => void;
}

const GameHistory: React.FC<GameHistoryProps> = ({ history, onBack }) => {
  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold serif text-stone-800">Your Journey</h2>
        <Button variant="ghost" onClick={onBack}>
          Close
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
          <span className="text-4xl mb-4 opacity-50">📜</span>
          <p>No history yet.</p>
          <p className="text-sm">Play a game to start your record.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {[...history].reverse().map((game) => (
            <div key={game.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    game.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    game.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {game.difficulty}
                  </span>
                  <span className="text-xs text-stone-400">
                    {game.date.toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-stone-600">
                  Language: <span className="font-semibold">{game.language}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-bold text-orange-600 font-mono">
                  {game.score}
                </span>
                <span className="text-xs text-stone-400">Points</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameHistory;
