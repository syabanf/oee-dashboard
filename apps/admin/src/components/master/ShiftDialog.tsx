import type { Shift } from '@oee/types';
import { newId } from '@oee/fixtures';
import { FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog } from './EntityDialog';

export const emptyShift = (): Shift => ({ id: '', name: '', start: '07:00', end: '15:00', breakStart: '12:00', breakEnd: '12:30' });
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function ShiftDialog({ shift, onClose }: { shift: Shift | null; onClose: () => void }) {
  const { dispatch } = useScoped();
  const time = (s: Shift, key: 'start' | 'end' | 'breakStart' | 'breakEnd', label: string, set: (patch: Partial<Shift>) => void) => (
    <FormField label={label}><Input type="time" value={s[key]} onChange={(e) => set({ [key]: e.target.value })} /></FormField>
  );
  return (
    <EntityDialog entity={shift} noun="shift" description="Shift length minus the break is planned production time, the denominator of availability." onClose={onClose}
      valid={(s) => !!s.name.trim() && [s.start, s.end, s.breakStart, s.breakEnd].every((t) => TIME.test(t))} onSave={(s) => dispatch({ type: 'shifts/upsert', shift: s.id ? s : { ...s, id: newId('shf') } })}>
      {(s, set) => (<>
        <FormField label="Name" className="sm:col-span-2"><Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Shift 1" /></FormField>
        {time(s, 'start', 'Starts', set)}{time(s, 'end', 'Ends', set)}{time(s, 'breakStart', 'Break starts', set)}{time(s, 'breakEnd', 'Break ends', set)}
      </>)}
    </EntityDialog>
  );
}
