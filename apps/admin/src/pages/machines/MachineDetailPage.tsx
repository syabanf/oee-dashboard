import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Pencil, Sparkles, Tablet, Timer } from 'lucide-react';
import { fmtDuration, fmtHm, fmtInt, hourlyOee, responseKpis } from '@oee/fixtures';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, KeyValue, SplitStats } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { StateBadge } from '../../components/badges';
import { BackButton } from '../../components/BackButton';
import { ApqBars, HourlyChart, LossBreakdown, LossLegend, StateTimeline } from '../../components/charts';
import { JobCard } from '../../components/JobCard';
import { selectBucket, useOpenLoss } from '../../components/useOpenLoss';
import { ExplainButton, useOeeExplain } from '../../components/useOeeExplain';
import { EventListItem } from '../../components/EventListItem';
import { MachineDialog } from '../../components/master/MachineDialog';
import { useOpenEvent } from '../../components/useOpenEvent';

const SHIFT_MS = 8 * 3_600_000;

export function MachineDetailPage() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { machineById, lineById, departmentById, productById, stateByCode, oeeByMachine, kpi, events, history, reasonById, cycleTimes, mappings, insights, shiftStart } = useScoped();
  const [editing, setEditing] = React.useState(false);
  const explain = useOeeExplain();
  const openEvent = useOpenEvent();
  const machine = machineById.get(machineId ?? '');
  const openLoss = useOpenLoss(machine ? [machine] : []);
  const hours = React.useMemo(() => (machine ? hourlyOee([machine], kpi, shiftStart) : []), [machine, kpi, shiftStart]);
  if (!machine) return <Card><EmptyState title="Machine not found" description="It may have been deleted." action={<Button onClick={() => navigate('/machines')}>All machines</Button>} /></Card>;

  const line = lineById.get(machine.lineId);
  const oee = oeeByMachine.get(machine.id);
  const machineEvents = events.filter((e) => e.machineId === machine.id).sort((a, b) => b.startedAt - a.startedAt);
  const kpis = responseKpis(machineEvents);
  const mainCause = history.filter((h) => h.machineId === machine.id).sort((a, b) => b.minutes - a.minutes)[0];
  const insight = insights.find((i) => i.machineId === machine.id && !i.dismissed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <BackButton fallback="/machines" />
          <span className="text-muted">·</span>
          <Link to="/machines" className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-black/5 hover:text-foreground">All machines</Link>
          <span className="text-muted">·</span>
          <Link to={`/oee?line=${machine.lineId}`} className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-black/5 hover:text-foreground">{line?.name}</Link>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to={`/operator/${machine.lineId}?machine=${machine.id}`}><Tablet />Line tablet</Link></Button>
          <Button variant="outline" onClick={() => setEditing(true)}><Pencil />Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="font-mono text-xs text-muted">{machine.code}</p>
            <CardTitle className="text-2xl font-bold tracking-tight">{machine.name}</CardTitle>
            <div className="flex flex-wrap gap-2 pt-1"><StateBadge state={stateByCode.get(machine.active ? machine.stateCode : 'OFF')} /><Badge variant="outline">{machine.tag}</Badge><Badge variant="outline">{productById.get(machine.productId)?.name}</Badge></div>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <KeyValue label="Line">{line?.name} · {departmentById.get(line?.departmentId ?? '')?.name}</KeyValue>
              <KeyValue label="Type">{machine.machineType} · {machine.manufacturer}</KeyValue>
              <KeyValue label="Controller">{machine.plc} · {machine.protocol} · <span className="font-mono text-xs">{machine.ipAddress}</span></KeyValue>
              <KeyValue label="Ideal cycle">{machine.idealCycleSec} sec · rated {fmtInt(machine.ratedCapacityPerHour)} pcs/hour</KeyValue>
              <KeyValue label="CMMS asset"><span className="font-mono text-xs">{machine.cmmsAssetId}</span></KeyValue>
            </dl>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div><CardTitle>OEE this shift</CardTitle><CardDescription>Target {machine.targetOee}%</CardDescription></div>
            <p className="flex items-start gap-1 leading-none"><ExplainButton onClick={() => explain(machine.name, [machine.id])} className="text-5xl font-bold tabular-nums tracking-tight">{((oee?.oee ?? 0) * 100).toFixed(1)}</ExplainButton><span className="pt-1 text-sm font-semibold text-muted">%</span></p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            {oee ? <ApqBars result={oee} targets={{ a: machine.targetAvailability, p: machine.targetPerformance, q: machine.targetQuality }} /> : <p className="text-sm text-muted">Inactive machines have no OEE.</p>}
            <SplitStats items={[{ label: 'Good pcs', value: fmtInt(oee?.good ?? 0) }, { label: 'Rejected', value: fmtInt((oee?.total ?? 0) - (oee?.good ?? 0)) }, { label: 'Lost pcs', value: fmtInt(oee?.lostPcs ?? 0) }, { label: 'Downtime', value: fmtHm((oee?.plannedMs ?? 0) - (oee?.runMs ?? 0)) }]} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Current job</CardTitle></CardHeader>
        <CardContent><JobCard machine={machine} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Machine state, Shift 1</CardTitle><CardDescription>Built by the state engine from PLC signals. OEE reads these spans, never the raw tags.</CardDescription></CardHeader>
        <CardContent><StateTimeline spans={kpi.spansByMachine.get(machine.id) ?? []} from={shiftStart} to={shiftStart + SHIFT_MS} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hour by hour</CardTitle><CardDescription>Good pieces against the hourly target for {productById.get(machine.productId)?.name}.</CardDescription></CardHeader>
        <CardContent><HourlyChart hours={hours} /></CardContent>
      </Card>

      {insight ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-info-soft px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-info"><Sparkles className="size-4" /></span>
          <p className="min-w-[12rem] flex-1 text-sm"><span className="font-semibold">{insight.title}.</span> <span className="text-body/70">{insight.recommendation}</span></p>
          <Button asChild size="sm"><Link to="/insights">Open insight</Link></Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Where the shift went</CardTitle><LossLegend /></CardHeader>
          <CardContent className="flex flex-col gap-5">
            {oee?.buckets.length ? <LossBreakdown buckets={oee.buckets} plannedMs={oee.plannedMs} onPick={(b) => openLoss(selectBucket(b))} /> : <p className="text-sm text-muted">No losses recorded yet.</p>}
            <SplitStats items={[{ label: '30-day main cause', value: reasonById.get(mainCause?.reasonId ?? '')?.l3 ?? 'None' }, { label: 'Occurrences', value: `${mainCause?.occurrences ?? 0}x` }, { label: 'Total', value: fmtHm((mainCause?.minutes ?? 0) * 60_000) }, { label: 'Avg response', value: fmtDuration(kpis.responseMs) }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Andon events today</CardTitle><CardDescription>MTTA {fmtDuration(kpis.mttaMs)} · MTTR {fmtDuration(kpis.mttrMs)}</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {machineEvents.slice(0, 5).map((e) => <EventListItem key={e.id} event={e} onOpen={(ev) => openEvent(ev.id)} />)}
            {machineEvents.length === 0 ? <EmptyState icon={<Timer />} title="No events today" description="This machine has run without an Andon call." /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cycle time per product</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cycleTimes.filter((c) => c.machineId === machine.id).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
                <span className="min-w-0 truncate font-medium">{productById.get(c.productId)?.name}</span>
                <span className="flex items-center gap-2">{c.productId === machine.productId ? <Badge variant="success" dot>Running</Badge> : null}<span className="font-bold tabular-nums">{c.idealCycleSec.toFixed(1)} sec</span></span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Integration mapping</CardTitle><CardDescription>External ids that resolve to <span className="font-mono text-xs">{machine.code}</span></CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {mappings.filter((m) => m.machineId === machine.id).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-sm"><Badge variant="outline">{m.source}</Badge><span className="truncate font-mono text-xs">{m.externalId}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <MachineDialog machine={editing ? machine : null} onClose={() => setEditing(false)} />
    </div>
  );
}
