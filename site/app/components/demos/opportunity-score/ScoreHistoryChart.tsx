'use client';

import {useState} from 'react';

import {
  type DayChange,
  deriveDayChanges,
  describeChangeItem,
  type ScorePoint,
} from '@/lib/demos/opportunity-score';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  if (!m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}`;
}

/**
 * SVG line chart of opportunity score (0–100) over time. Hovering (or focusing)
 * a point reveals a tooltip with the date, score, and — straight from the
 * `/opportunity_score_history` changelog — the campaign change(s) that drove it.
 * The SVG fills its box at the viewBox aspect ratio so the HTML tooltip overlay
 * maps exactly to each point.
 */
export function ScoreHistoryChart({
  history,
  currency,
}: {
  history: ScorePoint[];
  currency: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 200;
  const padX = 26;
  const padTop = 14;
  const padBottom = 26;
  const lastI = Math.max(0, history.length - 1);

  const x = (i: number) =>
    padX + (lastI === 0 ? 0 : (i * (W - padX * 2)) / lastI);
  const y = (s: number) => padTop + (H - padTop - padBottom) * (1 - s / 100);

  const linePoints = history
    .map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(' ');
  const areaPoints =
    `${x(0).toFixed(1)},${(H - padBottom).toFixed(1)} ` +
    linePoints +
    ` ${x(lastI).toFixed(1)},${(H - padBottom).toFixed(1)}`;

  const changesByDate = new Map<string, DayChange>(
    deriveDayChanges(history).map(d => [d.date, d]),
  );
  const active = hover !== null ? history[hover] : null;
  const activeChange = active ? changesByDate.get(active.date) : undefined;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block aspect-[16/5] w-full"
        role="img"
        aria-label="Opportunity score over time">
        {[0, 50, 100].map(g => (
          <g key={g}>
            <line
              x1={padX}
              x2={W - padX}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={2} y={y(g) + 3} fontSize={11} fill="var(--ink-3)">
              {g}
            </text>
          </g>
        ))}

        <polygon
          points={areaPoints}
          fill="color-mix(in srgb, var(--brand-2) 14%, transparent)"
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--brand-2)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {history.map((p, i) => {
          const hasChange = p.changelog.length > 0;
          return (
            <circle
              key={`dot-${p.date}-${i}`}
              cx={x(i)}
              cy={y(p.score)}
              r={hover === i ? 6 : hasChange ? 4.5 : 3}
              fill={hasChange ? 'var(--brand)' : 'var(--surface)'}
              stroke="var(--brand-2)"
              strokeWidth={2}
            />
          );
        })}

        {/* Larger transparent hit targets for hover / keyboard focus. */}
        {history.map((p, i) => (
          <circle
            key={`hit-${p.date}-${i}`}
            cx={x(i)}
            cy={y(p.score)}
            r={16}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${shortDate(p.date)}: score ${p.score}`}
            style={{cursor: 'pointer', outline: 'none'}}
            onMouseEnter={() => {
              setHover(i);
            }}
            onMouseLeave={() => {
              setHover(null);
            }}
            onFocus={() => {
              setHover(i);
            }}
            onBlur={() => {
              setHover(null);
            }}
          />
        ))}

        {history.length > 0 ? (
          <>
            <text x={padX} y={H - 6} fontSize={11} fill="var(--ink-3)">
              {shortDate(history[0].date)}
            </text>
            <text
              x={W - padX}
              y={H - 6}
              fontSize={11}
              fill="var(--ink-3)"
              textAnchor="end">
              {shortDate(history[lastI].date)}
            </text>
          </>
        ) : null}
      </svg>

      {active && hover !== null ? (
        <div
          className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface p-2.5 shadow-[var(--shadow-pop)]"
          style={{
            left: `${Math.min(80, Math.max(20, (x(hover) / W) * 100))}%`,
            top: `${(y(active.score) / H) * 100 - 4}%`,
          }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-ink-3">
              {shortDate(active.date)}
            </span>
            <span className="text-[13px] font-bold tabular-nums text-ink">
              Score {active.score}
            </span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {activeChange ? (
              activeChange.items.map((item, idx) => (
                <div
                  key={idx}
                  className="border-t border-border pt-1.5 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-ink">
                      {item.campaignName}
                    </span>
                    <span
                      className="shrink-0 text-[12px] font-bold tabular-nums"
                      style={{
                        color:
                          item.scoreChange >= 0
                            ? 'var(--green)'
                            : 'var(--rose)',
                      }}>
                      {item.scoreChange >= 0
                        ? `+${item.scoreChange}`
                        : item.scoreChange}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-ink-2">
                    {describeChangeItem(item, currency)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-ink-3">No change logged</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
