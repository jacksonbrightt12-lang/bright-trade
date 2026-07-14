export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  referralCode?: string;
}

export interface Market {
  id: string;
  symbol: string;
  rawSymbol: string;
  name: string;
  type: string;
  price: number;
  ask: number;
  change: string;
  updatedAt?: string;
}

export interface Position {
  id: string;
  symbol: string;
  rawSymbol?: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  pnl: number;
  openTime: string;
  status: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

export interface Order {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  price: number;
  createdTime: string;
  status: string;
}

export interface Transaction {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  amount: number;
  date: string;
  status: string;
  method?: string | null;
}

export interface AccountSummary {
  balance: number;
  equity: number;
  unrealizedPnL: number;
  marginUsed: number;
  freeMargin: number;
  accountType: string;
  currency: string;
  profitToday: number;
  openPositions: Position[];
  recentTransactions: Transaction[];
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleUpdate {
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface EducationCourse {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  lessons: number;
  progress: number;
  category: string;
  resourceType: string;
  resourceUrl: string;
  featured: boolean;
  author: string;
  tags: string[];
}

export interface AffiliateStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  commissionRate: string;
}

export interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  changePct: number;
}
