import {BAND_META, scoreBand} from '@/lib/demos/opportunity-score';

export function ScoreRing({
  score,
  size = 64,
  stroke = 6,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (circumference * clamped) / 100;
  const color = BAND_META[scoreBand(clamped)].colorVar;

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{width: size, height: size}}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            transition: 'stroke-dasharray 450ms cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums text-ink"
        style={{fontSize: size * 0.28}}>
        {Math.round(clamped)}
      </span>
    </div>
  );
}
