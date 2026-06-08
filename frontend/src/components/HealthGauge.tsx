interface HealthGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function HealthGauge({ score, size = 'md' }: HealthGaugeProps) {
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10' };
    if (s >= 60) return { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (s >= 35) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const { stroke, text, bg } = getColor(score);
  const sizes = { sm: 60, md: 80, lg: 110 };
  const dim = sizes[size];
  const r = dim / 2 - 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${bg} rounded-full`} style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="absolute -rotate-90">
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none" stroke="#1f2937" strokeWidth={size === 'lg' ? 8 : 6}
        />
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none" stroke={stroke} strokeWidth={size === 'lg' ? 8 : 6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className={`relative font-bold ${text} ${size === 'lg' ? 'text-xl' : size === 'md' ? 'text-sm' : 'text-xs'}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}
