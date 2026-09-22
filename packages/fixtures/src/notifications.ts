import type { AndonEvent, AndonRule, DowntimeReason, Machine, NotifyChannel } from '@oee/types';
import { escalationStages, isOpen, type AndonColor } from './kpi';

/** A message to a role (escalation) or to one person (assignment). Derived from events, so every tab agrees. */
export interface AppNotification {
  id: string;
  eventId: string;
  at: number;
  role?: string;
  personId?: string;
  /** Set on escalation steps that also leave the plant through a gateway. */
  channel?: NotifyChannel;
  title: string;
  body: string;
  color: AndonColor;
  /** Closed events keep their history but stop asking for attention. */
  live: boolean;
}

export function notificationsFor(
  events: AndonEvent[],
  rules: AndonRule[],
  machineById: Map<string, Machine>,
  reasonById: Map<string, DowntimeReason>,
  now: number,
): AppNotification[] {
  const fallback = rules.find((r) => r.l1 === 'Other');
  const out: AppNotification[] = [];
  for (const event of events) {
    const machine = machineById.get(event.machineId);
    const what = reasonById.get(event.reasonId ?? '')?.l3 ?? event.l1 ?? 'Waiting for a reason';
    const where = machine ? `${machine.tag} · ${machine.name}` : 'Removed machine';
    const rule = rules.find((r) => r.id === event.ruleId) ?? fallback;
    const live = isOpen(event);
    escalationStages(event, rule, now).forEach((stage, i) => {
      if (!stage.reached || !stage.role || stage.color === 'none') return;
      out.push({
        id: `${event.id}:${i}`,
        eventId: event.id,
        at: event.startedAt + stage.atSec * 1000,
        role: stage.role,
        channel: stage.channel,
        title: `${stage.label}: ${where}`,
        body: `${what}. ${stage.color === 'red' ? `Open for more than ${Math.round(stage.atSec / 60)} min.` : 'Waiting for a response.'}`,
        color: stage.color,
        live,
      });
    });
    if (event.assigneeId && event.assignedAt) {
      out.push({
        id: `${event.id}:assigned`,
        eventId: event.id,
        at: event.assignedAt,
        personId: event.assigneeId,
        title: `Assigned to you: ${where}`,
        body: `${what}.${event.workOrderId ? ` Work order ${event.workOrderId}.` : ''}`,
        color: 'none',
        live: live && !event.arrivedAt,
      });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}
