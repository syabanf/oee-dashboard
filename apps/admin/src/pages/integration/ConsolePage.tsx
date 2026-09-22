import * as React from 'react';
import { ArrowDownLeft, ArrowUpRight, Cable, ClipboardList, MessageSquare, Send } from 'lucide-react';
import type { IntegrationMessage, WorkOrder, WorkOrderStatus } from '@oee/types';
import { WORK_ORDER_STATUS_LABEL } from '@oee/types';
import { SAMPLE_PAYLOAD, gatewayMessage, parseStatePayload } from '@oee/integration';
import { fmtClock, notificationsFor } from '@oee/fixtures';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, EmptyState, PageHeader, StatCard, Textarea, cn, type BadgeProps, type Column } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ChipGroup, FilterBar, SearchFilter } from '../../components/FilterBar';
import { useOpenEvent } from '../../components/useOpenEvent';

const WO_VARIANT: Record<WorkOrderStatus, NonNullable<BadgeProps['variant']>> = { OPEN: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success', CLOSED: 'muted' };
const TABS = ['Work orders', 'Message log', 'Payload console'] as const;

export function ConsolePage() {
  const { workOrders, messages, mappings, states, events, rules, machineById, reasonById, personById, now, dispatch } = useScoped();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>('Work orders');
  const [selected, setSelected] = React.useState<IntegrationMessage | null>(null);
  const [payload, setPayload] = React.useState(SAMPLE_PAYLOAD);
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = React.useState<WorkOrderStatus | ''>('');
  const [system, setSystem] = React.useState('');
  const [q, setQ] = React.useState('');
  const openEvent = useOpenEvent();

  // Red escalation steps also leave through the WhatsApp gateway. They derive from the ladder, like the inbox.
  const log = React.useMemo(() => {
    const escalations = notificationsFor(events, rules, machineById, reasonById, now)
      .filter((n) => n.channel && n.role)
      .map((n): IntegrationMessage => ({ ...gatewayMessage(n.channel!, n.eventId, n.role!, `${n.title}. ${n.body}`), id: `GW-${n.id}`, at: n.at }));
    return [...messages, ...escalations].sort((a, b) => b.at - a.at);
  }, [messages, events, rules, machineById, reasonById, now]);

  const ingest = () => {
    const parsed = parseStatePayload(payload, mappings, states.map((s) => s.code));
    if (!parsed.ok) return setResult({ ok: false, text: parsed.error });
    dispatch({ type: 'machines/stop', machineId: parsed.machineId, stateCode: parsed.stateCode, externalId: parsed.externalId });
    setResult({ ok: true, text: `${parsed.externalId} resolved to ${machineById.get(parsed.machineId)?.code}. State set to ${parsed.stateCode}.` });
  };

  const needle = q.trim().toLowerCase();
  const orders = workOrders.filter((w) => (!status || w.status === status) && (!needle || `${w.id} ${w.title} ${w.assetId} ${w.eventId}`.toLowerCase().includes(needle)));
  const shownLog = log.filter((m) => (!system || m.system === system) && (!needle || `${m.path} ${m.summary} ${m.eventId ?? ''}`.toLowerCase().includes(needle)));
  const systems = [...new Set(log.map((m) => m.system))];

  const orderColumns: Column<WorkOrder>[] = [
    { key: 'id', header: 'Work order', sortValue: (w) => w.id, cell: (w) => <span className="font-mono text-xs font-semibold">{w.id}</span> },
    { key: 'title', header: 'Description', cell: (w) => <div><p className="font-semibold">{w.title}</p><p className="font-mono text-xs text-muted">{w.assetId} · Andon {w.eventId}</p></div> },
    { key: 'status', header: 'CMMS status', sortValue: (w) => w.status, cell: (w) => <Badge variant={WO_VARIANT[w.status]} dot>{WORK_ORDER_STATUS_LABEL[w.status]}</Badge> },
    { key: 'tech', header: 'Technician', cell: (w) => personById.get(w.technicianId ?? '')?.name ?? 'Unassigned' },
    { key: 'down', header: 'Downtime', className: 'tabular-nums', sortValue: (w) => w.downtimeMin ?? -1, cell: (w) => (w.downtimeMin === undefined ? 'running' : `${w.downtimeMin} min`) },
    { key: 'updated', header: 'Last sync', className: 'font-mono text-xs', sortValue: (w) => w.updatedAt, cell: (w) => fmtClock(w.updatedAt) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Integration Console" description="What crosses the system boundary: work orders to the CMMS, escalations to WhatsApp, SMS or email, machine states in from the PLC. Every adapter here is a mock behind the same interface a real one would use." className="mb-2" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Open work orders" value={workOrders.filter((w) => w.status === 'OPEN' || w.status === 'IN_PROGRESS').length} hint={`${workOrders.length} today`} icon={<ClipboardList />} tone="ink" />
        <StatCard label="CMMS requests" value={log.filter((m) => m.system === 'CMMS').length} hint="This session" icon={<Send />} tone="info" />
        <StatCard label="Escalations sent" value={log.filter((m) => m.system !== 'CMMS' && m.system !== 'PLC').length} hint="WhatsApp, SMS and email" icon={<MessageSquare />} tone="danger" />
        <StatCard label="PLC state messages" value={log.filter((m) => m.system === 'PLC').length} hint={`${mappings.filter((m) => m.source === 'PLC').length} tags mapped`} icon={<Cable />} />
      </div>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-card p-1 shadow-card [scrollbar-width:none]" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-muted', tab === t && 'bg-ink text-on-ink')}>{t}</button>)}
      </div>

      {tab === 'Work orders' ? (
        <FilterBar count={orders.length} total={workOrders.length} noun="work orders" onClear={status || q ? () => { setStatus(''); setQ(''); } : undefined}>
          <SearchFilter value={q} onChange={setQ} placeholder="Search work order, asset, Andon id" />
          <ChipGroup label="CMMS status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...(Object.keys(WORK_ORDER_STATUS_LABEL) as WorkOrderStatus[]).map((s) => ({ value: s, label: WORK_ORDER_STATUS_LABEL[s], count: workOrders.filter((w) => w.status === s).length }))]} />
        </FilterBar>
      ) : null}
      {tab === 'Message log' ? (
        <FilterBar count={shownLog.length} total={log.length} noun="messages" onClear={system || q ? () => { setSystem(''); setQ(''); } : undefined}>
          <SearchFilter value={q} onChange={setQ} placeholder="Search path, summary, Andon id" />
          <ChipGroup label="System" value={system} onChange={setSystem} options={[{ value: '', label: 'All systems' }, ...systems.map((s) => ({ value: s, label: s, count: log.filter((m) => m.system === s).length }))]} />
        </FilterBar>
      ) : null}
      {tab === 'Work orders' ? <Card><DataTable columns={orderColumns} rows={orders} rowKey={(w) => w.id} onRowClick={(w) => openEvent(w.eventId)} initialSort={{ key: 'updated', dir: 'desc' }} pageSize={10} emptyTitle="No work orders" emptyDescription="Assign an event whose reason creates one." /></Card> : null}

      {tab === 'Message log' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {shownLog.slice(0, 40).map((m) => (
                <button key={m.id} type="button" onClick={() => setSelected(m)} className={cn('flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-surface-2', selected?.id === m.id && 'bg-surface-2')}>
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', m.direction === 'IN' ? 'bg-info-soft text-info' : 'bg-surface text-body')}>{m.direction === 'IN' ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
                  <span className="hidden w-16 shrink-0 font-mono text-xs text-muted sm:block">{fmtClock(m.at)}</span>
                  <Badge variant="outline">{m.system}</Badge>
                  <span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs">{m.method} {m.path}</span><span className="block truncate text-xs text-muted">{m.summary}</span></span>
                  <Badge variant="success">{m.status}</Badge>
                  <span className="hidden w-12 shrink-0 text-right text-xs tabular-nums text-muted md:block">{m.latencyMs} ms</span>
                </button>
              ))}
              {shownLog.length === 0 ? <EmptyState icon={<Cable />} title="No messages yet" description="Stop a machine, assign an event, or let a ladder reach red." /> : null}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>{selected ? `${selected.method} ${selected.path}` : 'Payload'}</CardTitle><CardDescription>{selected ? selected.summary : 'Pick a message to read what was sent.'}</CardDescription></CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-2xl bg-ink p-4 font-mono text-xs leading-relaxed text-white">{selected?.payload ?? '{ }'}</pre>
              {selected?.eventId ? <Button variant="outline" size="sm" className="mt-3" onClick={() => openEvent(selected.eventId!)}>Open Andon {selected.eventId}</Button> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'Payload console' ? (
        <Card>
          <CardHeader><CardTitle>Send a PLC state payload</CardTitle><CardDescription>The tag resolves to a machine through the integration mapping. A stop stays silent for 2 minutes, then the state engine opens the Andon event. Try an unknown tag to see the unmapped case.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Textarea aria-label="Inbound payload" value={payload} onChange={(e) => setPayload(e.target.value)} className="min-h-40 border-0 bg-surface font-mono text-xs" />
            <div className="flex flex-wrap gap-2"><Button onClick={ingest}>Ingest</Button><Button variant="outline" onClick={() => { setPayload(SAMPLE_PAYLOAD); setResult(null); }}>Reset sample</Button></div>
            {result ? <p className={cn('rounded-2xl px-4 py-3 text-sm', result.ok ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent')}>{result.text}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
