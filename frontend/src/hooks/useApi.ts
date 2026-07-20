import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  accountApi,
  adminApi,
  affiliateApi,
  educationApi,
  marketsApi,
  supportApi,
  tradesApi,
} from '../api/services';
import type { EducationCourse, Market, PriceUpdate } from '../api/types';
import { useAccount } from '../context/AccountContext';
import { useMarketSocket } from './useMarketSocket';

export function useAccountSummary() {
  const { accountType } = useAccount();
  return useQuery({
    queryKey: ['account', 'summary', accountType],
    queryFn: async () => {
      const { data } = await accountApi.summary(accountType);
      return data;
    },
  });
}

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);

  const query = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const { data } = await marketsApi.list();
      return data.markets;
    },
  });

  useEffect(() => {
    if (query.data) setMarkets(query.data);
  }, [query.data]);

  const mergePrices = useCallback((updates: PriceUpdate[]) => {
    setMarkets((prev) => {
      const base = prev.length ? prev : query.data ?? [];
      return base.map((m) => {
        const update = updates.find((u) => u.symbol === m.rawSymbol);
        if (!update) return m;
        return {
          ...m,
          price: update.bid,
          ask: update.ask,
          change: `${update.changePct >= 0 ? '+' : ''}${update.changePct.toFixed(2)}%`,
        };
      });
    });
  }, [query.data]);

  const { connected } = useMarketSocket(mergePrices);

  return { ...query, markets: markets.length ? markets : query.data ?? [], connected };
}

export function useMarket(symbol: string) {
  const clean = symbol.replace('/', '');

  const query = useQuery({
    queryKey: ['markets', clean],
    queryFn: async () => {
      const { data } = await marketApiGet(clean);
      return data.market;
    },
    enabled: !!clean,
  });

  const [live, setLive] = useState<{ bid: number; ask: number; changePct: number } | null>(null);

  useMarketSocket(
    useCallback(
      (updates) => {
        const update = updates.find((u) => u.symbol === clean);
        if (update) setLive(update);
      },
      [clean]
    )
  );

  const market = query.data;
  const price = live?.bid ?? market?.price ?? 0;
  const ask = live?.ask ?? market?.ask ?? price;
  const changePct = live?.changePct ?? (typeof market?.change === 'number' ? market.change : parseFloat(String(market?.change ?? '0')));

  return { ...query, market, price, ask, changePct, rawSymbol: clean };
}

async function marketApiGet(symbol: string) {
  return marketsApi.get(symbol);
}

export function useCandles(symbol: string, limit = 50, interval = 'M30') {
  const clean = symbol.replace('/', '');
  return useQuery({
    queryKey: ['candles', clean, limit, interval],
    queryFn: async () => {
      const { data } = await marketsApi.candles(clean, limit, interval);
      return data.candles;
    },
    enabled: !!clean,
    refetchInterval: 60_000,
  });
}

export function usePositions(status = 'OPEN') {
  const { accountType } = useAccount();
  return useQuery({
    queryKey: ['positions', status, accountType],
    queryFn: async () => {
      const { data } = await tradesApi.positions(status, accountType);
      return data.positions;
    },
  });
}

export function useOrders() {
  const { accountType } = useAccount();
  return useQuery({
    queryKey: ['orders', accountType],
    queryFn: async () => {
      const { data } = await tradesApi.orders(accountType);
      return data.orders;
    },
  });
}

export function useTransactions(type = 'all') {
  const { accountType } = useAccount();
  return useQuery({
    queryKey: ['transactions', type, accountType],
    queryFn: async () => {
      const { data } = await accountApi.transactions(type, accountType);
      return data.transactions;
    },
  });
}

export function useEducation() {
  return useQuery({
    queryKey: ['education'],
    queryFn: async () => {
      const { data } = await educationApi.list();
      return data.courses;
    },
  });
}

export function useCreateEducationResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EducationCourse, 'id' | 'progress'>) => educationApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['education'] });
    },
  });
}

export function useDeleteEducationResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => educationApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['education'] });
    },
  });
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ['support'],
    queryFn: async () => {
      const { data } = await supportApi.list();
      return data.conversations ?? [];
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useAffiliateStats() {
  return useQuery({
    queryKey: ['affiliate'],
    queryFn: async () => {
      const { data } = await affiliateApi.stats();
      return data;
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await adminApi.users();
      return data.users;
    },
  });
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: ['admin', 'accounts'],
    queryFn: async () => {
      const { data } = await adminApi.accounts();
      return data.accounts;
    },
  });
}

export function useAdminTransactions(type = 'all') {
  return useQuery({
    queryKey: ['admin', 'transactions', type],
    queryFn: async () => {
      const { data } = await adminApi.transactions(type);
      return data.transactions;
    },
  });
}

export function useAdminTrades() {
  return useQuery({
    queryKey: ['admin', 'trades'],
    queryFn: async () => {
      const { data } = await adminApi.trades();
      return data.positions;
    },
  });
}

export function useAdminSupport() {
  return useQuery({
    queryKey: ['admin', 'support'],
    queryFn: async () => {
      const { data } = await adminApi.support();
      return data.conversations ?? [];
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateTicketStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'support'] });
      void qc.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useDeleteSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteSupportTicket(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'support'] });
      void qc.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await adminApi.stats();
      return data;
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteAccount(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.createUser>[0]) => adminApi.createUser(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.createAccount>[0]) => adminApi.createAccount(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
    },
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  const { accountType } = useAccount();
  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method: string }) =>
      accountApi.deposit(amount, method, accountType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  const { accountType } = useAccount();
  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method: string }) =>
      accountApi.withdraw(amount, method, accountType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useOpenTrade() {
  const qc = useQueryClient();
  const { accountType } = useAccount();
  return useMutation({
    mutationFn: (data: Parameters<typeof tradesApi.open>[0]) =>
      tradesApi.open({ ...data, accountType }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['positions'] });
      void qc.invalidateQueries({ queryKey: ['account'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useClosePosition() {
  const qc = useQueryClient();
  const { accountType } = useAccount();
  return useMutation({
    mutationFn: (id: string) => tradesApi.closePosition(id, accountType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['positions'] });
      void qc.invalidateQueries({ queryKey: ['account'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  const { accountType } = useAccount();
  return useMutation({
    mutationFn: (id: string) => tradesApi.cancelOrder(id, accountType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, message }: { subject: string; message: string }) =>
      supportApi.create(subject, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => supportApi.sendMessage(id, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useAdminSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => adminApi.adminSendMessage(id, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'support'] });
    },
  });
}
