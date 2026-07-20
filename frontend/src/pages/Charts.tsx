import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import PageLoader from '../components/ui/PageLoader';
import TradingChart from '../components/charts/TradingChart';
import { useCandles, useMarket } from '../hooks/useApi';
import { useMarketSocket } from '../hooks/useMarketSocket';
import { formatChange, formatPrice, formatSymbol, getPriceDecimals } from '../utils/format';
import './pages.css';

function getTimeframeDurationMs(timeframe: string) {
  switch (timeframe) {
    case 'M1':
      return 60_000;
    case 'M5':
      return 5 * 60_000;
    case 'M15':
      return 15 * 60_000;
    case 'M30':
      return 30 * 60_000;
    case 'H1':
      return 60 * 60_000;
    case 'H4':
      return 4 * 60 * 60_000;
    case 'D1':
      return 24 * 60 * 60_000;
    default:
      return 30 * 60_000;
  }
}

function applyLivePriceToCandles(
  candles: Array<{ time: string; open: number; high: number; low: number; close: number; timestamp: number }>,
  livePrice: number | null,
  timeframe: string
) {
  if (!livePrice || candles.length === 0) return candles;

  const duration = getTimeframeDurationMs(timeframe);
  const now = Date.now();
  const currentCandleStart = Math.floor(now / duration) * duration;
  const updated = [...candles];
  const lastCandle = updated[updated.length - 1];

  if (lastCandle.timestamp === currentCandleStart) {
    lastCandle.close = livePrice;
    lastCandle.high = Math.max(lastCandle.high, livePrice);
    lastCandle.low = Math.min(lastCandle.low, livePrice);
    return updated;
  }

  const lastCandleClose = lastCandle.close;
  const newCandle = {
    time: new Date(currentCandleStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    open: lastCandleClose,
    high: Math.max(lastCandleClose, livePrice),
    low: Math.min(lastCandleClose, livePrice),
    close: livePrice,
    timestamp: currentCandleStart,
  };

  return [...updated.slice(1), newCandle];
}

export default function Charts() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const symbol = params.get('symbol') ?? 'EURUSD';
  const [selectedTimeframe, setSelectedTimeframe] = useState('M30');

  const { market, price, changePct, isLoading: loadingMarket } = useMarket(symbol);
  const { data: candles = [], isLoading: loadingCandles } = useCandles(symbol, 50, selectedTimeframe);
  const {
    connected,
    lastUpdate,
    lastCandleUpdate,
    subscribeCandleRoom,
    unsubscribeCandleRoom,
  } = useMarketSocket();

  const livePrice = useMemo(() => {
    const update = lastUpdate.find((u) => u.symbol === symbol.replace('/', ''));
    return update?.bid ?? null;
  }, [lastUpdate, symbol]);

  const liveCandle = useMemo(() => {
    if (!lastCandleUpdate) return null;
    if (lastCandleUpdate.symbol !== symbol.replace('/', '')) return null;
    if (lastCandleUpdate.timeframe !== selectedTimeframe) return null;
    return lastCandleUpdate;
  }, [lastCandleUpdate, selectedTimeframe, symbol]);

  const rawChartData = useMemo(
    () =>
      candles.map((c) => ({
        timestamp: new Date(c.timestamp).getTime(),
        time: new Date(c.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
    [candles]
  );

  const chartData = useMemo(() => {
    let updated = applyLivePriceToCandles(rawChartData, livePrice, selectedTimeframe);
    if (liveCandle) {
      updated = updated.map((point) =>
        point.timestamp === liveCandle.timestamp
          ? {
              ...point,
              open: liveCandle.open,
              high: liveCandle.high,
              low: liveCandle.low,
              close: liveCandle.close,
            }
          : point
      );
    }
    return updated;
  }, [rawChartData, livePrice, selectedTimeframe, liveCandle]);

  useEffect(() => {
    subscribeCandleRoom(symbol, selectedTimeframe);
    return () => {
      unsubscribeCandleRoom(symbol, selectedTimeframe);
    };
  }, [symbol, selectedTimeframe, subscribeCandleRoom, unsubscribeCandleRoom]);

  const rsiData = useMemo(
    () =>
      chartData.map((point, idx) => ({
        time: point.time,
        value: 45 + (point.close - point.open) * 10000 + idx,
      })),
    [chartData]
  );

  if (loadingMarket || loadingCandles) {
    return <PageLoader message="Loading charts..." />;
  }

  return (
    <div className="page-container charts-container page-shell">
      <button type="button" className="back-btn" onClick={() => navigate(`/trading/${symbol}`)}>
        <FiArrowLeft size={20} />
        Back to Trading
      </button>

      <div className="charts-content">
        <div className="chart-section glass-card">
          <div className="section-header">
            <div>
              <h2>{formatSymbol(symbol)}</h2>
              <p className="subtitle">
                {market?.name}
                <span className={`live-dot ${connected ? 'online' : ''}`}>
                  {connected ? ' · Live' : ' · Connecting...'}
                </span>
              </p>
            </div>
            <div className="price-info">
              <span className="price">{formatPrice(price, symbol)}</span>
              <span className={`change ${changePct >= 0 ? 'positive' : 'negative'}`}>
                {formatChange(changePct)}
              </span>
            </div>
          </div>

          <div className="chart-controls">
            <div className="timeframes">
              {['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`tf ${selectedTimeframe === tf ? 'active' : ''}`}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-wrapper">
            {chartData.length > 0 ? (
              <TradingChart
                data={chartData}
                symbol={symbol}
                timeframe={selectedTimeframe}
                priceDecimals={getPriceDecimals(symbol)}
              />
            ) : (
              <p className="empty-state">No chart data available</p>
            )}
          </div>
        </div>

        <div className="indicators-section">
          <div className="indicator-card indicator-full glass-card">
            <div className="indicator-header">
              <div>
                <h4>Price Trend</h4>
                <p>{formatPrice(price, symbol)}</p>
              </div>
            </div>
            <div className="indicator-chart-line">
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={rsiData}>
                  <Line type="monotone" dataKey="value" stroke="#8b9dff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
