import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { averageTargetOee, eventElapsed, fmtClock, fmtDuration, fmtHm, fmtPct } from '@oee/fixtures';
import { WitMark } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { MachineTile } from '../../components/MachineTile';
import { AndonLegend, eventTitle } from '../../components/badges';

/** Full-screen shopfloor board for a wall display: states by line, active issues, today's numbers. */
export function TvBoardPage() {
  const { lines, machinesByLine, openEvents, machineById, reasonById, departmentById, plantOee, machines, now } = useScoped();
  const target = averageTargetOee(machines);
  const figures = [
    { label: 'OEE', value: fmtPct(plantOee.oee) },
    { label: 'Target', value: fmtPct(target) },
    { label: 'Downtime', value: fmtHm(plantOee.plannedMs - plantOee.runMs) },
    { label: 'Reject', value: fmtPct(1 - plantOee.quality) },
  ];
  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-ink p-4 text-white lg:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/andon" aria-label="Back to the admin board" className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></Link>
          <div><WitMark dark /><h1 className="text-xl font-bold tracking-tight lg:text-3xl">Production Andon</h1></div>
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums lg:text-4xl">{fmtClock(now)}</p>
      </header>
      <AndonLegend dark />

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {lines.map((line) => (
            <section key={line.id} className="rounded-[28px] bg-ink-2 p-4">
              <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-on-ink-muted">{line.code}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-1 lg:grid-cols-2">{(machinesByLine.get(line.id) ?? []).filter((m) => m.active).map((m) => <MachineTile key={m.id} machine={m} dark />)}</div>
            </section>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <section className="flex-1 rounded-[28px] bg-ink-2 p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-on-ink-muted">Active issue</h2>
            <ul className="mt-3 space-y-3">
              {openEvents.map((e) => {
                const machine = machineById.get(e.machineId);
                return (
                  <li key={e.id} className="rounded-2xl bg-white/5 p-4">
                    <div className="flex items-baseline justify-between gap-3"><span className="font-mono text-lg font-bold">{machine?.tag}</span><span className="text-2xl font-bold tabular-nums">{fmtDuration(eventElapsed(e, now))}</span></div>
                    <p className="mt-1 text-base font-semibold">{eventTitle(e, reasonById.get(e.reasonId ?? '')?.l3)}</p>
                    <p className="text-sm text-on-ink-muted">Assigned → {departmentById.get(e.ownerDepartmentId ?? '')?.name ?? 'waiting for a reason'}</p>
                  </li>
                );
              })}
              {openEvents.length === 0 ? <li className="rounded-2xl bg-white/5 p-4 text-on-ink-muted">All lines running.</li> : null}
            </ul>
          </section>
          <section className="grid grid-cols-2 gap-3 rounded-[28px] bg-ink-2 p-5">
            <h2 className="col-span-2 text-sm font-bold uppercase tracking-[0.2em] text-on-ink-muted">Today</h2>
            {figures.map((f) => <div key={f.label}><p className="text-sm text-on-ink-muted">{f.label}</p><p className="text-3xl font-bold tabular-nums">{f.value}</p></div>)}
          </section>
        </div>
      </div>
    </div>
  );
}
