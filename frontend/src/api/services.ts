import api from './client';
import type {
  AccountSummary,
  AffiliateStats,
  Candle,
  EducationCourse,
  Market,
  Order,
  Position,
  SupportTicket,
  Transaction,
  User,
} from './types';

export const authApi = {
  register: (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    referralCode?: string;
  }) => api.post('/auth/register', data),
  verifyEmail: (email: string, code: string) =>
    api.post('/auth/verify-email', { email, code }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get<{ user: User }>('/auth/me'),
};

export const accountApi = {
  summary: (accountType = 'DEMO') =>
    api.get<AccountSummary>('/account/summary', { params: { accountType } }),
  deposit: (amount: number, method: string, accountType = 'DEMO') =>
    api.post('/account/deposit', { amount, method, accountType }),
  withdraw: (amount: number, method: string, accountType = 'DEMO') =>
    api.post('/account/withdraw', { amount, method, accountType }),
  transactions: (type = 'all', accountType = 'DEMO') =>
    api.get<{ transactions: Transaction[] }>('/account/transactions', {
      params: { type, accountType },
    }),
};

export const marketsApi = {
  list: () => api.get<{ markets: Market[] }>('/markets'),
  get: (symbol: string) => api.get<{ market: Market }>(`/markets/${symbol}`),
  candles: (symbol: string, limit = 50, interval = 'M30') =>
    api.get<{ candles: Candle[] }>(`/markets/${symbol}/candles`, {
      params: { limit, interval },
    }),
};

export const tradesApi = {
  positions: (status = 'OPEN', accountType = 'DEMO') =>
    api.get<{ positions: Position[] }>('/trades/positions', {
      params: { status, accountType },
    }),
  orders: (accountType = 'DEMO') =>
    api.get<{ orders: Order[] }>('/trades/orders', { params: { accountType } }),
  open: (data: {
    symbol: string;
    type: 'BUY' | 'SELL';
    volume: number;
    stopLoss?: number;
    takeProfit?: number;
    orderType?: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    accountType?: string;
  }) => api.post('/trades/open', data),
  closePosition: (id: string, accountType = 'DEMO') =>
    api.post(`/trades/positions/${id}/close`, { accountType }),
  cancelOrder: (id: string, accountType = 'DEMO') =>
    api.delete(`/trades/orders/${id}`, { params: { accountType } }),
};

export const supportApi = {
  list: () => api.get<{ tickets: SupportTicket[] }>('/support'),
  create: (subject: string, message: string) =>
    api.post('/support', { subject, message }),
};

export const educationApi = {
  list: () => api.get<{ courses: EducationCourse[] }>('/education'),
  create: (data: Omit<EducationCourse, 'id' | 'progress'>) => api.post('/education', data),
  delete: (id: string) => api.delete(`/education/${id}`),
};

export const affiliateApi = {
  stats: () => api.get<AffiliateStats>('/affiliate/stats'),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
  accounts: () => api.get('/admin/accounts'),
  transactions: (type = 'all') => api.get('/admin/transactions', { params: { type } }),
  trades: () => api.get('/admin/trades'),
  support: () => api.get('/admin/support'),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  deleteAccount: (id: string) => api.delete(`/admin/accounts/${id}`),
  createUser: (data: { fullName: string; email: string; password: string; phone?: string; role?: string }) =>
    api.post('/admin/users', data),
  createAccount: (data: { userId: string; type?: string; balance?: number; currency?: string }) =>
    api.post('/admin/accounts', data),
  updateTicketStatus: (id: string, status: string) =>
    api.patch(`/admin/support/${id}`, { status }),
  deleteSupportTicket: (id: string) => api.delete(`/admin/support/${id}`),
};
