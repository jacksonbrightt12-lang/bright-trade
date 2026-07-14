import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import PageLoader from '../components/ui/PageLoader';
import { useCandles, useMarket } from '../hooks/useApi';
import { useMarketSocket } from '../hooks/useMarketSocket';
import { formatChange, formatPrice, formatSymbol } from '../utils/format';
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

function CandlestickChart({
  data,
}: {
  data: Array<{
    timestamp: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
}) {
  const width = 900;
  const height = 480;
  const padding = 54;
  const values = data.flatMap((point) => [point.high, point.low, point.open, point.close]);
  const maxPrice = Math.max(...values, 1);
  const minPrice = Math.min(...values, 0);
  const extraPadding = Math.max((maxPrice - minPrice) * 0.08, 0.0001);
  const paddedMax = maxPrice + extraPadding;
  const paddedMin = minPrice - extraPadding;
  const priceRange = Math.max(paddedMax - paddedMin, 0.0006);
  const candleGap = (width - padding * 2) / Math.max(data.length, 1);
  const candleWidth = Math.min(52, Math.max(14, candleGap * 0.65));
  const wickStrokeWidth = 1.6;
  const minBodyHeight = 8;
  const yAxisTicks = 5;
  const latestPrice = data[data.length - 1]?.close;

  const yPos = (price: number) => {
    const ratio = (paddedMax - price) / priceRange;
    return padding + ratio * (height - padding * 2);
  };

  const yLabels = Array.from({ length: yAxisTicks }, (_, index) => {
    const value = paddedMax - (priceRange / (yAxisTicks - 1)) * index;
    return {
      value,
      y: padding + ((height - padding * 2) / (yAxisTicks - 1)) * index,
    };
  });

  const labelEvery = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="candlestick-chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartBackground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f1624" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#0b111b" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} rx={22} fill="url(#chartBackground)" />

      {yLabels.map((label, index) => (
        <g key={`y-label-${index}`}>
          <line
            x1={padding + 16}
            x2={width - padding - 16}
            y1={label.y}
            y2={label.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            strokeDasharray="4 6"
          />
          <text x={padding - 10} y={label.y + 4} textAnchor="end" fill="#9aa4b2" fontSize={11} fontFamily="Inter, sans-serif">
            {label.value.toFixed(5)}
          </text>
        </g>
      ))}

      {latestPrice != null && (
        <g>
          <line
            x1={padding + 16}
            x2={width - padding - 16}
            y1={yPos(latestPrice)}
            y2={yPos(latestPrice)}
            stroke="#7c8bff"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.85}
          />
          <rect
            x={width - padding - 82}
            y={yPos(latestPrice) - 14}
            width={70}
            height={24}
            rx={12}
            fill="rgba(15, 23, 40, 0.92)"
          />
          <text x={width - padding - 18} y={yPos(latestPrice) + 6} textAnchor="end" fill="#eef3ff" fontSize={11} fontFamily="Inter, sans-serif">
            {latestPrice.toFixed(5)}
          </text>
        </g>
      )}

      {data.map((point, index) => {
        const centerX = padding + index * candleGap + candleGap / 2;
        const openY = yPos(point.open);
        const closeY = yPos(point.close);
        const highY = yPos(point.high);
        const lowY = yPos(point.low);
        const isBull = point.close >= point.open;
        const rawHeight = Math.abs(openY - closeY);
        const candleHeight = Math.max(rawHeight, minBodyHeight);
        const topY = Math.min(openY, closeY) - Math.max(0, (candleHeight - rawHeight) / 2);
        const bodyFill = isBull ? '#13d789' : '#ff6467';
        const bodyStroke = isBull ? '#00ff9a' : '#ff9aa0';

        return (
          <g key={`${point.timestamp}-${index}`}>
            <line
              x1={centerX}
              x2={centerX}
              y1={highY}
              y2={lowY}
              stroke={bodyFill}
              strokeWidth={wickStrokeWidth}
              strokeLinecap="round"
              opacity={0.9}
            />
            <rect
              x={centerX - candleWidth / 2}
              y={topY}
              width={candleWidth}
              height={candleHeight}
              fill={isBull ? 'rgba(19, 215, 137, 0.86)' : 'rgba(255, 100, 103, 0.92)'}
              stroke={bodyStroke}
              strokeWidth={1.2}
              rx={3}
            />
          </g>
        );
      })}

      {data.map((point, index) => {
        if (index % labelEvery !== 0) return null;
        const centerX = padding + index * candleGap + candleGap / 2;
        return (
          <text
            key={`x-label-${point.timestamp}`}
            x={centerX}
            y={height - padding + 20}
            textAnchor="middle"
            fill="#7a8db7"
            fontSize={11}
            fontFamily="Inter, sans-serif"
          >
            {point.time}
          </text>
        );
      })}
    </svg>
  );
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
              <CandlestickChart data={chartData} />
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
