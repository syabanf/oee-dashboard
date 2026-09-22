import * as React from 'react';
import { Link } from 'react-router';
import { Building2, ClipboardList, ListTree, Plus, Timer, TriangleAlert } from 'lucide-react';
import type { DowntimeReason } from '@oee/types';
import { Badge, Button, Card, Combobox, DataTable, PageHeader, type Column } from '@oee/ui';
import { ChipGroup, FilterBar, FilterPill, SearchFilter, SummaryCards } from '../../components/FilterBar';
import { useScoped } from '../../state/app-state';
import { LossClassBadge } from '../../components/badges';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { ReasonDialog, emptyReason } from '../../components/master/ReasonDialog';
import { RowActions } from '../../components/master/RowActions';

export function ReasonsPage() {
  const { reasons, departments, departmentById, events, dispatch } = useScoped();
  const classified = events.filter((e) => e.l1);
  const otherShare = classified.length ? classified.filter((e) => e.l1 === 'Other').length / classified.length : 0;
  const [q, setQ] = React.useState('');
  const [l1, setL1] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [workOrder, setWorkOrder] = React.useState(false);
  const [editing, setEditing] = React.useState<DowntimeReason | null>(null);
  const [removing, setRemoving] = React.useState<DowntimeReason | null>(null);
  const categories = [...new Set(reasons.map((r) => r.l1))];
  const needle = q.trim().toLowerCase();
  const rows = reasons.filter((r) => (!l1 || r.l1 === l1) && (!owner || r.ownerDepartmentId === owner) && (!workOrder || r.createsWorkOrder) && (!needle || `${r.l1} ${r.l2} ${r.l3}`.toLowerCase().includes(needle)));
  const owners = departments.filter((d) => reasons.some((r) => r.ownerDepartmentId === d.id));
  const columns: Column<DowntimeReason>[] = [
    { key: 'l1', header: 'L1', sortValue: (r) => r.l1, cell: (r) => <span className="font-semibold">{r.l1}</span> },
    { key: 'l2', header: 'L2', sortValue: (r) => r.l2, cell: (r) => r.l2 },
    { key: 'l3', header: 'L3', sortValue: (r) => r.l3, cell: (r) => r.l3 },
    { key: 'owner', header: 'Owner', sortValue: (r) => departmentById.get(r.ownerDepartmentId)?.name ?? '', cell: (r) => departmentById.get(r.ownerDepartmentId)?.name },
    { key: 'sla', header: 'SLA', className: 'tabular-nums', sortValue: (r) => r.slaMin, cell: (r) => `${r.slaMin} min` },
    { key: 'loss', header: 'OEE classification', cell: (r) => <LossClassBadge lossClass={r.lossClass} /> },
    { key: 'cmms', header: 'CMMS', cell: (r) => (r.createsWorkOrder ? <Badge variant="info">Work order</Badge> : <span className="text-muted">No</span>) },
    { key: 'actions', header: '', cell: (r) => <RowActions name={r.l3} onEdit={() => setEditing(r)} onDelete={() => setRemoving(r)} /> },
  ];
  return (
    <div>
      <PageHeader title="Downtime Reasons" description="Keep level 1 short so operators never reach for Other. Each reason knows its owner, SLA, OEE class and whether it opens a work order."
        actions={<><Button onClick={() => setEditing(emptyReason(departments.find((d) => d.kind === 'SUPPORT')?.id ?? ''))}><Plus />Add reason</Button></>} />
      {otherShare > 0.1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card bg-warning-soft px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-warning"><TriangleAlert className="size-4" /></span>
          <p className="min-w-[12rem] flex-1 text-sm"><span className="font-semibold">“Other” covers {Math.round(otherShare * 100)}% of classified events.</span> <span className="text-body/70">Above 10% the tree is missing a reason operators need.</span></p>
          <Button asChild size="sm" variant="secondary"><Link to="/events?tab=reason">Review them</Link></Button>
        </div>
      ) : null}
      <div className="mb-4 space-y-4">
        <SummaryCards items={[
          { label: 'Reasons in view', value: rows.length, hint: `${new Set(rows.map((r) => r.l1)).size} categories, ${new Set(rows.map((r) => `${r.l1}/${r.l2}`)).size} groups`, icon: <ListTree />, tone: 'ink' },
          { label: 'Owner departments', value: new Set(rows.map((r) => r.ownerDepartmentId)).size, hint: 'Who gets the Andon call', icon: <Building2 />, tone: 'info' },
          { label: 'Open a work order', value: rows.filter((r) => r.createsWorkOrder).length, hint: 'Click to show only these', icon: <ClipboardList />, tone: 'warning', active: workOrder, onClick: () => setWorkOrder((v) => !v) },
          { label: 'Average response SLA', value: `${(rows.reduce((a, r) => a + r.slaMin, 0) / Math.max(1, rows.length)).toFixed(1)} min`, hint: `Tightest ${rows.length ? Math.min(...rows.map((r) => r.slaMin)) : 0} min`, icon: <Timer />, tone: 'success' },
        ]} />
        <FilterBar count={rows.length} total={reasons.length} noun="reasons" onClear={q || l1 || owner || workOrder ? () => { setQ(''); setL1(''); setOwner(''); setWorkOrder(false); } : undefined}>
          <SearchFilter value={q} onChange={setQ} placeholder="Search reasons" />
          <FilterPill><Combobox variant="inline" label="Owner" searchable={false} value={owner} onChange={setOwner} placeholder="All owners" options={[{ value: '', label: 'All owners' }, ...owners.map((d) => ({ value: d.id, label: d.name }))]} /></FilterPill>
          <ChipGroup label="Category" value={l1} onChange={setL1} options={[{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c, label: c, count: reasons.filter((r) => r.l1 === c).length }))]} />
        </FilterBar>
      </div>
      <Card><DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={setEditing} pageSize={12} emptyTitle="No reasons match" emptyDescription="Clear the filter or add a reason." /></Card>
      <ReasonDialog reason={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete ${removing?.l3}?`} description="Its 30-day loss history leaves the loss tree. Past events keep their category." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'reasons/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
