'use client';

import {
  type AdAccount,
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  correlationSeries,
  CREATIVE_TESTS,
  deriveDayChanges,
  describeChangeItem,
  formatMoneyCents,
  LIFT_TESTS,
} from '@/lib/demos/opportunity-score';

import {DualAxisChart} from './charts';
import {Badge, Insight, Kpi, SectionHeading, type Tone} from './shared';

function Section({
  tag,
  tone,
  children,
}: {
  tag: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <Badge tone={tone}>{tag}</Badge>
      </div>
      {children}
    </section>
  );
}

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 align-top text-[12px] text-ink-2';

export function MeasurementView({account}: {account: AdAccount}) {
  const changeRows = deriveDayChanges(account.history).flatMap(d =>
    d.items.map(item => ({date: d.date, score: d.score, item})),
  );
  const fromStart = account.opportunityScore - account.history[0].score;
  const total = account.recommendations.length;
  const series = correlationSeries(account);
  const avgLift = Math.round(
    LIFT_TESTS.reduce((s, t) => s + t.lift, 0) / LIFT_TESTS.length,
  );
  const maxLift = Math.max(...LIFT_TESTS.map(t => t.lift));
  const maxCpa = Math.max(
    ...CREATIVE_TESTS.map(t => Math.abs(t.cpaImprovement)),
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Observed */}
      <Section tag="Observed" tone="blue">
        <SectionHeading
          title="Performance & adoption"
          sub={`What actually moved on ${account.name}`}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Current score"
            value={String(account.opportunityScore)}
            note={
              fromStart >= 0
                ? `+${fromStart} from start`
                : `${fromStart} from start`
            }
            noteTone={fromStart >= 0 ? 'up' : 'down'}
          />
          <Kpi label="Recommendations" value={String(total)} note="tracked" />
          <Kpi
            label="Cost per result"
            value={formatMoneyCents(account.cpaCents, account.currency)}
          />
          <Kpi label="Return on spend" value={`${account.roas.toFixed(1)}×`} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-ink">
              Score changes & reasons
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Score</th>
                  <th className={TH}>Change</th>
                  <th className={TH}>What happened</th>
                  <th className={TH}>Area</th>
                </tr>
              </thead>
              <tbody>
                {changeRows.map(({date, score, item}, i) => {
                  const areaColor = item.category
                    ? CATEGORY_COLOR[item.category]
                    : 'var(--ink-3)';
                  return (
                    <tr key={`${date}-${i}`} className="border-t border-border">
                      <td className={TD}>{date.slice(5)}</td>
                      <td className={`${TD} font-bold text-ink`}>{score}</td>
                      <td
                        className={`${TD} font-semibold`}
                        style={{
                          color:
                            item.scoreChange > 0
                              ? 'var(--green)'
                              : item.scoreChange < 0
                                ? 'var(--rose)'
                                : 'var(--ink-3)',
                        }}>
                        {item.scoreChange > 0
                          ? `+${item.scoreChange}`
                          : item.scoreChange < 0
                            ? item.scoreChange
                            : '0'}
                      </td>
                      <td className={`${TD} text-ink`}>
                        <span className="font-medium">{item.campaignName}</span>
                        <span className="text-ink-3">
                          {' '}
                          — {describeChangeItem(item, account.currency)}
                        </span>
                      </td>
                      <td className={TD}>
                        {item.category ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              color: areaColor,
                              background: `color-mix(in srgb, ${areaColor} 15%, transparent)`,
                            }}>
                            {CATEGORY_LABEL[item.category]}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Correlational */}
      <Section tag="Correlational" tone="purple">
        <SectionHeading
          title="Score vs cost per result"
          sub="Higher scores track with lower costs — 90-day comparison"
        />
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">
              Score (rising) vs cost per result (falling)
            </span>
            <Badge tone="purple">r = −0.82</Badge>
          </div>
          <DualAxisChart series={series} currency={account.currency} />
          <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{background: 'var(--brand-2)'}}
              />
              Opportunity score
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{background: 'var(--rose)'}}
              />
              Cost per result
            </span>
          </div>
          <div className="mt-3">
            <Insight>
              <strong className="text-ink">Key finding:</strong> on{' '}
              {account.name}, each 5-point score gain tracks with a measurable
              drop in cost per result — strongest 7–14 days after a
              recommendation is applied.
            </Insight>
          </div>
        </div>
      </Section>

      {/* Causation */}
      <Section tag="Causation" tone="rose">
        <SectionHeading
          title="Experiment results"
          sub="Controlled tests proving recommendations cause the outcome"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi
            label="Conversion lift tests"
            value={String(LIFT_TESTS.length)}
            note="this quarter"
          />
          <Kpi
            label="Avg incremental lift"
            value={`+${avgLift}%`}
            note="vs control"
            noteTone="up"
          />
          <Kpi
            label="Creative split tests"
            value={String(CREATIVE_TESTS.length)}
            note="winners found"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-ink">
              Conversion lift — what we tested
            </span>
            <Badge tone="blue">Controlled</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Test</th>
                  <th className={TH}>Treatment</th>
                  <th className={TH}>Control</th>
                  <th className={TH}>Lift</th>
                  <th className={TH}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {LIFT_TESTS.map(t => (
                  <tr key={t.name} className="border-t border-border">
                    <td className={`${TD} font-semibold text-ink`}>{t.name}</td>
                    <td className={TD}>{t.treatment}</td>
                    <td className={TD}>{t.control}</td>
                    <td className={`${TD} font-bold text-[color:var(--green)]`}>
                      +{t.lift}%
                    </td>
                    <td className={TD}>
                      <Badge tone={t.confidence >= 90 ? 'green' : 'blue'}>
                        {t.confidence}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-ink">
              Creative split tests — winners
            </span>
            <Badge tone="rose">A/B tested</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="bg-surface-2">
                <tr>
                  <th className={TH}>Test</th>
                  <th className={TH}>Variants</th>
                  <th className={TH}>Winner</th>
                  <th className={TH}>CPA improvement</th>
                  <th className={TH}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {CREATIVE_TESTS.map(t => (
                  <tr key={t.name} className="border-t border-border">
                    <td className={`${TD} font-semibold text-ink`}>{t.name}</td>
                    <td className={TD}>{t.variants}</td>
                    <td className={TD}>{t.winner}</td>
                    <td className={`${TD} font-bold text-[color:var(--green)]`}>
                      {t.cpaImprovement}%
                    </td>
                    <td className={TD}>
                      <Badge tone={t.confidence >= 90 ? 'green' : 'blue'}>
                        {t.confidence}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-3">
              Conversion lift by action
            </p>
            <div className="flex flex-col gap-2">
              {LIFT_TESTS.map(t => (
                <div key={t.name} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[11px] text-ink-2">
                    {t.name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(t.lift / maxLift) * 100}%`,
                        background: 'var(--brand-2)',
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] font-bold text-[color:var(--brand-ink)]">
                    +{t.lift}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-ink-3">
              Creative winners — CPA reduction
            </p>
            <div className="flex flex-col gap-2">
              {CREATIVE_TESTS.map(t => (
                <div key={t.name} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[11px] text-ink-2">
                    {t.winner}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(Math.abs(t.cpaImprovement) / maxCpa) * 100}%`,
                        background: 'var(--rose)',
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] font-bold text-[color:var(--rose)]">
                    {t.cpaImprovement}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
