export type View = "SPLASH" | "ONBOARDING" | "MAIN";

export type Side = "YES" | "NO";

export interface Market {
  id: string;
  question: string;
  highlightWords?: string[];
  category: string;
  volume: string;
  closingIn: string;
  // ISO timestamp of closing (if available) to allow live countdowns in the UI
  closingAt?: string;
  yesPercent: number;   // 0..100
  price: number;        // stake amount for instant trade in demo
}

export interface Position {
  marketId: string;
  question: string;
  side: Side;
  stake: number;
  entryYesPercent: number;
  createdAt: number;
}

export interface UserState {
  balance: number;
  xp: number;
  streak: number;
  positions: Position[];
  isDemoMode: boolean;
}
