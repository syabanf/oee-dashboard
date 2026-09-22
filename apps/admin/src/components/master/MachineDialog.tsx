import type { Machine } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog, ToggleRow, num } from './EntityDialog';

export const emptyMachine = (lineId: string, productId: string): Machine => ({
  id: '', code: '', tag: '', name: '', lineId, machineType: '', manufacturer: '', plc: '', protocol: 'OPC UA', ipAddress: '', idealCycleSec: 4, ratedCapacityPerHour: 900,
  targetAvailability: 90, targetPerformance: 95, targetQuality: 99, targetOee: 85, cmmsAssetId: '', active: true, productId, stateCode: 'RUN', stateSince: 0,
});
const PROTOCOLS = ['OPC UA', 'Modbus TCP', 'MQTT', 'Ethernet/IP'];

export function MachineDialog({ machine, onClose }: { machine: Machine | null; onClose: () => void }) {
  const { lines, products, now, dispatch } = useScoped();
  return (
    <EntityDialog entity={machine} noun="machine" description="Targets and ideal cycle time drive the OEE maths. The CMMS asset id links downtime to work orders." onClose={onClose}
      valid={(m) => !!m.code.trim() && !!m.name.trim() && !!m.tag.trim() && m.idealCycleSec > 0}
      onSave={(m) => dispatch({ type: 'machines/upsert', machine: m.id ? m : { ...m, id: newId('mch'), stateSince: now, ratedCapacityPerHour: Math.round(3600 / m.idealCycleSec) } })}>
      {(m, set) => (<>
        <FormField label="Machine ID" hint="Canonical id, for example MCH-POL-007"><Input value={m.code} onChange={(e) => set({ code: e.target.value })} className="[&_input]:font-mono" /></FormField>
        <FormField label="Board tag" hint="Short label on the Andon board"><Input value={m.tag} onChange={(e) => set({ tag: e.target.value })} /></FormField>
        <FormField label="Name"><Input value={m.name} onChange={(e) => set({ name: e.target.value })} /></FormField>
        <FormField label="Line"><Combobox label="Line" value={m.lineId} onChange={(lineId) => set({ lineId })} options={lines.map((l) => ({ value: l.id, label: l.name, hint: l.code }))} /></FormField>
        <FormField label="Machine type"><Input value={m.machineType} onChange={(e) => set({ machineType: e.target.value })} /></FormField>
        <FormField label="Manufacturer"><Input value={m.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })} /></FormField>
        <FormField label="PLC"><Input value={m.plc} onChange={(e) => set({ plc: e.target.value })} /></FormField>
        <FormField label="Protocol"><Combobox label="Protocol" searchable={false} value={m.protocol} onChange={(protocol) => set({ protocol })} options={PROTOCOLS.map((p) => ({ value: p, label: p }))} /></FormField>
        <FormField label="IP address"><Input value={m.ipAddress} onChange={(e) => set({ ipAddress: e.target.value })} className="[&_input]:font-mono" /></FormField>
        <FormField label="CMMS asset ID"><Input value={m.cmmsAssetId} onChange={(e) => set({ cmmsAssetId: e.target.value })} className="[&_input]:font-mono" /></FormField>
        <FormField label="Running product"><Combobox label="Product" value={m.productId} onChange={(productId) => set({ productId })} options={products.map((p) => ({ value: p.id, label: p.name, hint: p.sku }))} /></FormField>
        <FormField label="Ideal cycle time (sec)"><Input type="number" min={0.1} step={0.1} value={m.idealCycleSec} onChange={(e) => set({ idealCycleSec: num(e.target.value) })} /></FormField>
        <FormField label="Availability target (%)"><Input type="number" min={0} max={100} value={m.targetAvailability} onChange={(e) => set({ targetAvailability: num(e.target.value) })} /></FormField>
        <FormField label="Performance target (%)"><Input type="number" min={0} max={100} value={m.targetPerformance} onChange={(e) => set({ targetPerformance: num(e.target.value) })} /></FormField>
        <FormField label="Quality target (%)"><Input type="number" min={0} max={100} value={m.targetQuality} onChange={(e) => set({ targetQuality: num(e.target.value) })} /></FormField>
        <FormField label="OEE target (%)"><Input type="number" min={0} max={100} value={m.targetOee} onChange={(e) => set({ targetOee: num(e.target.value) })} /></FormField>
        <div className="sm:col-span-2"><ToggleRow label="Active" hint="Inactive machines leave the board and the OEE roll-up." checked={m.active} onChange={(active) => set({ active })} /></div>
      </>)}
    </EntityDialog>
  );
}
