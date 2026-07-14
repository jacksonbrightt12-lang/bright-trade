type DonutProps = {
  values: number[];
  colors?: string[];
  size?: number;
};

export default function DonutChart({ values, colors, size = 160 }: DonutProps) {
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  // build paths directly in JSX below; remove unused variable
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* render paths programmatically */}
      {values.map((v, i) => {
        const portion = v / total;
        const start = (i === 0 ? 0 : values.slice(0, i).reduce((s, x) => s + x, 0) / total * 360);
        const end = start + portion * 360;
        const large = end - start > 180 ? 1 : 0;
        const startRad = (Math.PI / 180) * (start - 90);
        const endRad = (Math.PI / 180) * (end - 90);
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} z`;
        const fill = (colors && colors[i]) || ['#00d084', '#6b5cff', '#ffd166', '#4cc9f0'][i % 4];
        return <path key={i} d={d} fill={fill} stroke="rgba(0,0,0,0.02)" />;
      })}
      <circle cx={size / 2} cy={size / 2} r={r - 28} fill="#0f1419" />
    </svg>
  );
}
