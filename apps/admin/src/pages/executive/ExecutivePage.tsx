import * as React from 'react';
import { Link } from 'react-router';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { BigLoss } from '@oee/types';
import { BIG_LOSSES } from '@oee/types';
import {
  aggregateOee,
  averageTargetOee,
  bigLossOfReason,
  fmtHm,
  fmtIdrShort,
  fmtPct,
  orderProgress,
  plannedMonthMin,
  trendMetric,
  trendSeries,
} from '@oee/fixtures';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  cn,
} from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { LOSS_FILL } from '../../components/badges';
import { TrendLine } from '../../components/TrendLine';

const Delta = ({ value, onInk }: { value: number; onInk?: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
      onInk ? 'text-on-ink-muted' : value >= 0 ? 'text-success' : 'text-accent',
    )}
  >
    {value >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
    {Math.abs(value * 100).toFixed(1)} pts
  </span>
);

/** The weekly read for a plant manager or ops director: trend, top losses, schedule, lines. Nothing here needs a refresh more than daily. */
export function ExecutivePage() {
  const {
    machines,
    lines,
    machinesByLine,
    history,
    reasonById,
    machineById,
    productById,
    orders,
    oeeByMachine,
    kpi,
  } = useScoped();
  const active = machines.filter((m) => m.active);
  const all = React.useMemo(() => new Set(machines.map((_, i) => i)), [machines]);
  const weeks = React.useMemo(() => trendSeries('WEEK', all), [all]);
  const thisWeek = weeks.at(-1),
    lastWeek = weeks.at(-2),
    quarterAgo = weeks[0];
  const weekOee = thisWeek ? trendMetric(thisWeek, 'OEE') : 0;
  const target = averageTargetOee(active);

  // 30-day history folded into the six big losses, then the five largest.
  const top5 = React.useMemo(() => {
    const totals = new Map<BigLoss, { minutes: number; value: number }>();
    for (const h of history) {
      const reason = reasonById.get(h.reasonId),
        machine = machineById.get(h.machineId);
      if (!reason || !machine) continue;
      const key = bigLossOfReason(reason),
        t = totals.get(key) ?? { minutes: 0, value: 0 };
      totals.set(key, {
        minutes: t.minutes + h.minutes,
        value:
          t.value +
          ((h.minutes * 60) / machine.idealCycleSec) *
            (productById.get(machine.productId)?.valuePerPcs ?? 0),
      });
    }
    return BIG_LOSSES.flatMap((b) => (totals.has(b.key) ? [{ ...b, ...totals.get(b.key)! }] : []))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [history, reasonById, machineById, productById]);
  const planned = plannedMonthMin(active.length);

  const jobs = orders.flatMap((o) => {
    const m = machineById.get(o.machineId);
    return m ? [{ order: o, progress: orderProgress(o, m, kpi) }] : [];
  });
  const attainment =
    jobs.reduce((a, j) => a + Math.min(j.progress.produced, j.order.targetQty), 0) /
    Math.max(
      1,
      jobs.reduce((a, j) => a + j.order.targetQty, 0),
    );

  const lineRows = lines
    .map((l) => {
      const ms = (machinesByLine.get(l.id) ?? []).filter((m) => m.active);
      const series = trendSeries('WEEK', new Set(ms.map((m) => machines.indexOf(m))));
      const now = series.at(-1),
        before = series.at(-2);
      return {
        line: l,
        week: now ? trendMetric(now, 'OEE') : 0,
        delta: now && before ? trendMetric(now, 'OEE') - trendMetric(before, 'OEE') : 0,
        today: aggregateOee(ms.flatMap((m) => oeeByMachine.get(m.id) ?? [])).oee,
        target: averageTargetOee(ms),
      };
    })
    .sort((a, b) => b.week - a.week);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Executive View"
        description="Read weekly. Four questions: where is OEE heading, what costs the most, are orders on schedule, and which line needs help."
        className="mb-2"
        actions={
          <Button asChild variant="outline">
            <Link to="/trends">Trends & reports</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.6fr]">
        <Card className="bg-ink text-on-ink shadow-float relative overflow-hidden p-6">
          <div
            aria-hidden
            className="bg-accent/30 pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl"
          />
          <div className="relative">
            <p className="text-on-ink-muted text-[11px] font-semibold uppercase tracking-wider">
              Plant OEE, last full week
            </p>
            <p className="mt-3 flex items-start gap-1.5 leading-none">
              <span className="text-6xl font-bold tabular-nums tracking-tight">
                {(weekOee * 100).toFixed(1)}
              </span>
              <span className="text-on-ink-muted pt-1.5 text-sm font-semibold">
                % · target {fmtPct(target, 0)}
              </span>
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['vs previous week', lastWeek ? weekOee - trendMetric(lastWeek, 'OEE') : 0],
                ['vs 12 weeks ago', quarterAgo ? weekOee - trendMetric(quarterAgo, 'OEE') : 0],
                ['gap to target', weekOee - target],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-2xl bg-white/5 p-3">
                  <dt className="text-on-ink-muted text-[11px]">{label}</dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums">
                    {(v as number) >= 0 ? '+' : '−'}
                    {Math.abs((v as number) * 100).toFixed(1)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-on-ink-muted mt-4 text-xs">
              Schedule attainment today {fmtPct(attainment, 0)} across {jobs.length} running orders.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overall OEE trend</CardTitle>
            <CardDescription>Weekly, last 12 weeks.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine
              points={weeks.map((w) => ({
                label: w.label.replace('w/c ', ''),
                value: trendMetric(w, 'OEE'),
              }))}
              target={target}
              height={190}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Top 5 loss categories</CardTitle>
              <CardDescription>Last 30 days, in OEE points and rupiah.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/losses">Open loss tree</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {top5.map((l) => (
              <div key={l.key}>
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{l.label}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-bold">{fmtHm(l.minutes * 60_000)}</span>
                    <span className="text-muted ml-2 text-xs">
                      {fmtPct(l.minutes / planned)} OEE · {fmtIdrShort(l.value)}
                    </span>
                  </span>
                </p>
                <p className="bg-surface mt-1.5 h-2 rounded-full">
                  <span
                    className={cn('block h-full rounded-full', LOSS_FILL[l.lossClass])}
                    style={{ width: `${(l.minutes / (top5[0]?.minutes ?? 1)) * 100}%` }}
                  />
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Line-to-line comparison</CardTitle>
            <CardDescription>
              Last full week, with the change on the week before and today's live figure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lineRows.map((r) => (
              <Link
                key={r.line.id}
                to={`/oee?line=${r.line.id}`}
                className="bg-surface-2 hover:bg-card hover:shadow-card block rounded-2xl p-3 transition-all"
              >
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{r.line.name}</span>
                  <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
                    <Delta value={r.delta} />
                    <span className="text-lg font-bold">{fmtPct(r.week)}</span>
                  </span>
                </span>
                <span className="bg-surface relative mt-2 block h-1.5 rounded-full">
                  <span
                    className="bg-ink block h-full rounded-full"
                    style={{ width: `${r.week * 100}%` }}
                  />
                  <span
                    aria-hidden
                    className="bg-action absolute -top-1 h-3.5 w-0.5 rounded-full"
                    style={{ left: `${r.target * 100}%` }}
                  />
                </span>
                <span className="text-muted mt-1.5 block text-xs">
                  Today so far {fmtPct(r.today)} · target {fmtPct(r.target, 0)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
