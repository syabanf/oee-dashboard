import type { AndonRule } from '@oee/types';
import { NOTIFY_CHANNELS, NOTIFY_CHANNEL_LABEL, PRIORITIES, PRIORITY_LABEL } from '@oee/types';
import { newId } from '@oee/fixtures';
import { Plus, X } from 'lucide-react';
import { Button, Combobox, FormField, Input } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EntityDialog, num } from './EntityDialog';

export const emptyRule = (): AndonRule => ({ id: '', code: '', name: '', l1: '', priority: 'MEDIUM', triggerAfterSec: 120, notifyRole: '', escalations: [{ afterMin: 5, role: '', channel: 'WHATSAPP' }] });

export function RuleDialog({ rule, onClose }: { rule: AndonRule | null; onClose: () => void }) {
  const { reasons, people, rules, dispatch } = useScoped();
  const categories = [...new Set(reasons.map((r) => r.l1))];
  // Roles come from people plus any role an existing ladder already names (a plant manager may have no user yet).
  const roles = [...new Set([...people.map((p) => p.role), ...rules.flatMap((r) => [r.notifyRole, ...r.escalations.map((s) => s.role)])])].sort().map((r) => ({ value: r, label: r }));
  return (
    <EntityDialog entity={rule} noun="Andon rule" description="A stop turns yellow at the trigger, then climbs one red step per escalation until someone resolves it." onClose={onClose}
      valid={(r) => !!r.code.trim() && !!r.name.trim() && !!r.l1 && !!r.notifyRole && r.escalations.every((s) => s.role && s.afterMin > 0)}
      onSave={(r) => dispatch({ type: 'rules/upsert', rule: { ...r, id: r.id || newId('rul'), escalations: [...r.escalations].sort((a, b) => a.afterMin - b.afterMin) } })}>
      {(r, set) => (<>
        <FormField label="Code"><Input value={r.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="[&_input]:font-mono" placeholder="A08" /></FormField>
        <FormField label="Andon"><Input value={r.name} onChange={(e) => set({ name: e.target.value })} placeholder="Machine Breakdown" /></FormField>
        <FormField label="Routes category"><Combobox label="Category" value={r.l1} onChange={(l1) => set({ l1 })} placeholder="Select a category" options={categories.map((c) => ({ value: c, label: c }))} /></FormField>
        <FormField label="Priority"><Combobox label="Priority" searchable={false} value={r.priority} onChange={(v) => set({ priority: v as AndonRule['priority'] })} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} /></FormField>
        <FormField label="Trigger after (sec)" hint="Shorter stops count as micro stops."><Input type="number" min={30} step={10} value={r.triggerAfterSec} onChange={(e) => set({ triggerAfterSec: num(e.target.value) })} /></FormField>
        <FormField label="First notify"><Combobox label="First notify" value={r.notifyRole} onChange={(notifyRole) => set({ notifyRole })} placeholder="Select a role" options={roles} /></FormField>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium">Escalation ladder</p>
          {r.escalations.map((step, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2 sm:flex-nowrap">
              <Input aria-label={`Escalation ${i + 1} after minutes`} type="number" min={1} value={step.afterMin} onChange={(e) => set({ escalations: r.escalations.map((s, j) => (j === i ? { ...s, afterMin: num(e.target.value) } : s)) })} className="w-24 shrink-0" />
              <span className="shrink-0 text-xs text-muted">min →</span>
              <div className="min-w-0 flex-1"><Combobox label={`Escalation ${i + 1} role`} value={step.role} onChange={(role) => set({ escalations: r.escalations.map((s, j) => (j === i ? { ...s, role } : s)) })} placeholder="Select a role" options={roles} /></div>
              <div className="w-32 shrink-0"><Combobox label={`Escalation ${i + 1} channel`} searchable={false} value={step.channel} onChange={(v) => set({ escalations: r.escalations.map((s, j) => (j === i ? { ...s, channel: v as typeof s.channel } : s)) })} options={NOTIFY_CHANNELS.map((c) => ({ value: c, label: NOTIFY_CHANNEL_LABEL[c] }))} /></div>
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Remove escalation ${i + 1}`} onClick={() => set({ escalations: r.escalations.filter((_, j) => j !== i) })}><X /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set({ escalations: [...r.escalations, { afterMin: (r.escalations.at(-1)?.afterMin ?? 0) + 10, role: '', channel: 'WHATSAPP' }] })}><Plus />Add step</Button>
        </div>
      </>)}
    </EntityDialog>
  );
}
