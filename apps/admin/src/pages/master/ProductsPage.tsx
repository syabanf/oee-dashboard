import * as React from 'react';
import { Plus } from 'lucide-react';
import type { CycleTime } from '@oee/types';
import { fmtIdr } from '@oee/fixtures';
import { Badge, Button, Card, Combobox, DataTable, PageHeader, SplitStats, type Column } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { CycleTimeDialog, emptyCycleTime } from '../../components/master/CycleTimeDialog';
import { RowActions } from '../../components/master/RowActions';
import { ChipGroup, FilterBar, FilterPill } from '../../components/FilterBar';

export function ProductsPage() {
  const { products, cycleTimes, machines, machineById, productById, dispatch } = useScoped();
  const [machine, setMachine] = React.useState('');
  const [product, setProduct] = React.useState('');
  const [editing, setEditing] = React.useState<CycleTime | null>(null);
  const [removing, setRemoving] = React.useState<CycleTime | null>(null);
  const rows = cycleTimes.filter((c) => (!machine || c.machineId === machine) && (!product || (product === 'running' ? machineById.get(c.machineId)?.productId === c.productId : c.productId === product)));
  const running = (c: CycleTime) => machineById.get(c.machineId)?.productId === c.productId;
  const columns: Column<CycleTime>[] = [
    { key: 'machine', header: 'Machine', sortValue: (c) => machineById.get(c.machineId)?.tag ?? '', cell: (c) => { const m = machineById.get(c.machineId); return <span className="font-semibold">{m?.tag} · {m?.name}</span>; } },
    { key: 'product', header: 'Product', sortValue: (c) => productById.get(c.productId)?.name ?? '', cell: (c) => <div><p>{productById.get(c.productId)?.name}</p><p className="font-mono text-xs text-muted">{productById.get(c.productId)?.sku}</p></div> },
    { key: 'cycle', header: 'Ideal cycle', className: 'tabular-nums', sortValue: (c) => c.idealCycleSec, cell: (c) => `${c.idealCycleSec.toFixed(1)} sec` },
    { key: 'rate', header: 'Ideal run rate', className: 'tabular-nums', cell: (c) => `${(60 / c.idealCycleSec).toFixed(1)} pcs/min` },
    { key: 'running', header: 'Today', cell: (c) => (running(c) ? <Badge variant="success" dot>Running</Badge> : null) },
    { key: 'actions', header: '', cell: (c) => <RowActions name="cycle time" onEdit={() => setEditing(c)} onDelete={() => setRemoving(c)} /> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Products & Cycle Times" description="Performance compares output with the ideal cycle for the product on the machine, never with one number per machine." className="mb-2" actions={<Button onClick={() => setEditing(emptyCycleTime())}><Plus />Add cycle time</Button>} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {products.map((p) => (
          <Card key={p.id} className="flex flex-col p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{p.category}</p>
            <p className="mt-0.5 text-base font-semibold">{p.name}</p>
            <p className="mb-4 font-mono text-xs text-muted">{p.sku}</p>
            <SplitStats items={[{ label: 'Machines', value: cycleTimes.filter((c) => c.productId === p.id).length }, { label: 'Value per pcs', value: fmtIdr(p.valuePerPcs) }]} />
          </Card>
        ))}
      </div>
      <FilterBar count={rows.length} total={cycleTimes.length} noun="cycle times" onClear={machine || product ? () => { setMachine(''); setProduct(''); } : undefined}>
        <FilterPill><Combobox variant="inline" label="Machine" value={machine} onChange={setMachine} placeholder="All machines" options={[{ value: '', label: 'All machines' }, ...machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: m.code }))]} /></FilterPill>
        <ChipGroup label="Product" value={product} onChange={setProduct} options={[{ value: '', label: 'All products' }, { value: 'running', label: 'Running today' }, ...products.map((p) => ({ value: p.id, label: p.name }))]} />
      </FilterBar>
      <Card><DataTable columns={columns} rows={rows} rowKey={(c) => c.id} onRowClick={setEditing} pageSize={12} emptyTitle="No cycle times" emptyDescription="Add one for this machine." /></Card>
      <CycleTimeDialog cycleTime={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title="Delete this cycle time?" description="Performance for this machine and product falls back to the machine's own ideal cycle." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'cycleTimes/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
