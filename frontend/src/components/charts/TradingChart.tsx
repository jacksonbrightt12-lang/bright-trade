import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

export interface ChartCandle {
  timestamp: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  data: ChartCandle[];
  symbol: string;
  timeframe: string;
  priceDecimals?: number;
}

const UP_COLOR = '#13d789';
const DOWN_COLOR = '#ff6467';

function toSeconds(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

export default function TradingChart({ data, symbol, timeframe, priceDecimals = 5 }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const symbolTimeframeRef = useRef<string>('');

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9aa4b2',
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#7c8bff', width: 1, style: 3, labelBackgroundColor: '#2a3350' },
        horzLine: { color: '#7c8bff', width: 1, style: 3, labelBackgroundColor: '#2a3350' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      autoSize: true,
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderVisible: false,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      priceFormat: { type: 'price', precision: priceDecimals, minMove: Math.pow(10, -priceDecimals) },
      priceLineVisible: true,
      priceLineColor: '#7c8bff',
      lastValueVisible: true,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: 'rgba(124, 139, 255, 0.35)',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    lastTimestampRef.current = null;
    symbolTimeframeRef.current = '';

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // Only recreate the chart if the container mounts fresh; theme/precision are static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data in (full reset on symbol/timeframe change, incremental otherwise)
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !chart || data.length === 0) return;

    const currentKey = `${symbol}:${timeframe}`;
    const isFreshDataset = symbolTimeframeRef.current !== currentKey || lastTimestampRef.current === null;

    const toBar = (c: ChartCandle) => ({
      time: toSeconds(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });
    const toVolBar = (c: ChartCandle) => ({
      time: toSeconds(c.timestamp),
      value: c.volume ?? 0,
      color: c.close >= c.open ? 'rgba(19, 215, 137, 0.5)' : 'rgba(255, 100, 103, 0.5)',
    });

    if (isFreshDataset) {
      candleSeries.setData(data.map(toBar));
      volumeSeries.setData(data.map(toVolBar));
      chart.timeScale().fitContent();
      symbolTimeframeRef.current = currentKey;
      lastTimestampRef.current = data[data.length - 1].timestamp;
      return;
    }

    const last = data[data.length - 1];
    if (last.timestamp === lastTimestampRef.current) {
      // Same candle, values updated live (price tick)
      candleSeries.update(toBar(last));
      volumeSeries.update(toVolBar(last));
    } else if (last.timestamp > (lastTimestampRef.current ?? 0)) {
      // A new candle rolled in
      candleSeries.update(toBar(last));
      volumeSeries.update(toVolBar(last));
      lastTimestampRef.current = last.timestamp;
    } else {
      // Data set shrank/changed unexpectedly - full refresh
      candleSeries.setData(data.map(toBar));
      volumeSeries.setData(data.map(toVolBar));
      lastTimestampRef.current = last.timestamp;
    }
  }, [data, symbol, timeframe]);

  return <div ref={containerRef} className="trading-chart-canvas" />;
}
