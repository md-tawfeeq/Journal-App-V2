export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'chat';

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: ReflectionMode;
  messages: JournalMessage[];
  summary?: string;
  tags?: string[];
  isPinned?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
