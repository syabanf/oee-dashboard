import type { AndonLevel, BigLoss, LossClass, StateSpan } from '@oee/types';
import { BIG_LOSSES } from '@oee/types';
import {
  fmtClockShort,
  fmtDuration,
  fmtHm,
  fmtInt,
  fmtPct,
  sixBigLosses,
  type HourBucket,
  type LossBucket,
  type OeeResult,
} from '@oee/fixtures';
import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@oee/ui';
import { ChevronRight } from 'lucide-react';
import { ANDON_TONE, LOSS_FILL } from './badges';
import { useScoped } from '../state/app-state';

/** Availability, performance and quality as three thin bars, each with its target tick. */
export function ApqBars({
  result,
  targets,
  onInk,
}: {
  result: OeeResult;
  targets: { a: number; p: number; q: number };
  onInk?: boolean;
}) {
  const rows = [
    { label: 'Availability', value: result.availability, target: targets.a / 100 },
    { label: 'Performance', value: result.performance, target: targets.p / 100 },
    { label: 'Quality', value: result.quality, target: targets.q / 100 },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className={onInk ? 'text-on-ink-muted' : 'text-muted'}>{r.label}</span>
            <span className="font-semibold tabular-nums">
              {fmtPct(r.value)}{' '}
              <span className={cn('font-normal', onInk ? 'text-on-ink-muted' : 'text-muted')}>
                / {fmtPct(r.target, 0)}
              </span>
            </span>
          </div>
          <div
            className={cn(
              'relative mt-1.5 h-1.5 rounded-full',
              onInk ? 'bg-white/15' : 'bg-surface',
            )}
          >
            <div
              className={cn('h-full rounded-full', onInk ? 'bg-white' : 'bg-ink')}
              style={{ width: `${Math.min(100, r.value * 100)}%` }}
            />
            <span
              aria-hidden
              className={cn(
                'absolute -top-1 h-3.5 w-0.5 rounded-full',
                r.value >= r.target ? 'bg-success' : 'bg-action',
              )}
              style={{ left: `${r.target * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CLASS_ORDER: LossClass[] = ['AVAILABILITY', 'PERFORMANCE', 'QUALITY'];

/** One stacked bar of loss buckets (2px surface gaps) with the ranked list below it, so every value is readable without hover. */
export function LossBreakdown({
  buckets,
  plannedMs,
  limit = 6,
  onPick,
}: {
  buckets: LossBucket[];
  plannedMs: number;
  limit?: number;
  onPick?: (bucket: LossBucket) => void;
}) {
  const total = buckets.reduce((a, b) => a + b.ms, 0);
  const shown = buckets.slice(0, limit);
  const rest = buckets.slice(limit).reduce((a, b) => a + b.ms, 0);
  // The bar groups segments by loss class so each colour reads as one block; the list below stays ranked by size.
  const byClass = [...buckets].sort(
    (a, b) => CLASS_ORDER.indexOf(a.lossClass) - CLASS_ORDER.indexOf(b.lossClass) || b.ms - a.ms,
  );
  return (
    <div>
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label="Lost production time by cause"
      >
        {byClass.map((b) => (
          <Tooltip key={b.key}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                onClick={() => onPick?.(b)}
                className={cn(
                  'h-full min-w-1 outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80',
                  onPick && 'cursor-pointer',
                  LOSS_FILL[b.lossClass],
                )}
                style={{ flexGrow: b.ms, flexBasis: 0 }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-semibold">{fmtHm(b.ms)}</span> · {b.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <ul className="mt-3 space-y-0.5">
        {shown.map((b) => (
          <li key={b.key}>
            <button
              type="button"
              disabled={!onPick}
              onClick={() => onPick?.(b)}
              className="enabled:hover:bg-surface-2 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm"
            >
              <span className={cn('size-2.5 shrink-0 rounded-[3px]', LOSS_FILL[b.lossClass])} />
              <span className="min-w-0 flex-1 truncate">{b.label}</span>
              <span className="text-muted hidden text-xs tabular-nums sm:inline">
                {fmtPct(b.ms / plannedMs)} of planned
              </span>
              <span className="w-16 text-right font-semibold tabular-nums">{fmtHm(b.ms)}</span>
              {onPick ? <ChevronRight className="text-muted size-4 shrink-0" /> : null}
            </button>
          </li>
        ))}
        {rest > 0 ? (
          <li className="text-muted flex items-center gap-3 py-1.5 text-sm">
            <span className="bg-border size-2.5 shrink-0 rounded-[3px]" />
            <span className="flex-1">{buckets.length - limit} smaller causes</span>
            <span className="w-16 text-right font-semibold tabular-nums">{fmtHm(rest)}</span>
          </li>
        ) : null}
      </ul>
      <p className="sr-only">Total lost time {fmtHm(total)}</p>
    </div>
  );
}
export const LossLegend = () => (
  <div className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-xs">
    {(
      [
        ['AVAILABILITY', 'Availability'],
        ['PERFORMANCE', 'Performance'],
        ['QUALITY', 'Quality'],
      ] as const
    ).map(([k, label]) => (
      <span key={k} className="inline-flex items-center gap-1.5">
        <span className={cn('size-2.5 rounded-[3px]', LOSS_FILL[k])} />
        {label}
      </span>
    ))}
  </div>
);

const TIMELINE_LEVELS: AndonLevel[] = [
  'RUNNING',
  'WARNING',
  'ATTENTION',
  'ASSISTANCE',
  'STOP',
  'OFF',
];
const TIMELINE_LABEL: Record<AndonLevel, string> = {
  RUNNING: 'Running',
  WARNING: 'Micro stop or slow',
  ATTENTION: 'Changeover or attention',
  ASSISTANCE: 'Assistance',
  STOP: 'Stop or fault',
  OFF: 'Break or planned',
};

/** The shift as a strip of machine states. Each segment answers hover and focus with state, start and duration. */
export function StateTimeline({
  spans,
  from,
  to,
}: {
  spans: StateSpan[];
  from: number;
  to: number;
}) {
  const { stateByCode, now } = useScoped();
  const width = to - from;
  const hours = Array.from(
    { length: Math.floor(width / 3_600_000) + 1 },
    (_, i) => from + i * 3_600_000,
  );
  return (
    <div>
      <div className="bg-surface relative h-9 overflow-hidden rounded-xl">
        {spans.map((s) => {
          const end = Math.min(s.end ?? now, to);
          const state = stateByCode.get(s.stateCode);
          if (end <= s.start || !state) return null;
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className={cn(
                    'absolute inset-y-0 min-w-px outline-none hover:opacity-80 focus-visible:opacity-80',
                    ANDON_TONE[state.andonLevel].dot,
                  )}
                  style={{
                    left: `${((s.start - from) / width) * 100}%`,
                    width: `${((end - s.start) / width) * 100}%`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold">{fmtDuration(end - s.start)}</span> · {state.name}{' '}
                from {fmtClockShort(s.start)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="text-muted relative mt-1.5 h-4 text-[10.5px] tabular-nums">
        {hours.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${((h - from) / width) * 100}%` }}
          >
            {fmtClockShort(h)}
          </span>
        ))}
      </div>
      <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {TIMELINE_LEVELS.map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-[3px]', ANDON_TONE[l].dot)} />
            {TIMELINE_LABEL[l]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Planned time stepping down to good output: the three loss classes as the steps between four totals. */
export function OeeWaterfall({ result }: { result: OeeResult }) {
  const { plannedMs, runMs, idealOutputMs, goodMs } = result;
  const rows = [
    { label: 'Planned production time', from: 0, ms: plannedMs, fill: 'bg-ink', total: true },
    {
      label: 'Availability loss',
      from: runMs,
      ms: plannedMs - runMs,
      fill: LOSS_FILL.AVAILABILITY,
    },
    { label: 'Run time', from: 0, ms: runMs, fill: 'bg-ink', total: true },
    {
      label: 'Performance loss',
      from: idealOutputMs,
      ms: runMs - idealOutputMs,
      fill: LOSS_FILL.PERFORMANCE,
    },
    {
      label: 'Net run time at ideal speed',
      from: 0,
      ms: idealOutputMs,
      fill: 'bg-ink',
      total: true,
    },
    { label: 'Quality loss', from: goodMs, ms: idealOutputMs - goodMs, fill: LOSS_FILL.QUALITY },
    { label: 'Good output time', from: 0, ms: goodMs, fill: 'bg-success', total: true },
  ];
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid grid-cols-[minmax(0,7.5rem)_1fr_4rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_4.5rem] sm:gap-3"
        >
          <span className={cn('truncate', r.total ? 'font-semibold' : 'text-muted pl-3')}>
            {r.label}
          </span>
          <span className="bg-surface relative h-4 rounded">
            <span
              className={cn('absolute inset-y-0 min-w-0.5 rounded', r.fill)}
              style={{
                left: `${(r.from / plannedMs) * 100}%`,
                width: `${(r.ms / plannedMs) * 100}%`,
              }}
            />
          </span>
          <span className={cn('text-right tabular-nums', r.total ? 'font-bold' : 'text-muted')}>
            {r.total ? '' : '−'}
            {fmtHm(r.ms)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Good pieces per clock hour against the hourly target tick. One measure, one axis; downtime lives in the tooltip and the row under the bars. */
export function HourlyChart({
  hours,
  onPick,
  selected,
}: {
  hours: HourBucket[];
  onPick?: (hour: HourBucket) => void;
  selected?: number;
}) {
  const max = Math.max(1, ...hours.map((h) => Math.max(h.result.good, h.targetPcs)));
  return (
    <div>
      <div className="flex h-40 items-end gap-0.5 sm:gap-2">
        {hours.map((h) => {
          const hit = h.result.good >= h.targetPcs;
          return (
            <Tooltip key={h.from}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={!onPick}
                  onClick={() => onPick?.(h)}
                  aria-pressed={selected === h.from}
                  aria-label={`${fmtClockShort(h.from)}: ${fmtInt(h.result.good)} good pieces, target ${fmtInt(h.targetPcs)}`}
                  className="enabled:hover:bg-surface-2 aria-pressed:bg-surface group relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-lg outline-none"
                >
                  <span className="text-body mb-1 hidden text-center text-[10.5px] font-semibold tabular-nums lg:block">
                    {fmtInt(h.result.good)}
                  </span>
                  <span
                    className={cn(
                      'mx-auto block w-full max-w-10 rounded-t',
                      hit ? 'bg-ink' : 'bg-ink/55',
                    )}
                    style={{ height: `${(h.result.good / max) * 78}%` }}
                  />
                  <span
                    aria-hidden
                    className="bg-action absolute inset-x-0 mx-auto h-0.5 max-w-12 rounded-full"
                    style={{ bottom: `${(h.targetPcs / max) * 78}%` }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold">{fmtInt(h.result.good)} good pcs</span> · target{' '}
                {fmtInt(h.targetPcs)} · OEE {fmtPct(h.result.oee)} · down{' '}
                {fmtHm(h.result.plannedMs - h.result.runMs)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="text-muted mt-1.5 flex gap-0.5 text-center text-[10.5px] tabular-nums sm:gap-2">
        {hours.map((h) => (
          <span key={h.from} className="min-w-0 flex-1 truncate">
            {fmtClockShort(h.from)}
          </span>
        ))}
      </div>
      <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-ink size-2.5 rounded-[3px]" />
          Good pieces, target met
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-ink/55 size-2.5 rounded-[3px]" />
          Below target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-action h-0.5 w-3 rounded-full" />
          Hourly target
        </span>
      </div>
    </div>
  );
}

const BIG_ORDER = BIG_LOSSES.map((b) => b.key);

/** The six big losses, always all six in the same order, two per OEE component. Each row opens the machines and events behind it. */
export function SixBigLosses({
  result,
  onPick,
}: {
  result: OeeResult;
  onPick?: (loss: {
    key: BigLoss;
    label: string;
    lossClass: LossClass;
    keys: string[];
    ms: number;
  }) => void;
}) {
  const rows = sixBigLosses(result, BIG_ORDER);
  const max = Math.max(1, ...rows.map((r) => r.ms));
  return (
    <ul className="space-y-0.5">
      {rows.map((row, i) => {
        const meta = BIG_LOSSES[i]!;
        return (
          <li key={row.key}>
            <button
              type="button"
              disabled={!onPick || row.ms === 0}
              onClick={() =>
                onPick?.({
                  key: row.key,
                  label: meta.label,
                  lossClass: meta.lossClass,
                  keys: row.buckets.map((b) => b.key),
                  ms: row.ms,
                })
              }
              className="enabled:hover:bg-surface-2 -mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-2 text-left"
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{meta.label}</span>
                  <span className="text-muted block truncate text-[11px]">{meta.example}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block font-bold">{fmtHm(row.ms)}</span>
                  <span className="text-muted block text-[11px]">
                    {fmtPct(result.plannedMs ? row.ms / result.plannedMs : 0)} of planned
                  </span>
                </span>
              </span>
              <span className="bg-surface mt-1.5 block h-2 rounded-full">
                <span
                  className={cn('block h-full rounded-full', LOSS_FILL[meta.lossClass])}
                  style={{ width: `${(row.ms / max) * 100}%` }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
