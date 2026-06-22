interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({ values, color = 'var(--brand)', height = 36, width = 120 }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-40">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const areaPoints = `${pad},${height - pad} ${points.join(' ')} ${width - pad},${height - pad}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-fill)" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
