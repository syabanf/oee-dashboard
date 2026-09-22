import { fmtDuration, responseKpis, slaState } from '@oee/fixtures';
import { Avatar, Card, CardContent, CardHeader, CardTitle, EmptyState, StatCard } from '@oee/ui';
import { CheckCheck, Clock, Footprints, Lock, Timer, Wrench } from 'lucide-react';
import { useScoped } from '../../state/app-state';
import { EventListItem } from '../../components/EventListItem';
import { useOpenEvent } from '../../components/useOpenEvent';

/** Personal response numbers. Only the viewer's own events are read; no other screen breaks stats down by person. */
export function MyStatsPage() {
  const { events, personById, departmentById, reasonById, viewerId, now } = useScoped();
  const openEvent = useOpenEvent();
  const me = personById.get(viewerId);
  const mine = events
    .filter((e) => e.assigneeId === viewerId)
    .sort((a, b) => b.startedAt - a.startedAt);
  const kpis = responseKpis(mine);
  const slas = mine.flatMap((e) => slaState(e, reasonById.get(e.reasonId ?? ''), now) ?? []);
  if (!me) return null;
  return (
    <div className="space-y-4">
      <div className="rounded-card bg-card shadow-card flex flex-wrap items-center gap-4 p-5">
        <Avatar name={me.name} color={me.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{me.name}</h1>
          <p className="text-muted text-sm">
            {me.role} · {departmentById.get(me.departmentId)?.name}
          </p>
        </div>
        <p className="bg-info-soft text-info flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium">
          <Lock className="size-3.5" />
          Only you see this page. Team screens compare departments and losses.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Calls today"
          value={mine.length}
          hint={`${mine.filter((e) => e.resolvedAt).length} resolved`}
          icon={<CheckCheck />}
          tone="ink"
        />
        <StatCard
          label="Time to acknowledge"
          value={fmtDuration(kpis.mttaMs)}
          hint="Average"
          icon={<Clock />}
          tone="warning"
        />
        <StatCard
          label="Time to arrive"
          value={fmtDuration(kpis.responseMs)}
          hint={
            slas.length
              ? `Arrival target met on ${slas.filter((s) => !s.breached).length} of ${slas.length}`
              : 'No calls with an arrival target yet'
          }
          icon={<Footprints />}
          tone="info"
        />
        <StatCard
          label="Time to resolve"
          value={fmtDuration(kpis.mttrMs)}
          hint="Average"
          icon={<Wrench />}
          tone="success"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mine.slice(0, 10).map((e) => (
            <EventListItem key={e.id} event={e} onOpen={(ev) => openEvent(ev.id)} />
          ))}
          {mine.length === 0 ? (
            <EmptyState
              icon={<Timer />}
              title="No calls assigned to you today"
              description="Switch the viewer from the account menu to see a technician's page."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
