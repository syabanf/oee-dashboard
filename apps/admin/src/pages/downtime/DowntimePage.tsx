import * as React from 'react';
import { CalendarCheck, Download, OctagonX, Timer, Zap } from 'lucide-react';
import { fmtClock, fmtDuration, fmtHm, fmtPct, toCsv } from '@oee/fixtures';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  PageHeader,
  StatCard,
  cn,
  type BadgeProps,
  type Column,
} from '@oee/ui';
import { ChipGroup, FilterBar, FilterPill } from '../../components/FilterBar';
import { useScoped } from '../../state/app-state';
import { StateBadge } from '../../components/badges';
import { useOpenEvent } from '../../components/useOpenEvent';
import { downloadFile } from '../../lib/download';

type Category = 'Unplanned' | 'Planned' | 'Minor stop';
interface LogRow {
  id: string;
  machineId: string;
  stateCode: string;
  start: number;
  ms: number;
  open: boolean;
  category: Category;
  reason: string;
  group: string;
  eventId?: string;
}

const CATEGORY_VARIANT: Record<Category, NonNullable<BadgeProps['variant']>> = {
  Unplanned: 'danger',
  Planned: 'muted',
  'Minor stop': 'warning',
};
const CATEGORY_FILL: Record<Category, string> = {
  Unplanned: 'bg-loss-a',
  Planned: 'bg-silver',
  'Minor stop': 'bg-loss-p',
};
const PARETO_BY = ['Reason', 'Category', 'Machine'] as const;

export function DowntimePage() {
  const { spans, machines, machineById, stateByCode, events, reasonById, now } = useScoped();
  const [machine, setMachine] = React.useState('');
  const [category, setCategory] = React.useState<Category | ''>('');
  const [by, setBy] = React.useState<(typeof PARETO_BY)[number]>('Reason');
  const openEvent = useOpenEvent();

  // Every span in which a machine made nothing, labelled planned, unplanned or minor stop.
  const log = React.useMemo(() => {
    const eventById = new Map(events.map((e) => [e.id, e]));
    return spans
      .flatMap((s): LogRow[] => {
        const state = stateByCode.get(s.stateCode);
        if (!state || state.outputFactor > 0 || (machine && s.machineId !== machine)) return [];
        const event = s.eventId ? eventById.get(s.eventId) : undefined;
        const reason = reasonById.get(event?.reasonId ?? '');
        const cat: Category =
          state.lossClass === 'AVAILABILITY'
            ? 'Unplanned'
            : state.lossClass === 'PERFORMANCE'
              ? 'Minor stop'
              : 'Planned';
        return [
          {
            id: s.id,
            machineId: s.machineId,
            stateCode: s.stateCode,
            start: s.start,
            ms: (s.end ?? now) - s.start,
            open: s.end === null,
            category: cat,
            eventId: s.eventId,
            reason: reason?.l3 ?? event?.l1 ?? (event ? 'Waiting for a reason' : state.name),
            group: reason?.l1 ?? event?.l1 ?? state.name,
          },
        ];
      })
      .sort((a, b) => b.start - a.start);
  }, [spans, events, stateByCode, reasonById, machine, now]);

  const total = (c: Category) => log.filter((r) => r.category === c).reduce((a, r) => a + r.ms, 0);
  const totals: [Category, number][] = [
    ['Unplanned', total('Unplanned')],
    ['Planned', total('Planned')],
    ['Minor stop', total('Minor stop')],
  ];
  const grand = totals.reduce((a, [, ms]) => a + ms, 0);
  const unplanned = log.filter((r) => r.category === 'Unplanned');

  const pareto = React.useMemo(() => {
    const groups = new Map<string, { ms: number; count: number }>();
    for (const r of unplanned) {
      const key =
        by === 'Reason'
          ? r.reason
          : by === 'Category'
            ? r.group
            : `${machineById.get(r.machineId)?.tag} · ${machineById.get(r.machineId)?.name}`;
      const g = groups.get(key) ?? { ms: 0, count: 0 };
      groups.set(key, { ms: g.ms + r.ms, count: g.count + 1 });
    }
    const sum = unplanned.reduce((a, r) => a + r.ms, 0) || 1;
    let running = 0;
    return [...groups]
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 12)
      .map(([key, g]) => ({ key, ...g, cumulative: (running += g.ms) / sum }));
  }, [unplanned, by, machineById]);
  const cutoff = pareto.findIndex((p) => p.cumulative >= 0.8);

  const rows = log.filter((r) => !category || r.category === category);
  const exportCsv = () =>
    downloadFile(
      'downtime-log.csv',
      'text/csv',
      toCsv(
        ['Start', 'Machine', 'State', 'Category', 'Reason', 'Duration (min)', 'Andon event'],
        rows.map((r) => [
          fmtClock(r.start),
          machineById.get(r.machineId)?.code ?? r.machineId,
          stateByCode.get(r.stateCode)?.name ?? r.stateCode,
          r.category,
          r.reason,
          (r.ms / 60_000).toFixed(1),
          r.eventId ?? '',
        ]),
      ),
    );

  const columns: Column<LogRow>[] = [
    {
      key: 'start',
      header: 'Start',
      sortValue: (r) => r.start,
      cell: (r) => <span className="font-mono text-xs">{fmtClock(r.start)}</span>,
    },
    {
      key: 'machine',
      header: 'Machine',
      sortValue: (r) => machineById.get(r.machineId)?.tag ?? '',
      cell: (r) => (
        <span className="font-semibold">
          {machineById.get(r.machineId)?.tag} · {machineById.get(r.machineId)?.name}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      cell: (r) => <StateBadge state={stateByCode.get(r.stateCode)} />,
    },
    {
      key: 'category',
      header: 'Category',
      sortValue: (r) => r.category,
      cell: (r) => <Badge variant={CATEGORY_VARIANT[r.category]}>{r.category}</Badge>,
    },
    { key: 'reason', header: 'Reason', sortValue: (r) => r.reason, cell: (r) => r.reason },
    {
      key: 'duration',
      header: 'Duration',
      className: 'tabular-nums font-semibold',
      sortValue: (r) => r.ms,
      cell: (r) => (
        <>
          {fmtDuration(r.ms)}
          {r.open ? <span className="text-accent ml-2 text-xs font-normal">ongoing</span> : null}
        </>
      ),
    },
    {
      key: 'event',
      header: 'Andon',
      cell: (r) =>
        r.eventId ? (
          <span className="text-info font-mono text-xs">{r.eventId}</span>
        ) : (
          <span className="text-muted">none</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Downtime Analytics"
        description="Every stop this shift, in order, with its reason. Planned time (breaks, cleaning, preventive maintenance) stays apart from unplanned time, because only the second one counts against availability."
        className="mb-2"
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Export CSV
          </Button>
        }
      />
      <FilterBar
        count={rows.length}
        total={log.length}
        noun="stops"
        onClear={
          machine || category
            ? () => {
                setMachine('');
                setCategory('');
              }
            : undefined
        }
      >
        <FilterPill>
          <Combobox
            variant="inline"
            label="Machine"
            value={machine}
            onChange={setMachine}
            placeholder="All machines"
            options={[
              { value: '', label: 'All machines' },
              ...machines.map((m) => ({
                value: m.id,
                label: `${m.tag} · ${m.name}`,
                hint: m.code,
              })),
            ]}
          />
        </FilterPill>
        <ChipGroup
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: 'All stops' },
            ...totals.map(([c]) => ({
              value: c,
              label: c,
              count: log.filter((r) => r.category === c).length,
            })),
          ]}
        />
      </FilterBar>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Unplanned downtime"
          value={fmtHm(totals[0]![1])}
          hint={`${unplanned.length} stops`}
          icon={<OctagonX />}
          tone="danger"
        />
        <StatCard
          label="Planned downtime"
          value={fmtHm(totals[1]![1])}
          hint="Outside the availability maths"
          icon={<CalendarCheck />}
        />
        <StatCard
          label="Minor stops"
          value={fmtHm(totals[2]![1])}
          hint="Counted under performance"
          icon={<Zap />}
          tone="warning"
        />
        <StatCard
          label="Longest stop"
          value={fmtDuration(Math.max(0, ...unplanned.map((r) => r.ms)))}
          hint={unplanned.length ? [...unplanned].sort((a, b) => b.ms - a.ms)[0]!.reason : 'None'}
          icon={<Timer />}
          tone="ink"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Planned against unplanned</CardTitle>
            <CardDescription>Share of all stopped time this shift.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
              {totals.map(([c, ms]) => (
                <span key={c} className={CATEGORY_FILL[c]} style={{ flexGrow: ms, flexBasis: 0 }} />
              ))}
            </div>
            <ul className="mt-4 space-y-1">
              {totals.map(([c, ms]) => (
                <li key={c}>
                  <button
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(category === c ? '' : c)}
                    className="hover:bg-surface-2 aria-pressed:bg-surface-2 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left text-sm"
                  >
                    <span className={cn('size-2.5 shrink-0 rounded-[3px]', CATEGORY_FILL[c])} />
                    <span className="flex-1">{c}</span>
                    <span className="text-muted text-xs tabular-nums">
                      {fmtPct(grand ? ms / grand : 0, 0)}
                    </span>
                    <span className="w-16 text-right font-semibold tabular-nums">{fmtHm(ms)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Pareto of unplanned downtime</CardTitle>
              <CardDescription>
                Fix what sits above the line first: it makes up 80% of the time.
              </CardDescription>
            </div>
            <div className="bg-surface flex gap-1 rounded-full p-1" role="tablist">
              {PARETO_BY.map((b) => (
                <button
                  key={b}
                  role="tab"
                  aria-selected={by === b}
                  onClick={() => setBy(b)}
                  className={cn(
                    'text-muted h-8 rounded-full px-3 text-xs font-semibold',
                    by === b && 'bg-ink text-on-ink',
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {pareto.map((p, i) => (
              <React.Fragment key={p.key}>
                <div className="rounded-2xl p-2.5">
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{p.key}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-bold">{fmtHm(p.ms)}</span>
                      <span className="text-muted ml-2 text-xs">{p.count}x</span>
                      <span className="text-muted ml-2 inline-block w-16 text-right text-xs">
                        cum. {fmtPct(p.cumulative, 0)}
                      </span>
                    </span>
                  </p>
                  <p className="bg-surface mt-1.5 h-2 rounded-full">
                    <span
                      className="bg-loss-a block h-full rounded-full"
                      style={{ width: `${(p.ms / (pareto[0]?.ms ?? 1)) * 100}%` }}
                    />
                  </p>
                </div>
                {i === cutoff && i < pareto.length - 1 ? (
                  <p className="text-muted flex items-center gap-2 py-1 text-[11px] font-semibold uppercase tracking-wider">
                    <span className="bg-border h-px flex-1" />
                    80% of unplanned downtime above
                    <span className="bg-border h-px flex-1" />
                  </p>
                ) : null}
              </React.Fragment>
            ))}
            {pareto.length === 0 ? (
              <p className="text-muted py-8 text-center text-sm">
                No unplanned downtime for this machine.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => r.eventId && openEvent(r.eventId)}
          initialSort={{ key: 'start', dir: 'desc' }}
          pageSize={12}
          emptyTitle="No stops match"
          emptyDescription="Clear the filters."
        />
      </Card>
    </div>
  );
}
