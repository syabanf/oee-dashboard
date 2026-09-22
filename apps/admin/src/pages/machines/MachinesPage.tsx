import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Cog, Gauge, OctagonX, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import type { Machine } from '@oee/types';
import { aggregateOee, fmtPct } from '@oee/fixtures';
import { Button, Card, Combobox, DataTable, PageHeader, type Column } from '@oee/ui';
import { ChipGroup, FilterBar, FilterPill, SearchFilter, SummaryCards } from '../../components/FilterBar';
import { useScoped } from '../../state/app-state';
import { StateBadge } from '../../components/badges';
import { MachineDialog, emptyMachine } from '../../components/master/MachineDialog';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { ExplainButton, useOeeExplain } from '../../components/useOeeExplain';

export function MachinesPage() {
  const { machines, lineById, stateByCode, oeeByMachine, lines, products, dispatch } = useScoped();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [editing, setEditing] = React.useState<Machine | null>(null);
  const [removing, setRemoving] = React.useState<Machine | null>(null);
  const [line, setLine] = React.useState('');
  const [status, setStatus] = React.useState<'' | 'down' | 'below' | 'inactive'>('');
  const explain = useOeeExplain();

  const needle = q.trim().toLowerCase();
  const pct = (m: Machine, key: 'oee' | 'availability' | 'performance' | 'quality') => oeeByMachine.get(m.id)?.[key] ?? 0;
  const isDown = (m: Machine) => m.active && stateByCode.get(m.stateCode)?.andonLevel === 'STOP';
  const isBelow = (m: Machine) => m.active && pct(m, 'oee') * 100 < m.targetOee;
  const matches: Record<typeof status, (m: Machine) => boolean> = { '': () => true, down: isDown, below: isBelow, inactive: (m) => !m.active };
  const searched = machines.filter((m) => (!line || m.lineId === line) && (!needle || `${m.tag} ${m.name} ${m.code} ${m.cmmsAssetId} ${lineById.get(m.lineId)?.name}`.toLowerCase().includes(needle)));
  const rows = searched.filter(matches[status]);
  const scopeOee = aggregateOee(rows.flatMap((m) => oeeByMachine.get(m.id) ?? []));
  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true });

  const columns: Column<Machine>[] = [
    { key: 'machine', header: 'Machine', sortValue: (m) => m.tag, cell: (m) => <div><p className="font-semibold">{m.tag} · {m.name}</p><p className="font-mono text-xs text-muted">{m.code}</p></div> },
    { key: 'line', header: 'Line', sortValue: (m) => lineById.get(m.lineId)?.name ?? '', cell: (m) => lineById.get(m.lineId)?.name },
    { key: 'state', header: 'State', cell: (m) => (m.active ? <StateBadge state={stateByCode.get(m.stateCode)} /> : <StateBadge state={stateByCode.get('OFF')} />) },
    { key: 'oee', header: 'OEE', sortValue: (m) => pct(m, 'oee'), cell: (m) => <ExplainButton onClick={() => explain(m.name, [m.id])} className={pct(m, 'oee') * 100 < m.targetOee - 10 ? 'font-bold tabular-nums text-accent' : 'font-bold tabular-nums'}>{fmtPct(pct(m, 'oee'))}</ExplainButton> },
    { key: 'a', header: 'A', sortValue: (m) => pct(m, 'availability'), className: 'tabular-nums', cell: (m) => fmtPct(pct(m, 'availability')) },
    { key: 'p', header: 'P', sortValue: (m) => pct(m, 'performance'), className: 'tabular-nums', cell: (m) => fmtPct(pct(m, 'performance')) },
    { key: 'q', header: 'Q', sortValue: (m) => pct(m, 'quality'), className: 'tabular-nums', cell: (m) => fmtPct(pct(m, 'quality')) },
    { key: 'asset', header: 'CMMS asset', cell: (m) => <span className="font-mono text-xs">{m.cmmsAssetId}</span> },
    {
      key: 'actions', header: '', cell: (m) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${m.name}`} onClick={() => setEditing(m)}><Pencil /></Button>
          <Button variant="ghost" size="icon" className="size-8 text-accent" aria-label={`Delete ${m.name}`} onClick={() => setRemoving(m)}><Trash2 /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Machines" description="Master machine with live OEE for the current shift. The machine code is the canonical id every other system maps to."
        actions={<>
          <Button onClick={() => setEditing(emptyMachine(lines[0]?.id ?? '', products[0]?.id ?? ''))}><Plus />Add machine</Button>
        </>} />
      <div className="mb-4 space-y-4">
        <SummaryCards items={[
          { label: 'Machines in view', value: rows.length, hint: `${rows.filter((m) => m.active).length} active`, icon: <Cog />, tone: 'ink' },
          { label: 'OEE of this selection', value: fmtPct(scopeOee.oee), hint: `A ${fmtPct(scopeOee.availability, 0)} · P ${fmtPct(scopeOee.performance, 0)} · Q ${fmtPct(scopeOee.quality, 0)}`, icon: <Gauge />, tone: 'info' },
          { label: 'Below target', value: searched.filter(isBelow).length, hint: 'Click to show only these', icon: <Target />, tone: 'warning', active: status === 'below', onClick: () => setStatus(status === 'below' ? '' : 'below') },
          { label: 'Down now', value: searched.filter(isDown).length, hint: 'Stop or machine fault', icon: <OctagonX />, tone: 'danger', active: status === 'down', onClick: () => setStatus(status === 'down' ? '' : 'down') },
        ]} />
        <FilterBar count={rows.length} total={machines.length} noun="machines" onClear={q || line || status ? () => { setQuery(''); setLine(''); setStatus(''); } : undefined}>
          <SearchFilter value={q} onChange={setQuery} placeholder="Search tag, name, asset id" />
          <FilterPill><Combobox variant="inline" label="Line" searchable={false} value={line} onChange={setLine} placeholder="All lines" options={[{ value: '', label: 'All lines' }, ...lines.map((l) => ({ value: l.id, label: l.name }))]} /></FilterPill>
          <ChipGroup label="Status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, { value: 'down', label: 'Down' }, { value: 'below', label: 'Below target' }, { value: 'inactive', label: 'Inactive' }]} />
        </FilterBar>
      </div>
      <Card><DataTable columns={columns} rows={rows} rowKey={(m) => m.id} onRowClick={(m) => navigate(`/machines/${m.id}`)} initialSort={{ key: 'oee', dir: 'asc' }} pageSize={12} emptyTitle="No machines match" emptyDescription="Clear the filter or add a machine." /></Card>
      <MachineDialog machine={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete ${removing?.name}?`} description="Its state history, Andon events, cycle times and integration mappings go with it." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'machines/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
