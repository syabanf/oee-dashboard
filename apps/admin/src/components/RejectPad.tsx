import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Machine } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Button } from '@oee/ui';
import { useScoped } from '../state/app-state';

/** Reject entry for gloves: pick the defect, set the count, log. Used on the line tablet and in the quality page dialog. */
export function RejectPad({
  machine,
  onLogged,
  language = 'en',
}: {
  machine: Machine;
  onLogged?: () => void;
  language?: 'en' | 'id';
}) {
  const { defects, rejects, viewerId, now, dispatch } = useScoped();
  const [defectId, setDefectId] = React.useState('');
  const [qty, setQty] = React.useState(1);
  // Most-used defects first, so the common case is the first tile.
  const ranked = React.useMemo(() => {
    const used = new Map<string, number>();
    for (const r of rejects) used.set(r.defectId, (used.get(r.defectId) ?? 0) + r.qty);
    return [...defects].sort((a, b) => (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0));
  }, [defects, rejects]);

  const submit = () => {
    dispatch({
      type: 'rejects/add',
      reject: { id: newId('rej'), machineId: machine.id, defectId, qty, at: now, byId: viewerId },
    });
    setDefectId('');
    setQty(1);
    onLogged?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ranked.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={defectId === d.id}
            onClick={() => setDefectId(d.id)}
            className="bg-surface aria-pressed:bg-ink aria-pressed:text-on-ink flex h-16 flex-col items-center justify-center rounded-2xl px-2 text-center transition-transform active:scale-[0.98]"
          >
            <span className="text-sm font-semibold">{d.name}</span>
            <span className="text-[11px] opacity-60">{d.category}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-surface flex items-center gap-1 rounded-full p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={language === 'id' ? 'Kurangi satu' : 'One less'}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus />
          </Button>
          <span className="w-12 text-center text-2xl font-bold tabular-nums">{qty}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={language === 'id' ? 'Tambah satu' : 'One more'}
            onClick={() => setQty((q) => q + 1)}
          >
            <Plus />
          </Button>
        </div>
        {[5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQty((q) => q + n)}
            className="border-border bg-card hover:bg-surface h-10 rounded-full border px-4 text-sm font-semibold"
          >
            +{n}
          </button>
        ))}
        <Button type="button" size="lg" className="ml-auto" disabled={!defectId} onClick={submit}>
          {language === 'id'
            ? `Catat ${qty} cacat`
            : `Log ${qty} ${qty === 1 ? 'reject' : 'rejects'}`}
        </Button>
      </div>
    </div>
  );
}
