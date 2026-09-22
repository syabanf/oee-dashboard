import type { ThresholdRule } from '@oee/types';
import { OEE_METRICS, OEE_METRIC_LABEL } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog, ToggleRow, num } from './EntityDialog';

export const emptyThreshold = (): ThresholdRule => ({ id: '', name: '', metric: 'OEE', scope: 'PLANT', below: 85, notifyRole: '', active: true });
const SCOPES = [{ value: 'PLANT', label: 'Whole plant' }, { value: 'LINE', label: 'One line' }, { value: 'MACHINE', label: 'One machine' }];

export function ThresholdDialog({ rule, onClose }: { rule: ThresholdRule | null; onClose: () => void }) {
  const { lines, machines, people, thresholds, rules, dispatch } = useScoped();
  const roles = [...new Set([...people.map((p) => p.role), ...thresholds.map((t) => t.notifyRole), ...rules.flatMap((r) => r.escalations.map((s) => s.role))])].filter(Boolean).sort().map((r) => ({ value: r, label: r }));
  return (
    <EntityDialog entity={rule} noun="alert rule" description="Fires when the metric for the shift so far drops under the floor. The role gets it in the inbox and the Control Tower shows a flag." onClose={onClose}
      valid={(r) => !!r.name.trim() && !!r.notifyRole && r.below > 0 && (r.scope === 'PLANT' || !!r.scopeId)} onSave={(r) => dispatch({ type: 'thresholds/upsert', rule: r.id ? r : { ...r, id: newId('thr') } })}>
      {(r, set) => (<>
        <FormField label="Name" className="sm:col-span-2"><Input value={r.name} onChange={(e) => set({ name: e.target.value })} placeholder="Polishing availability" /></FormField>
        <FormField label="Metric"><Combobox label="Metric" searchable={false} value={r.metric} onChange={(v) => set({ metric: v as ThresholdRule['metric'] })} options={OEE_METRICS.map((m) => ({ value: m, label: OEE_METRIC_LABEL[m] }))} /></FormField>
        <FormField label="Floor (%)"><Input type="number" min={1} max={100} value={r.below} onChange={(e) => set({ below: num(e.target.value) })} /></FormField>
        <FormField label="Applies to"><Combobox label="Applies to" searchable={false} value={r.scope} onChange={(v) => set({ scope: v as ThresholdRule['scope'], scopeId: undefined })} options={SCOPES} /></FormField>
        {r.scope === 'LINE' ? <FormField label="Line"><Combobox label="Line" value={r.scopeId ?? ''} onChange={(scopeId) => set({ scopeId })} placeholder="Select a line" options={lines.map((l) => ({ value: l.id, label: l.name, hint: l.code }))} /></FormField> : null}
        {r.scope === 'MACHINE' ? <FormField label="Machine"><Combobox label="Machine" value={r.scopeId ?? ''} onChange={(scopeId) => set({ scopeId })} placeholder="Select a machine" options={machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: m.code }))} /></FormField> : null}
        <FormField label="Notify role"><Combobox label="Notify role" value={r.notifyRole} onChange={(notifyRole) => set({ notifyRole })} placeholder="Select a role" options={roles} /></FormField>
        <div className="sm:col-span-2"><ToggleRow label="Active" checked={r.active} onChange={(active) => set({ active })} /></div>
      </>)}
    </EntityDialog>
  );
}
