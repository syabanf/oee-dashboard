import * as React from 'react';
import type { AndonEvent } from '@oee/types';
import { EVENT_STATUSES } from '@oee/types';
import {
  andonColor,
  escalationStages,
  eventElapsed,
  fmtClock,
  fmtClockShort,
  fmtDuration,
  fmtHm,
  fmtInt,
  fmtPct,
  isOpen,
  slaState,
} from '@oee/fixtures';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  EmptyState,
  KeyValue,
  Textarea,
  cn,
} from '@oee/ui';
import { Check, Tablet } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { useScoped } from '../../state/app-state';
import {
  AndonColorBadge,
  EventStatusBadge,
  PriorityBadge,
  SlaBadge,
  eventTitle,
} from '../../components/badges';
import { CategoryTiles, ReasonChips } from '../../components/ReasonPicker';
import { EventListItem } from '../../components/EventListItem';
import { BackButton } from '../../components/BackButton';
import { ConfirmMachineRunning } from '../../components/ConfirmMachineRunning';

const EXPECTED_CATEGORY: Record<string, string> = {
  FAULT: 'Machine',
  LOW: 'Material',
  CHANGE: 'Process',
  SETUP: 'Process',
  MICRO: 'Process',
  SLOW: 'Process',
  CLEAN: 'Process',
};

const NEXT_STEP_LABEL: Partial<Record<AndonEvent['status'], string>> = {
  DETECTED: 'Acknowledge alert',
  ACKNOWLEDGED: 'Choose a reason',
  CLASSIFIED: 'Assign an owner',
  ASSIGNED: 'Mark arrival',
  IN_PROGRESS: 'Record the fix',
  RESOLVED: 'Verify the fix',
};
const LIFECYCLE_LABEL: Record<AndonEvent['status'], string> = {
  DETECTED: 'Stop detected',
  ACKNOWLEDGED: 'Alert seen',
  CLASSIFIED: 'Reason named',
  ASSIGNED: 'Owner assigned',
  IN_PROGRESS: 'Technician arrived',
  RESOLVED: 'Machine running',
  VERIFIED: 'Fix verified',
};

function Lifecycle({ event }: { event: AndonEvent }) {
  const reached = EVENT_STATUSES.indexOf(event.status);
  const times = [
    event.startedAt,
    event.acknowledgedAt,
    event.classifiedAt,
    event.assignedAt,
    event.arrivedAt,
    event.resolvedAt,
    event.verifiedAt,
  ];
  const complete = event.status === 'VERIFIED';
  const step = complete ? EVENT_STATUSES.length : Math.min(EVENT_STATUSES.length, reached + 2);
  return (
    <>
      <div
        className="bg-surface-2 rounded-2xl p-4 sm:hidden"
        aria-label={`Lifecycle step ${step} of ${EVENT_STATUSES.length}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            Step {step} of {EVENT_STATUSES.length}
          </p>
          <p className="text-sm font-bold">
            {complete ? 'Verified' : NEXT_STEP_LABEL[event.status]}
          </p>
        </div>
        <div className="bg-border mt-3 h-2 overflow-hidden rounded-full">
          <div
            className="bg-action h-full rounded-full"
            style={{ width: `${(step / EVENT_STATUSES.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="hidden grid-cols-7 gap-1 sm:grid">
        {EVENT_STATUSES.map((status, i) => {
          // A status names a step that is already done, so the step after it is the one in play.
          const done = i <= reached,
            next = i === reached + 1;
          return (
            <li key={status} className="min-w-0 text-center">
              <span
                className={cn(
                  'mx-auto flex size-7 items-center justify-center rounded-full text-[11px] font-bold',
                  done
                    ? 'bg-success-soft text-success'
                    : next
                      ? 'bg-action text-white'
                      : 'bg-surface text-muted',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'mt-1.5 block truncate text-[10.5px] font-semibold',
                  !done && !next && 'text-muted',
                )}
              >
                {LIFECYCLE_LABEL[status]}
              </span>
              <span className="text-muted block font-mono text-[10px]">
                {times[i] ? fmtClock(times[i]) : '·'}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** The one thing the current owner of the event should do next. */
function NextAction({ event }: { event: AndonEvent }) {
  const { dispatch, people, departmentById, reasonById } = useScoped();
  const [assignee, setAssignee] = React.useState('');
  const [note, setNote] = React.useState('');
  const [changeCategory, setChangeCategory] = React.useState(false);
  const [showAllCategories, setShowAllCategories] = React.useState(false);
  const owners = people.filter((p) => p.departmentId === event.ownerDepartmentId);
  const reason = event.reasonId ? reasonById.get(event.reasonId) : undefined;

  if (event.status === 'DETECTED') {
    return (
      <ActionCard
        title="Acknowledge the alert"
        hint="Let the team know that someone has seen the stop."
      >
        <Button onClick={() => dispatch({ type: 'events/acknowledge', id: event.id })}>
          Acknowledge
        </Button>
      </ActionCard>
    );
  }
  if (!event.l1 || (!reason && isOpen(event))) {
    return (
      <ActionCard
        title={event.l1 ? 'Refine the reason' : 'What happened?'}
        hint={
          event.l1
            ? 'The operator picked the category. A leader or technician adds the detail.'
            : 'One tap for the category, one more for the detail.'
        }
      >
        <div className="w-full space-y-4">
          {event.l1 && !changeCategory ? (
            <div className="bg-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div>
                <p className="text-muted text-xs">Category</p>
                <p className="font-semibold">{event.l1}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setChangeCategory(true)}>
                Change
              </Button>
            </div>
          ) : (
            <CategoryTiles
              value={event.l1}
              preferred={
                EXPECTED_CATEGORY[event.stateCode] ? [EXPECTED_CATEGORY[event.stateCode]!] : []
              }
              collapsed={!showAllCategories}
              onPick={(l1) => {
                dispatch({ type: 'events/classify', id: event.id, l1 });
                setChangeCategory(false);
              }}
            />
          )}
          {(!event.l1 || changeCategory) && !showAllCategories ? (
            <Button variant="outline" onClick={() => setShowAllCategories(true)}>
              Show all categories
            </Button>
          ) : null}
          {event.l1 && !changeCategory ? (
            <ReasonChips
              l1={event.l1}
              value={event.reasonId}
              onPick={(reasonId) =>
                dispatch({ type: 'events/classify', id: event.id, l1: event.l1!, reasonId })
              }
            />
          ) : null}
        </div>
      </ActionCard>
    );
  }
  if (event.status === 'CLASSIFIED') {
    return (
      <ActionCard
        title={`Assign to ${departmentById.get(event.ownerDepartmentId ?? '')?.name ?? 'the owner'}`}
        hint={
          reason?.createsWorkOrder
            ? 'Assigning also opens a CMMS work order.'
            : `Technician should arrive within ${reason?.slaMin ?? 5} min.`
        }
      >
        <div className="flex w-full flex-wrap gap-2">
          <div className="min-w-[12rem] flex-1">
            <Combobox
              label="Assignee"
              variant="soft"
              value={assignee}
              onChange={setAssignee}
              placeholder="Select a person"
              options={owners.map((p) => ({ value: p.id, label: p.name, hint: p.role }))}
            />
          </div>
          <Button
            disabled={!assignee}
            onClick={() => dispatch({ type: 'events/assign', id: event.id, assigneeId: assignee })}
          >
            Assign
          </Button>
        </div>
      </ActionCard>
    );
  }
  if (event.status === 'ASSIGNED') {
    return (
      <ActionCard
        title="Mark technician arrival"
        hint="Do this when the assignee reaches the machine."
      >
        <Button onClick={() => dispatch({ type: 'events/arrive', id: event.id })}>
          Mark arrived
        </Button>
      </ActionCard>
    );
  }
  if (event.status === 'IN_PROGRESS') {
    return (
      <ActionCard
        title="Repair in progress"
        hint="Add a repair note, then mark the machine as running."
      >
        <div className="w-full space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              reason?.requiresComment
                ? 'What was done? Required for this reason.'
                : 'What was done? Optional.'
            }
            className="bg-surface min-h-20 border-0"
          />
          <ConfirmMachineRunning
            disabled={reason?.requiresComment && !note.trim()}
            onConfirm={() => dispatch({ type: 'events/resolve', id: event.id, note: note.trim() })}
          />
        </div>
      </ActionCard>
    );
  }
  if (event.status === 'RESOLVED') {
    return (
      <ActionCard
        title="Verify the fix"
        hint="Confirm that the machine is holding its normal cycle time."
      >
        <Button onClick={() => dispatch({ type: 'events/verify', id: event.id })}>Verify</Button>
      </ActionCard>
    );
  }
  return (
    <Card className="bg-success-soft text-success p-5 text-sm font-medium">
      Machine running again and fix verified.
    </Card>
  );
}
const ActionCard = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) => (
  <Card className="ring-action ring-2">
    <CardHeader>
      <p className="text-action text-[11px] font-semibold uppercase tracking-wider">Next step</p>
      <CardTitle>{title}</CardTitle>
      <p className="text-muted text-sm">{hint}</p>
    </CardHeader>
    <CardContent className="flex">{children}</CardContent>
  </Card>
);

/** One Andon event on its own page: hero with the clock, next action and lifecycle on the left, facts and ladder on the right. */
export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const {
    now,
    machineById,
    lineById,
    reasonById,
    ruleById,
    rules,
    departmentById,
    personById,
    oeeByMachine,
    events,
    history,
  } = useScoped();
  const event = events.find((e) => e.id === eventId);
  if (!event) {
    return (
      <Card>
        <EmptyState
          title="Event not found"
          description="It may belong to a machine that was removed."
          action={<Button onClick={() => navigate('/events')}>All events</Button>}
        />
      </Card>
    );
  }
  const machine = machineById.get(event.machineId);
  const reason = event.reasonId ? reasonById.get(event.reasonId) : undefined;
  const rule =
    (event.ruleId ? ruleById.get(event.ruleId) : undefined) ?? rules.find((r) => r.l1 === 'Other');
  const assignee = event.assigneeId ? personById.get(event.assigneeId) : undefined;
  const elapsed = eventElapsed(event, now);
  const planned = oeeByMachine.get(event.machineId)?.plannedMs ?? 0;
  const stages = escalationStages(event, rule, now);
  const sla = slaState(event, reason, now);
  // Recurrence: the same reason on the same machine, today and over the 30-day history.
  const sameToday = reason
    ? events.filter((e) => e.machineId === event.machineId && e.reasonId === reason.id)
    : [];
  const month = reason
    ? history.find((h) => h.machineId === event.machineId && h.reasonId === reason.id)
    : undefined;
  const pastFixes = reason
    ? events
        .filter((e) => e.id !== event.id && e.reasonId === reason.id && e.note && e.resolvedAt)
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 3)
    : [];

  const related = events
    .filter((e) => e.id !== event.id && e.machineId === event.machineId)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <BackButton fallback="/events" />
          <span className="text-muted">·</span>
          <Link
            to="/events"
            className="text-muted hover:text-foreground rounded-full px-3 py-1.5 font-medium hover:bg-black/5"
          >
            All events
          </Link>
          {machine ? (
            <>
              <span className="text-muted">·</span>
              <Link
                to={`/machines/${machine.id}`}
                className="text-muted hover:text-foreground rounded-full px-3 py-1.5 font-medium hover:bg-black/5"
              >
                {machine.tag} · {machine.name}
              </Link>
            </>
          ) : null}
        </div>
        {machine ? (
          <Button asChild variant="outline">
            <Link to={`/operator/${machine.lineId}?machine=${machine.id}`}>
              <Tablet />
              Line tablet
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="bg-ink text-on-ink shadow-float relative overflow-hidden">
        <div className="relative p-6">
          <div
            aria-hidden
            className="bg-accent/30 pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-on-ink-muted font-mono text-xs">ANDON EVENT #{event.id}</span>
              <EventStatusBadge status={event.status} />
              {rule ? <PriorityBadge priority={rule.priority} /> : null}
              <SlaBadge sla={sla} />
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
              {eventTitle(event, reason?.l3)}
            </h1>
            <p className="text-on-ink-muted text-sm">
              {machine ? (
                <Link to={`/machines/${machine.id}`} className="underline-offset-4 hover:underline">
                  {machine.tag} · {machine.name}
                </Link>
              ) : (
                'Removed machine'
              )}{' '}
              · {lineById.get(machine?.lineId ?? '')?.name}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="flex items-start gap-1.5 leading-none">
                <span className="whitespace-nowrap text-[44px] font-bold tabular-nums tracking-tight sm:text-6xl">
                  {fmtDuration(elapsed)}
                </span>
                <span className="text-on-ink-muted pt-1 text-sm font-semibold">
                  {isOpen(event) ? 'and counting' : 'total'}
                </span>
              </p>
              <span className="rounded-full bg-white/10 px-3 py-1.5 [&_span]:text-white">
                <AndonColorBadge color={isOpen(event) ? andonColor(event, rule, now) : 'none'} />
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <NextAction key={event.status} event={event} />
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <Lifecycle event={event} />
            </CardContent>
          </Card>
          {reason ? (
            <Card>
              <CardHeader>
                <CardTitle>Has this happened before?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Today, this machine', `${sameToday.length}x`],
                    ['Last 30 days', `${month?.occurrences ?? 0}x`],
                    ['30-day downtime', fmtHm((month?.minutes ?? 0) * 60_000)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface-2 rounded-2xl px-2 py-3">
                      <p className="text-muted text-[10.5px] font-medium">{label}</p>
                      <p className="text-[15px] font-extrabold tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>
                {(month?.occurrences ?? 0) >= 10 ? (
                  <p className="bg-warning-soft text-body mt-2 rounded-2xl px-4 py-2.5 text-sm">
                    Repeat offender. {reason.l3} on {machine?.name} needs a root-cause fix, the
                    quick repair does not hold.
                  </p>
                ) : null}
                {pastFixes.length ? (
                  <ul className="mt-3 space-y-2">
                    {pastFixes.map((e) => (
                      <li key={e.id} className="bg-surface-2 rounded-2xl p-3 text-sm">
                        <p className="text-muted text-xs">
                          {machineById.get(e.machineId)?.tag} · {fmtClockShort(e.startedAt)} · fixed
                          in {fmtDuration(eventElapsed(e, now))}
                        </p>
                        <p className="mt-0.5 font-medium">{e.note}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          {related.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Other events on this machine today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {related.map((e) => (
                  <EventListItem
                    key={e.id}
                    event={e}
                    onOpen={(ev) => navigate(`/events/${ev.id}`)}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production and ownership</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-border divide-y">
                <KeyValue label="Started">{fmtClock(event.startedAt)}</KeyValue>
                <KeyValue label="Production lost">
                  <span className="font-semibold">
                    {fmtInt(machine ? elapsed / 1000 / machine.idealCycleSec : 0)} pieces not
                    produced
                  </span>{' '}
                  · OEE availability down {fmtPct(planned ? elapsed / planned : 0)}
                </KeyValue>
                <KeyValue label="Reason">
                  {reason
                    ? `${reason.l1} › ${reason.l2} › ${reason.l3}`
                    : (event.l1 ?? 'Waiting for a reason')}
                </KeyValue>
                <KeyValue label="Owner">
                  {departmentById.get(event.ownerDepartmentId ?? '')?.name ??
                    'Set after a reason is selected'}
                  {reason ? ` · arrival target ${reason.slaMin} min` : ''}
                </KeyValue>
                <KeyValue label="Assigned">
                  {assignee ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={assignee.name} color={assignee.color} size="sm" />
                      {assignee.name} · {assignee.role}
                    </span>
                  ) : (
                    'Nobody yet'
                  )}
                </KeyValue>
                <KeyValue label="Work order">
                  {event.workOrderId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono text-xs">{event.workOrderId}</span>
                      <Badge variant="info">Work order on {machine?.cmmsAssetId}</Badge>
                    </span>
                  ) : reason?.createsWorkOrder ? (
                    'Opens on assignment'
                  ) : reason ? (
                    'No work order for this reason'
                  ) : (
                    'Set after a reason is selected'
                  )}
                </KeyValue>
                {event.note ? <KeyValue label="Note">{event.note}</KeyValue> : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Who is notified next</CardTitle>
              {rule ? (
                <p className="text-muted text-sm">
                  {rule.code}{' '}
                  {rule.name === 'Unclassified Stop' ? 'Waiting for a reason' : rule.name}
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <ol className="space-y-0">
                {stages.map((s, i) => (
                  <li key={`${s.atSec}-${s.notify}`} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < stages.length - 1 ? (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute left-[5px] top-3 h-full w-0.5',
                          stages[i + 1]!.reached ? 'bg-ink' : 'bg-border',
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'ring-card relative mt-1 size-3 shrink-0 rounded-full ring-4',
                        !s.reached
                          ? 'bg-border'
                          : s.color === 'red'
                            ? 'bg-accent'
                            : s.color === 'yellow'
                              ? 'bg-warning'
                              : 'bg-ink',
                      )}
                    />
                    <div className={cn('min-w-0 flex-1 text-sm', !s.reached && 'text-muted')}>
                      <p className="font-semibold">
                        {s.label}{' '}
                        <span className="text-muted ml-1 font-mono text-xs font-normal">
                          T+{s.atSec < 60 ? `${s.atSec}s` : `${s.atSec / 60}m`}
                        </span>
                      </p>
                      <p className="text-muted text-xs">
                        {s.color === 'red' ? `Notify ${s.notify}` : s.notify}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
