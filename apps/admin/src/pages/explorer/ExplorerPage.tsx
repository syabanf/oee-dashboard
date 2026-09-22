import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BellRing, ChevronRight, Coins, Gauge, TrendingDown } from 'lucide-react';
import type { Machine } from '@oee/types';
import {
  aggregateOee,
  averageTargetOee,
  fmtHm,
  fmtIdrShort,
  fmtInt,
  fmtPct,
  hourlyOee,
  type HourBucket,
  type OeeResult,
} from '@oee/fixtures';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  cn,
} from '@oee/ui';
import { ChipGroup, FilterBar, SummaryCards } from '../../components/FilterBar';
import { useScoped } from '../../state/app-state';
import { ANDON_TONE, AndonLegend, StateBadge } from '../../components/badges';
import {
  HourlyChart,
  LossBreakdown,
  LossLegend,
  OeeWaterfall,
  SixBigLosses,
} from '../../components/charts';
import { selectBucket, useOpenLoss } from '../../components/useOpenLoss';
import { ExplainButton, useOeeExplain } from '../../components/useOeeExplain';

interface Row {
  id: string;
  to: string;
  title: string;
  subtitle: string;
  machines: Machine[];
  result: OeeResult;
  target: number;
}

/** Plant → line → machine. Every level shows the same four views, scoped to what is selected. */
export function ExplorerPage() {
  const {
    plant,
    lines,
    lineById,
    departmentById,
    machines,
    machinesByLine,
    oeeByMachine,
    openEventByMachine,
    stateByCode,
    kpi,
    shiftStart,
  } = useScoped();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const line = lineById.get(params.get('line') ?? '');
  const [hour, setHour] = React.useState<HourBucket | null>(null);
  const [show, setShow] = React.useState<'' | 'below' | 'open'>('');
  const explain = useOeeExplain();

  const active = machines.filter((m) => m.active);
  const scoped = line ? active.filter((m) => m.lineId === line.id) : active;
  const openLoss = useOpenLoss(scoped);
  const resultOf = (ms: Machine[]) => aggregateOee(ms.flatMap((m) => oeeByMachine.get(m.id) ?? []));
  const scopeResult = resultOf(scoped);
  const hours = React.useMemo(() => hourlyOee(scoped, kpi, shiftStart), [scoped, kpi, shiftStart]);
  // The selected hour narrows the loss list; the object is rebuilt each tick, so match it by start time.
  const liveHour = hour ? hours.find((h) => h.from === hour.from) : undefined;
  const lossSource = liveHour?.result ?? scopeResult;

  const rows: Row[] = line
    ? scoped.map((m) => ({
        id: m.id,
        to: `/machines/${m.id}`,
        title: `${m.tag} · ${m.name}`,
        subtitle: m.machineType,
        machines: [m],
        result: resultOf([m]),
        target: m.targetOee / 100,
      }))
    : lines.map((l) => {
        const ms = (machinesByLine.get(l.id) ?? []).filter((m) => m.active);
        return {
          id: l.id,
          to: `/oee?line=${l.id}`,
          title: l.name,
          subtitle: `${l.code} · ${departmentById.get(l.departmentId)?.name}`,
          machines: ms,
          result: resultOf(ms),
          target: averageTargetOee(ms),
        };
      });
  rows.sort((a, b) => a.result.oee - b.result.oee);
  const hasOpen = (r: Row) => r.machines.some((m) => openEventByMachine.has(m.id));
  const visible = rows.filter((r) =>
    show === 'below' ? r.result.oee < r.target : show === 'open' ? hasOpen(r) : true,
  );
  const scopeName = line?.name ?? plant.name;

  return (
    <div className="space-y-4">
      <PageHeader
        title="OEE Explorer"
        description="Start at the plant, click down to a line, then a machine. The waterfall, the hours and the losses follow the level you are on."
        className="mb-2"
      />
      <nav
        aria-label="Hierarchy"
        className="bg-card shadow-card flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 text-sm [scrollbar-width:none]"
      >
        <Link
          to="/oee"
          onClick={() => setHour(null)}
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-1.5 font-semibold',
            line ? 'text-muted hover:text-foreground' : 'bg-ink text-on-ink',
          )}
        >
          {plant.name}
        </Link>
        {line ? (
          <>
            <ChevronRight className="text-muted size-4 shrink-0" />
            <span className="bg-ink text-on-ink whitespace-nowrap rounded-full px-4 py-1.5 font-semibold">
              {line.name}
            </span>
          </>
        ) : null}
        <ChevronRight className="text-muted size-4 shrink-0" />
        <span className="text-muted whitespace-nowrap px-3">
          {line ? 'pick a machine' : 'pick a line'}
        </span>
      </nav>

      <SummaryCards
        items={[
          {
            label: `OEE, ${scopeName}`,
            value: fmtPct(scopeResult.oee),
            hint: `A ${fmtPct(scopeResult.availability, 0)} · P ${fmtPct(scopeResult.performance, 0)} · Q ${fmtPct(scopeResult.quality, 0)}`,
            icon: <Gauge />,
            tone: 'ink',
          },
          {
            label: 'Downtime',
            value: fmtHm(scopeResult.plannedMs - scopeResult.runMs),
            hint: `${fmtPct(1 - scopeResult.availability)} of planned time`,
            icon: <TrendingDown />,
            tone: 'danger',
          },
          {
            label: 'Lost production',
            value: fmtIdrShort(scopeResult.lostValue),
            hint: `${fmtInt(scopeResult.lostPcs)} pcs against ideal`,
            icon: <Coins />,
            tone: 'warning',
          },
          {
            label: 'Open Andon calls',
            value: scoped.filter((m) => openEventByMachine.has(m.id)).length,
            hint: `across ${scoped.length} machines`,
            icon: <BellRing />,
            tone: 'info',
            active: show === 'open',
            onClick: () => setShow(show === 'open' ? '' : 'open'),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{scopeName}, planned time to good output</CardTitle>
              <LossLegend />
            </div>
            <ExplainButton
              onClick={() =>
                explain(
                  scopeName,
                  scoped.map((m) => m.id),
                )
              }
              className="text-3xl font-bold tabular-nums leading-none tracking-tight"
            >
              {fmtPct(scopeResult.oee)}
            </ExplainButton>
          </CardHeader>
          <CardContent>
            <OeeWaterfall result={scopeResult} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hour by hour</CardTitle>
            <CardDescription>
              {liveHour
                ? 'The loss list below shows this hour only. Click the bar again to clear.'
                : 'Click an hour to see what it lost.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyChart
              hours={hours}
              selected={hour?.from}
              onPick={(h) => setHour((prev) => (prev?.from === h.from ? null : h))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>{line ? 'Machines' : 'Lines'}, worst first</CardTitle>
          <AndonLegend />
        </CardHeader>
        <CardContent className="space-y-2">
          <FilterBar
            className="pb-2"
            count={visible.length}
            total={rows.length}
            noun={line ? 'machines' : 'lines'}
            onClear={show ? () => setShow('') : undefined}
          >
            <ChipGroup
              label="Show"
              value={show}
              onChange={setShow}
              options={[
                { value: '', label: 'All' },
                {
                  value: 'below',
                  label: 'Below target',
                  count: rows.filter((r) => r.result.oee < r.target).length,
                },
                { value: 'open', label: 'With open calls', count: rows.filter(hasOpen).length },
              ]}
            />
          </FilterBar>
          {visible.length === 0 ? (
            <p className="text-muted py-6 text-center text-sm">Nothing matches this filter.</p>
          ) : null}
          {visible.map((row) => {
            const open = row.machines.filter((m) => openEventByMachine.has(m.id)).length;
            return (
              <div
                key={row.id}
                role="link"
                tabIndex={0}
                onClick={() => {
                  setHour(null);
                  navigate(row.to);
                }}
                onKeyDown={(e) => e.key === 'Enter' && navigate(row.to)}
                className="bg-surface-2 hover:bg-card hover:shadow-card grid cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-3 rounded-2xl p-4 transition-all md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{row.title}</p>
                  <p className="text-muted truncate text-xs">{row.subtitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {line ? (
                      <StateBadge state={stateByCode.get(row.machines[0]!.stateCode)} />
                    ) : (
                      row.machines.map((m) => (
                        <span
                          key={m.id}
                          title={`${m.tag} ${stateByCode.get(m.stateCode)?.name}`}
                          className={cn(
                            'size-2.5 rounded-full',
                            ANDON_TONE[stateByCode.get(m.stateCode)?.andonLevel ?? 'OFF'].dot,
                          )}
                        />
                      ))
                    )}
                    {open ? <Badge variant="danger">{open} open</Badge> : null}
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <ExplainButton
                      onClick={() =>
                        explain(
                          row.title,
                          row.machines.map((m) => m.id),
                        )
                      }
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        row.result.oee < row.target - 0.1 && 'text-accent',
                      )}
                    >
                      {fmtPct(row.result.oee)}
                    </ExplainButton>
                    <span className="text-muted">target {fmtPct(row.target, 0)}</span>
                  </div>
                  <div className="bg-surface relative mt-1.5 h-1.5 rounded-full">
                    <div
                      className="bg-ink h-full rounded-full"
                      style={{ width: `${row.result.oee * 100}%` }}
                    />
                    <span
                      aria-hidden
                      className="bg-action absolute -top-1 h-3.5 w-0.5 rounded-full"
                      style={{ left: `${row.target * 100}%` }}
                    />
                  </div>
                  <p className="text-muted mt-1.5 text-xs tabular-nums">
                    A {fmtPct(row.result.availability)} · P {fmtPct(row.result.performance)} · Q{' '}
                    {fmtPct(row.result.quality)}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    ['Downtime', fmtHm(row.result.plannedMs - row.result.runMs)],
                    ['Lost value', fmtIdrShort(row.result.lostValue)],
                    ['Top loss', row.result.buckets[0]?.label ?? 'None'],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-muted">{label}</dt>
                      <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <ChevronRight className="text-muted hidden size-5 md:block" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Six big losses{liveHour ? ', selected hour' : ', shift so far'}</CardTitle>
            <LossLegend />
          </CardHeader>
          <CardContent>
            <SixBigLosses result={lossSource} onPick={openLoss} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By cause{liveHour ? ', selected hour' : ', shift so far'}</CardTitle>
            <CardDescription>
              Click a loss to see the machines and Andon events behind it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LossBreakdown
              buckets={lossSource.buckets}
              plannedMs={lossSource.plannedMs}
              limit={10}
              onPick={(b) => openLoss(selectBucket(b))}
            />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
