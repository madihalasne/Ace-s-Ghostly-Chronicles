
export type GhostType = 'FRIENDLY' | 'MALEVOLENT';

export interface Ghost {
  name: string;
  type: GhostType;
  appearance: string;
  dialogue: string;
  hint: string;
  imageUrl?: string;
}

export interface Choice {
  text: string;
  isCorrect: boolean;
  consequence: string;
  itemRequired?: string;
  itemFound?: string;
}

export interface Interactable {
  name: string;
  description: string;
  itemFound?: string;
}

export interface JournalEntry {
  level: number;
  content: string;
  mood: 'BRAVE' | 'SCARED' | 'CURIOUS';
  cluesFound: string[];
}

export interface LevelData {
  levelNumber: number;
  title: string;
  description: string;
  mysteryPrompt: string;
  ghostVibe: string;
  choices: Choice[];
  interactables?: Interactable[];
}

export type GameStatus = 'MENU' | 'INTRO' | 'PLAYING' | 'INTERACTION' | 'LEVEL_START' | 'DEAD' | 'VICTORY' | 'LEVEL_FAILED';

export interface GameState {
  level: number;
  lives: number;
  status: GameStatus;
  currentGhost?: Ghost;
  lastDailyReset: string;
  inventory: string[];
  journal: JournalEntry[];
}
