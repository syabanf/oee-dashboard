import { Link, useSearchParams } from 'react-router';
import { LOSS_CLASS_LABEL, type LossClass } from '@oee/types';
import { fmtHm, fmtInt } from '@oee/fixtures';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { LOSS_FILL } from '../../components/badges';
import { EventListItem } from '../../components/EventListItem';
import { useOpenEvent } from '../../components/useOpenEvent';
import { BackButton } from '../../components/BackButton';

/** A loss opened up: which machines carry it, and the Andon events behind it. The selection lives in the URL. */
export function LossDrillPage() {
  const [params] = useSearchParams();
  const { oeeByMachine, machineById, events } = useScoped();
  const openEvent = useOpenEvent();
  const keys = (params.get('keys') ?? '').split(',').filter(Boolean);
  const machines = (params.get('m') ?? '').split(',').flatMap((id) => machineById.get(id) ?? []);
  const label = params.get('label') ?? 'Loss';
  const lossClass = (params.get('class') ?? 'AVAILABILITY') as LossClass;

  const rows = machines
    .map((machine) => ({ machine, ms: (oeeByMachine.get(machine.id)?.buckets ?? []).filter((b) => keys.includes(b.key)).reduce((a, b) => a + b.ms, 0) }))
    .filter((r) => r.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  const total = rows.reduce((a, r) => a + r.ms, 0);
  const max = rows[0]?.ms ?? 1;
  // Availability buckets keyed by reason category (or unclassified) trace back to events; state and speed buckets do not.
  const l1s = keys.filter((k) => k.startsWith('l1:')).map((k) => k.slice(3));
  const ids = new Set(machines.map((m) => m.id));
  const related = events
    .filter((e) => ids.has(e.machineId) && (e.l1 ? l1s.includes(e.l1) : keys.includes('unclassified')))
    .sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <BackButton fallback="/losses" />
        <span className="text-muted">·</span>
        <Link to="/losses" className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-black/5 hover:text-foreground">Loss Intelligence</Link>
      </div>
      <PageHeader title={label} description={`${LOSS_CLASS_LABEL[lossClass] ?? lossClass} · ${fmtHm(total)} this shift across ${rows.length} ${rows.length === 1 ? 'machine' : 'machines'}`} className="mb-2" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By machine</CardTitle><CardDescription>Largest first. Open a machine to see when it happened on the state timeline.</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            {rows.map(({ machine, ms }) => (
              <Link key={machine.id} to={`/machines/${machine.id}`} className="block rounded-2xl p-3 hover:bg-surface-2">
                <span className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate font-semibold">{machine.tag} · {machine.name}</span><span className="shrink-0 tabular-nums"><span className="font-bold">{fmtHm(ms)}</span><span className="ml-2 text-xs text-muted">{fmtInt(ms / 1000 / machine.idealCycleSec)} pcs</span></span></span>
                <span className="mt-1.5 block h-2 rounded-full bg-surface"><span className={cn('block h-full rounded-full', LOSS_FILL[lossClass])} style={{ width: `${(ms / max) * 100}%` }} /></span>
              </Link>
            ))}
            {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted">No machine in this selection carries this loss right now.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Andon events behind it{related.length ? ` · ${related.length}` : ''}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {related.slice(0, 12).map((e) => <EventListItem key={e.id} event={e} onOpen={(ev) => openEvent(ev.id)} />)}
            {related.length === 0 ? <p className="rounded-2xl bg-info-soft px-4 py-3 text-sm text-body">This loss comes from machine states and counts, so no Andon event is attached.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
