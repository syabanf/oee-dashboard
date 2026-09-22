import type { IntegrationMapping } from '@oee/types';
import { INTEGRATION_SOURCES } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog } from './EntityDialog';

export const emptyMapping = (): IntegrationMapping => ({ id: '', machineId: '', source: 'PLC', externalId: '' });

export function MappingDialog({ mapping, onClose }: { mapping: IntegrationMapping | null; onClose: () => void }) {
  const { machines, dispatch } = useScoped();
  return (
    <EntityDialog entity={mapping} noun="integration mapping" description="External ids point at the canonical machine id. A PLC tag is never the business key." onClose={onClose}
      valid={(m) => !!m.machineId && !!m.externalId.trim()} onSave={(m) => dispatch({ type: 'mappings/upsert', mapping: m.id ? m : { ...m, id: newId('map') } })}>
      {(m, set) => (<>
        <FormField label="Internal machine" className="sm:col-span-2"><Combobox label="Machine" value={m.machineId} onChange={(machineId) => set({ machineId })} placeholder="Select a machine" options={machines.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}`, hint: x.tag }))} /></FormField>
        <FormField label="Source system"><Combobox label="Source system" searchable={false} value={m.source} onChange={(v) => set({ source: v as IntegrationMapping['source'] })} options={INTEGRATION_SOURCES.map((s) => ({ value: s, label: s }))} /></FormField>
        <FormField label="External ID"><Input value={m.externalId} onChange={(e) => set({ externalId: e.target.value })} className="[&_input]:font-mono" placeholder="DB101.M01" /></FormField>
      </>)}
    </EntityDialog>
  );
}
