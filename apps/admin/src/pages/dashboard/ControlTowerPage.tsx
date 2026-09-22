import * as React from 'react';
import { Link } from 'react-router';
import { CircleCheck, CircleHelp, TrendingDown, TriangleAlert } from 'lucide-react';
import { aggregateOee, averageTargetOee, fmtHm, fmtIdrShort, fmtPct } from '@oee/fixtures';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  StatCard,
  cn,
} from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EventListItem } from '../../components/EventListItem';
import { useOpenEvent } from '../../components/useOpenEvent';
import { ExplainButton, useOeeExplain } from '../../components/useOeeExplain';

export function ControlTowerPage() {
  const {
    lines,
    lineById,
    plant,
    machines,
    oeeByMachine,
    openEvents,
    stateByCode,
    now,
    shiftStart,
  } = useScoped();
  const [scope, setScope] = React.useState('all');
  const openEvent = useOpenEvent();
  const explain = useOeeExplain();

  const inScope = machines.filter((m) => m.active && (scope === 'all' || m.lineId === scope));
  const ids = new Set(inScope.map((m) => m.id));
  const oee = aggregateOee(inScope.flatMap((m) => oeeByMachine.get(m.id) ?? []));
  const target = averageTargetOee(inScope);
  const scopedOpen = openEvents
    .filter((event) => ids.has(event.machineId))
    .sort((a, b) => a.startedAt - b.startedAt);
  const withoutOwner = scopedOpen.filter((event) => !event.assigneeId);
  const firstWithoutOwner = withoutOwner[0];
  const ownershipAction = firstWithoutOwner
    ? firstWithoutOwner.status === 'DETECTED'
      ? 'Acknowledge stop'
      : firstWithoutOwner.reasonId
        ? 'Assign owner'
        : 'Name the reason'
    : '';
  const producing = inScope.filter(
    (machine) => (stateByCode.get(machine.stateCode)?.outputFactor ?? 0) > 0,
  ).length;
  const scopeName = scope === 'all' ? plant.name : (lineById.get(scope)?.name ?? plant.name);
  const explorerTo = scope === 'all' ? '/oee' : `/oee?line=${scope}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="bg-card shadow-card flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]"
          role="tablist"
          aria-label="Scope"
        >
          {[{ id: 'all', code: 'Plant' }, ...lines].map((line) => (
            <button
              key={line.id}
              role="tab"
              aria-selected={scope === line.id}
              onClick={() => setScope(line.id)}
              className={cn(
                'text-muted hover:text-foreground h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold capitalize',
                scope === line.id && 'bg-ink text-on-ink hover:text-on-ink',
              )}
            >
              {line.code.toLowerCase()}
            </button>
          ))}
        </div>
        <p className="text-muted hidden text-xs md:block">
          Shift 1 · {fmtHm(now - shiftStart - 30 * 60_000)} planned time per machine
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card className="bg-ink text-on-ink shadow-float relative overflow-hidden">
          <div
            aria-hidden
            className="bg-action/25 pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl"
          />
          <div className="relative flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-on-ink-muted text-[11px] font-semibold uppercase tracking-wider">
                OEE versus target
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">OEE this shift</h1>
              <p className="mt-6 flex items-start gap-2 leading-none">
                <ExplainButton
                  onClick={() =>
                    explain(
                      scopeName,
                      inScope.map((machine) => machine.id),
                    )
                  }
                  className="text-6xl font-bold tabular-nums tracking-tight decoration-white/40"
                >
                  {(oee.oee * 100).toFixed(1)}
                </ExplainButton>
                <span className="text-on-ink-muted pt-1.5 text-sm font-semibold">
                  % · target {fmtPct(target, 0)}
                </span>
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-on-ink-muted text-sm">
                {oee.oee >= target ? 'Target met' : `${fmtPct(target - oee.oee)} below target`}
              </p>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/15 bg-white/10 text-white hover:bg-white/20"
              >
                <Link to={explorerTo}>View OEE detail</Link>
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="col-span-2 flex flex-col p-5 sm:col-span-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-body/80 text-[13px] font-semibold">Stops without an owner</p>
                <p className="mt-1.5 text-[28px] font-extrabold leading-[1.15] tracking-[-0.5px]">
                  {withoutOwner.length}
                </p>
                <p className="text-muted mt-1 text-xs">Nobody is responsible yet</p>
              </div>
              <span className="bg-warning-soft text-warning flex size-[42px] shrink-0 items-center justify-center rounded-[13px]">
                <CircleHelp className="size-[18px]" />
              </span>
            </div>
            {firstWithoutOwner ? (
              <Button className="mt-4 w-full" onClick={() => openEvent(firstWithoutOwner.id)}>
                {ownershipAction}
              </Button>
            ) : (
              <p className="text-success mt-auto pt-4 text-xs font-semibold">
                Every stop has an owner
              </p>
            )}
          </Card>
          <StatCard
            label="Machines producing"
            value={
              <>
                {producing}
                <span className="text-muted ml-1 text-sm font-semibold">of {inScope.length}</span>
              </>
            }
            hint="Producing output now"
            icon={<CircleCheck />}
            tone="success"
          />
          <StatCard
            label="Open stops"
            value={scopedOpen.length}
            hint="Waiting for recovery"
            icon={<TriangleAlert />}
            tone="danger"
          />
          <StatCard
            label="Production lost"
            value={<span className="text-[22px] sm:text-[26px]">{fmtIdrShort(oee.lostValue)}</span>}
            hint="Estimated value this shift"
            icon={<TrendingDown />}
            tone="ink"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>What needs action</CardTitle>
            <CardDescription>Oldest problem first. Each row shows the next step.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/events">View all events</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {scopedOpen.slice(0, 5).map((event) => (
            <EventListItem key={event.id} event={event} onOpen={() => openEvent(event.id)} />
          ))}
          {scopedOpen.length === 0 ? (
            <EmptyState
              icon={<CircleCheck />}
              title="No open stops"
              description="Every machine in this scope is producing or has no open call."
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="rounded-card bg-card shadow-card flex flex-wrap items-center gap-2 p-4">
        <p className="mr-auto text-sm font-semibold">More analysis</p>
        <Button asChild variant="outline" size="sm">
          <Link to={explorerTo}>OEE Explorer</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/losses">Production losses</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/trends">Trends and reports</Link>
        </Button>
      </div>

    </div>
  );
}
