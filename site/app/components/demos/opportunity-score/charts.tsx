import {
  type CorrelationPoint,
  formatMoneyCents,
  type ScoreComponent,
} from '@/lib/demos/opportunity-score';

/** Donut showing the total score, split into its breakdown components. */
export function DonutScore({
  score,
  components,
  size = 104,
}: {
  score: number;
  components: ScoreComponent[];
  size?: number;
}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 2; // visual gap between segments, in score-points
  // Cumulative arc offset for each segment, computed without mutating state.
  const offsetFor = (idx: number) =>
    components
      .slice(0, idx)
      .reduce((sum, comp) => sum + (comp.points / 100) * c, 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      {components.map((comp, idx) => {
        const len = Math.max(0, (comp.points / 100) * c - gap);
        return (
          <circle
            key={comp.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={comp.colorVar}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offsetFor(idx)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2 - 1}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight={800}
        fill="var(--ink)">
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.13}
        textAnchor="middle"
        fontSize={size * 0.085}
        fill="var(--ink-3)">
        of 100
      </text>
    </svg>
  );
}

/** Dual-axis line chart: score (rising, left) vs cost-per-result (falling, right). */
export function DualAxisChart({
  series,
  currency,
}: {
  series: CorrelationPoint[];
  currency: string;
}) {
  const W = 560;
  const H = 200;
  const padL = 40;
  const padR = 40;
  const padTop = 18;
  const padBottom = 24;
  const n = series.length;
  const lastI = Math.max(1, n - 1);

  const scores = series.map(p => p.score);
  const cpas = series.map(p => p.cpaCents);
  const sMin = Math.min(...scores) - 4;
  const sMax = Math.max(...scores) + 4;
  const cMin = Math.min(...cpas) * 0.95;
  const cMax = Math.max(...cpas) * 1.05;

  const x = (i: number) => padL + (i * (W - padL - padR)) / lastI;
  const ys = (s: number) =>
    padTop + (H - padTop - padBottom) * (1 - (s - sMin) / (sMax - sMin));
  const yc = (v: number) =>
    padTop + (H - padTop - padBottom) * (1 - (v - cMin) / (cMax - cMin));

  const scoreLine = series
    .map((p, i) => `${x(i).toFixed(1)},${ys(p.score).toFixed(1)}`)
    .join(' ');
  const cpaLine = series
    .map((p, i) => `${x(i).toFixed(1)},${yc(p.cpaCents).toFixed(1)}`)
    .join(' ');
  const scoreArea = `${padL},${H - padBottom} ${scoreLine} ${(W - padR).toFixed(1)},${H - padBottom}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-52 w-full"
      role="img"
      aria-label="Opportunity score versus cost per result over time">
      {[0.5].map(g => (
        <line
          key={g}
          x1={padL}
          x2={W - padR}
          y1={padTop + (H - padTop - padBottom) * g}
          y2={padTop + (H - padTop - padBottom) * g}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}
      <text
        x={4}
        y={padTop}
        fontSize={10}
        fontWeight={600}
        fill="var(--brand-ink)">
        Score
      </text>
      <text
        x={W - 4}
        y={padTop}
        fontSize={10}
        fontWeight={600}
        textAnchor="end"
        fill="var(--rose)">
        CPR
      </text>

      <polygon
        points={scoreArea}
        fill="color-mix(in srgb, var(--brand-2) 13%, transparent)"
      />
      <polyline
        points={scoreLine}
        fill="none"
        stroke="var(--brand-2)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={cpaLine}
        fill="none"
        stroke="var(--rose)"
        strokeWidth={2}
        strokeDasharray="5 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(lastI)}
        cy={ys(series[lastI].score)}
        r={3.5}
        fill="var(--brand-2)"
      />
      <circle
        cx={x(lastI)}
        cy={yc(series[lastI].cpaCents)}
        r={3.5}
        fill="var(--rose)"
      />

      <text x={padL} y={H - 8} fontSize={10} fill="var(--ink-3)">
        {formatMoneyCents(cMax, currency)} → {formatMoneyCents(cMin, currency)}{' '}
        CPR
      </text>
    </svg>
  );
}

export interface AccountBar {
  name: string;
  score: number;
  colorVar: string;
}

/** Horizontal score bars per account with an industry-benchmark marker. */
export function AccountScoreBars({
  bars,
  benchmark,
}: {
  bars: AccountBar[];
  benchmark: number;
}) {
  return (
    <div className="relative flex flex-col gap-2.5 pt-1">
      <div
        className="pointer-events-none absolute inset-y-0 z-10 flex flex-col items-center"
        style={{left: `${benchmark}%`}}>
        <div className="w-px flex-1 bg-ink-3/50" />
      </div>
      {bars.map(b => (
        <div key={b.name}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-medium text-ink-2">{b.name}</span>
            <span
              className="text-[12px] font-bold tabular-nums"
              style={{color: b.colorVar}}>
              {b.score}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{width: `${b.score}%`, background: b.colorVar}}
            />
          </div>
        </div>
      ))}
      <p className="mt-1 text-[11px] text-ink-3">
        Dashed line = industry benchmark ({benchmark})
      </p>
    </div>
  );
}

export interface TrendSeries {
  label: string;
  colorVar: string;
  values: number[];
  dashed?: boolean;
}

/** Multi-line score trend across accounts over a shared set of dates. */
export function MultiLineChart({
  series,
  startLabel,
  endLabel,
}: {
  series: TrendSeries[];
  startLabel: string;
  endLabel: string;
}) {
  const W = 520;
  const H = 150;
  const padX = 30;
  const padTop = 12;
  const padBottom = 22;
  const domainMin = 40;
  const domainMax = 95;
  const len = Math.max(1, (series[0]?.values.length ?? 1) - 1);

  const x = (i: number) => padX + (i * (W - padX * 2)) / len;
  const y = (v: number) =>
    padTop +
    (H - padTop - padBottom) * (1 - (v - domainMin) / (domainMax - domainMin));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-40 w-full"
      role="img"
      aria-label="Score trend across accounts">
      {[domainMin, (domainMin + domainMax) / 2, domainMax].map(g => (
        <g key={g}>
          <line
            x1={padX}
            x2={W - padX}
            y1={y(g)}
            y2={y(g)}
            stroke="var(--border)"
            strokeWidth={0.75}
            strokeDasharray={g === domainMin ? undefined : '2 3'}
          />
          <text x={4} y={y(g) + 3} fontSize={9} fill="var(--ink-3)">
            {Math.round(g)}
          </text>
        </g>
      ))}
      {series.map(s => (
        <polyline
          key={s.label}
          points={s.values
            .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
            .join(' ')}
          fill="none"
          stroke={s.colorVar}
          strokeWidth={s.dashed ? 1.75 : 2}
          strokeDasharray={s.dashed ? '4 2' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <text x={padX} y={H - 6} fontSize={9} fill="var(--ink-3)">
        {startLabel}
      </text>
      <text
        x={W - padX}
        y={H - 6}
        fontSize={9}
        textAnchor="end"
        fill="var(--ink-3)">
        {endLabel}
      </text>
    </svg>
  );
}
