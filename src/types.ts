export type Outcome = "win" | "loss" | "breakeven";
export type Answer = string | string[];
export type FieldType =
  | "boolean"
  | "select"
  | "multiselect"
  | "number"
  | "text";
export interface Field {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
  group: string;
  role: "core" | "confluence" | "none";
  required: boolean;
  color: string;
}
export interface Checklist {
  id: string;
  name: string;
  description: string;
  strategy: string;
  fields: Field[];
  groups: string[];
  mode: "standard" | "guided";
  trackMfe: boolean;
  trackMae: boolean;
}
export interface Attachment {
  id: string;
  name: string;
  timeframe: string;
  src: string;
}
export interface Trade {
  id: string;
  name: string;
  symbol: string;
  direction: "long" | "short";
  date: string;
  session: string;
  templateId: string;
  accountId: string;
  status: "open" | "completed";
  outcome: Outcome | null;
  r: number | null;
  pnl: number | null;
  risk: number;
  followedRules: boolean;
  emotions: string[];
  notes: string;
  answers: Record<string, Answer>;
  screenshots: Attachment[];
  rating: number;
  bookmarked: boolean;
  mfe: number | null;
  mae: number | null;
  deletedAt: string | null;
  demo?: boolean;
}
export interface Note {
  demo?: boolean;
  id: string;
  title: string;
  content: string;
  category: string;
  emotion: string;
  pinned: boolean;
  color: string;
  date: string;
  tradeIds: string[];
}
export interface Account {
  demo?: boolean;
  id: string;
  name: string;
  type: "Live" | "Demo" | "Funded" | "1-Step" | "2-Step";
  balance: number;
  target: number;
  maxDrawdown: number;
  dailyDrawdown: number;
  status: "active" | "archived";
  payouts: { amount: number; date: string; note: string }[];
}
export interface Settings {
  name: string;
  theme: "purple" | "clean" | "light";
  defaultRisk: number;
  loggingMode: "pre" | "post";
  blinded: boolean;
  sessions: string[];
  symbols: string[];
  maxDailyLoss: number;
  maxTrades: number;
  dataLayout: "cards" | "table";
}
export interface Review {
  id: string;
  date: string;
  templateId: string;
  summary: string;
  strengths: string[];
  watch: string[];
  actions: string[];
  tradeCount: number;
  winRate: number;
  avgR: number;
}
export interface Group {
  id: string;
  name: string;
  description: string;
  tradeIds: string[];
  notes: { id: string; text: string; date: string }[];
}
export interface AppData {
  version: 1;
  onboardingCompleted?: boolean;
  trades: Trade[];
  checklists: Checklist[];
  notes: Note[];
  accounts: Account[];
  reviews: Review[];
  groups: Group[];
  settings: Settings;
  demo: boolean;
}
