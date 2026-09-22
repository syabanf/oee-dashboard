import type {
  AndonEvent,
  AndonRule,
  BigLoss,
  NotifyChannel,
  DefectReason,
  DowntimeReason,
  Line,
  LossClass,
  LossHistory,
  Machine,
  MachineState,
  OeeMetric,
  Product,
  ProductionOrder,
  ProductionRecord,
  RejectEntry,
  StateSpan,
  ThresholdRule,
} from '@oee/types';

/** Everything the OEE maths needs, already indexed. Build once per store state with `kpiContext`. */
export interface KpiContext {
  now: number;
  stateByCode: Map<string, MachineState>;
  spansByMachine: Map<string, StateSpan[]>;
  productionByMachine: Map<string, ProductionRecord>;
  eventById: Map<string, AndonEvent>;
  productById: Map<string, Product>;
  rejectsByMachine: Map<string, RejectEntry[]>;
  defectById: Map<string, DefectReason>;
}

export interface LossBucket {
  key: string;
  label: string;
  lossClass: LossClass;
  big: BigLoss;
  ms: number;
}

/** Times in ms. `goodMs` is good output expressed as ideal run time, so OEE = goodMs / plannedMs. */
export interface OeeResult {
  plannedMs: number;
  runMs: number;
  idealOutputMs: number;
  goodMs: number;
  total: number;
  good: number;
  lostPcs: number;
  lostValue: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  buckets: LossBucket[];
}

const L1_LOSS_LABEL: Record<string, string> = {
  Machine: 'Machine breakdown',
  Material: 'Material waiting',
  Quality: 'Waiting QC',
  Operator: 'Operator',
  Tooling: 'Tooling',
  Process: 'Process stop',
  Other: 'Other',
};

/** Reason categories that are setup work, not a breakdown. */
const SETUP_L1 = new Set(['Process']);
const SETUP_STATES = new Set(['CHANGE', 'SETUP']);
/** Share of inline-inspection rejects that get reworked instead of scrapped. */
const INLINE_REWORK_SHARE = 0.35;

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

function finish(
  plannedMs: number,
  runMs: number,
  idealOutputMs: number,
  goodMs: number,
  total: number,
  good: number,
  lostPcs: number,
  lostValue: number,
  buckets: Map<string, LossBucket>,
): OeeResult {
  return {
    plannedMs,
    runMs,
    idealOutputMs,
    goodMs,
    total,
    good,
    lostPcs,
    lostValue,
    availability: ratio(runMs, plannedMs),
    performance: ratio(idealOutputMs, runMs),
    quality: ratio(goodMs, idealOutputMs),
    oee: ratio(goodMs, plannedMs),
    buckets: [...buckets.values()].filter((b) => b.ms > 0).sort((a, b) => b.ms - a.ms),
  };
}

export interface TimeWindow {
  from: number;
  to: number;
}

/** OEE for one machine, computed from state spans, never from raw PLC tags. Without a window it covers the shift so far. */
export function machineOee(machine: Machine, ctx: KpiContext, window?: TimeWindow): OeeResult {
  const record = ctx.productionByMachine.get(machine.id);
  const speed = record?.speedFactor ?? 1;
  const yieldFactor = record?.yieldFactor ?? 1;
  const buckets = new Map<string, LossBucket>();
  const add = (key: string, label: string, lossClass: LossClass, big: BigLoss, ms: number) => {
    const b = buckets.get(key);
    if (b) b.ms += ms;
    else buckets.set(key, { key, label, lossClass, big, ms });
  };
  let plannedMs = 0,
    runMs = 0,
    idealOutputMs = 0;
  for (const span of ctx.spansByMachine.get(machine.id) ?? []) {
    const state = ctx.stateByCode.get(span.stateCode);
    const ms = Math.max(
      0,
      Math.min(span.end ?? ctx.now, ctx.now, window?.to ?? Infinity) -
        Math.max(span.start, window?.from ?? -Infinity),
    );
    if (!state || ms === 0 || state.lossClass === 'EXCLUDED' || state.lossClass === 'PLANNED')
      continue;
    plannedMs += ms;
    if (state.lossClass === 'AVAILABILITY') {
      const l1 = span.eventId ? ctx.eventById.get(span.eventId)?.l1 : undefined;
      if (l1)
        add(
          `l1:${l1}`,
          L1_LOSS_LABEL[l1] ?? l1,
          'AVAILABILITY',
          SETUP_L1.has(l1) ? 'SETUP' : 'UNPLANNED',
          ms,
        );
      else if (span.eventId)
        add('unclassified', 'Waiting for a reason', 'AVAILABILITY', 'UNPLANNED', ms);
      else
        add(
          `state:${state.code}`,
          state.name,
          'AVAILABILITY',
          SETUP_STATES.has(state.code) ? 'SETUP' : 'UNPLANNED',
          ms,
        );
      continue;
    }
    runMs += ms;
    const output = ms * state.outputFactor * speed;
    idealOutputMs += output;
    // A performance state that still makes parts is slow running; one that makes none is a minor stop.
    if (state.lossClass === 'PERFORMANCE')
      add(
        `state:${state.code}`,
        state.name,
        'PERFORMANCE',
        state.outputFactor > 0 ? 'SPEED' : 'MINOR',
        ms * (1 - state.outputFactor),
      );
    add(
      'speed',
      'Speed below ideal',
      'PERFORMANCE',
      'SPEED',
      ms * state.outputFactor * (1 - speed),
    );
  }
  const cycleMs = machine.idealCycleSec * 1000;
  // Inline inspection rejects come from the yield factor; rejects logged by hand come on top.
  const logged = (ctx.rejectsByMachine.get(machine.id) ?? []).filter(
    (r) =>
      r.at <= ctx.now && r.at >= (window?.from ?? -Infinity) && r.at < (window?.to ?? Infinity),
  );
  const loggedRework = logged
    .filter((r) => ctx.defectById.get(r.defectId)?.disposition === 'REWORK')
    .reduce((a, r) => a + r.qty, 0);
  const loggedPcs = logged.reduce((a, r) => a + r.qty, 0);
  const goodMs = Math.max(0, idealOutputMs * yieldFactor - loggedPcs * cycleMs);
  const inlineMs = idealOutputMs * (1 - yieldFactor);
  const reworkMs = Math.min(
    idealOutputMs - goodMs,
    inlineMs * INLINE_REWORK_SHARE + loggedRework * cycleMs,
  );
  add('rework', 'Rework', 'QUALITY', 'REWORK', reworkMs);
  add('scrap', 'Scrap', 'QUALITY', 'SCRAP', idealOutputMs - goodMs - reworkMs);
  const lostPcs = (plannedMs - goodMs) / cycleMs;
  return finish(
    plannedMs,
    runMs,
    idealOutputMs,
    goodMs,
    idealOutputMs / cycleMs,
    goodMs / cycleMs,
    lostPcs,
    lostPcs * (ctx.productById.get(machine.productId)?.valuePerPcs ?? 0),
    buckets,
  );
}

/** Mean OEE target of a group of machines, as a ratio. */
export const averageTargetOee = (machines: Machine[]) =>
  machines.length ? machines.reduce((a, m) => a + m.targetOee, 0) / machines.length / 100 : 0.85;

/** Roll machine results up to a line, department or plant. Ratios come from summed times, never averaged percentages. */
export function aggregateOee(results: OeeResult[]): OeeResult {
  const buckets = new Map<string, LossBucket>();
  let plannedMs = 0,
    runMs = 0,
    idealOutputMs = 0,
    goodMs = 0,
    total = 0,
    good = 0,
    lostPcs = 0,
    lostValue = 0;
  for (const r of results) {
    plannedMs += r.plannedMs;
    runMs += r.runMs;
    idealOutputMs += r.idealOutputMs;
    goodMs += r.goodMs;
    total += r.total;
    good += r.good;
    lostPcs += r.lostPcs;
    lostValue += r.lostValue;
    for (const b of r.buckets) {
      const hit = buckets.get(b.key);
      if (hit) hit.ms += b.ms;
      else buckets.set(b.key, { ...b });
    }
  }
  return finish(plannedMs, runMs, idealOutputMs, goodMs, total, good, lostPcs, lostValue, buckets);
}

export interface HourBucket extends TimeWindow {
  result: OeeResult;
  targetPcs: number;
}
const HOUR = 3_600_000;

/** One OEE result per clock hour of the shift so far, with the good-piece target for that hour. */
export function hourlyOee(machines: Machine[], ctx: KpiContext, shiftStart: number): HourBucket[] {
  const hours: HourBucket[] = [];
  for (let from = shiftStart; from < ctx.now; from += HOUR) {
    const window = { from, to: from + HOUR };
    const results = machines.map((m) => machineOee(m, ctx, window));
    const targetPcs = results.reduce(
      (sum, r, i) =>
        sum + (r.plannedMs / (machines[i]!.idealCycleSec * 1000)) * (machines[i]!.targetOee / 100),
      0,
    );
    hours.push({ ...window, result: aggregateOee(results), targetPcs });
  }
  return hours;
}

/** Which of the six big losses a master-data reason belongs to. Used for the 30-day history. */
export function bigLossOfReason(reason: DowntimeReason): BigLoss {
  if (reason.lossClass === 'QUALITY') return reason.l3 === 'Surface Scratch' ? 'REWORK' : 'SCRAP';
  if (reason.lossClass === 'PERFORMANCE') return reason.l2 === 'Speed' ? 'SPEED' : 'MINOR';
  return SETUP_L1.has(reason.l1) ? 'SETUP' : 'UNPLANNED';
}

/** Bucket totals folded into the six big losses, always six rows in the fixed order. */
export function sixBigLosses(
  r: OeeResult,
  order: BigLoss[],
): { key: BigLoss; ms: number; buckets: LossBucket[] }[] {
  return order.map((key) => {
    const buckets = r.buckets.filter((b) => b.big === key);
    return { key, buckets, ms: buckets.reduce((a, b) => a + b.ms, 0) };
  });
}

const metricOf = (r: OeeResult, metric: OeeMetric) =>
  ({ OEE: r.oee, AVAILABILITY: r.availability, PERFORMANCE: r.performance, QUALITY: r.quality })[
    metric
  ];

export interface ThresholdAlert {
  rule: ThresholdRule;
  scopeName: string;
  value: number;
  machineIds: string[];
}
/** Threshold rules that are breached right now, on the shift so far. */
export function thresholdAlerts(
  rules: ThresholdRule[],
  machines: Machine[],
  lines: Line[],
  plantName: string,
  oeeByMachine: Map<string, OeeResult>,
): ThresholdAlert[] {
  return rules
    .filter((r) => r.active)
    .flatMap((rule) => {
      const scoped = machines.filter(
        (m) =>
          m.active &&
          (rule.scope === 'PLANT' ||
            (rule.scope === 'LINE' ? m.lineId === rule.scopeId : m.id === rule.scopeId)),
      );
      if (scoped.length === 0) return [];
      const value = metricOf(
        aggregateOee(scoped.flatMap((m) => oeeByMachine.get(m.id) ?? [])),
        rule.metric,
      );
      const scopeName =
        rule.scope === 'PLANT'
          ? plantName
          : rule.scope === 'LINE'
            ? (lines.find((l) => l.id === rule.scopeId)?.name ?? 'Line')
            : scoped[0]!.name;
      return value * 100 < rule.below
        ? [{ rule, scopeName, value, machineIds: scoped.map((m) => m.id) }]
        : [];
    });
}

export interface OrderProgress {
  produced: number;
  remaining: number;
  share: number;
  /** Pieces per hour over the last hour of planned time. */ ratePerHour: number;
  etaAt: number | undefined;
}
/** Good pieces against the order target, and when the order finishes at the current rate. That finish is the next changeover window. */
export function orderProgress(
  order: ProductionOrder,
  machine: Machine,
  ctx: KpiContext,
): OrderProgress {
  const produced = machineOee(machine, ctx, { from: order.startedAt, to: Infinity }).good;
  const lastHour = machineOee(machine, ctx, { from: ctx.now - 3_600_000, to: Infinity });
  const ratePerHour = lastHour.plannedMs > 0 ? (lastHour.good / lastHour.plannedMs) * 3_600_000 : 0;
  const remaining = Math.max(0, order.targetQty - produced);
  return {
    produced,
    remaining,
    share: ratio(produced, order.targetQty),
    ratePerHour,
    etaAt:
      remaining === 0
        ? ctx.now
        : ratePerHour > 0
          ? ctx.now + (remaining / ratePerHour) * 3_600_000
          : undefined,
  };
}

/** Downtime nobody has explained yet: stops without a reason, short stops that never became an event, and "Other". */
const UNEXPLAINED_KEYS = new Set(['unclassified', 'state:STOP', 'state:FAULT', 'l1:Other']);
export const unexplainedBuckets = (r: OeeResult) =>
  r.buckets.filter((b) => UNEXPLAINED_KEYS.has(b.key));
/** An open or closed event still waiting for a usable reason. */
export const needsReason = (e: AndonEvent) => !e.l1 || e.l1 === 'Other' || !e.reasonId;

/** OEE if the top `n` loss buckets disappeared. */
export const potentialOee = (r: OeeResult, n = 3) =>
  ratio(r.goodMs + r.buckets.slice(0, n).reduce((a, b) => a + b.ms, 0), r.plannedMs);

// ---------- Andon escalation ----------
export type AndonColor = 'none' | 'yellow' | 'red';
export interface EscalationStage {
  atSec: number;
  label: string;
  notify: string;
  /** Role that gets the message at this stage, and the channel that carries it. */ role?: string;
  channel?: NotifyChannel;
  color: AndonColor;
  reached: boolean;
}

export const isOpen = (e: AndonEvent) => e.status !== 'RESOLVED' && e.status !== 'VERIFIED';
export const eventElapsed = (e: AndonEvent, now: number) =>
  Math.max(0, (e.resolvedAt ?? now) - e.startedAt);

/** The escalation ladder for an event: silent detection, micro stop, Andon yellow, then one red step per rule escalation. */
export function escalationStages(
  event: AndonEvent,
  rule: AndonRule | undefined,
  now: number,
): EscalationStage[] {
  const elapsedSec = eventElapsed(event, now) / 1000;
  const trigger = rule?.triggerAfterSec ?? 120;
  const stages: Omit<EscalationStage, 'reached'>[] = [
    { atSec: 0, label: 'Machine stop detected', notify: 'No alarm yet', color: 'none' },
    {
      atSec: Math.min(30, trigger),
      label: 'Counted as micro stop',
      notify: 'No alarm yet',
      color: 'none',
    },
    {
      atSec: trigger,
      label: 'Andon yellow',
      notify: `Operator selects a reason. ${rule?.notifyRole ?? 'Line Leader'} notified`,
      role: rule?.notifyRole ?? 'Line Leader',
      color: 'yellow',
    },
    ...(rule?.escalations ?? []).map((s, i, all) => ({
      atSec: s.afterMin * 60,
      label:
        i === all.length - 1 && all.length > 1
          ? 'Critical downtime'
          : i === 0
            ? 'Andon red'
            : `Escalation ${i}`,
      notify: s.role,
      role: s.role,
      channel: s.channel,
      color: 'red' as const,
    })),
  ];
  return stages.map((s) => ({ ...s, reached: elapsedSec >= s.atSec }));
}
export function andonColor(
  event: AndonEvent,
  rule: AndonRule | undefined,
  now: number,
): AndonColor {
  return (
    escalationStages(event, rule, now)
      .filter((s) => s.reached)
      .at(-1)?.color ?? 'none'
  );
}

export interface SlaState {
  dueAt: number;
  remainingMs: number;
  breached: boolean;
  met: boolean;
}
/** Response SLA runs from the stop to the responder's arrival. No reason means no owner yet, so no SLA. */
export function slaState(
  event: AndonEvent,
  reason: DowntimeReason | undefined,
  now: number,
): SlaState | undefined {
  if (!reason) return undefined;
  const dueAt = event.startedAt + reason.slaMin * 60_000;
  const stoppedAt = event.arrivedAt ?? event.resolvedAt;
  return {
    dueAt,
    remainingMs: dueAt - (stoppedAt ?? now),
    breached: (stoppedAt ?? now) > dueAt,
    met: stoppedAt !== undefined && stoppedAt <= dueAt,
  };
}

export interface ResponseKpis {
  mttaMs: number;
  responseMs: number;
  mttrMs: number;
  count: number;
}
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
/** Mean time to acknowledge, to technician arrival, and to resolve. */
export function responseKpis(events: AndonEvent[]): ResponseKpis {
  const since = (pick: (e: AndonEvent) => number | undefined) =>
    events.flatMap((e) => (pick(e) ? [pick(e)! - e.startedAt] : []));
  return {
    mttaMs: mean(since((e) => e.acknowledgedAt)),
    responseMs: mean(since((e) => e.arrivedAt)),
    mttrMs: mean(since((e) => e.resolvedAt)),
    count: events.length,
  };
}

// ---------- 30-day loss intelligence ----------
export const HISTORY_DAYS = 30;
const PRODUCTION_DAYS = 26;
const PLANNED_MIN_PER_DAY = 450;
export const plannedMonthMin = (machineCount: number) =>
  machineCount * PRODUCTION_DAYS * PLANNED_MIN_PER_DAY;

export interface LossNode {
  key: string;
  label: string;
  minutes: number;
  occurrences: number;
  children: LossNode[];
}

/** Loss class → L1 → L2 → L3 tree, largest first at every level. */
export function lossTree(
  history: LossHistory[],
  reasonById: Map<string, DowntimeReason>,
  classLabel: Record<LossClass, string>,
): LossNode[] {
  const root: LossNode = { key: 'root', label: 'root', minutes: 0, occurrences: 0, children: [] };
  for (const row of history) {
    const reason = reasonById.get(row.reasonId);
    if (!reason) continue;
    let node = root;
    for (const [key, label] of [
      [reason.lossClass, classLabel[reason.lossClass]],
      [reason.l1, reason.l1],
      [reason.l2, reason.l2],
      [reason.id, reason.l3],
    ] as const) {
      let child = node.children.find((c) => c.key === key);
      if (!child)
        node.children.push((child = { key, label, minutes: 0, occurrences: 0, children: [] }));
      child.minutes += row.minutes;
      child.occurrences += row.occurrences;
      node = child;
    }
  }
  const sort = (n: LossNode) => {
    n.children.sort((a, b) => b.minutes - a.minutes);
    n.children.forEach(sort);
  };
  sort(root);
  return root.children;
}

export interface Opportunity {
  key: string;
  l1: string;
  l2: string;
  lossClass: LossClass;
  ownerDepartmentId: string;
  topReason: string;
  minutes: number;
  occurrences: number;
  oeeGain: number;
  pcs: number;
  value: number;
}

/** Rank L1 › L2 loss groups by what removing them would return: OEE points, pieces and rupiah per month. */
export function opportunities(
  history: LossHistory[],
  reasonById: Map<string, DowntimeReason>,
  machineById: Map<string, Machine>,
  productById: Map<string, Product>,
  plannedMin: number,
): Opportunity[] {
  const groups = new Map<string, Opportunity & { reasonMinutes: Map<string, number> }>();
  for (const row of history) {
    const reason = reasonById.get(row.reasonId);
    const machine = machineById.get(row.machineId);
    if (!reason || !machine) continue;
    const key = `${reason.l1}/${reason.l2}`;
    let g = groups.get(key);
    if (!g)
      groups.set(
        key,
        (g = {
          key,
          l1: reason.l1,
          l2: reason.l2,
          lossClass: reason.lossClass,
          ownerDepartmentId: reason.ownerDepartmentId,
          topReason: reason.l3,
          minutes: 0,
          occurrences: 0,
          oeeGain: 0,
          pcs: 0,
          value: 0,
          reasonMinutes: new Map(),
        }),
      );
    const pcs = (row.minutes * 60) / machine.idealCycleSec;
    g.minutes += row.minutes;
    g.occurrences += row.occurrences;
    g.pcs += pcs;
    g.value += pcs * (productById.get(machine.productId)?.valuePerPcs ?? 0);
    g.reasonMinutes.set(reason.l3, (g.reasonMinutes.get(reason.l3) ?? 0) + row.minutes);
  }
  return [...groups.values()]
    .map(({ reasonMinutes, ...g }) => ({
      ...g,
      oeeGain: ratio(g.minutes, plannedMin),
      topReason: [...reasonMinutes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? g.topReason,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}
