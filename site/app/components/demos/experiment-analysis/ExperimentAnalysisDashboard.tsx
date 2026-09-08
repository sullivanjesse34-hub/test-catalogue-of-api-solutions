'use client';

import {
  BarChart3,
  Beaker,
  CircleCheck,
  FlaskConical,
  type LucideIcon,
  Plus,
  Target,
  TrendingUp,
} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  AD_STUDIES,
  type AdStudy,
  type Benchmark,
  benchmarksByCategory,
  formatLift,
  formatMoney,
  isSignificant,
  primaryObjective,
  SIGNIFICANCE_META,
  SIGNIFICANCE_THRESHOLD,
  significanceBand,
  STUDY_TYPE_META,
  studyConfidence,
  studyIncrementalConversions,
  studyLift,
  type StudyType,
} from '@/lib/demos/experiment-analysis';

import {
  Badge,
  ConfidenceRing,
  Insight,
  Kpi,
  LiftBar,
  LiftIntervalBar,
  SectionHeading,
  type Tone,
} from './ui';

// Developer-doc links surfaced in the API console for each call.
const DOC_AD_STUDY =
  'https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-study';
const DOC_BUSINESS =
  'https://developers.facebook.com/docs/business-management-apis/';
const DOC_SPLIT_TEST =
  'https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/split-testing';

const BUSINESS_ID = '748291056';

type View = 'studies' | 'results' | 'benchmarks';

const TABS: Array<{id: View; label: string; icon: LucideIcon}> = [
  {id: 'studies', label: 'Studies', icon: FlaskConical},
  {id: 'results', label: 'Results', icon: TrendingUp},
  {id: 'benchmarks', label: 'Benchmarks', icon: BarChart3},
];

const TH =
  'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-ink-3';
const TD = 'px-3 py-2.5 text-[12px] text-ink-2';

const STATUS_TONE: Record<AdStudy['status'], Tone> = {
  RUNNING: 'blue',
  COMPLETED: 'green',
  SCHEDULED: 'muted',
};

const STATUS_LABEL: Record<AdStudy['status'], string> = {
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  SCHEDULED: 'Scheduled',
};

function docForType(type: StudyType): string {
  return type === 'SPLIT_TEST_V2' ? DOC_SPLIT_TEST : DOC_AD_STUDY;
}

// Reads that populate a study's detail (cells → objectives → results).
function buildStudyLoadCalls(study: AdStudy): ApiCallInput[] {
  const meta = STUDY_TYPE_META[study.type];
  const calls: ApiCallInput[] = [
    {
      method: 'GET',
      endpoint: `${study.id}/cells`,
      summary: `Cells (treatment/control arms) for ${study.name}`,
      request: {fields: 'name,role,adaccount_ids,adset_ids,campaign_ids'},
      response: {
        data: study.cells.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role,
          treatment_percentage: c.treatmentPercentage,
          [`${c.entityLevel}_ids`]: c.entityIds,
        })),
      },
      status: 'success',
      docsUrl: docForType(study.type),
    },
    {
      method: 'GET',
      endpoint: `${study.id}/objectives`,
      summary: `Objectives for ${study.name}`,
      request: {fields: 'id,name,type'},
      response: {
        data: study.objectives.map(o => ({
          id: o.id,
          name: o.name,
          type: o.type,
        })),
      },
      status: 'success',
      docsUrl: DOC_AD_STUDY,
    },
  ];

  if (meta.hasResults && study.type !== 'SPLIT_TEST_V2') {
    for (const o of study.objectives) {
      calls.push({
        method: 'GET',
        endpoint: o.id,
        summary: `Results — ${o.name}`,
        request: {fields: 'results'},
        response: {
          results: {
            lift: o.liftPct,
            confidence: o.confidencePct,
            p_value: o.pValue,
            incremental_conversions: o.incrementalConversions,
            confidence_interval: {low: o.ciLowPct, high: o.ciHighPct},
          },
        },
        status: 'success',
        docsUrl: DOC_AD_STUDY,
      });
    }
  }

  if (study.type === 'SPLIT_TEST_V2' && study.creativeResults) {
    calls.push({
      method: 'GET',
      endpoint: study.id,
      summary: `Creative-test winner for ${study.name}`,
      request: {fields: 'split_test_winner'},
      response: {
        split_test_winner: {
          winner_ad_object_id:
            study.creativeResults.find(r => r.isWinner)?.adId ?? null,
          high_performer_ids: study.creativeResults
            .filter(r => r.isWinner)
            .map(r => r.adId),
          confidences: study.creativeResults.map(r => ({
            ad_id: r.adId,
            confidence: r.confidencePct / 100,
          })),
        },
      },
      status: 'success',
      docsUrl: DOC_SPLIT_TEST,
    });
  }

  return calls;
}

export function ExperimentAnalysisDashboard() {
  const {record} = useApiConsole();
  const [view, setView] = useState<View>('studies');
  const [selectedId, setSelectedId] = useState<string>(AD_STUDIES[0].id);

  const selected = AD_STUDIES.find(s => s.id === selectedId) ?? AD_STUDIES[0];

  // Initial read: list studies across the business (Business Mgmt + Ad Studies).
  useApiLoads('studies-list', () => [
    {
      method: 'GET',
      endpoint: `${BUSINESS_ID}/owned_ad_accounts`,
      summary: 'Ad accounts in scope (Business Management API)',
      request: {fields: 'account_id,name'},
      response: {
        data: Array.from(new Set(AD_STUDIES.map(s => s.adAccountId))).map(
          id => ({account_id: `act_${id}`}),
        ),
      },
      status: 'success',
      docsUrl: DOC_BUSINESS,
    },
    {
      method: 'GET',
      endpoint: `${BUSINESS_ID}/ad_studies`,
      summary: 'List ad studies across the business',
      request: {fields: 'id,name,type,start_time,end_time'},
      response: {
        data: AD_STUDIES.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          start_time: s.startTime,
          end_time: s.endTime,
        })),
      },
      status: 'success',
      docsUrl: DOC_AD_STUDY,
    },
  ]);

  // Re-fire the cell/objective/result reads whenever the selected study changes.
  useApiLoads(selectedId, () => buildStudyLoadCalls(selected));

  const handleCreateDraft = useCallback(
    (type: StudyType) => {
      const meta = STUDY_TYPE_META[type];
      record({
        method: 'POST',
        endpoint: `${BUSINESS_ID}/ad_studies`,
        summary: `Create standardised ${meta.label} draft`,
        request:
          type === 'SPLIT_TEST_V2'
            ? {
                type,
                name: '[Draft] Creative Test — {campaign}',
                cooldown_start_time: '{start_time}',
                observation_end_time: '{end_time}',
                cells: [
                  {name: 'group a', treatment_percentage: 50, ads: ['<AD_ID>']},
                  {name: 'group b', treatment_percentage: 50, ads: ['<AD_ID>']},
                ],
                creative_test_config: {daily_budget: 1000},
              }
            : {
                type,
                name: '[Draft] Conversion Lift — {campaign}',
                cells: [
                  {name: 'Exposed', treatment_percentage: 85},
                  {name: 'Holdout', treatment_percentage: 15},
                ],
                objectives: [{name: 'Purchases', type: 'PURCHASE'}],
              },
        response: {id: '1207743900000', success: true},
        status: 'success',
        docsUrl: docForType(type),
      });
    },
    [record],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-border bg-surface p-1">
          {TABS.map(({id, label, icon: Icon}) => {
            const on = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setView(id);
                }}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  on
                    ? 'bg-brand text-on-brand'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')}>
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'studies' ? (
        <StudiesView
          selected={selected}
          onSelect={setSelectedId}
          onCreateDraft={handleCreateDraft}
        />
      ) : null}
      {view === 'results' ? (
        <ResultsView selected={selected} onSelect={setSelectedId} />
      ) : null}
      {view === 'benchmarks' ? <BenchmarksView /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Studies — portfolio list + selected study cells
// ---------------------------------------------------------------------------

function StudiesView({
  selected,
  onSelect,
  onCreateDraft,
}: {
  selected: AdStudy;
  onSelect: (id: string) => void;
  onCreateDraft: (type: StudyType) => void;
}) {
  const completed = AD_STUDIES.filter(s => s.status === 'COMPLETED');
  const withResults = completed.filter(s => STUDY_TYPE_META[s.type].hasResults);
  const significant = withResults.filter(isSignificant).length;
  const running = AD_STUDIES.filter(s => s.status === 'RUNNING').length;
  const totalIncremental = withResults.reduce(
    (s, st) => s + studyIncrementalConversions(st),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Studies"
          value={String(AD_STUDIES.length)}
          note={`${running} running`}
          accentVar="var(--cat-measurement)"
        />
        <Kpi
          label="Significant results"
          value={`${significant}/${withResults.length}`}
          note={`≥ ${SIGNIFICANCE_THRESHOLD}% confidence`}
          accentVar="var(--green)"
        />
        <Kpi
          label="Incremental conversions"
          value={new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(totalIncremental)}
          note="across completed lifts"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Standardised"
          value="Business-level"
          note="one read layer, all accounts"
          accentVar="var(--cat-signals)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Ad studies · across the business
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateDraft('LIFT');
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-on-brand transition-opacity hover:opacity-90">
              <Plus className="size-3.5" />
              New lift study
            </button>
            <button
              type="button"
              onClick={() => {
                onCreateDraft('SPLIT_TEST_V2');
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <Beaker className="size-3.5" />
              New creative test
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Study</th>
                <th className={TH}>Type</th>
                <th className={TH}>Status</th>
                <th className={TH}>Lift</th>
                <th className={TH}>Confidence</th>
                <th className={TH}>Spend</th>
              </tr>
            </thead>
            <tbody>
              {AD_STUDIES.map(s => {
                const meta = STUDY_TYPE_META[s.type];
                const active = s.id === selected.id;
                const hasResults = meta.hasResults && s.status === 'COMPLETED';
                const conf = studyConfidence(s);
                const band = significanceBand(conf);
                return (
                  <tr
                    key={s.id}
                    onClick={() => {
                      onSelect(s.id);
                    }}
                    className={[
                      'cursor-pointer border-t border-border transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    ].join(' ')}>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold text-ink">
                        {s.name}
                      </div>
                      <div className="text-[11px] tabular-nums text-ink-3">
                        {s.businessName} · act_{s.adAccountId}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          color: meta.colorVar,
                          background: `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
                        }}>
                        {meta.short}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONE[s.status]}>
                        {STATUS_LABEL[s.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {hasResults ? (
                        <span
                          className="text-[13px] font-bold tabular-nums"
                          style={{
                            color:
                              studyLift(s) > 0 ? 'var(--green)' : 'var(--rose)',
                          }}>
                          {formatLift(studyLift(s))}
                        </span>
                      ) : s.type === 'SPLIT_TEST' &&
                        s.status === 'COMPLETED' ? (
                        <span className="text-[11px] text-ink-3">
                          no API results
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {hasResults ? (
                        <span
                          className="text-[12px] font-semibold tabular-nums"
                          style={{color: SIGNIFICANCE_META[band].colorVar}}>
                          {conf}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3">—</span>
                      )}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {s.spendCents > 0 ? formatMoney(s.spendCents) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StudyDesign study={selected} />
    </div>
  );
}

function StudyDesign({study}: {study: AdStudy}) {
  const meta = STUDY_TYPE_META[study.type];
  const treatment = study.cells.filter(c => c.role === 'TREATMENT');
  const control = study.cells.filter(c => c.role === 'CONTROL');

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical
          className="size-4"
          style={{color: meta.colorVar}}
          aria-hidden
        />
        <h3 className="text-base font-bold tracking-[-0.01em] text-ink">
          {study.name}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            color: meta.colorVar,
            background: `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
          }}>
          {meta.label}
        </span>
      </div>
      <p className="mt-1 text-xs tabular-nums text-ink-3">
        {study.businessName} · study {study.id} · {study.startTime} →{' '}
        {study.endTime}
      </p>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        Cells define the experiment&apos;s treatment and control arms. Each cell
        carries a <span className="font-semibold text-ink">role</span> and the
        measured entities at one object level — standardise roles before writing
        a study.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CellGroup title="Treatment" cells={treatment} tone="green" />
        <CellGroup title="Control" cells={control} tone="muted" />
      </div>
    </div>
  );
}

function CellGroup({
  title,
  cells,
  tone,
}: {
  title: string;
  cells: AdStudy['cells'];
  tone: Tone;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <Badge tone={tone}>{title}</Badge>
        <span className="text-[11px] text-ink-3">
          {cells.length} cell{cells.length === 1 ? '' : 's'}
        </span>
      </div>
      {cells.length === 0 ? (
        <p className="text-[12px] text-ink-3">No cells.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cells.map(c => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">
                  {c.name}
                </div>
                <div className="text-[11px] text-ink-3">
                  {c.entityLevel.replace('_', ' ')} ·{' '}
                  {c.entityIds.length > 0
                    ? `${c.entityIds.length} entit${c.entityIds.length === 1 ? 'y' : 'ies'}`
                    : 'no exposure'}
                </div>
              </div>
              <span className="shrink-0 text-[13px] font-bold tabular-nums text-ink-2">
                {c.treatmentPercentage}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results — per-study lift / confidence-interval / creative winner
// ---------------------------------------------------------------------------

function ResultsView({
  selected,
  onSelect,
}: {
  selected: AdStudy;
  onSelect: (id: string) => void;
}) {
  const resultStudies = AD_STUDIES.filter(
    s => STUDY_TYPE_META[s.type].hasResults && s.objectives.length > 0,
  ).concat(
    AD_STUDIES.filter(
      s => s.type === 'SPLIT_TEST_V2' && (s.creativeResults?.length ?? 0) > 0,
    ),
  );
  const uniqueResultStudies = Array.from(
    new Map(resultStudies.map(s => [s.id, s])).values(),
  );
  const showStudy = STUDY_TYPE_META[selected.type].hasResults
    ? selected
    : (uniqueResultStudies[0] ?? selected);

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <span>Study</span>
        <select
          value={showStudy.id}
          onChange={e => {
            onSelect(e.target.value);
          }}
          aria-label="Select study"
          className="rounded-[10px] border-2 border-border bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus:border-[color:var(--cat-measurement)]">
          {uniqueResultStudies.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {showStudy.type === 'SPLIT_TEST_V2' ? (
        <CreativeResults study={showStudy} />
      ) : (
        <LiftResults study={showStudy} />
      )}
    </div>
  );
}

function LiftResults({study}: {study: AdStudy}) {
  const primary = primaryObjective(study);
  const band = significanceBand(studyConfidence(study));
  const bandMeta = SIGNIFICANCE_META[band];

  if (!primary) {
    return (
      <Insight>This study has no lift objectives with results yet.</Insight>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-5">
          <ConfidenceRing
            pct={studyConfidence(study)}
            colorVar={bandMeta.colorVar}
            size={104}
            stroke={9}
          />
          <div className="text-center">
            <div
              className="text-3xl font-bold tabular-nums tracking-[-0.02em]"
              style={{
                color: studyLift(study) > 0 ? 'var(--green)' : 'var(--rose)',
              }}>
              {formatLift(studyLift(study))}
            </div>
            <div className="mt-0.5 text-[12px] text-ink-3">
              {primary.name} lift
            </div>
            <div className="mt-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  color: bandMeta.colorVar,
                  background: `color-mix(in srgb, ${bandMeta.colorVar} 15%, transparent)`,
                }}>
                {bandMeta.label}
                {study.status === 'RUNNING' ? ' · interim' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricTile
              label="Incremental conv."
              value={new Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(studyIncrementalConversions(study))}
            />
            <MetricTile
              label="Incr. cost / conv."
              value={formatMoney(primary.incrementalCostPerConversionCents)}
            />
            <MetricTile label="p-value" value={primary.pValue.toFixed(3)} />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <SectionHeading
              title="Confidence intervals by objective"
              sub="Point estimate with its interval on a shared axis — an interval crossing zero is not conclusive."
            />
            <ul className="flex flex-col gap-3">
              {study.objectives.map(o => {
                const ob = significanceBand(o.confidencePct);
                return (
                  <li key={o.id}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-ink">{o.name}</span>
                      <span className="flex items-center gap-2 tabular-nums text-ink-2">
                        <span
                          className="font-bold"
                          style={{
                            color:
                              o.liftPct > 0 ? 'var(--green)' : 'var(--rose)',
                          }}>
                          {formatLift(o.liftPct)}
                        </span>
                        <span style={{color: SIGNIFICANCE_META[ob].colorVar}}>
                          {o.confidencePct}%
                        </span>
                      </span>
                    </div>
                    <LiftIntervalBar
                      liftPct={o.liftPct}
                      lowPct={o.ciLowPct}
                      highPct={o.ciHighPct}
                      colorVar={SIGNIFICANCE_META[ob].colorVar}
                    />
                    <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-ink-3">
                      <span>{formatLift(o.ciLowPct)}</span>
                      <span>0</span>
                      <span>{formatLift(o.ciHighPct)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {band === 'significant' ? (
        <Insight>
          <strong className="text-ink">Read:</strong> {primary.name} lift of{' '}
          {formatLift(primary.liftPct)} is statistically significant at{' '}
          {primary.confidencePct}% confidence — the exposed group drove{' '}
          {new Intl.NumberFormat('en-US').format(
            primary.incrementalConversions,
          )}{' '}
          incremental conversions at{' '}
          {formatMoney(primary.incrementalCostPerConversionCents)} each. Safe to
          scale this treatment and benchmark it against similar tests.
        </Insight>
      ) : (
        <Insight>
          <strong className="text-ink">Read:</strong> confidence is{' '}
          {studyConfidence(study)}%, below the {SIGNIFICANCE_THRESHOLD}%
          threshold{study.status === 'RUNNING' ? ' (still running)' : ''}. Treat
          the lift as directional — extend the test window or increase the
          holdout to tighten the interval before acting.
        </Insight>
      )}
    </div>
  );
}

function CreativeResults({study}: {study: AdStudy}) {
  const results = study.creativeResults ?? [];
  const winner = results.find(r => r.isWinner);
  const maxResults = Math.max(1, ...results.map(r => r.results));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi
          label="Cells"
          value={String(results.length)}
          note="one ad per cell"
          accentVar="var(--purple)"
        />
        <Kpi
          label="Winner confidence"
          value={winner ? `${winner.confidencePct}%` : '—'}
          note="Bayesian (split_test_winner)"
          accentVar="var(--green)"
        />
        <Kpi
          label="Best cost / result"
          value={winner ? formatMoney(winner.costPerResultCents) : '—'}
          note={winner?.cellName ?? ''}
          accentVar="var(--cat-signals)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-ink">
            Per-cell results · {study.name}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Cell (ad)</th>
                <th className={TH}>Results</th>
                <th className={TH}>Cost / result</th>
                <th className={TH}>Confidence</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.cellId} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <div className="text-[13px] font-semibold text-ink">
                      {r.cellName}
                    </div>
                    <div className="text-[11px] tabular-nums text-ink-3">
                      ad {r.adId}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[12px] tabular-nums text-ink-2">
                        {new Intl.NumberFormat('en-US', {
                          notation: 'compact',
                        }).format(r.results)}
                      </span>
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(r.results / maxResults) * 100}%`,
                            background: r.isWinner
                              ? 'var(--green)'
                              : 'var(--purple)',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {formatMoney(r.costPerResultCents)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold tabular-nums text-ink-2">
                    {r.confidencePct}%
                  </td>
                  <td className="px-3 py-2.5">
                    {r.isWinner ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--green)]">
                        <Target className="size-3.5" />
                        Winner
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {winner ? (
        <Insight>
          <strong className="text-ink">Read:</strong> {winner.cellName} is the
          winning creative at {winner.confidencePct}% Bayesian confidence and
          the lowest cost per result ({formatMoney(winner.costPerResultCents)}).
          Promote ad {winner.adId} and retire the underperformers.
        </Insight>
      ) : null}
    </div>
  );
}

function MetricTile({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Benchmarks — aggregate like-for-like completed studies (build spec, step 2)
// ---------------------------------------------------------------------------

function BenchmarksView() {
  const benchmarks = useMemo(() => benchmarksByCategory(AD_STUDIES), []);
  const maxMean = Math.max(1, ...benchmarks.map(b => b.meanLiftPct));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Standardised benchmarks"
        sub="Like-for-like completed studies aggregated by category — the meta-analysis layer that turns individual causal tests into planning benchmarks."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-surface-2">
              <tr>
                <th className={TH}>Benchmark category</th>
                <th className={TH}>Studies</th>
                <th className={TH}>Mean lift</th>
                <th className={TH}>Best lift</th>
                <th className={TH}>Median confidence</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map(b => (
                <tr key={b.category} className="border-t border-border">
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                    {b.category}
                  </td>
                  <td className={`${TD} tabular-nums`}>{b.studyCount}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-12 text-[13px] font-bold tabular-nums"
                        style={{color: 'var(--green)'}}>
                        {formatLift(b.meanLiftPct)}
                      </span>
                      <div className="w-24">
                        <LiftBar
                          liftPct={b.meanLiftPct}
                          colorVar="var(--cat-measurement)"
                          domain={maxMean * 1.1}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {formatLift(b.bestLiftPct)}
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {b.medianConfidencePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BenchmarkComparison benchmarks={benchmarks} />
    </div>
  );
}

function BenchmarkComparison({benchmarks}: {benchmarks: Benchmark[]}) {
  const scored = AD_STUDIES.filter(
    s =>
      s.status === 'COMPLETED' &&
      STUDY_TYPE_META[s.type].hasResults &&
      s.objectives.length > 0,
  );
  const benchByCat = new Map(benchmarks.map(b => [b.category, b]));

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <SectionHeading
        title="Study vs its benchmark"
        sub="Each completed study measured against the mean of its category — the read layer an agency uses to flag over- and under-performers."
      />
      <ul className="flex flex-col gap-2.5">
        {scored.map(s => {
          const bench = benchByCat.get(s.benchmarkCategory);
          const lift = studyLift(s);
          const delta = bench ? lift - bench.meanLiftPct : 0;
          const beats = delta >= 0;
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {s.name}
                </p>
                <p className="text-[11px] text-ink-3">{s.benchmarkCategory}</p>
              </div>
              <span className="text-[13px] font-bold tabular-nums text-ink">
                {formatLift(lift)}
              </span>
              {bench ? (
                <span
                  className="inline-flex w-24 items-center justify-end gap-1 text-[12px] font-semibold tabular-nums"
                  style={{
                    color: beats ? 'var(--green)' : 'var(--rose)',
                  }}>
                  {beats ? (
                    <CircleCheck className="size-3.5" />
                  ) : (
                    <TrendingUp className="size-3.5 rotate-180" />
                  )}
                  {formatLift(delta)} vs avg
                </span>
              ) : (
                <span className="w-24 text-right text-[11px] text-ink-3">
                  no peers
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
