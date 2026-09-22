import type { CycleTime } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog, num } from './EntityDialog';

export const emptyCycleTime = (): CycleTime => ({ id: '', machineId: '', productId: '', idealCycleSec: 4 });

export function CycleTimeDialog({ cycleTime, onClose }: { cycleTime: CycleTime | null; onClose: () => void }) {
  const { machines, products, cycleTimes, dispatch } = useScoped();
  const clash = (c: CycleTime) => cycleTimes.some((x) => x.id !== c.id && x.machineId === c.machineId && x.productId === c.productId);
  return (
    <EntityDialog entity={cycleTime} noun="cycle time" description="Machine plus product gives the ideal cycle time. One machine, many products, many cycle times." onClose={onClose}
      valid={(c) => !!c.machineId && !!c.productId && c.idealCycleSec > 0 && !clash(c)} onSave={(c) => dispatch({ type: 'cycleTimes/upsert', cycleTime: c.id ? c : { ...c, id: newId('cyc') } })}>
      {(c, set) => (<>
        <FormField label="Machine"><Combobox label="Machine" value={c.machineId} onChange={(machineId) => set({ machineId })} placeholder="Select a machine" options={machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: m.code }))} /></FormField>
        <FormField label="Product" error={clash(c) ? 'This machine already has a cycle time for this product.' : undefined}><Combobox label="Product" value={c.productId} onChange={(productId) => set({ productId })} placeholder="Select a product" options={products.map((p) => ({ value: p.id, label: p.name, hint: p.sku }))} /></FormField>
        <FormField label="Ideal cycle time (sec)"><Input type="number" min={0.1} step={0.1} value={c.idealCycleSec} onChange={(e) => set({ idealCycleSec: num(e.target.value) })} /></FormField>
      </>)}
    </EntityDialog>
  );
}
