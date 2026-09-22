import * as React from 'react';
import { Plus, ScanSearch, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import type { DefectReason, RejectEntry } from '@oee/types';
import { fmtClock, fmtInt, fmtPct } from '@oee/fixtures';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Combobox, DataTable, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, FormField, PageHeader, StatCard, type Column } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { DefectDialog, emptyDefect } from '../../components/master/DefectDialog';
import { RowActions } from '../../components/master/RowActions';
import { ChipGroup, FilterBar, FilterPill } from '../../components/FilterBar';
import { RejectPad } from '../../components/RejectPad';

export function QualityPage() {
  const { rejects, defects, defectById, machines, machineById, personById, plantOee, oeeByMachine, dispatch } = useScoped();
  const [machine, setMachine] = React.useState('');
  const [defect, setDefect] = React.useState('');
  const [disposition, setDisposition] = React.useState<'' | 'SCRAP' | 'REWORK'>('');
  const [logging, setLogging] = React.useState(false);
  const [logMachine, setLogMachine] = React.useState(machines[0]?.id ?? '');
  const [editing, setEditing] = React.useState<DefectReason | null>(null);
  const [removing, setRemoving] = React.useState<DefectReason | null>(null);

  const scoped = rejects.filter((r) => (!machine || r.machineId === machine) && (!disposition || defectById.get(r.defectId)?.disposition === disposition));
  const rows = scoped.filter((r) => !defect || r.defectId === defect).sort((a, b) => b.at - a.at);
  const logged = scoped.reduce((a, r) => a + r.qty, 0);
  const quality = machine ? oeeByMachine.get(machine) : plantOee;

  // Pareto by defect: bars ranked by count with the running share, and a line where the vital few end.
  const pareto = React.useMemo(() => {
    const byDefect = new Map<string, number>();
    for (const r of scoped) byDefect.set(r.defectId, (byDefect.get(r.defectId) ?? 0) + r.qty);
    let running = 0;
    return [...byDefect].sort((a, b) => b[1] - a[1]).map(([id, qty]) => ({ id, qty, cumulative: (running += qty) / Math.max(1, logged) }));
  }, [scoped, logged]);
  const cutoff = pareto.findIndex((p) => p.cumulative >= 0.8);

  const columns: Column<RejectEntry>[] = [
    { key: 'at', header: 'Time', sortValue: (r) => r.at, cell: (r) => <span className="font-mono text-xs">{fmtClock(r.at)}</span> },
    { key: 'machine', header: 'Machine', sortValue: (r) => machineById.get(r.machineId)?.tag ?? '', cell: (r) => <span className="font-semibold">{machineById.get(r.machineId)?.tag} · {machineById.get(r.machineId)?.name}</span> },
    { key: 'defect', header: 'Defect', sortValue: (r) => defectById.get(r.defectId)?.name ?? '', cell: (r) => <div><p>{defectById.get(r.defectId)?.name}</p><p className="text-xs text-muted">{defectById.get(r.defectId)?.category}</p></div> },
    { key: 'qty', header: 'Qty', className: 'tabular-nums font-semibold', sortValue: (r) => r.qty, cell: (r) => r.qty },
    { key: 'by', header: 'Logged by', cell: (r) => personById.get(r.byId ?? '')?.role ?? 'Line tablet' },
    { key: 'undo', header: '', cell: (r) => <div className="flex justify-end"><Button variant="ghost" size="icon" className="size-8 text-accent" aria-label="Remove entry" onClick={() => dispatch({ type: 'rejects/remove', id: r.id })}><Trash2 /></Button></div> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Quality" description="Inline inspection rejects come from the machine. Rejects found by hand get logged here or on the line tablet, and Quality moves the moment they are." className="mb-2"
        actions={<Button onClick={() => setLogging(true)}><Plus />Log rejects</Button>} />
      <FilterBar count={rows.length} total={rejects.length} noun="entries" onClear={machine || defect || disposition ? () => { setMachine(''); setDefect(''); setDisposition(''); } : undefined}>
        <FilterPill><Combobox variant="inline" label="Machine" value={machine} onChange={(id) => { setMachine(id); setDefect(''); }} placeholder="All machines" options={[{ value: '', label: 'All machines' }, ...machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: m.code }))]} /></FilterPill>
        <ChipGroup label="Disposition" value={disposition} onChange={setDisposition} options={[{ value: '', label: 'Scrap and rework' }, { value: 'SCRAP', label: 'Scrap' }, { value: 'REWORK', label: 'Rework' }]} />
      </FilterBar>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Quality" value={fmtPct(quality?.quality ?? 0)} hint="Good ÷ total, shift so far" icon={<ShieldCheck />} tone="ink" />
        <StatCard label="Rejected" value={fmtInt((quality?.total ?? 0) - (quality?.good ?? 0))} hint={`of ${fmtInt(quality?.total ?? 0)} pcs`} icon={<ShieldAlert />} tone="danger" />
        <StatCard label="Logged by hand" value={fmtInt(logged)} hint={`${scoped.length} entries`} icon={<ScanSearch />} tone="info" />
        <StatCard label="Top defect" value={defectById.get(pareto[0]?.id ?? '')?.name ?? 'None'} hint={pareto[0] ? `${pareto[0].qty} pcs · ${fmtPct(pareto[0].cumulative, 0)} of logged` : undefined} icon={<ShieldAlert />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Defect Pareto</CardTitle><CardDescription>Logged rejects, ranked. The defects above the line make up 80%. Click one to filter the entries.</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            {pareto.map((p, i) => (
              <React.Fragment key={p.id}>
                <button type="button" aria-pressed={defect === p.id} onClick={() => setDefect(defect === p.id ? '' : p.id)} className="block w-full rounded-2xl p-2.5 text-left hover:bg-surface-2 aria-pressed:bg-surface-2">
                  <span className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate font-semibold">{defectById.get(p.id)?.name}</span><span className="shrink-0 tabular-nums"><span className="font-bold">{p.qty} pcs</span><span className="ml-2 inline-block w-20 text-right text-xs text-muted">cum. {fmtPct(p.cumulative, 0)}</span></span></span>
                  <span className="mt-1.5 block h-2 rounded-full bg-surface"><span className="block h-full rounded-full bg-loss-q" style={{ width: `${(p.qty / (pareto[0]?.qty ?? 1)) * 100}%` }} /></span>
                </button>
                {i === cutoff && i < pareto.length - 1 ? <p className="flex items-center gap-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-border" />80% of rejects above<span className="h-px flex-1 bg-border" /></p> : null}
              </React.Fragment>
            ))}
            {pareto.length === 0 ? <p className="py-8 text-center text-sm text-muted">No rejects logged for this machine.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Defect reasons</CardTitle><CardDescription>Master data behind the tablet tiles.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setEditing(emptyDefect())}><Plus />Add</Button></CardHeader>
          <CardContent className="space-y-1.5">
            {defects.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate font-medium">{d.name}</span><span className="text-xs text-muted">{d.category}</span><RowActions name={d.name} onEdit={() => setEditing(d)} onDelete={() => setRemoving(d)} /></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card><DataTable columns={columns} rows={rows} rowKey={(r) => r.id} initialSort={{ key: 'at', dir: 'desc' }} pageSize={8} emptyTitle="No entries" emptyDescription="Log rejects from here or from the line tablet." /></Card>

      <Dialog open={logging} onOpenChange={setLogging}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Log rejects</DialogTitle><DialogDescription>The same pad runs on the line tablet.</DialogDescription></DialogHeader>
          <FormField label="Machine" className="mb-4"><Combobox label="Machine" value={logMachine} onChange={setLogMachine} options={machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: m.code }))} /></FormField>
          {machineById.get(logMachine) ? <RejectPad machine={machineById.get(logMachine)!} onLogged={() => setLogging(false)} /> : null}
        </DialogContent>
      </Dialog>
      <DefectDialog defect={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete ${removing?.name}?`} description="Reject entries logged with this defect go with it." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'defects/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
