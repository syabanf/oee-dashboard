import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleCheck, Monitor, OctagonX, TriangleAlert, Wrench } from 'lucide-react';
import type { AndonLevel } from '@oee/types';
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@oee/ui';
import { aggregateOee, fmtPct } from '@oee/fixtures';
import { useScoped } from '../../state/app-state';
import { AndonLegend } from '../../components/badges';
import { ChipGroup, FilterBar, SummaryCards } from '../../components/FilterBar';
import { ExplainButton, useOeeExplain } from '../../components/useOeeExplain';
import { MachineTile } from '../../components/MachineTile';
import { useOpenEvent } from '../../components/useOpenEvent';

export function AndonBoardPage() {
  const { lines, machines: allMachines, machinesByLine, oeeByMachine, openEventByMachine, openEvents, stateByCode, departmentById } = useScoped();
  const [line, setLine] = React.useState('');
  const [level, setLevel] = React.useState<'' | 'RUNNING' | 'WATCH' | 'STOP'>('');
  const navigate = useNavigate();
  const openEvent = useOpenEvent();
  const explain = useOeeExplain();
  // Three buckets a supervisor acts on: fine, needs watching, down.
  const bucketOf = (l: AndonLevel | undefined) => (l === 'RUNNING' ? 'RUNNING' : l === 'STOP' ? 'STOP' : 'WATCH');
  const active = allMachines.filter((m) => m.active && (!line || m.lineId === line));
  const inBucket = (b: string) => active.filter((m) => bucketOf(stateByCode.get(m.stateCode)?.andonLevel) === b);
  const shown = active.filter((m) => !level || bucketOf(stateByCode.get(m.stateCode)?.andonLevel) === level);
  const toggle = (b: typeof level) => setLevel(level === b ? '' : b);
  return (
    <div className="space-y-4">
      <PageHeader title="Andon Board" description="Green alone says nothing. Each tile carries the state, the cause and the running clock." className="mb-2"
        actions={<Button asChild variant="secondary"><Link to="/board"><Monitor />TV mode</Link></Button>} />
      <SummaryCards items={[
        { label: 'Running', value: inBucket('RUNNING').length, hint: `of ${active.length} machines`, icon: <CircleCheck />, tone: 'success', active: level === 'RUNNING', onClick: () => toggle('RUNNING') },
        { label: 'Needs watching', value: inBucket('WATCH').length, hint: 'Warning, attention or assistance', icon: <TriangleAlert />, tone: 'warning', active: level === 'WATCH', onClick: () => toggle('WATCH') },
        { label: 'Stopped', value: inBucket('STOP').length, hint: 'Stop or machine fault', icon: <OctagonX />, tone: 'danger', active: level === 'STOP', onClick: () => toggle('STOP') },
        { label: 'Open Andon calls', value: openEvents.filter((e) => active.some((m) => m.id === e.machineId)).length, hint: `${openEvents.filter((e) => e.assigneeId && active.some((m) => m.id === e.machineId)).length} have an owner`, icon: <Wrench />, tone: 'ink' },
      ]} />
      <FilterBar count={shown.length} total={active.length} noun="machines" onClear={line || level ? () => { setLine(''); setLevel(''); } : undefined}>
        <ChipGroup label="Line" value={line} onChange={setLine} options={[{ value: '', label: 'All lines' }, ...lines.map((l) => ({ value: l.id, label: l.name }))]} />
      </FilterBar>
      <AndonLegend className="px-1" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {lines.filter((l) => !line || l.id === line).map((line) => {
          const machines = (machinesByLine.get(line.id) ?? []).filter((m) => m.active);
          const visible = machines.filter((m) => shown.includes(m));
          const oee = aggregateOee(machines.flatMap((m) => oeeByMachine.get(m.id) ?? []));
          return (
            <Card key={line.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{line.code} · {departmentById.get(line.departmentId)?.name}</p><CardTitle className="mt-0.5"><Link to={`/oee?line=${line.id}`} className="hover:underline">{line.name}</Link></CardTitle></div>
                <p className="text-right"><ExplainButton onClick={() => explain(line.name, machines.map((m) => m.id))} className="block text-xl font-bold tabular-nums leading-none">{fmtPct(oee.oee)}</ExplainButton><span className="text-[11px] text-muted">line OEE</span></p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {visible.length === 0 ? <p className="col-span-2 py-6 text-center text-sm text-muted">No machine on this line matches.</p> : null}
                {visible.map((m) => <MachineTile key={m.id} machine={m} onSelect={(machine) => { const e = openEventByMachine.get(machine.id); if (e) openEvent(e.id); else navigate(`/machines/${machine.id}`); }} />)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
