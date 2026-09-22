import type { DefectReason } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog } from './EntityDialog';

export const emptyDefect = (): DefectReason => ({ id: '', category: '', name: '', disposition: 'SCRAP' });

export function DefectDialog({ defect, onClose }: { defect: DefectReason | null; onClose: () => void }) {
  const { dispatch } = useScoped();
  return (
    <EntityDialog entity={defect} noun="defect reason" description="Category is the tile an inspector taps. Keep the list short enough to fit one screen." onClose={onClose}
      valid={(d) => !!d.category.trim() && !!d.name.trim()} onSave={(d) => dispatch({ type: 'defects/upsert', defect: d.id ? d : { ...d, id: newId('def') } })}>
      {(d, set) => (<>
        <FormField label="Category"><Input value={d.category} onChange={(e) => set({ category: e.target.value })} placeholder="Surface" /></FormField>
        <FormField label="Defect"><Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Scratch" /></FormField>
        <FormField label="Disposition" hint="Scrap and rework are two of the six big losses."><Combobox label="Disposition" searchable={false} value={d.disposition} onChange={(v) => set({ disposition: v as DefectReason['disposition'] })} options={[{ value: 'SCRAP', label: 'Scrap', hint: 'Part is discarded' }, { value: 'REWORK', label: 'Rework', hint: 'Part is reprocessed to meet spec' }]} /></FormField>
      </>)}
    </EntityDialog>
  );
}
