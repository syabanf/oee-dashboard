import * as React from 'react';
import type { AndonEvent, Machine } from '@oee/types';
import { aggregateOee, byId, groupBy, initialState, isOpen, machineOee, notificationsFor, reducer, thresholdAlerts, type AppAction, type AppNotification, type AppState, type KpiContext, type OeeResult } from '@oee/fixtures';
import { AppStateContext } from './context';

const TICK_MS = 1000;
const CHANNEL = 'oee-demo';
type SyncMessage = { kind: 'action'; action: AppAction } | { kind: 'hello' } | { kind: 'snapshot'; state: AppState };

/**
 * Holds the store and keeps every open tab on the same story: the wall board, the line tablet and the
 * technician's phone can sit side by side. Actions travel over a BroadcastChannel; each tab ticks its own clock.
 */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = React.useReducer(reducer, initialState);
  const [autoStops, setAutoStops] = React.useState(false);
  const { speed } = state;
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const channel = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = ({ data }: MessageEvent<SyncMessage>) => {
      if (data.kind === 'action') rawDispatch(data.action);
      else if (data.kind === 'hello') bc.postMessage({ kind: 'snapshot', state: stateRef.current } satisfies SyncMessage);
      // A tab that just opened takes the snapshot of whichever tab is further along.
      else if (data.state.now > stateRef.current.now) rawDispatch({ type: 'state/replace', state: data.state });
    };
    bc.postMessage({ kind: 'hello' } satisfies SyncMessage);
    return () => bc.close();
  }, []);

  const dispatch = React.useCallback((action: AppAction) => {
    rawDispatch(action);
    channel.current?.postMessage({ kind: 'action', action } satisfies SyncMessage);
  }, []);

  // The demo clock drives every live duration, escalation and OEE figure. Ticks stay local to the tab.
  React.useEffect(() => {
    if (speed === 0) return;
    const timer = window.setInterval(() => rawDispatch({ type: 'clock/tick', ms: TICK_MS * speed }), TICK_MS);
    return () => window.clearInterval(timer);
  }, [speed]);

  // Unattended demo: about one stop every six simulated minutes, most of them short enough to end as micro stops.
  React.useEffect(() => {
    if (!autoStops || speed === 0) return;
    const timer = window.setInterval(() => {
      const { machines, events, states } = stateRef.current;
      const open = new Set(events.filter(isOpen).map((e) => e.machineId));
      const running = machines.filter((m) => m.active && !open.has(m.id) && states.find((s) => s.code === m.stateCode)?.andonLevel !== 'STOP');
      if (open.size >= 5 || running.length === 0 || Math.random() > (speed * TICK_MS) / 360_000) return;
      const machine = running[Math.floor(Math.random() * running.length)]!;
      const short = Math.random() < 0.6;
      dispatch({ type: 'machines/stop', machineId: machine.id, stateCode: Math.random() < 0.3 ? 'FAULT' : 'STOP', clearsAfterMs: short ? 20_000 + Math.random() * 70_000 : undefined });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [autoStops, speed, dispatch]);

  const value = React.useMemo(() => ({ state, dispatch, autoStops, setAutoStops }), [state, dispatch, autoStops]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function useAppState() {
  const ctx = React.useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

/** Derived, indexed views of the store. Pages read from here and never filter the raw collections themselves. */
export function useScoped() {
  const { state, dispatch, autoStops, setAutoStops } = useAppState();
  const { machines, states, spans, production, events, products, lines, departments, reasons, rules, people, rejects, defects, orders, thresholds, plant, viewerId, readNotifications } = state;

  const lookups = React.useMemo(() => ({
    machineById: byId(machines),
    lineById: byId(lines),
    departmentById: byId(departments),
    reasonById: byId(reasons),
    ruleById: byId(rules),
    personById: byId(people),
    productById: byId(products),
    defectById: byId(defects),
    orderByMachine: new Map(orders.map((o) => [o.machineId, o])),
    stateByCode: new Map(states.map((s) => [s.code, s])),
    machinesByLine: groupBy(machines, (m: Machine) => m.lineId),
  }), [machines, lines, departments, reasons, rules, people, products, defects, orders, states]);

  const kpi = React.useMemo<KpiContext>(() => ({
    now: state.now,
    stateByCode: lookups.stateByCode,
    spansByMachine: groupBy(spans, (s) => s.machineId),
    productionByMachine: new Map(production.map((p) => [p.machineId, p])),
    eventById: byId(events),
    productById: lookups.productById,
    rejectsByMachine: groupBy(rejects, (r) => r.machineId),
    defectById: lookups.defectById,
  }), [state.now, lookups, spans, production, events, rejects]);

  const oeeByMachine = React.useMemo(() => new Map<string, OeeResult>(machines.filter((m) => m.active).map((m) => [m.id, machineOee(m, kpi)])), [machines, kpi]);
  const plantOee = React.useMemo(() => aggregateOee([...oeeByMachine.values()]), [oeeByMachine]);

  const openEvents = React.useMemo(() => events.filter(isOpen).sort((a, b) => a.startedAt - b.startedAt), [events]);
  const openEventByMachine = React.useMemo(() => new Map<string, AndonEvent>(openEvents.map((e) => [e.machineId, e])), [openEvents]);

  const alerts = React.useMemo(() => thresholdAlerts(thresholds, machines, lines, plant.name, oeeByMachine), [thresholds, machines, lines, plant.name, oeeByMachine]);

  // The viewer's inbox: escalations addressed to their role plus assignments addressed to them.
  const inbox = React.useMemo(() => {
    const viewer = lookups.personById.get(viewerId);
    const read = new Set(readNotifications);
    // Threshold breaches join the escalations. They carry no event, so they open the explorer instead.
    const breaches = alerts.map((a): AppNotification => ({ id: `thr:${a.rule.id}`, eventId: '', at: state.now, role: a.rule.notifyRole, title: `${a.rule.name}: ${a.scopeName}`, body: `${a.rule.metric} is ${(a.value * 100).toFixed(1)}%, floor ${a.rule.below}%.`, color: 'yellow', live: true }));
    return [...breaches, ...notificationsFor(events, rules, lookups.machineById, lookups.reasonById, state.now)]
      .filter((n) => n.personId === viewerId || (n.role !== undefined && n.role === viewer?.role))
      .map((n) => ({ ...n, unread: n.live && !read.has(n.id) }));
  }, [alerts, events, rules, lookups, state.now, viewerId, readNotifications]);

  return { ...state, ...lookups, dispatch, autoStops, setAutoStops, inbox, alerts, kpi, oeeByMachine, plantOee, openEvents, openEventByMachine };
}
