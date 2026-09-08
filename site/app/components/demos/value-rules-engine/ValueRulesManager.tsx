'use client';

import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Link2,
  Plus,
  Trash2,
  TriangleAlert,
  Unlink,
  X,
} from 'lucide-react';
import {useRef, useState} from 'react';

import type {ApiCallInput} from '@/lib/api-console/types';

import {
  useApiConsole,
  useApiLoads,
} from '@/app/components/api-console/ApiConsoleProvider';
import {
  ACCOUNTS,
  adjustBounds,
  type AdjustSign,
  BID_STRATEGY_LABEL,
  CRITERIA_LABEL,
  CRITERIA_TYPES,
  CRITERIA_VALUES,
  type CriteriaType,
  type Criterion,
  formatAdjust,
  isEligible,
  isRuleReadOnly,
  LIMITS,
  type ValueRule,
  type ValueRuleSet,
  type VrAccount,
} from '@/lib/demos/value-rules-engine';

// Developer-doc links surfaced in the API console for each call.
const DOC_VALUE_RULES =
  'https://developers.facebook.com/docs/marketing-api/bidding/value-rules';
const DOC_ADSETS =
  'https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets/';

// Serialise a rule into the Value Rules API `rules[]` shape (criteria_type /
// operator CONTAINS / criteria_values), matching the spec's POST payload.
function serializeRule(rule: ValueRule): unknown {
  return {
    name: `${rule.adjustSign === 'INCREASE' ? 'Increase' : 'Decrease'} ${rule.adjustValue}%`,
    adjust_sign: rule.adjustSign,
    adjust_value: rule.adjustValue,
    criterias: rule.criteria.map(c => ({
      criteria_type: c.type,
      operator: 'CONTAINS',
      criteria_values: c.values,
    })),
  };
}

function buildLoadCalls(account: VrAccount): ApiCallInput[] {
  return [
    {
      method: 'GET',
      endpoint: `act_${account.id}/value_rule_set`,
      summary: `List value rule sets for ${account.name}`,
      request: {fields: 'id,name,rules'},
      response: {
        data: account.ruleSets.map(s => ({
          id: s.id,
          name: s.name,
          rules_count: s.rules.length,
        })),
      },
      status: 'success',
      docsUrl: DOC_VALUE_RULES,
    },
    {
      method: 'GET',
      endpoint: account.ruleSets[0]?.id ?? 'VALUE_RULE_SET_ID',
      summary: `Read rules for ${account.ruleSets[0]?.name ?? 'first rule set'}`,
      request: {
        fields:
          'id,name,rules{adjust_sign,adjust_value,criterias{criteria_type,operator,criteria_values}}',
      },
      response: {
        id: account.ruleSets[0]?.id ?? null,
        rules: account.ruleSets[0]?.rules.map(serializeRule) ?? [],
      },
      status: 'success',
      docsUrl: DOC_VALUE_RULES,
    },
    {
      method: 'GET',
      endpoint: `act_${account.id}/adsets`,
      summary: 'Read attached ad sets and bid strategies (eligibility)',
      request: {fields: 'id,name,bid_strategy,value_rule_set_id'},
      response: {
        data: account.ruleSets
          .filter(s => s.attachedAdSet != null)
          .map(s => ({
            name: s.attachedAdSet,
            bid_strategy: s.bidStrategy,
            value_rule_set_id: s.id,
          })),
      },
      status: 'success',
      docsUrl: DOC_ADSETS,
    },
  ];
}

function cloneAccounts(): VrAccount[] {
  return ACCOUNTS.map(a => ({
    ...a,
    ruleSets: a.ruleSets.map(s => ({
      ...s,
      rules: s.rules.map(r => ({
        ...r,
        criteria: r.criteria.map(c => ({...c, values: [...c.values]})),
      })),
    })),
  }));
}

export function ValueRulesManager() {
  const {record} = useApiConsole();
  const [accounts, setAccounts] = useState<VrAccount[]>(cloneAccounts);
  const [accountId, setAccountId] = useState(ACCOUNTS[0].id);
  const [setId, setSetId] = useState(ACCOUNTS[0].ruleSets[0].id);
  const [adding, setAdding] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const idCounter = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const makeId = () => `vr-${++idCounter.current}`;

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const account = accounts.find(a => a.id === accountId) ?? accounts[0];
  const ruleSet: ValueRuleSet | undefined =
    account.ruleSets.find(s => s.id === setId) ?? account.ruleSets.at(0);

  // Log the initial reads that populate the dashboard, re-firing per account.
  useApiLoads(accountId, () => buildLoadCalls(account));

  const selectAccount = (id: string) => {
    const acct = accounts.find(a => a.id === id);
    setAccountId(id);
    setSetId(acct?.ruleSets[0]?.id ?? '');
    setAdding(false);
    setDupOpen(false);
  };

  const updateSet = (fn: (s: ValueRuleSet) => ValueRuleSet) => {
    if (!ruleSet) return;
    setAccounts(prev =>
      prev.map(a =>
        a.id !== account.id
          ? a
          : {
              ...a,
              ruleSets: a.ruleSets.map(s => (s.id !== ruleSet.id ? s : fn(s))),
            },
      ),
    );
  };

  const addRule = (rule: ValueRule) => {
    if (ruleSet) {
      const nextRules = [...ruleSet.rules, rule];
      record({
        method: 'POST',
        endpoint: ruleSet.id,
        summary: `Add rule ${formatAdjust(rule)} to ${ruleSet.name}`,
        request: {rules: nextRules.map(serializeRule)},
        response: {id: ruleSet.id, success: true},
        status: 'success',
        docsUrl: DOC_VALUE_RULES,
      });
    }
    updateSet(s => ({...s, rules: [...s.rules, rule]}));
    setAdding(false);
    showToast(`Added rule ${formatAdjust(rule)}`);
  };

  const deleteRule = (ruleId: string) => {
    if (ruleSet) {
      const nextRules = ruleSet.rules.filter(r => r.id !== ruleId);
      record({
        method: 'POST',
        endpoint: ruleSet.id,
        summary: `Remove rule from ${ruleSet.name}`,
        request: {rules: nextRules.map(serializeRule)},
        response: {id: ruleSet.id, success: true},
        status: 'success',
        docsUrl: DOC_VALUE_RULES,
      });
    }
    updateSet(s => ({...s, rules: s.rules.filter(r => r.id !== ruleId)}));
    showToast('Rule removed');
  };

  const moveRule = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (ruleSet && target >= 0 && target < ruleSet.rules.length) {
      const rules = [...ruleSet.rules];
      [rules[index], rules[target]] = [rules[target], rules[index]];
      record({
        method: 'POST',
        endpoint: ruleSet.id,
        summary: `Reorder rules in ${ruleSet.name} — first match wins`,
        request: {rules: rules.map(serializeRule)},
        response: {id: ruleSet.id, success: true},
        status: 'success',
        docsUrl: DOC_VALUE_RULES,
      });
    }
    updateSet(s => {
      if (target < 0 || target >= s.rules.length) return s;
      const rules = [...s.rules];
      [rules[index], rules[target]] = [rules[target], rules[index]];
      return {...s, rules};
    });
  };

  const addSet = () => {
    if (account.ruleSets.length >= LIMITS.setsPerAccount) return;
    const newSet: ValueRuleSet = {
      id: makeId(),
      name: 'New rule set',
      attachedAdSet: null,
      bidStrategy: null,
      rules: [],
    };
    record({
      method: 'POST',
      endpoint: `act_${account.id}/value_rule_set`,
      summary: `Create value rule set on ${account.name}`,
      request: {name: newSet.name, rules: []},
      response: {id: newSet.id},
      status: 'success',
      docsUrl: DOC_VALUE_RULES,
    });
    setAccounts(prev =>
      prev.map(a =>
        a.id !== account.id ? a : {...a, ruleSets: [...a.ruleSets, newSet]},
      ),
    );
    setSetId(newSet.id);
    setAdding(false);
    showToast('Created rule set');
  };

  const duplicateTo = (targetAccountId: string) => {
    if (!ruleSet) return;
    const target = accounts.find(a => a.id === targetAccountId);
    if (!target || target.ruleSets.length >= LIMITS.setsPerAccount) return;
    const copy: ValueRuleSet = {
      id: makeId(),
      name: `${ruleSet.name} (copy)`,
      attachedAdSet: null,
      bidStrategy: null,
      rules: ruleSet.rules.map(r => ({
        ...r,
        id: makeId(),
        criteria: r.criteria.map(c => ({...c, values: [...c.values]})),
      })),
    };
    record({
      method: 'POST',
      endpoint: `act_${target.id}/value_rule_set`,
      summary: `Duplicate ${ruleSet.name} to ${target.name}`,
      request: {
        name: copy.name,
        rules: ruleSet.rules.map(serializeRule),
      },
      response: {id: copy.id},
      status: 'success',
      docsUrl: DOC_VALUE_RULES,
    });
    setAccounts(prev =>
      prev.map(a =>
        a.id !== targetAccountId ? a : {...a, ruleSets: [...a.ruleSets, copy]},
      ),
    );
    setDupOpen(false);
    showToast(`Duplicated to ${target.name}`);
  };

  const setsFull = account.ruleSets.length >= LIMITS.setsPerAccount;
  const rulesFull = ruleSet ? ruleSet.rules.length >= LIMITS.rulesPerSet : true;
  const eligible = ruleSet ? isEligible(ruleSet.bidStrategy) : false;
  const otherAccounts = accounts.filter(a => a.id !== account.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Accounts + rule sets */}
      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Ad account
          </h2>
          {accounts.map(a => {
            const active = a.id === account.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  selectAccount(a.id);
                }}
                aria-current={active ? 'true' : undefined}
                className={[
                  'rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-border-strong bg-surface'
                    : 'border-border bg-surface hover:bg-surface-2',
                ].join(' ')}>
                <p className="text-sm font-semibold text-ink">{a.name}</p>
                <p className="text-xs tabular-nums text-ink-3">
                  act_{a.id} · {a.ruleSets.length}/{LIMITS.setsPerAccount} sets
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              Rule sets
            </h2>
            <button
              type="button"
              onClick={addSet}
              disabled={setsFull}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink disabled:cursor-not-allowed disabled:text-ink-3">
              <Plus className="size-3.5" /> New
            </button>
          </div>
          {account.ruleSets.map(s => {
            const active = ruleSet?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSetId(s.id);
                  setAdding(false);
                  setDupOpen(false);
                }}
                aria-current={active ? 'true' : undefined}
                className={[
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  active
                    ? 'border-border-strong bg-surface'
                    : 'border-border bg-surface hover:bg-surface-2',
                ].join(' ')}>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {s.name}
                  </span>
                  {s.attachedAdSet ? (
                    <Link2 className="ml-auto size-3.5 shrink-0 text-ink-3" />
                  ) : (
                    <Unlink className="ml-auto size-3.5 shrink-0 text-ink-3" />
                  )}
                </div>
                <span className="text-xs text-ink-3">
                  {s.rules.length}/{LIMITS.rulesPerSet} rules
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Selected rule set */}
      <section className="flex flex-col gap-4">
        {ruleSet ? (
          <>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold tracking-[-0.01em] text-ink">
                    {ruleSet.name}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    {ruleSet.attachedAdSet ? (
                      <>
                        <Link2 className="size-3.5" />
                        Attached to {ruleSet.attachedAdSet}
                        {ruleSet.bidStrategy ? (
                          <span>
                            · {BID_STRATEGY_LABEL[ruleSet.bidStrategy]}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Unlink className="size-3.5" />
                        Not attached to an ad set
                      </>
                    )}
                  </p>
                </div>
                <div className="relative flex items-center gap-2">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">
                    {ruleSet.rules.length}/{LIMITS.rulesPerSet} rules
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDupOpen(v => !v);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                    <Copy className="size-4" /> Duplicate
                  </button>
                  {dupOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
                      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                        Duplicate to account
                      </p>
                      {otherAccounts.map(a => {
                        const full = a.ruleSets.length >= LIMITS.setsPerAccount;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            disabled={full}
                            onClick={() => {
                              duplicateTo(a.id);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-ink-3">
                            <span className="truncate">{a.name}</span>
                            <span className="text-xs text-ink-3">
                              {full
                                ? 'full'
                                : `${a.ruleSets.length}/${LIMITS.setsPerAccount}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {ruleSet.attachedAdSet && !eligible ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-[13px] text-ink-2">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    style={{color: 'var(--rose)'}}
                  />
                  <span>
                    <span className="font-semibold text-ink">
                      Not eligible for value rules.
                    </span>{' '}
                    The attached ad set uses{' '}
                    {ruleSet.bidStrategy
                      ? BID_STRATEGY_LABEL[ruleSet.bidStrategy]
                      : 'an unsupported strategy'}
                    . Value rules require Highest volume (auto-bid) or Cost cap.
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[13px] text-ink-3">
                Rules apply top-down — the first matching rule wins.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                }}
                disabled={rulesFull || adding}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="size-4" /> Add rule
              </button>
            </div>

            {rulesFull ? (
              <p className="text-[12px] text-ink-3">
                Rule limit reached ({LIMITS.rulesPerSet}). Remove a rule to add
                another.
              </p>
            ) : null}

            {adding ? (
              <AddRuleForm
                onAdd={addRule}
                onCancel={() => {
                  setAdding(false);
                }}
                makeId={makeId}
              />
            ) : null}

            {ruleSet.rules.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {ruleSet.rules.map((rule, i) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    index={i}
                    total={ruleSet.rules.length}
                    onUp={() => {
                      moveRule(i, -1);
                    }}
                    onDown={() => {
                      moveRule(i, 1);
                    }}
                    onDelete={() => {
                      deleteRule(rule.id);
                    }}
                  />
                ))}
              </ol>
            ) : (
              !adding && (
                <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-ink">No rules yet</p>
                  <p className="mt-1 text-[13px] text-ink-2">
                    Add a rule to adjust bids for a slice of the audience.
                  </p>
                </div>
              )
            )}
          </>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="text-sm font-semibold text-ink">No rule sets</p>
            <p className="mt-1 text-[13px] text-ink-2">
              Create a rule set to get started.
            </p>
          </div>
        )}
      </section>

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <Check className="size-4" style={{color: 'var(--green)'}} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function RuleRow({
  rule,
  index,
  total,
  onUp,
  onDown,
  onDelete,
}: {
  rule: ValueRule;
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const increase = rule.adjustSign === 'INCREASE';
  const readOnly = isRuleReadOnly(rule);
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-semibold tabular-nums text-ink-2">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
              style={{
                color: increase ? 'var(--green)' : 'var(--rose)',
                background: `color-mix(in srgb, ${
                  increase ? 'var(--green)' : 'var(--rose)'
                } 14%, transparent)`,
              }}>
              {formatAdjust(rule)} bid
            </span>
            {readOnly ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  color: 'var(--ink-2)',
                  background:
                    'color-mix(in srgb, var(--yellow) 22%, transparent)',
                }}
                title="Rules with more than 2 criteria are read-only in Ads Manager (API-edit only).">
                <TriangleAlert className="size-3" /> Read-only in Ads Manager
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rule.criteria.map(c => (
              <span
                key={c.type}
                className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[12px] text-ink-2">
                <span className="font-medium text-ink">
                  {CRITERIA_LABEL[c.type]}:
                </span>{' '}
                {c.values.join(', ')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onUp}
            disabled={index === 0}
            aria-label="Move rule up"
            className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDown}
            disabled={index === total - 1}
            aria-label="Move rule down"
            className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete rule"
            className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function AddRuleForm({
  onAdd,
  onCancel,
  makeId,
}: {
  onAdd: (rule: ValueRule) => void;
  onCancel: () => void;
  makeId: () => string;
}) {
  const [sign, setSign] = useState<AdjustSign>('INCREASE');
  const [value, setValue] = useState(20);
  const [criteria, setCriteria] = useState<Criterion[]>([
    {type: 'AGE', values: []},
  ]);

  const bounds = adjustBounds(sign);
  const valueValid =
    Number.isFinite(value) && value >= bounds.min && value <= bounds.max;
  const criteriaValid =
    criteria.length >= 1 && criteria.every(c => c.values.length > 0);
  const valid = valueValid && criteriaValid;
  const willBeReadOnly = criteria.length > 2;

  const setCriterionType = (i: number, type: CriteriaType) => {
    setCriteria(prev =>
      prev.map((c, idx) => (idx === i ? {type, values: []} : c)),
    );
  };

  const toggleValue = (i: number, v: string) => {
    setCriteria(prev =>
      prev.map((c, idx) => {
        if (idx !== i) return c;
        const has = c.values.includes(v);
        return {
          ...c,
          values: has ? c.values.filter(x => x !== v) : [...c.values, v],
        };
      }),
    );
  };

  const addCriterion = () => {
    if (criteria.length >= LIMITS.criteriaPerRule) return;
    const used = new Set(criteria.map(c => c.type));
    const next = CRITERIA_TYPES.find(t => !used.has(t)) ?? 'AGE';
    setCriteria(prev => [...prev, {type: next, values: []}]);
  };

  const removeCriterion = (i: number) => {
    setCriteria(prev => prev.filter((_, idx) => idx !== i));
  };

  const submit = () => {
    if (!valid) return;
    onAdd({id: makeId(), adjustSign: sign, adjustValue: value, criteria});
  };

  return (
    <div className="rounded-xl border border-border-strong bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">New rule</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      {/* Bid adjustment */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(['INCREASE', 'DECREASE'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSign(s);
              }}
              className={[
                'rounded-md px-3 py-1 text-[13px] font-medium transition-colors',
                sign === s
                  ? 'bg-surface-2 text-ink'
                  : 'text-ink-3 hover:text-ink',
              ].join(' ')}>
              {s === 'INCREASE' ? 'Increase' : 'Decrease'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={bounds.min}
            max={bounds.max}
            value={Number.isFinite(value) ? value : ''}
            onChange={e => {
              setValue(Number(e.target.value));
            }}
            aria-label="Bid adjustment percent"
            className="w-20 rounded-lg border-2 border-border bg-surface-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-2"
          />
          <span className="text-sm text-ink-2">% bid</span>
        </div>
        <span className="text-[12px] text-ink-3">
          {sign === 'INCREASE' ? '1–1000%' : '1–90%'}
          {!valueValid ? ' · out of range' : ''}
        </span>
      </div>

      {/* Criteria */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ink">
            Criteria{' '}
            <span className="font-normal text-ink-3">
              ({criteria.length}/{LIMITS.criteriaPerRule})
            </span>
          </p>
          <button
            type="button"
            onClick={addCriterion}
            disabled={criteria.length >= LIMITS.criteriaPerRule}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink disabled:cursor-not-allowed disabled:text-ink-3">
            <Plus className="size-3.5" /> Add criterion
          </button>
        </div>

        {criteria.map((c, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <select
                value={c.type}
                onChange={e => {
                  setCriterionType(i, e.target.value as CriteriaType);
                }}
                aria-label="Criterion type"
                className="rounded-md border border-border bg-surface px-2 py-1 text-[13px] font-medium text-ink outline-none focus:border-brand-2">
                {CRITERIA_TYPES.map(t => (
                  <option key={t} value={t}>
                    {CRITERIA_LABEL[t]}
                  </option>
                ))}
              </select>
              {criteria.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    removeCriterion(i);
                  }}
                  aria-label="Remove criterion"
                  className="ml-auto grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface hover:text-ink">
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CRITERIA_VALUES[c.type].map(v => {
                const on = c.values.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      toggleValue(i, v);
                    }}
                    className={[
                      'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                      on
                        ? 'border-transparent bg-brand text-on-brand'
                        : 'border-border bg-surface text-ink-2 hover:text-ink',
                    ].join(' ')}>
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {willBeReadOnly ? (
        <p
          className="mt-3 flex items-center gap-1.5 text-[12px]"
          style={{color: 'var(--ink-2)'}}>
          <TriangleAlert
            className="size-3.5"
            style={{color: 'var(--yellow)'}}
          />
          More than 2 criteria — this rule will be read-only in Ads Manager
          (API-edit only).
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Check className="size-4" /> Add rule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
