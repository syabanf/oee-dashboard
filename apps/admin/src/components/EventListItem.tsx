import type { AndonEvent } from '@oee/types';
import {
  andonColor,
  eventElapsed,
  fmtClockShort,
  fmtDuration,
  isOpen,
  slaState,
} from '@oee/fixtures';
import { cn } from '@oee/ui';
import { ChevronRight } from 'lucide-react';
import { useScoped } from '../state/app-state';
import {
  ANDON_TONE,
  AndonColorBadge,
  EventStatusBadge,
  SlaBadge,
  eventNextAction,
  eventTitle,
} from './badges';

/** Compact admin row for one Andon event. Status drops under the title on phones. */
export function EventListItem({
  event,
  onOpen,
}: {
  event: AndonEvent;
  onOpen: (event: AndonEvent) => void;
}) {
  const { now, machineById, reasonById, ruleById, rules, departmentById, stateByCode } =
    useScoped();
  const machine = machineById.get(event.machineId);
  const rule =
    (event.ruleId ? ruleById.get(event.ruleId) : undefined) ?? rules.find((r) => r.l1 === 'Other');
  const tone = ANDON_TONE[stateByCode.get(event.stateCode)?.andonLevel ?? 'STOP'];
  const open = isOpen(event);
  const owner = departmentById.get(event.ownerDepartmentId ?? '')?.name;
  const sla = slaState(event, reasonById.get(event.reasonId ?? ''), now);
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="bg-surface-2 hover:bg-card hover:shadow-card flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.99]"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          open ? tone.soft : 'bg-surface text-muted',
        )}
      >
        <tone.icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {eventTitle(event, reasonById.get(event.reasonId ?? '')?.l3)}
        </span>
        <span className="text-muted block truncate text-xs">
          {machine?.tag} · {machine?.name} · {fmtClockShort(event.startedAt)}
          {owner ? ` → ${owner}` : ''}
        </span>
        <span className="text-action mt-1.5 flex items-center gap-1 text-xs font-semibold">
          {eventNextAction(event)}
          <ChevronRight className="size-3.5" />
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
          <EventStatusBadge status={event.status} />
          {sla?.breached ? <SlaBadge sla={sla} /> : null}
          <span className="text-xs font-bold tabular-nums">
            {fmtDuration(eventElapsed(event, now))}
          </span>
        </span>
      </span>
      {sla?.breached ? (
        <span className="hidden lg:block">
          <SlaBadge sla={sla} />
        </span>
      ) : null}
      <span className="hidden flex-col items-end gap-1 sm:flex">
        <span className="text-sm font-bold tabular-nums">
          {fmtDuration(eventElapsed(event, now))}
        </span>
        {open ? (
          <AndonColorBadge color={andonColor(event, rule, now)} />
        ) : (
          <EventStatusBadge status={event.status} />
        )}
      </span>
    </button>
  );
}
