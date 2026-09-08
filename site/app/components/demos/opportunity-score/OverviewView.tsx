'use client';

import {Check} from 'lucide-react';

import {
  type AdAccount,
  CATEGORY_LABEL,
  deriveDayChanges,
  describeChangeItem,
  formatMoneyCents,
  type Recommendation,
  scoreBreakdown,
} from '@/lib/demos/opportunity-score';

import {DonutScore} from './charts';
import {ScoreHistoryChart} from './ScoreHistoryChart';
import {Insight, Kpi, RecCard, SectionHeading} from './shared';

const TONE_GLYPH = {
  positive: {sign: '+', colorVar: 'var(--green)'},
  negative: {sign: '−', colorVar: 'var(--rose)'},
  neutral: {sign: '~', colorVar: 'var(--cat-measurement)'},
} as const;

export function OverviewView({
  account,
  applied,
  onAdopt,
}: {
  account: AdAccount;
  applied: Set<string>;
  onAdopt: (rec: Recommendation) => void;
}) {
  const openRecs = account.recommendations
    .filter(r => !applied.has(r.id))
    .sort((a, b) => b.scoreLift - a.scoreLift);
  const total = account.recommendations.length;
  const appliedCount = total - openRecs.length;
  const uplift = openRecs.reduce((s, r) => s + r.scoreLift, 0);
  const adoption = total > 0 ? Math.round((appliedCount / total) * 100) : 0;
  const scoreDelta = account.opportunityScore - account.prevScore;

  const breakdown = scoreBreakdown(account.opportunityScore);
  const changeRows = deriveDayChanges(account.history).flatMap(d =>
    d.items.map(item => ({date: d.date, item})),
  );
  const projected = Math.min(100, account.opportunityScore + uplift);
  const topLever = openRecs[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Opportunity score"
          value={String(account.opportunityScore)}
          note={
            scoreDelta >= 0
              ? `+${scoreDelta} vs 30d ago`
              : `${scoreDelta} vs 30d ago`
          }
          noteTone={scoreDelta >= 0 ? 'up' : 'down'}
        />
        <Kpi
          label="Recommendations"
          value={String(openRecs.length)}
          note={`${appliedCount} applied`}
        />
        <Kpi
          label="Potential uplift"
          value={`+${uplift}`}
          note="if all applied"
          noteTone={uplift > 0 ? 'up' : 'muted'}
        />
        <Kpi
          label="Adoption rate"
          value={`${adoption}%`}
          note={`${appliedCount} of ${total}`}
        />
        <Kpi
          label="Cost per result"
          value={formatMoneyCents(account.cpaCents, account.currency)}
          note={`ROAS ${account.roas.toFixed(1)}×`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <SectionHeading title="Score trend — last 30 days" />
          <ScoreHistoryChart
            history={account.history}
            currency={account.currency}
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <SectionHeading title="Score breakdown" />
          <div className="flex items-center gap-5">
            <DonutScore
              score={account.opportunityScore}
              components={breakdown}
            />
            <div className="flex flex-1 flex-col gap-2.5">
              {breakdown.map(c => (
                <div key={c.label}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-ink-2">{c.label}</span>
                    <span
                      className="font-bold tabular-nums"
                      style={{color: c.colorVar}}>
                      {c.points} pts
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((c.points / c.max) * 100)}%`,
                        background: c.colorVar,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {changeRows.length > 0 ? (
        <div>
          <SectionHeading
            title="Why your score changed"
            sub="Recent changes on this account and their impact"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {changeRows.map(({date, item}, i) => {
              const g = TONE_GLYPH[item.tone];
              return (
                <div
                  key={`${date}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-md text-[13px] font-bold"
                    style={{
                      color: g.colorVar,
                      background: `color-mix(in srgb, ${g.colorVar} 14%, transparent)`,
                    }}
                    aria-hidden>
                    {g.sign}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {item.campaignName}
                    </p>
                    <p className="truncate text-[11px] text-ink-3">
                      {describeChangeItem(item, account.currency)}
                      {item.category
                        ? ` · ${CATEGORY_LABEL[item.category]}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[13px] font-bold tabular-nums"
                    style={{color: g.colorVar}}>
                    {item.scoreChange > 0
                      ? `+${item.scoreChange}`
                      : item.scoreChange < 0
                        ? item.scoreChange
                        : '0'}
                  </span>
                </div>
              );
            })}
          </div>
          {openRecs.length > 0 ? (
            <div className="mt-3">
              <Insight>
                <strong className="text-ink">Projected trajectory:</strong>{' '}
                applying the {openRecs.length} open recommendation
                {openRecs.length === 1 ? '' : 's'} would lift {account.name} to{' '}
                <strong className="text-ink">{projected}</strong>. Biggest
                lever: {topLever.title} (+{topLever.scoreLift}).
              </Insight>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <SectionHeading
          title="Recommendations"
          sub="Ranked by impact on this account's score"
        />
        {openRecs.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {openRecs.map(rec => (
              <RecCard
                key={rec.id}
                rec={rec}
                onAdopt={() => {
                  onAdopt(rec);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <Check className="size-6 text-[color:var(--green)]" />
            <p className="mt-2 text-sm font-semibold text-ink">
              All recommendations adopted
            </p>
            <p className="mt-1 text-[13px] text-ink-2">
              {account.name} is following best practices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
