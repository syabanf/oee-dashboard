import type { MachineState } from '@oee/types';
import { ANDON_LEVELS, ANDON_LEVEL_LABEL, LOSS_CLASSES, LOSS_CLASS_LABEL } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog, num } from './EntityDialog';

export const emptyState = (): MachineState => ({ id: '', code: '', name: '', lossClass: 'AVAILABILITY', andonLevel: 'STOP', outputFactor: 0, description: '' });

export function StateDialog({ state, onClose }: { state: MachineState | null; onClose: () => void }) {
  const { dispatch } = useScoped();
  return (
    <EntityDialog entity={state} noun="machine state" description="The OEE impact lives here as configuration. Change it and every figure recalculates, with no code change." onClose={onClose}
      valid={(s) => !!s.code.trim() && !!s.name.trim()} onSave={(s) => dispatch({ type: 'states/upsert', state: s.id ? s : { ...s, id: newId('st') } })}>
      {(s, set) => (<>
        <FormField label="Code"><Input value={s.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="[&_input]:font-mono" /></FormField>
        <FormField label="State"><Input value={s.name} onChange={(e) => set({ name: e.target.value })} /></FormField>
        <FormField label="OEE impact"><Combobox label="OEE impact" searchable={false} value={s.lossClass} onChange={(v) => set({ lossClass: v as MachineState['lossClass'] })} options={LOSS_CLASSES.map((c) => ({ value: c, label: LOSS_CLASS_LABEL[c] }))} /></FormField>
        <FormField label="Andon light"><Combobox label="Andon light" searchable={false} value={s.andonLevel} onChange={(v) => set({ andonLevel: v as MachineState['andonLevel'] })} options={ANDON_LEVELS.map((l) => ({ value: l, label: ANDON_LEVEL_LABEL[l] }))} /></FormField>
        <FormField label="Output factor" hint="Share of ideal output still made: 1 running, 0.8 reduced speed, 0 stopped."><Input type="number" min={0} max={1} step={0.05} value={s.outputFactor} onChange={(e) => set({ outputFactor: num(e.target.value) })} /></FormField>
        <FormField label="Description"><Input value={s.description} onChange={(e) => set({ description: e.target.value })} /></FormField>
      </>)}
    </EntityDialog>
  );
}
