import type { Machine } from '@oee/types';
import { fmtClockShort, fmtHm, fmtInt, orderProgress } from '@oee/fixtures';
import { cn } from '@oee/ui';
import { useScoped } from '../state/app-state';

/** The running order: batch, product, live count against target, and the changeover window that follows. */
export function JobCard({ machine, onInk }: { machine: Machine; onInk?: boolean }) {
  const { orderByMachine, productById, kpi, now } = useScoped();
  const order = orderByMachine.get(machine.id);
  if (!order) return <p className={cn('text-sm', onInk ? 'text-on-ink-muted' : 'text-muted')}>No production order on this machine.</p>;
  const p = orderProgress(order, machine, kpi);
  const muted = onInk ? 'text-on-ink-muted' : 'text-muted';
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-bold">{productById.get(order.productId)?.name} <span className={cn('font-mono text-xs font-normal', muted)}>{order.id} · batch {order.batchNo}</span></p>
        <p className="text-sm tabular-nums"><span className="text-lg font-bold">{fmtInt(p.produced)}</span> <span className={muted}>/ {fmtInt(order.targetQty)} pcs</span></p>
      </div>
      <div className={cn('mt-2 h-2 overflow-hidden rounded-full', onInk ? 'bg-white/15' : 'bg-surface')}><div className={cn('h-full rounded-full', onInk ? 'bg-white' : 'bg-ink')} style={{ width: `${Math.min(100, p.share * 100)}%` }} /></div>
      <p className={cn('mt-2 text-xs', muted)}>
        {p.remaining === 0 ? 'Order complete. ' : p.etaAt ? `${fmtInt(p.remaining)} pcs to go at ${fmtInt(p.ratePerHour)} pcs/h, done about ${fmtClockShort(p.etaAt)} (${fmtHm(p.etaAt - now)}). ` : `${fmtInt(p.remaining)} pcs to go. No output in the last hour, no finish time. `}
        Next changeover: {productById.get(order.nextProductId)?.name}, {order.changeoverMin} min standard.
      </p>
    </div>
  );
}
