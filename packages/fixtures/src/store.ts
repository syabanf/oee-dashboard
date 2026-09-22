import type {
  AndonEvent, AndonRule, CalendarDay, CycleTime, DefectReason, Department, DowntimeReason, EventStatus, Insight, IntegrationMapping, IntegrationMessage, Line,
  LossHistory, Machine, MachineState, Person, Plant, Product, ProductionOrder, ProductionRecord, RejectEntry, Shift, StateSpan, ThresholdRule, WorkOrder, WorkOrderStatus,
} from '@oee/types';
import { createWorkOrderMessage, plcStateMessage, updateWorkOrderMessage, type MessageDraft } from '@oee/integration';
import { EVENT_STATUSES } from '@oee/types';
import { seed } from './seed';

export type ClockSpeed = 0 | 1 | 10 | 60;

export interface AppState {
  now: number;
  speed: ClockSpeed;
  /** Who is looking. Personal stats only ever show for this person. */
  viewerId: string;
  shiftStart: number;
  plant: Plant;
  departments: Department[];
  lines: Line[];
  machines: Machine[];
  states: MachineState[];
  reasons: DowntimeReason[];
  rules: AndonRule[];
  products: Product[];
  cycleTimes: CycleTime[];
  shifts: Shift[];
  calendar: CalendarDay[];
  mappings: IntegrationMapping[];
  people: Person[];
  production: ProductionRecord[];
  spans: StateSpan[];
  events: AndonEvent[];
  history: LossHistory[];
  insights: Insight[];
  defects: DefectReason[];
  rejects: RejectEntry[];
  orders: ProductionOrder[];
  thresholds: ThresholdRule[];
  workOrders: WorkOrder[];
  messages: IntegrationMessage[];
  /** Notification ids the viewer has opened. */
  readNotifications: string[];
  /** Stops that clear on their own at the given time (machineId → ms). Used to demo micro stops. */
  selfClearing: Record<string, number>;
}

export type AppAction =
  | { type: 'clock/tick'; ms: number }
  | { type: 'clock/setSpeed'; speed: ClockSpeed }
  | { type: 'viewer/set'; personId: string }
  | { type: 'state/replace'; state: AppState }
  | { type: 'notifications/read'; ids: string[] }
  | { type: 'machines/stop'; machineId: string; stateCode: string; clearsAfterMs?: number; externalId?: string }
  | { type: 'rejects/add'; reject: RejectEntry }
  | { type: 'rejects/remove'; id: string }
  | { type: 'defects/upsert'; defect: DefectReason }
  | { type: 'defects/remove'; id: string }
  | { type: 'thresholds/upsert'; rule: ThresholdRule }
  | { type: 'thresholds/remove'; id: string }
  | { type: 'shifts/upsert'; shift: Shift }
  | { type: 'shifts/remove'; id: string }
  | { type: 'events/raise'; machineId: string; stateCode: string; l1?: string }
  | { type: 'events/acknowledge'; id: string }
  | { type: 'events/classify'; id: string; l1: string; reasonId?: string }
  | { type: 'events/assign'; id: string; assigneeId: string }
  | { type: 'events/arrive'; id: string }
  | { type: 'events/resolve'; id: string; note?: string; partsUsed?: string }
  | { type: 'events/verify'; id: string }
  | { type: 'machines/upsert'; machine: Machine }
  | { type: 'machines/remove'; id: string }
  | { type: 'states/upsert'; state: MachineState }
  | { type: 'states/remove'; id: string }
  | { type: 'reasons/upsert'; reason: DowntimeReason }
  | { type: 'reasons/remove'; id: string }
  | { type: 'rules/upsert'; rule: AndonRule }
  | { type: 'rules/remove'; id: string }
  | { type: 'cycleTimes/upsert'; cycleTime: CycleTime }
  | { type: 'cycleTimes/remove'; id: string }
  | { type: 'mappings/upsert'; mapping: IntegrationMapping }
  | { type: 'mappings/remove'; id: string }
  | { type: 'insights/dismiss'; id: string };

// The year of trend rows never changes, so it stays out of the store (and out of cross-tab snapshots).
const { fixtureNow, trend: _trend, ...collections } = seed;

const WO_STATUS: Record<EventStatus, WorkOrderStatus> = { DETECTED: 'OPEN', ACKNOWLEDGED: 'OPEN', CLASSIFIED: 'OPEN', ASSIGNED: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', RESOLVED: 'COMPLETED', VERIFIED: 'CLOSED' };
const minutesDown = (e: AndonEvent) => (e.resolvedAt ? Math.round((e.resolvedAt - e.startedAt) / 60_000) : undefined);

function workOrderFor(e: AndonEvent, state: Pick<AppState, 'machines' | 'reasons'>, now: number): WorkOrder {
  const machine = state.machines.find((m) => m.id === e.machineId);
  const reason = state.reasons.find((r) => r.id === e.reasonId);
  return {
    id: e.workOrderId!, eventId: e.id, machineId: e.machineId, assetId: machine?.cmmsAssetId ?? 'UNMAPPED', title: `${reason?.l3 ?? 'Breakdown'} on ${machine?.name ?? e.machineId}`,
    status: WO_STATUS[e.status], createdAt: e.assignedAt ?? now, updatedAt: e.verifiedAt ?? e.resolvedAt ?? e.arrivedAt ?? e.assignedAt ?? now,
    technicianId: e.assigneeId, downtimeMin: minutesDown(e), partsUsed: e.partsUsed,
  };
}

export const initialState: AppState = {
  ...collections, now: fixtureNow, speed: 1,
  viewerId: collections.people.find((p) => p.role === 'Production Manager')?.id ?? collections.people[0]!.id,
  workOrders: collections.events.filter((e) => e.workOrderId).map((e) => workOrderFor(e, collections, fixtureNow)),
  messages: [], readNotifications: [], selfClearing: {},
};

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
}
const without = <T extends { id: string }>(items: T[], id: string) => items.filter((i) => i.id !== id);

/** Closes the machine's open span at `now` and opens one in the new state. */
function switchState(state: AppState, machineId: string, stateCode: string, eventId?: string): Pick<AppState, 'spans' | 'machines'> {
  return {
    spans: [
      ...state.spans.map((s) => (s.machineId === machineId && s.end === null ? { ...s, end: state.now } : s)),
      { id: newId('spn'), machineId, stateCode, start: state.now, end: null, eventId },
    ],
    machines: state.machines.map((m) => (m.id === machineId ? { ...m, stateCode, stateSince: state.now } : m)),
  };
}

/** Lifecycle only moves forward: classifying an event that is already assigned keeps it assigned. */
const advance = (current: EventStatus, next: EventStatus) => (EVENT_STATUSES.indexOf(next) > EVENT_STATUSES.indexOf(current) ? next : current);

const log = (state: AppState, ...drafts: MessageDraft[]): IntegrationMessage[] => [
  ...state.messages,
  ...drafts.map((d, i) => ({ ...d, id: `MSG-${String(state.messages.length + i + 1).padStart(4, '0')}`, at: state.now })),
];
const plcTag = (state: AppState, machineId: string) => state.mappings.find((m) => m.machineId === machineId && m.source === 'PLC')?.externalId ?? machineId;
const nextEventId = (state: AppState) => `A-${Math.max(...state.events.map((e) => Number(e.id.slice(2)) || 0)) + 1}`;

/** Re-reads the event after a lifecycle step and mirrors it to the CMMS work order, logging the request. */
function syncWorkOrder(state: AppState, eventId: string): AppState {
  const event = state.events.find((e) => e.id === eventId);
  if (!event?.workOrderId) return state;
  const next = workOrderFor(event, state, state.now);
  const current = state.workOrders.find((w) => w.id === next.id);
  if (!current) {
    const technician = state.people.find((p) => p.id === event.assigneeId)?.name;
    const reason = state.reasons.find((r) => r.id === event.reasonId);
    return { ...state, workOrders: [...state.workOrders, next], messages: log(state, createWorkOrderMessage(next, technician, reason ? `${reason.l1}/${reason.l2}/${reason.l3}` : 'UNKNOWN')) };
  }
  if (current.status === next.status) return state;
  const updated = { ...next, createdAt: current.createdAt, updatedAt: state.now };
  return { ...state, workOrders: state.workOrders.map((w) => (w.id === updated.id ? updated : w)), messages: log(state, updateWorkOrderMessage(updated)) };
}

/**
 * The state engine's job on every tick. A stop stays silent at first: if it clears by itself inside the
 * detection window it becomes a micro stop, otherwise the engine opens the Andon event for it.
 */
function runStateEngine(state: AppState): AppState {
  const detectMs = (state.rules.find((r) => r.l1 === 'Other')?.triggerAfterSec ?? 120) * 1000;
  let next = state;
  for (const machine of state.machines) {
    const level = state.states.find((s) => s.code === machine.stateCode)?.andonLevel;
    if (level !== 'STOP' || next.events.some((e) => e.machineId === machine.id && e.status !== 'RESOLVED' && e.status !== 'VERIFIED')) continue;
    const clearsAt = next.selfClearing[machine.id];
    const { [machine.id]: _cleared, ...selfClearing } = next.selfClearing;
    if (clearsAt !== undefined && next.now >= clearsAt && clearsAt - machine.stateSince < detectMs) {
      next = {
        ...next, selfClearing,
        spans: [...next.spans.map((s) => (s.machineId === machine.id && s.end === null ? { ...s, stateCode: 'MICRO', end: clearsAt } : s)), { id: newId('spn'), machineId: machine.id, stateCode: 'RUN', start: clearsAt, end: null }],
        machines: next.machines.map((m) => (m.id === machine.id ? { ...m, stateCode: 'RUN', stateSince: clearsAt } : m)),
        messages: log(next, plcStateMessage(plcTag(next, machine.id), 'RUN', `${machine.tag} ran again after ${Math.round((clearsAt - machine.stateSince) / 1000)} s. Counted as a micro stop, no alarm.`)),
      };
    } else if (next.now - machine.stateSince >= detectMs) {
      const event: AndonEvent = { id: nextEventId(next), machineId: machine.id, stateCode: machine.stateCode, status: 'DETECTED', startedAt: machine.stateSince, source: 'STATE_ENGINE' };
      next = {
        ...next, selfClearing, events: [...next.events, event],
        spans: next.spans.map((s) => (s.machineId === machine.id && s.end === null ? { ...s, eventId: event.id } : s)),
        messages: log(next, plcStateMessage(plcTag(next, machine.id), machine.stateCode, `${machine.tag} stopped for ${detectMs / 1000} s. State engine opened ${event.id}.`, event.id)),
      };
    }
  }
  return next;
}

function patchEvent(state: AppState, id: string, patch: (e: AndonEvent) => AndonEvent): AppState {
  return { ...state, events: state.events.map((e) => (e.id === id ? patch(e) : e)) };
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'clock/tick':
      return runStateEngine({ ...state, now: state.now + action.ms });
    case 'state/replace':
      return action.state;
    case 'notifications/read':
      return { ...state, readNotifications: [...new Set([...state.readNotifications, ...action.ids])] };

    case 'machines/stop': {
      const machine = state.machines.find((m) => m.id === action.machineId);
      if (!machine) return state;
      const selfClearing = action.clearsAfterMs ? { ...state.selfClearing, [machine.id]: state.now + action.clearsAfterMs } : state.selfClearing;
      return { ...state, ...switchState(state, machine.id, action.stateCode), selfClearing, messages: log(state, plcStateMessage(action.externalId ?? plcTag(state, machine.id), action.stateCode, `${machine.tag} reports ${action.stateCode}. Silent phase, no alarm yet.`)) };
    }
    case 'clock/setSpeed':
      return { ...state, speed: action.speed };
    case 'viewer/set':
      return { ...state, viewerId: action.personId };

    case 'events/raise': {
      const rule = state.rules.find((r) => r.l1 === action.l1);
      const event: AndonEvent = { id: nextEventId(state), source: 'PERSON', machineId: action.machineId, stateCode: action.stateCode, status: 'DETECTED', startedAt: state.now, l1: action.l1, ruleId: rule?.id };
      return { ...state, ...switchState(state, action.machineId, action.stateCode, event.id), events: [...state.events, event] };
    }
    case 'events/acknowledge':
      return patchEvent(state, action.id, (e) => ({ ...e, status: advance(e.status, 'ACKNOWLEDGED'), acknowledgedAt: e.acknowledgedAt ?? state.now }));
    case 'events/classify': {
      const reason = state.reasons.find((r) => r.id === action.reasonId);
      const owner = reason?.ownerDepartmentId ?? state.reasons.find((r) => r.l1 === action.l1)?.ownerDepartmentId;
      return patchEvent(state, action.id, (e) => ({
        ...e, status: advance(e.status, 'CLASSIFIED'), l1: action.l1, reasonId: action.reasonId,
        ruleId: state.rules.find((r) => r.l1 === action.l1)?.id, ownerDepartmentId: owner,
        acknowledgedAt: e.acknowledgedAt ?? state.now, classifiedAt: e.classifiedAt ?? state.now,
      }));
    }
    case 'events/assign':
      return syncWorkOrder(patchEvent(state, action.id, (e) => {
        const reason = state.reasons.find((r) => r.id === e.reasonId);
        const workOrderId = e.workOrderId ?? (reason?.createsWorkOrder ? `WO-${48300 + (Number(e.id.slice(2)) % 700)}` : undefined);
        return { ...e, status: advance(e.status, 'ASSIGNED'), assigneeId: action.assigneeId, acknowledgedAt: e.acknowledgedAt ?? state.now, assignedAt: e.assignedAt ?? state.now, workOrderId };
      }), action.id);
    case 'events/arrive':
      return syncWorkOrder(patchEvent(state, action.id, (e) => ({ ...e, status: advance(e.status, 'IN_PROGRESS'), arrivedAt: e.arrivedAt ?? state.now })), action.id);
    case 'events/resolve': {
      const event = state.events.find((e) => e.id === action.id);
      if (!event) return state;
      const resolved = patchEvent(state, action.id, (e) => ({ ...e, status: advance(e.status, 'RESOLVED'), resolvedAt: e.resolvedAt ?? state.now, note: action.note || e.note, partsUsed: action.partsUsed || e.partsUsed }));
      return syncWorkOrder({ ...resolved, ...switchState(resolved, event.machineId, 'RUN') }, action.id);
    }
    case 'events/verify':
      return syncWorkOrder(patchEvent(state, action.id, (e) => ({ ...e, status: advance(e.status, 'VERIFIED'), verifiedAt: e.verifiedAt ?? state.now })), action.id);

    case 'rejects/add':
      return { ...state, rejects: [...state.rejects, action.reject] };
    case 'rejects/remove':
      return { ...state, rejects: without(state.rejects, action.id) };
    case 'defects/upsert':
      return { ...state, defects: upsert(state.defects, action.defect) };
    case 'defects/remove':
      return { ...state, defects: without(state.defects, action.id), rejects: state.rejects.filter((r) => r.defectId !== action.id) };

    case 'machines/upsert': {
      const isNew = !state.machines.some((m) => m.id === action.machine.id);
      const machines = upsert(state.machines, action.machine);
      if (!isNew) return { ...state, machines };
      // A new machine starts its first span now and gets a neutral production record.
      return {
        ...state, machines,
        spans: [...state.spans, { id: newId('spn'), machineId: action.machine.id, stateCode: action.machine.stateCode, start: state.now, end: null }],
        production: [...state.production, { machineId: action.machine.id, speedFactor: 0.95, yieldFactor: 0.98 }],
      };
    }
    case 'machines/remove': {
      const gone = (x: { machineId: string }) => x.machineId !== action.id;
      return {
        ...state, machines: without(state.machines, action.id),
        spans: state.spans.filter(gone), events: state.events.filter(gone), mappings: state.mappings.filter(gone),
        cycleTimes: state.cycleTimes.filter(gone), production: state.production.filter(gone),
        history: state.history.filter(gone), insights: state.insights.filter(gone), rejects: state.rejects.filter(gone), workOrders: state.workOrders.filter(gone), orders: state.orders.filter(gone),
      };
    }
    case 'thresholds/upsert':
      return { ...state, thresholds: upsert(state.thresholds, action.rule) };
    case 'thresholds/remove':
      return { ...state, thresholds: without(state.thresholds, action.id) };
    case 'shifts/upsert':
      return { ...state, shifts: upsert(state.shifts, action.shift) };
    case 'shifts/remove':
      return { ...state, shifts: without(state.shifts, action.id) };
    case 'states/upsert':
      return { ...state, states: upsert(state.states, action.state) };
    case 'states/remove':
      return { ...state, states: without(state.states, action.id) };
    case 'reasons/upsert':
      return { ...state, reasons: upsert(state.reasons, action.reason) };
    case 'reasons/remove':
      return { ...state, reasons: without(state.reasons, action.id), history: state.history.filter((h) => h.reasonId !== action.id) };
    case 'rules/upsert':
      return { ...state, rules: upsert(state.rules, action.rule) };
    case 'rules/remove':
      return { ...state, rules: without(state.rules, action.id) };
    case 'cycleTimes/upsert': {
      // The cycle time of the product a machine runs today is that machine's ideal cycle.
      const { cycleTime } = action;
      const machines = state.machines.map((m) => (m.id === cycleTime.machineId && m.productId === cycleTime.productId ? { ...m, idealCycleSec: cycleTime.idealCycleSec } : m));
      return { ...state, machines, cycleTimes: upsert(state.cycleTimes, cycleTime) };
    }
    case 'cycleTimes/remove':
      return { ...state, cycleTimes: without(state.cycleTimes, action.id) };
    case 'mappings/upsert':
      return { ...state, mappings: upsert(state.mappings, action.mapping) };
    case 'mappings/remove':
      return { ...state, mappings: without(state.mappings, action.id) };
    case 'insights/dismiss':
      return { ...state, insights: state.insights.map((i) => (i.id === action.id ? { ...i, dismissed: true } : i)) };
  }
}
