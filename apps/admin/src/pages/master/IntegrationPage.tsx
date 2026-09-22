import * as React from 'react';
import { Plus } from 'lucide-react';
import type { IntegrationMapping } from '@oee/types';
import { INTEGRATION_SOURCES } from '@oee/types';
import { Badge, Button, Card, DataTable, PageHeader, StatCard, type Column } from '@oee/ui';
import { ChipGroup, FilterBar, SearchFilter } from '../../components/FilterBar';
import { Cable, Cpu, Factory, Wrench } from 'lucide-react';
import { useScoped } from '../../state/app-state';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { MappingDialog, emptyMapping } from '../../components/master/MappingDialog';
import { RowActions } from '../../components/master/RowActions';

export function IntegrationPage() {
  const { mappings, machines, machineById, dispatch } = useScoped();
  const [q, setQ] = React.useState('');
  const [source, setSource] = React.useState('');
  const [editing, setEditing] = React.useState<IntegrationMapping | null>(null);
  const [removing, setRemoving] = React.useState<IntegrationMapping | null>(null);
  const needle = q.trim().toLowerCase();
  const rows = mappings.filter((m) => (!source || m.source === source) && (!needle || `${machineById.get(m.machineId)?.code} ${machineById.get(m.machineId)?.name} ${m.externalId}`.toLowerCase().includes(needle)));
  const count = (s: string) => mappings.filter((m) => m.source === s).length;
  const columns: Column<IntegrationMapping>[] = [
    { key: 'internal', header: 'Internal ID', sortValue: (m) => machineById.get(m.machineId)?.code ?? '', cell: (m) => <div><p className="font-mono text-xs font-semibold">{machineById.get(m.machineId)?.code}</p><p className="text-xs text-muted">{machineById.get(m.machineId)?.name}</p></div> },
    { key: 'source', header: 'Source', sortValue: (m) => m.source, cell: (m) => <Badge variant="outline">{m.source}</Badge> },
    { key: 'external', header: 'External ID', sortValue: (m) => m.externalId, cell: (m) => <span className="font-mono text-xs">{m.externalId}</span> },
    { key: 'actions', header: '', cell: (m) => <RowActions name={m.externalId} onEdit={() => setEditing(m)} onDelete={() => setRemoving(m)} /> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Integration Mapping" description="One canonical machine id, many external ids. PLC, SCADA, MES and CMMS all resolve to the same record." className="mb-2"
        actions={<><Button onClick={() => setEditing(emptyMapping())}><Plus />Add mapping</Button></>} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="PLC tags" value={count('PLC')} hint={`${machines.length} machines`} icon={<Cpu />} tone="ink" />
        <StatCard label="SCADA tags" value={count('SCADA')} hint="Data acquisition" icon={<Cable />} />
        <StatCard label="MES machines" value={count('MES')} hint="Production orders" icon={<Factory />} tone="info" />
        <StatCard label="CMMS assets" value={count('CMMS')} hint="Work orders" icon={<Wrench />} tone="warning" />
      </div>
      <FilterBar count={rows.length} total={mappings.length} noun="mappings" onClear={q || source ? () => { setQ(''); setSource(''); } : undefined}>
        <SearchFilter value={q} onChange={setQ} placeholder="Search machine or external id" />
        <ChipGroup label="Source" value={source} onChange={setSource} options={[{ value: '', label: 'All sources' }, ...INTEGRATION_SOURCES.map((s) => ({ value: s as string, label: s, count: count(s) }))]} />
      </FilterBar>
      <Card><DataTable columns={columns} rows={rows} rowKey={(m) => m.id} onRowClick={setEditing} pageSize={12} emptyTitle="No mappings match" emptyDescription="Clear the filter or add a mapping." /></Card>
      <MappingDialog mapping={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete mapping ${removing?.externalId}?`} description="Data from this external id stops reaching the machine." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'mappings/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
