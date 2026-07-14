import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { CandleUpdate, PriceUpdate } from '../api/types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;

export function useMarketSocket(
  onUpdate?: (updates: PriceUpdate[]) => void,
  onCandleUpdate?: (update: CandleUpdate) => void
) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<PriceUpdate[]>([]);
  const [lastCandleUpdate, setLastCandleUpdate] = useState<CandleUpdate | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    }

    const handleConnect = () => {
      setConnected(true);
      socket?.emit('subscribe:markets');
    };

    const handleDisconnect = () => setConnected(false);

    const handlePrices = (updates: PriceUpdate[]) => {
      setLastUpdate(updates);
      onUpdate?.(updates);
    };

    const handleCandleUpdate = (update: CandleUpdate) => {
      setLastCandleUpdate(update);
      onCandleUpdate?.(update);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('prices:update', handlePrices);
    socket.on('candles:update', handleCandleUpdate);

    if (socket.connected) handleConnect();

    return () => {
      socket?.off('connect', handleConnect);
      socket?.off('disconnect', handleDisconnect);
      socket?.off('prices:update', handlePrices);
      socket?.off('candles:update', handleCandleUpdate);
    };
  }, [onUpdate, onCandleUpdate]);

  const subscribeCandleRoom = useCallback((symbol: string, timeframe: string) => {
    socket?.emit('subscribe:candles', { symbol, timeframe });
  }, []);

  const unsubscribeCandleRoom = useCallback((symbol: string, timeframe: string) => {
    socket?.emit('unsubscribe:candles', { symbol, timeframe });
  }, []);

  return { connected, lastUpdate, lastCandleUpdate, subscribeCandleRoom, unsubscribeCandleRoom };
}
