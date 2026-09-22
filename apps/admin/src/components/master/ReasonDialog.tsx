import type { DowntimeReason } from '@oee/types';
import { LOSS_CLASSES, LOSS_CLASS_LABEL } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog, ToggleRow, num } from './EntityDialog';

export const emptyReason = (ownerDepartmentId: string): DowntimeReason => ({
  id: '',
  l1: '',
  l2: '',
  l3: '',
  ownerDepartmentId,
  slaMin: 5,
  lossClass: 'AVAILABILITY',
  createsWorkOrder: false,
  requiresComment: false,
});

export function ReasonDialog({
  reason,
  onClose,
}: {
  reason: DowntimeReason | null;
  onClose: () => void;
}) {
  const { departments, dispatch } = useScoped();
  return (
    <EntityDialog
      entity={reason}
      noun="downtime reason"
      description="Operators pick level 1. Leaders and maintenance complete levels 2 and 3. Ownership routes the Andon call."
      onClose={onClose}
      valid={(r) => !!r.l1.trim() && !!r.l2.trim() && !!r.l3.trim()}
      onSave={(r) =>
        dispatch({ type: 'reasons/upsert', reason: r.id ? r : { ...r, id: newId('rsn') } })
      }
    >
      {(r, set) => (
        <>
          <FormField label="Level 1, category">
            <Input
              value={r.l1}
              onChange={(e) => set({ l1: e.target.value })}
              placeholder="Machine"
            />
          </FormField>
          <FormField label="Level 2, group">
            <Input
              value={r.l2}
              onChange={(e) => set({ l2: e.target.value })}
              placeholder="Mechanical"
            />
          </FormField>
          <FormField label="Level 3, reason">
            <Input
              value={r.l3}
              onChange={(e) => set({ l3: e.target.value })}
              placeholder="Bearing Failure"
            />
          </FormField>
          <FormField label="Owner department">
            <Combobox
              label="Owner department"
              value={r.ownerDepartmentId}
              onChange={(ownerDepartmentId) => set({ ownerDepartmentId })}
              options={departments
                .filter((d) => d.kind === 'SUPPORT')
                .map((d) => ({ value: d.id, label: d.name }))}
            />
          </FormField>
          <FormField label="Technician arrival target (min)">
            <Input
              type="number"
              min={1}
              value={r.slaMin}
              onChange={(e) => set({ slaMin: num(e.target.value) })}
            />
          </FormField>
          <FormField label="OEE classification">
            <Combobox
              label="OEE classification"
              searchable={false}
              value={r.lossClass}
              onChange={(v) => set({ lossClass: v as DowntimeReason['lossClass'] })}
              options={LOSS_CLASSES.map((c) => ({ value: c, label: LOSS_CLASS_LABEL[c] }))}
            />
          </FormField>
          <ToggleRow
            label="Create CMMS work order"
            hint="Opens when the event is assigned."
            checked={r.createsWorkOrder}
            onChange={(createsWorkOrder) => set({ createsWorkOrder })}
          />
          <ToggleRow
            label="Requires comment"
            hint="Blocks resolve until a note is written."
            checked={r.requiresComment}
            onChange={(requiresComment) => set({ requiresComment })}
          />
        </>
      )}
    </EntityDialog>
  );
}
