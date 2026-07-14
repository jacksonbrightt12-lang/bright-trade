type TrendChartProps = {
  data: Array<{ value: number }>;
  height?: number;
  stroke?: string;
};

export default function TrendChart({ data, height = 56, stroke = '#00d084' }: TrendChartProps) {
  if (!data.length) {
    return null;
  }

  const width = 220;
  const max = Math.max(...data.map((point) => point.value));
  const min = Math.min(...data.map((point) => point.value));
  const range = max - min || 1;

  const points = data.map((point, index) => {
    const x = (index / Math.max(1, data.length - 1)) * (width - 10) + 5;
    const y = height - 6 - ((point.value - min) / range) * (height - 12);
    return `${x},${y}`;
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
}
