
export enum ImageSize {
  Size1K = '1K'
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Language = 'English' | 'Hindi' | 'Telugu' | 'Kannada' | 'Tamil' | 'Malayalam';

export interface God {
  id: string;
  names: Record<string, string> & { English: string }; // Ensure English is always present
  description?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface QuizState {
  currentGod: God | null;
  imageUrl: string | null;
  options: God[];
  score: number;
  totalRounds: number;
  isLoading: boolean;
  gameStatus: 'idle' | 'playing' | 'revealed' | 'finished';
  selectedOptionId: string | null;
  feedback: string | null;
}

export interface GameHistoryEntry {
  id: string;
  date: Date;
  score: number;
  totalRounds: number;
  difficulty: Difficulty;
  language: Language;
}

export interface UserProfile {
  name: string;
  language: Language;
  difficulty: Difficulty;
}

export type ViewState = 'welcome' | 'game' | 'history';
