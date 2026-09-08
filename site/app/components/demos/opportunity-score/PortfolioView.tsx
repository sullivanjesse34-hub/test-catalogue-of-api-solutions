'use client';

import {
  type AdAccount,
  BENCHMARK_SCORE,
  type Category,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  formatMoneyCents,
  REC_CATEGORY,
  type ScoreBand,
  scoreBand,
} from '@/lib/demos/opportunity-score';

import {AccountScoreBars, MultiLineChart, type TrendSeries} from './charts';
import {Badge, Insight, Kpi, SectionHeading, type Tone} from './shared';

const BAND_TONE: Record<ScoreBand, Tone> = {
  high: 'green',
  mid: 'yellow',
  low: 'rose',
};

const BAND_COLOR: Record<ScoreBand, string> = {
  high: 'var(--green)',
  mid: 'var(--cat-measurement)',
  low: 'var(--rose)',
};

const STATUS_LABEL: Record<ScoreBand, string> = {
  high: 'Optimal',
  mid: 'On track',
  low: 'Needs action',
};

const LINE_COLORS = [
  'var(--brand-2)',
  'var(--purple)',
  'var(--cat-signals)',
  'var(--rose)',
];

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
  return m && d ? `${MONTHS[m - 1]} ${d}` : iso;
}

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

function openByCategory(
  account: AdAccount,
  applied: Set<string>,
): Record<Category, number> {
  const counts: Record<Category, number> = {
    audiences: 0,
    tracking: 0,
    creative: 0,
    budget: 0,
    placements: 0,
  };
  for (const r of account.recommendations) {
    if (!applied.has(r.id)) counts[REC_CATEGORY[r.type]] += 1;
  }
  return counts;
}

export function PortfolioView({
  accounts,
  applied,
}: {
  accounts: AdAccount[];
  applied: Set<string>;
}) {
  const total = accounts.length;
  const avg = Math.round(
    accounts.reduce((s, a) => s + a.opportunityScore, 0) / total,
  );
  const prevAvg = Math.round(
    accounts.reduce((s, a) => s + a.prevScore, 0) / total,
  );
  const aboveBench = accounts.filter(
    a => a.opportunityScore >= BENCHMARK_SCORE,
  ).length;

  let openActions = 0;
  let combinedLift = 0;
  for (const a of accounts) {
    for (const r of a.recommendations) {
      if (!applied.has(r.id)) {
        openActions += 1;
        combinedLift += r.scoreLift;
      }
    }
  }
  const portfolioCpa = Math.round(
    accounts.reduce((s, a) => s + a.cpaCents, 0) / total,
  );

  const ranked = [...accounts].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  );
  const bars = ranked.map(a => ({
    name: a.name,
    score: a.opportunityScore,
    colorVar: BAND_COLOR[scoreBand(a.opportunityScore)],
  }));

  // Trend: a spread of accounts (best, two mid, worst) plus the portfolio average.
  const trendPicks = [
    ranked[0],
    ranked[2],
    ranked[4],
    ranked[ranked.length - 1],
  ].filter((a): a is AdAccount => Boolean(a));
  const histLen = accounts[0].history.length;
  const avgValues = Array.from({length: histLen}, (_, i) =>
    Math.round(accounts.reduce((s, a) => s + a.history[i].score, 0) / total),
  );
  const series: TrendSeries[] = [
    ...trendPicks.map((a, i) => ({
      label: a.name,
      colorVar: LINE_COLORS[i % LINE_COLORS.length],
      values: a.history.map(h => h.score),
    })),
    {
      label: 'Portfolio avg',
      colorVar: 'var(--cat-measurement)',
      values: avgValues,
      dashed: true,
    },
  ];

  const lowest = ranked[ranked.length - 1];
  const lowestOpen = lowest.recommendations
    .filter(r => !applied.has(r.id))
    .sort((a, b) => b.scoreLift - a.scoreLift);
  const lowestUplift = lowestOpen.reduce((s, r) => s + r.scoreLift, 0);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Portfolio scorecard"
        sub="Opportunity across every client account — compare, benchmark, prioritise"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Portfolio average"
          value={String(avg)}
          note={
            avg - prevAvg >= 0
              ? `+${avg - prevAvg} over 30d`
              : `${avg - prevAvg} over 30d`
          }
          noteTone={avg - prevAvg >= 0 ? 'up' : 'down'}
          accentVar="var(--brand-2)"
        />
        <Kpi
          label="Total accounts"
          value={String(total)}
          note="clients"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Above benchmark"
          value={String(aboveBench)}
          note={`${Math.round((aboveBench / total) * 100)}% of book`}
          noteTone="up"
          accentVar="var(--green)"
        />
        <Kpi
          label="Open actions"
          value={String(openActions)}
          note={`+${combinedLift} pts combined`}
          accentVar="var(--rose)"
        />
        <Kpi
          label="Portfolio CPR"
          value={formatMoneyCents(portfolioCpa, 'USD')}
          note="blended"
          accentVar="var(--cat-measurement)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Score by account</span>
            <Badge tone="blue">Benchmark {BENCHMARK_SCORE}</Badge>
          </div>
          <AccountScoreBars bars={bars} benchmark={BENCHMARK_SCORE} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-ink">
              Readiness by category
            </span>
            <Badge tone="purple">Open work</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Account</th>
                  {CATEGORY_ORDER.map(c => (
                    <th key={c} className={`${TH} text-center`}>
                      {CATEGORY_LABEL[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map(a => {
                  const counts = openByCategory(a, applied);
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className={`${TD} font-semibold text-ink`}>
                        {a.name}
                      </td>
                      {CATEGORY_ORDER.map(c => {
                        const n = counts[c];
                        const color =
                          n === 0
                            ? 'var(--green)'
                            : n === 1
                              ? 'var(--cat-measurement)'
                              : 'var(--rose)';
                        return (
                          <td key={c} className="px-3 py-2.5 text-center">
                            <span
                              className="inline-flex min-w-12 justify-center rounded px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                color,
                                background: `color-mix(in srgb, ${color} 13%, transparent)`,
                              }}>
                              {n === 0 ? 'Done' : `${n} left`}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Full account scorecard
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Account</th>
                <th className={TH}>Score</th>
                <th className={TH}>30d</th>
                <th className={TH}>Actions</th>
                <th className={TH}>Top recommendation</th>
                <th className={TH}>Lift</th>
                <th className={TH}>CPR</th>
                <th className={TH}>ROAS</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(a => {
                const band = scoreBand(a.opportunityScore);
                const open = a.recommendations
                  .filter(r => !applied.has(r.id))
                  .sort((x, y) => y.scoreLift - x.scoreLift);
                const topRec = open[0];
                const delta = a.opportunityScore - a.prevScore;
                return (
                  <tr key={a.id} className="border-t border-border">
                    <td className={`${TD} font-semibold text-ink`}>{a.name}</td>
                    <td
                      className={`${TD} font-bold`}
                      style={{color: BAND_COLOR[band]}}>
                      {a.opportunityScore}
                    </td>
                    <td
                      className={`${TD} font-semibold`}
                      style={{
                        color: delta >= 0 ? 'var(--green)' : 'var(--rose)',
                      }}>
                      {delta >= 0 ? `+${delta}` : delta}
                    </td>
                    <td className={TD}>{open.length}</td>
                    <td className={`${TD} text-ink`}>
                      {open.length > 0 ? topRec.title : '—'}
                    </td>
                    <td
                      className={`${TD} font-semibold text-[color:var(--green)]`}>
                      {open.length > 0 ? `+${topRec.scoreLift}` : '—'}
                    </td>
                    <td className={TD}>
                      {formatMoneyCents(a.cpaCents, a.currency)}
                    </td>
                    <td className={TD}>{a.roas.toFixed(1)}×</td>
                    <td className={TD}>
                      <Badge tone={BAND_TONE[band]}>{STATUS_LABEL[band]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">
            Score trend across accounts
          </span>
          <Badge tone="blue">30 days</Badge>
        </div>
        <MultiLineChart
          series={series}
          startLabel={shortDate(accounts[0].history[0].date)}
          endLabel={shortDate(accounts[0].history[histLen - 1].date)}
        />
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {series.map(s => (
            <span
              key={s.label}
              className="flex items-center gap-1.5 text-[11px] text-ink-2">
              <span
                className="size-2 rounded-full"
                style={{background: s.colorVar}}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {lowestOpen.length > 0 ? (
        <Insight>
          <strong className="text-ink">Priority:</strong> {lowest.name} (score{' '}
          {lowest.opportunityScore}) is pulling the portfolio average down.
          Applying its {lowestOpen.length} open recommendation
          {lowestOpen.length === 1 ? '' : 's'} would lift it to{' '}
          <strong className="text-ink">
            {Math.min(100, lowest.opportunityScore + lowestUplift)}
          </strong>{' '}
          and raise the portfolio average.
        </Insight>
      ) : null}
    </div>
  );
}
