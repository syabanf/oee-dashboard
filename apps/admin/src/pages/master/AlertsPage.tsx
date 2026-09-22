import * as React from 'react';
import { BellOff, BellRing, CircleCheck, Plus, TriangleAlert } from 'lucide-react';
import type { ThresholdRule } from '@oee/types';
import { OEE_METRIC_LABEL } from '@oee/types';
import { fmtPct } from '@oee/fixtures';
import { Badge, Button, Card, DataTable, PageHeader, type Column } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ChipGroup, FilterBar, SummaryCards } from '../../components/FilterBar';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { RowActions } from '../../components/master/RowActions';
import { ThresholdDialog, emptyThreshold } from '../../components/master/ThresholdDialog';

export function AlertsPage() {
  const { thresholds, alerts, plant, lineById, machineById, dispatch } = useScoped();
  const [editing, setEditing] = React.useState<ThresholdRule | null>(null);
  const [removing, setRemoving] = React.useState<ThresholdRule | null>(null);
  const [status, setStatus] = React.useState<'' | 'firing' | 'ok' | 'off'>('');
  const [metric, setMetric] = React.useState('');
  const firing = new Map(alerts.map((a) => [a.rule.id, a]));
  const statusOf = (r: ThresholdRule) => (!r.active ? 'off' : firing.has(r.id) ? 'firing' : 'ok');
  const rows = thresholds.filter((r) => (!status || statusOf(r) === status) && (!metric || r.metric === metric));
  const count = (s: string) => thresholds.filter((r) => statusOf(r) === s).length;
  const toggle = (s: typeof status) => setStatus(status === s ? '' : s);
  const scopeName = (r: ThresholdRule) => (r.scope === 'PLANT' ? plant.name : r.scope === 'LINE' ? lineById.get(r.scopeId ?? '')?.name : machineById.get(r.scopeId ?? '')?.name) ?? 'Removed';
  const columns: Column<ThresholdRule>[] = [
    { key: 'name', header: 'Rule', sortValue: (r) => r.name, cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'scope', header: 'Applies to', cell: scopeName },
    { key: 'condition', header: 'Condition', cell: (r) => <span className="tabular-nums">{OEE_METRIC_LABEL[r.metric]} under {r.below}%</span> },
    { key: 'notify', header: 'Notify', cell: (r) => r.notifyRole },
    { key: 'status', header: 'Now', cell: (r) => (!r.active ? <Badge variant="muted">Off</Badge> : firing.has(r.id) ? <Badge variant="danger" dot>Firing at {fmtPct(firing.get(r.id)!.value)}</Badge> : <Badge variant="success" dot>OK</Badge>) },
    { key: 'actions', header: '', cell: (r) => <RowActions name={r.name} onEdit={() => setEditing(r)} onDelete={() => setRemoving(r)} /> },
  ];
  return (
    <div>
      <PageHeader title="Alert Rules" description="Threshold triggers on OEE, availability, performance or quality. Downtime escalation by minutes lives in Andon Rules." actions={<Button onClick={() => setEditing(emptyThreshold())}><Plus />Add alert rule</Button>} />
      <div className="mb-4 space-y-4">
        <SummaryCards items={[
          { label: 'Alert rules', value: thresholds.length, hint: `${new Set(thresholds.map((r) => r.notifyRole)).size} roles notified`, icon: <BellRing />, tone: 'ink' },
          { label: 'Firing now', value: count('firing'), hint: 'Metric under its floor', icon: <TriangleAlert />, tone: 'danger', active: status === 'firing', onClick: () => toggle('firing') },
          { label: 'Within limits', value: count('ok'), hint: 'Active and above the floor', icon: <CircleCheck />, tone: 'success', active: status === 'ok', onClick: () => toggle('ok') },
          { label: 'Switched off', value: count('off'), hint: 'Kept but not evaluated', icon: <BellOff />, active: status === 'off', onClick: () => toggle('off') },
        ]} />
        <FilterBar count={rows.length} total={thresholds.length} noun="rules" onClear={status || metric ? () => { setStatus(''); setMetric(''); } : undefined}>
          <ChipGroup label="Metric" value={metric} onChange={setMetric} options={[{ value: '', label: 'All metrics' }, ...(Object.keys(OEE_METRIC_LABEL) as (keyof typeof OEE_METRIC_LABEL)[]).map((m) => ({ value: m as string, label: OEE_METRIC_LABEL[m], count: thresholds.filter((r) => r.metric === m).length }))]} />
        </FilterBar>
      </div>
      <Card><DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={setEditing} emptyTitle="No alert rules" emptyDescription="Add one to get told when a metric drops." /></Card>
      <p className="mt-3 flex items-center gap-2 px-1 text-xs text-muted"><BellRing className="size-3.5" />{alerts.length} firing now. Breaches appear as a flag on the Control Tower and in the notified role's inbox.</p>
      <ThresholdDialog rule={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete ${removing?.name}?`} description="The role stops hearing about this metric." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'thresholds/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
