import * as React from 'react';
import { CircleCheck, GitBranch, OctagonX, Plus, Zap } from 'lucide-react';
import type { LossClass, MachineState } from '@oee/types';
import { LOSS_CLASSES, LOSS_CLASS_LABEL } from '@oee/types';
import { Button, Card, DataTable, PageHeader, type Column } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { AndonLevelBadge, LossClassBadge } from '../../components/badges';
import { ChipGroup, FilterBar, SearchFilter, SummaryCards } from '../../components/FilterBar';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { RowActions } from '../../components/master/RowActions';
import { StateDialog, emptyState } from '../../components/master/StateDialog';

export function StatesPage() {
  const { states, machines, dispatch } = useScoped();
  const [editing, setEditing] = React.useState<MachineState | null>(null);
  const [removing, setRemoving] = React.useState<MachineState | null>(null);
  const [impact, setImpact] = React.useState<LossClass | ''>('');
  const [q, setQ] = React.useState('');
  const inUse = (s: MachineState) => machines.filter((m) => m.stateCode === s.code).length;
  const count = (c: LossClass) => states.filter((s) => s.lossClass === c).length;
  const needle = q.trim().toLowerCase();
  const rows = states.filter((s) => (!impact || s.lossClass === impact) && (!needle || `${s.code} ${s.name} ${s.description}`.toLowerCase().includes(needle)));
  const columns: Column<MachineState>[] = [
    { key: 'code', header: 'Code', sortValue: (s) => s.code, cell: (s) => <span className="font-mono text-xs font-semibold">{s.code}</span> },
    { key: 'name', header: 'State', sortValue: (s) => s.name, cell: (s) => <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted">{s.description}</p></div> },
    { key: 'loss', header: 'OEE impact', sortValue: (s) => s.lossClass, cell: (s) => <LossClassBadge lossClass={s.lossClass} /> },
    { key: 'andon', header: 'Andon light', cell: (s) => <AndonLevelBadge level={s.andonLevel} /> },
    { key: 'output', header: 'Output', className: 'tabular-nums', cell: (s) => `${Math.round(s.outputFactor * 100)}%` },
    { key: 'use', header: 'Machines now', className: 'tabular-nums', sortValue: inUse, cell: inUse },
    { key: 'actions', header: '', cell: (s) => <RowActions name={s.name} onEdit={() => setEditing(s)} onDelete={() => setRemoving(s)} /> },
  ];
  return (
    <div>
      <PageHeader title="Machine States" description="The state engine sits between raw PLC tags and OEE. Machine state and downtime reason stay separate: a stop says the machine stands still, the reason says why." actions={<Button onClick={() => setEditing(emptyState())}><Plus />Add state</Button>} />
      <div className="mb-4 space-y-4">
        <SummaryCards items={[
          { label: 'Machine states', value: states.length, hint: `${states.filter((s) => inUse(s) > 0).length} in use right now`, icon: <GitBranch />, tone: 'ink' },
          { label: 'Productive', value: count('PRODUCTIVE'), hint: 'Output counts at full rate', icon: <CircleCheck />, tone: 'success', active: impact === 'PRODUCTIVE', onClick: () => setImpact(impact === 'PRODUCTIVE' ? '' : 'PRODUCTIVE') },
          { label: 'Availability loss', value: count('AVAILABILITY'), hint: 'Stops that cut run time', icon: <OctagonX />, tone: 'danger', active: impact === 'AVAILABILITY', onClick: () => setImpact(impact === 'AVAILABILITY' ? '' : 'AVAILABILITY') },
          { label: 'Performance loss', value: count('PERFORMANCE'), hint: 'Slow running and minor stops', icon: <Zap />, tone: 'warning', active: impact === 'PERFORMANCE', onClick: () => setImpact(impact === 'PERFORMANCE' ? '' : 'PERFORMANCE') },
        ]} />
        <FilterBar count={rows.length} total={states.length} noun="states" onClear={impact || q ? () => { setImpact(''); setQ(''); } : undefined}>
          <SearchFilter value={q} onChange={setQ} placeholder="Search code or state" />
          <ChipGroup label="OEE impact" value={impact} onChange={setImpact} options={[{ value: '', label: 'All' }, ...LOSS_CLASSES.map((c) => ({ value: c, label: LOSS_CLASS_LABEL[c], count: count(c) }))]} />
        </FilterBar>
      </div>
      <Card><DataTable columns={columns} rows={rows} rowKey={(s) => s.id} onRowClick={setEditing} pageSize={14} /></Card>
      <StateDialog state={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete ${removing?.name}?`} description="Spans recorded in this state stop counting toward planned production time." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'states/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
