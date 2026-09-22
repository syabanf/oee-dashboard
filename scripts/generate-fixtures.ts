/** Seeded, deterministic fixture generator. Run `pnpm gen:fixtures`; never hand-edit packages/fixtures/data. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AndonEvent, AndonRule, CalendarDay, CycleTime, DefectReason, Department, DowntimeReason, Insight, IntegrationMapping, Line, LossClass,
  LossHistory, Machine, MachineState, Person, Plant, Product, ProductionOrder, ProductionRecord, RejectEntry, Shift, StateSpan, ThresholdRule,
} from '../packages/types/src';

const MIN = 60_000;
const at = (hhmmss: string) => Date.parse(`2026-09-21T${hhmmss}+07:00`);
const FIXTURE_NOW = at('14:40:53');
const SHIFT_START = at('07:00:00');
const BREAK_START = at('12:00:00');
const BREAK_END = at('12:30:00');

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260921);
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
const pick = <T,>(items: T[]): T => items[Math.floor(rnd() * items.length)]!;

// ---------- master data ----------
const plant: Plant = { id: 'plt-a', name: 'Factory A', company: 'Nusantara Precious Metals' };

const departments: Department[] = [
  { id: 'dep-cast', plantId: plant.id, name: 'Casting', kind: 'PRODUCTION' },
  { id: 'dep-fin', plantId: plant.id, name: 'Finishing', kind: 'PRODUCTION' },
  { id: 'dep-pack', plantId: plant.id, name: 'Inspection & Packing', kind: 'PRODUCTION' },
  { id: 'dep-mtn', plantId: plant.id, name: 'Maintenance', kind: 'SUPPORT' },
  { id: 'dep-whs', plantId: plant.id, name: 'Warehouse', kind: 'SUPPORT' },
  { id: 'dep-qc', plantId: plant.id, name: 'Quality Control', kind: 'SUPPORT' },
  { id: 'dep-prod', plantId: plant.id, name: 'Production', kind: 'SUPPORT' },
];

const lines: Line[] = [
  { id: 'lin-a', departmentId: 'dep-cast', name: 'Casting Line', code: 'LINE A' },
  { id: 'lin-b', departmentId: 'dep-fin', name: 'Polishing Line 1', code: 'LINE B' },
  { id: 'lin-c', departmentId: 'dep-pack', name: 'Inspection & Packing Line', code: 'LINE C' },
];

const products: Product[] = [
  { id: 'prd-gb1', sku: 'GB-1G-001', name: 'Gold Bar 1g', category: 'Gold Bar', valuePerPcs: 5400 },
  { id: 'prd-gb5', sku: 'GB-5G-001', name: 'Gold Bar 5g', category: 'Gold Bar', valuePerPcs: 7800 },
  { id: 'prd-gb10', sku: 'GB-10G-001', name: 'Gold Bar 10g', category: 'Gold Bar', valuePerPcs: 10200 },
  { id: 'prd-gb25', sku: 'GB-25G-001', name: 'Gold Bar 25g', category: 'Gold Bar', valuePerPcs: 15600 },
];

const stateSeeds: Omit<MachineState, 'outputFactor'>[] = [
  { id: 'st-run', code: 'RUN', name: 'Running', lossClass: 'PRODUCTIVE', andonLevel: 'RUNNING', description: 'Cycle normal, output counted.' },
  { id: 'st-low', code: 'LOW', name: 'Material low', lossClass: 'PRODUCTIVE', andonLevel: 'ATTENTION', description: 'Still producing. Feeder below refill level.' },
  { id: 'st-assist', code: 'ASSIST', name: 'Assistance requested', lossClass: 'PRODUCTIVE', andonLevel: 'ASSISTANCE', description: 'Operator called for support while running.' },
  { id: 'st-slow', code: 'SLOW', name: 'Reduced speed', lossClass: 'PERFORMANCE', andonLevel: 'WARNING', description: 'Cycle time more than 15% above ideal.' },
  { id: 'st-idle', code: 'IDLE', name: 'Idle', lossClass: 'PERFORMANCE', andonLevel: 'WARNING', description: 'Motor on, no output.' },
  { id: 'st-micro', code: 'MICRO', name: 'Micro stop', lossClass: 'PERFORMANCE', andonLevel: 'WARNING', description: 'Stop shorter than 2 minutes.' },
  { id: 'st-stop', code: 'STOP', name: 'Stop', lossClass: 'AVAILABILITY', andonLevel: 'STOP', description: 'Unplanned stop, no machine fault signal.' },
  { id: 'st-fault', code: 'FAULT', name: 'Machine fault', lossClass: 'AVAILABILITY', andonLevel: 'STOP', description: 'PLC fault bit raised.' },
  { id: 'st-change', code: 'CHANGE', name: 'Changeover', lossClass: 'AVAILABILITY', andonLevel: 'ATTENTION', description: 'Product change on the machine.' },
  { id: 'st-setup', code: 'SETUP', name: 'Setup', lossClass: 'AVAILABILITY', andonLevel: 'ATTENTION', description: 'Tooling and parameter setup.' },
  { id: 'st-clean', code: 'CLEAN', name: 'Cleaning', lossClass: 'PLANNED', andonLevel: 'OFF', description: 'Scheduled cleaning.' },
  { id: 'st-pm', code: 'PM', name: 'Preventive maintenance', lossClass: 'PLANNED', andonLevel: 'OFF', description: 'Scheduled maintenance window.' },
  { id: 'st-break', code: 'BREAK', name: 'Break', lossClass: 'EXCLUDED', andonLevel: 'OFF', description: 'Shift break, outside planned production time.' },
  { id: 'st-off', code: 'OFF', name: 'Machine off', lossClass: 'EXCLUDED', andonLevel: 'OFF', description: 'No production planned.' },
];
const states: MachineState[] = stateSeeds.map((s) => ({ ...s, outputFactor: s.lossClass === 'PRODUCTIVE' ? 1 : s.code === 'SLOW' ? 0.8 : 0 }));

type ReasonSeed = [l1: string, l2: string, l3: string, owner: string, sla: number, loss: LossClass, wo: boolean, monthMin: number];
const reasonSeeds: ReasonSeed[] = [
  ['Machine', 'Electrical', 'Motor Overload', 'dep-mtn', 5, 'AVAILABILITY', true, 1480],
  ['Machine', 'Electrical', 'Sensor Fault', 'dep-mtn', 5, 'AVAILABILITY', true, 760],
  ['Machine', 'Electrical', 'Servo Alarm', 'dep-mtn', 5, 'AVAILABILITY', true, 410],
  ['Machine', 'Mechanical', 'Bearing Failure', 'dep-mtn', 5, 'AVAILABILITY', true, 880],
  ['Machine', 'Mechanical', 'Belt Slip', 'dep-mtn', 5, 'AVAILABILITY', true, 520],
  ['Machine', 'Pneumatic', 'Cylinder Leak', 'dep-mtn', 10, 'AVAILABILITY', true, 330],
  ['Material', 'Supply', 'Material Late', 'dep-whs', 10, 'AVAILABILITY', false, 3120],
  ['Material', 'Supply', 'Material Empty', 'dep-whs', 10, 'AVAILABILITY', false, 1910],
  ['Material', 'Incoming', 'Wrong Material', 'dep-whs', 10, 'AVAILABILITY', false, 370],
  ['Material', 'Incoming', 'Material Defect', 'dep-qc', 10, 'AVAILABILITY', false, 290],
  ['Quality', 'Inspection', 'Waiting QC', 'dep-qc', 5, 'AVAILABILITY', false, 940],
  ['Quality', 'Reject', 'Surface Scratch', 'dep-qc', 10, 'QUALITY', false, 1260],
  ['Quality', 'Reject', 'Dimension Out', 'dep-qc', 10, 'QUALITY', false, 610],
  ['Quality', 'Reject', 'Startup Defect', 'dep-qc', 10, 'QUALITY', false, 380],
  ['Operator', 'Availability', 'No Operator', 'dep-prod', 5, 'AVAILABILITY', false, 690],
  ['Operator', 'Availability', 'Operator Delay', 'dep-prod', 5, 'PERFORMANCE', false, 450],
  ['Tooling', 'Wear', 'Polishing Wheel Worn', 'dep-mtn', 10, 'AVAILABILITY', true, 560],
  ['Tooling', 'Wear', 'Die Damage', 'dep-mtn', 10, 'AVAILABILITY', true, 300],
  ['Process', 'Setup', 'Changeover', 'dep-prod', 15, 'AVAILABILITY', false, 2240],
  ['Process', 'Setup', 'Parameter Adjustment', 'dep-prod', 15, 'AVAILABILITY', false, 640],
  ['Process', 'Speed', 'Reduced Speed', 'dep-prod', 15, 'PERFORMANCE', false, 2380],
  ['Process', 'Minor Stop', 'Micro Stop', 'dep-prod', 15, 'PERFORMANCE', false, 3350],
  ['Process', 'Cleaning', 'Unplanned Cleaning', 'dep-prod', 15, 'AVAILABILITY', false, 420],
  ['Other', 'Unclassified', 'Other', 'dep-prod', 15, 'AVAILABILITY', false, 510],
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const reasons: DowntimeReason[] = reasonSeeds.map(([l1, l2, l3, owner, sla, loss, wo]) => ({
  id: `rsn-${slug(l3)}`, l1, l2, l3, ownerDepartmentId: owner, slaMin: sla, lossClass: loss, createsWorkOrder: wo, requiresComment: l1 === 'Other',
}));

const rules: AndonRule[] = [
  { id: 'rul-a01', code: 'A01', name: 'Machine Breakdown', l1: 'Machine', priority: 'CRITICAL', triggerAfterSec: 120, notifyRole: 'Maintenance Technician', escalations: [{ afterMin: 5, role: 'Maintenance Leader', channel: 'WHATSAPP' }, { afterMin: 15, role: 'Production Supervisor', channel: 'WHATSAPP' }, { afterMin: 30, role: 'Plant Manager', channel: 'WHATSAPP' }] },
  { id: 'rul-a02', code: 'A02', name: 'Quality Assistance', l1: 'Quality', priority: 'HIGH', triggerAfterSec: 120, notifyRole: 'QC Inspector', escalations: [{ afterMin: 5, role: 'QC Leader', channel: 'WHATSAPP' }, { afterMin: 15, role: 'Production Supervisor', channel: 'WHATSAPP' }] },
  { id: 'rul-a03', code: 'A03', name: 'Material Request', l1: 'Material', priority: 'MEDIUM', triggerAfterSec: 120, notifyRole: 'Warehouse Runner', escalations: [{ afterMin: 10, role: 'Warehouse Leader', channel: 'WHATSAPP' }, { afterMin: 20, role: 'Production Supervisor', channel: 'WHATSAPP' }] },
  { id: 'rul-a04', code: 'A04', name: 'Supervisor Assistance', l1: 'Operator', priority: 'MEDIUM', triggerAfterSec: 120, notifyRole: 'Line Leader', escalations: [{ afterMin: 10, role: 'Production Supervisor', channel: 'WHATSAPP' }] },
  { id: 'rul-a05', code: 'A05', name: 'Tooling Change', l1: 'Tooling', priority: 'HIGH', triggerAfterSec: 120, notifyRole: 'Maintenance Technician', escalations: [{ afterMin: 10, role: 'Maintenance Leader', channel: 'WHATSAPP' }] },
  { id: 'rul-a06', code: 'A06', name: 'Unclassified Stop', l1: 'Other', priority: 'MEDIUM', triggerAfterSec: 120, notifyRole: 'Line Leader', escalations: [{ afterMin: 5, role: 'Production Supervisor', channel: 'WHATSAPP' }, { afterMin: 30, role: 'Production Manager', channel: 'WHATSAPP' }] },
  { id: 'rul-a07', code: 'A07', name: 'Process Stop', l1: 'Process', priority: 'MEDIUM', triggerAfterSec: 120, notifyRole: 'Line Leader', escalations: [{ afterMin: 15, role: 'Production Supervisor', channel: 'WHATSAPP' }] },
];

const people: Person[] = [
  { id: 'per-ardi', name: 'Ardi Pratama', role: 'Maintenance Technician', departmentId: 'dep-mtn', color: '#256caf' },
  { id: 'per-yoga', name: 'Yoga Saputra', role: 'Maintenance Technician', departmentId: 'dep-mtn', color: '#0f766e' },
  { id: 'per-hendra', name: 'Hendra Wijaya', role: 'Maintenance Leader', departmentId: 'dep-mtn', color: '#7c3aed' },
  { id: 'per-sari', name: 'Sari Lestari', role: 'QC Inspector', departmentId: 'dep-qc', color: '#b45309' },
  { id: 'per-dewi', name: 'Dewi Anggraini', role: 'QC Leader', departmentId: 'dep-qc', color: '#be185d' },
  { id: 'per-bayu', name: 'Bayu Firmansyah', role: 'Warehouse Runner', departmentId: 'dep-whs', color: '#4d7c0f' },
  { id: 'per-rina', name: 'Rina Marlina', role: 'Warehouse Leader', departmentId: 'dep-whs', color: '#0369a1' },
  { id: 'per-agus', name: 'Agus Setiawan', role: 'Line Leader', departmentId: 'dep-prod', color: '#9b1c1c' },
  { id: 'per-putri', name: 'Putri Handayani', role: 'Production Supervisor', departmentId: 'dep-prod', color: '#334155' },
  { id: 'per-fahmi', name: 'Fahmi Syaban', role: 'Production Manager', departmentId: 'dep-prod', color: '#101112' },
];

type MachineSeed = [n: number, name: string, line: string, type: string, vendor: string, plc: string, protocol: string, cycle: number, product: string, speed: number, yieldF: number];
const machineSeeds: MachineSeed[] = [
  [1, 'Casting #01', 'lin-a', 'Induction Caster', 'Indutherm', 'Siemens S7-1200', 'OPC UA', 6.0, 'prd-gb10', 0.95, 0.985],
  [2, 'Casting #02', 'lin-a', 'Induction Caster', 'Indutherm', 'Siemens S7-1200', 'OPC UA', 6.0, 'prd-gb5', 0.96, 0.982],
  [3, 'Casting #03', 'lin-a', 'Induction Caster', 'Indutherm', 'Siemens S7-1200', 'OPC UA', 6.0, 'prd-gb5', 0.93, 0.978],
  [4, 'Blanking #04', 'lin-a', 'Blanking Press', 'Schuler', 'Siemens S7-1500', 'OPC UA', 3.6, 'prd-gb1', 0.96, 0.99],
  [5, 'Polishing #05', 'lin-b', 'Automatic Polisher', 'Otec', 'Omron NX102', 'OPC UA', 4.0, 'prd-gb5', 0.95, 0.975],
  [6, 'Polishing #06', 'lin-b', 'Automatic Polisher', 'Otec', 'Omron NX102', 'OPC UA', 4.0, 'prd-gb5', 0.9, 0.972],
  [7, 'Polishing #07', 'lin-b', 'Automatic Polisher', 'Otec', 'Omron NX102', 'OPC UA', 4.0, 'prd-gb5', 0.88, 0.968],
  [8, 'Polishing #08', 'lin-b', 'Automatic Polisher', 'Otec', 'Omron NX102', 'OPC UA', 4.8, 'prd-gb10', 0.96, 0.981],
  [9, 'QC Camera #09', 'lin-c', 'Vision Inspection Station', 'Keyence', 'Keyence KV-8000', 'MQTT', 2.4, 'prd-gb5', 0.94, 0.992],
  [10, 'Stamping #10', 'lin-c', 'Minting Press', 'Schuler', 'Siemens S7-1500', 'OPC UA', 3.2, 'prd-gb1', 0.96, 0.986],
  [11, 'Packing #11', 'lin-c', 'Blister Packer', 'Uhlmann', 'Mitsubishi FX5U', 'Modbus TCP', 3.0, 'prd-gb5', 0.97, 0.995],
  [12, 'Packing #12', 'lin-c', 'Blister Packer', 'Uhlmann', 'Mitsubishi FX5U', 'Modbus TCP', 3.0, 'prd-gb10', 0.95, 0.994],
];
const pad = (n: number, len = 2) => String(n).padStart(len, '0');
const typeCode: Record<string, string> = { 'lin-a': 'CST', 'lin-b': 'POL', 'lin-c': 'PCK' };

/** Machines whose shift ends in a live abnormal state. */
const forced: Record<number, { stateCode: string; since: number }> = {
  3: { stateCode: 'STOP', since: at('14:33:11') },
  6: { stateCode: 'SLOW', since: at('14:12:40') },
  7: { stateCode: 'FAULT', since: at('14:32:11') },
  9: { stateCode: 'FAULT', since: at('14:28:22') },
  12: { stateCode: 'LOW', since: at('14:31:05') },
};

const machines: Machine[] = machineSeeds.map(([n, name, lineId, type, vendor, plc, protocol, cycle, productId]) => ({
  id: `mch-${pad(n)}`,
  code: `MCH-${typeCode[lineId]}-${pad(n, 3)}`,
  tag: `M${pad(n)}`,
  name,
  lineId,
  machineType: type,
  manufacturer: vendor,
  plc,
  protocol,
  ipAddress: `10.10.10.${20 + n}`,
  idealCycleSec: cycle,
  ratedCapacityPerHour: Math.round(3600 / cycle),
  targetAvailability: 90,
  targetPerformance: 95,
  targetQuality: 99,
  targetOee: 85,
  cmmsAssetId: `AST-${pad(120 + n, 5)}`,
  active: true,
  productId,
  stateCode: forced[n]?.stateCode ?? 'RUN',
  stateSince: forced[n]?.since ?? 0,
}));
const production: ProductionRecord[] = machineSeeds.map(([n, , , , , , , , , speed, yieldF]) => ({ machineId: `mch-${pad(n)}`, speedFactor: speed, yieldFactor: yieldF }));

const cycleTimes: CycleTime[] = machines.flatMap((m) =>
  products.map((p, i) => ({ id: `cyc-${m.tag.toLowerCase()}-${p.id.slice(4)}`, machineId: m.id, productId: p.id, idealCycleSec: Math.round(m.idealCycleSec * (0.8 + i * 0.2) * 10) / 10 })),
);
// The machine's own ideal cycle is the one for the product it runs today.
for (const m of machines) {
  const running = cycleTimes.find((c) => c.machineId === m.id && c.productId === m.productId)!;
  running.idealCycleSec = m.idealCycleSec;
}

const shifts: Shift[] = [
  { id: 'shf-1', name: 'Shift 1', start: '07:00', end: '15:00', breakStart: '12:00', breakEnd: '12:30' },
  { id: 'shf-2', name: 'Shift 2', start: '15:00', end: '23:00', breakStart: '18:30', breakEnd: '19:00' },
  { id: 'shf-3', name: 'Shift 3', start: '23:00', end: '07:00', breakStart: '03:00', breakEnd: '03:30' },
];
const calendar: CalendarDay[] = [
  { id: 'cal-0817', date: '2026-08-17', label: 'Independence Day', kind: 'HOLIDAY' },
  { id: 'cal-0920', date: '2026-09-20', label: 'Special overtime, Line B', kind: 'OVERTIME' },
  { id: 'cal-0921', date: '2026-09-21', label: 'Monday', kind: 'PRODUCTION' },
  { id: 'cal-0927', date: '2026-09-27', label: 'Sunday', kind: 'NON_PRODUCTION' },
  { id: 'cal-1225', date: '2026-12-25', label: 'Christmas Day', kind: 'HOLIDAY' },
];

const mappings: IntegrationMapping[] = machines.flatMap((m, i) => [
  { id: `map-${m.tag}-plc`, machineId: m.id, source: 'PLC' as const, externalId: `DB1${pad(i + 1)}.${m.tag}` },
  { id: `map-${m.tag}-scada`, machineId: m.id, source: 'SCADA' as const, externalId: `TAG_${typeCode[m.lineId]}_${pad(i + 1)}` },
  { id: `map-${m.tag}-cmms`, machineId: m.id, source: 'CMMS' as const, externalId: m.cmmsAssetId },
  { id: `map-${m.tag}-mes`, machineId: m.id, source: 'MES' as const, externalId: `MACHINE-${pad(i + 1)}` },
]);

// ---------- transactions: state spans and Andon events ----------
const spans: StateSpan[] = [];
const events: AndonEvent[] = [];
const reasonsBy = (l1s: string[]) => reasons.filter((r) => l1s.includes(r.l1) && r.lossClass === 'AVAILABILITY');
const peopleIn = (dep: string) => people.filter((p) => p.departmentId === dep);

function addSpan(machineId: string, stateCode: string, start: number, end: number | null, eventId?: string) {
  spans.push({ id: '', machineId, stateCode, start, end, eventId });
}

/** What the responder wrote when closing the event. Feeds "what fixed it last time" on later events. */
const FIX_NOTES: Record<string, string[]> = {
  Machine: ['Reset overload relay, cleaned cooling fan intake.', 'Replaced proximity sensor and re-taught position.', 'Re-tensioned drive belt, checked alignment.', 'Swapped leaking cylinder seal.'],
  Tooling: ['Changed polishing wheel, ran 20 pcs run-in.', 'Replaced die insert from spare set B.'],
  Material: ['Kanban cart arrived late, topped up two bins.', 'Swapped to the correct lot after label check.'],
  Quality: ['QC released the batch after re-measuring 5 samples.', 'First-piece approval given after adjustment.'],
  Operator: ['Relief operator took over the station.', 'Leader covered until the operator returned.'],
  Process: ['Parameters restored from the recipe sheet.', 'Changeover done, first piece approved.'],
  Other: ['Cause not found, machine restarted and monitored.'],
};

function resolvedEvent(machineId: string, stateCode: string, start: number, end: number): string {
  const reason = pick(stateCode === 'FAULT' ? reasonsBy(['Machine', 'Tooling']) : reasonsBy(['Material', 'Quality', 'Operator', 'Process']));
  const rule = rules.find((r) => r.l1 === reason.l1)!;
  const len = end - start;
  const ack = start + Math.min(between(0.7, 3) * MIN, len * 0.2);
  const classified = ack + Math.min(between(0.3, 1.5) * MIN, len * 0.1);
  const assigned = classified + Math.min(between(0.2, 1) * MIN, len * 0.1);
  const arrived = assigned + Math.min(between(2, 7) * MIN, len * 0.3);
  const verified = rnd() < 0.8;
  const key = `tmp-${events.length}`;
  events.push({
    id: key, machineId, stateCode, status: verified ? 'VERIFIED' : 'RESOLVED', startedAt: start,
    acknowledgedAt: ack, classifiedAt: classified, assignedAt: assigned, arrivedAt: arrived, resolvedAt: end,
    verifiedAt: verified ? end + between(1, 5) * MIN : undefined,
    l1: reason.l1, reasonId: reason.id, ruleId: rule.id, ownerDepartmentId: reason.ownerDepartmentId,
    assigneeId: pick(peopleIn(reason.ownerDepartmentId)).id,
    workOrderId: reason.createsWorkOrder ? `WO-${Math.floor(between(48000, 48999))}` : undefined,
    note: pick(FIX_NOTES[reason.l1] ?? FIX_NOTES.Other!),
  });
  return key;
}

for (const [n] of machineSeeds) {
  const machineId = `mch-${pad(n)}`;
  const horizon = forced[n]?.since ?? FIXTURE_NOW;
  let t = SHIFT_START;
  /** Pushes a span, splitting it around the shift break and clipping it at the horizon. */
  const push = (stateCode: string, minutes: number) => {
    let end = Math.min(t + minutes * MIN, horizon);
    if (t < BREAK_START && end > BREAK_START) end = BREAK_START;
    if (end <= t) return;
    const isStop = stateCode === 'STOP' || stateCode === 'FAULT';
    addSpan(machineId, stateCode, t, end, isStop && end - t >= 2 * MIN ? resolvedEvent(machineId, stateCode, t, end) : undefined);
    t = end;
    if (t === BREAK_START) {
      addSpan(machineId, 'BREAK', BREAK_START, BREAK_END);
      t = BREAK_END;
    }
  };
  while (t < horizon) {
    push('RUN', between(22, 68));
    const roll = rnd();
    if (roll < 0.45) push('MICRO', between(0.5, 1.9));
    else if (roll < 0.68) push('STOP', between(3, 16));
    else if (roll < 0.8) push('FAULT', between(6, 24));
    else if (roll < 0.9) push('CHANGE', between(8, 14));
    else push('SLOW', between(6, 15));
  }
  addSpan(machineId, forced[n]?.stateCode ?? 'RUN', horizon, null);
}

// Live events at fixture time, one per lifecycle stage so the demo shows the whole workflow.
const live: AndonEvent[] = [
  { id: 'live-m07', machineId: 'mch-07', stateCode: 'FAULT', status: 'IN_PROGRESS', startedAt: at('14:32:11'), acknowledgedAt: at('14:33:02'), classifiedAt: at('14:34:20'), assignedAt: at('14:35:02'), arrivedAt: at('14:39:40'), l1: 'Machine', reasonId: 'rsn-motor-overload', ruleId: 'rul-a01', ownerDepartmentId: 'dep-mtn', assigneeId: 'per-ardi', workOrderId: 'WO-48213', note: 'Overload relay tripped twice this shift.' },
  { id: 'live-m03', machineId: 'mch-03', stateCode: 'STOP', status: 'ASSIGNED', startedAt: at('14:33:11'), acknowledgedAt: at('14:34:30'), classifiedAt: at('14:35:10'), assignedAt: at('14:35:40'), l1: 'Material', reasonId: 'rsn-material-late', ruleId: 'rul-a03', ownerDepartmentId: 'dep-whs', assigneeId: 'per-bayu' },
  { id: 'live-m09', machineId: 'mch-09', stateCode: 'FAULT', status: 'DETECTED', startedAt: at('14:28:22') },
];
events.push(...live);
for (const e of live) spans.find((s) => s.machineId === e.machineId && s.end === null)!.eventId = e.id;

// Number events in time order so the featured Polishing #07 stop lands on A-10291.
events.sort((a, b) => a.startedAt - b.startedAt);
const anchor = events.findIndex((e) => e.id === 'live-m07');
const idMap = new Map(events.map((e, i) => [e.id, `A-${10291 - (anchor - i)}`]));
for (const e of events) e.id = idMap.get(e.id)!;
spans.forEach((s, i) => {
  s.id = `spn-${pad(i + 1, 4)}`;
  if (s.eventId) s.eventId = idMap.get(s.eventId);
});

// ---------- 30-day loss history ----------
const history: LossHistory[] = [];
reasonSeeds.forEach(([, , l3, , , , , monthMin]) => {
  const reasonId = `rsn-${slug(l3)}`;
  const weights = machines.map((m) => (l3 === 'Motor Overload' && m.tag === 'M07' ? 0 : between(0.2, 1)));
  const budget = l3 === 'Motor Overload' ? monthMin - 261 : monthMin;
  const total = weights.reduce((a, b) => a + b, 0);
  machines.forEach((m, i) => {
    const minutes = l3 === 'Motor Overload' && m.tag === 'M07' ? 261 : Math.round((budget * weights[i]!) / total);
    if (minutes < 8) return;
    const occurrences = l3 === 'Motor Overload' && m.tag === 'M07' ? 27 : Math.max(1, Math.round(minutes / between(6, 22)));
    history.push({ id: `los-${slug(l3)}-${m.tag.toLowerCase()}`, reasonId, machineId: m.id, minutes, occurrences });
  });
});

const insights: Insight[] = [
  { id: 'ins-01', machineId: 'mch-07', stage: 'Predictive', title: 'Performance loss up 14% over the last 5 shifts', pattern: 'Motor current rises 20 to 30 minutes before each cycle slowdown.', correlation: 'Motor or bearing resistance.', recommendation: 'Inspect the spindle motor and bearing before Shift 2 tomorrow.', confidence: 0.82, dismissed: false },
  { id: 'ins-02', machineId: 'mch-03', stage: 'Diagnostic', title: 'Material Late repeats at the 14:30 kanban run', pattern: '9 of the last 12 Material Late stops started between 14:20 and 14:45.', correlation: 'Warehouse shift handover overlaps the afternoon kanban route.', recommendation: 'Move the Casting Line kanban run to 14:00 for two weeks and compare.', confidence: 0.74, dismissed: false },
  { id: 'ins-03', machineId: 'mch-06', stage: 'Diagnostic', title: 'Cycle time runs 15% above ideal after each wheel change', pattern: 'Reduced Speed follows 6 of 7 polishing wheel changes and lasts about 40 minutes.', correlation: 'Wheel run-in parameters are set by hand per operator.', recommendation: 'Store the run-in recipe on the PLC and lock it per SKU.', confidence: 0.68, dismissed: false },
  { id: 'ins-04', machineId: 'mch-09', stage: 'Descriptive', title: 'Camera faults cluster in the last hour of Shift 1', pattern: '5 vision faults this week, all after 14:00.', correlation: 'Afternoon sun on the inspection window raises the exposure error rate.', recommendation: 'Fit the light hood that Line B already uses and re-teach exposure.', confidence: 0.61, dismissed: false },
];

// ---------- quality: defect master and hand-logged rejects (generated last so earlier data keeps its random sequence) ----------
const defects: DefectReason[] = [
  ['Surface', 'Scratch'], ['Surface', 'Dent'], ['Surface', 'Stain'], ['Dimension', 'Thickness Out'], ['Dimension', 'Edge Burr'],
  ['Weight', 'Underweight'], ['Weight', 'Overweight'], ['Visual', 'Blurred Stamp'], ['Visual', 'Off-centre Stamp'],
].map(([category, name]) => ({ id: `def-${slug(name!)}`, category: category!, name: name!, disposition: category === 'Surface' || name === 'Edge Burr' ? 'REWORK' as const : 'SCRAP' as const }));
const defectWeights = [9, 5, 3, 4, 3, 2, 1, 4, 2];
const weightedDefect = () => {
  let roll = rnd() * defectWeights.reduce((a, b) => a + b, 0);
  return defects[defectWeights.findIndex((w) => (roll -= w) < 0)]!;
};
const rejects: RejectEntry[] = Array.from({ length: 34 }, (_, i) => ({
  id: `rej-${pad(i + 1, 3)}`,
  machineId: pick(machines).id,
  defectId: weightedDefect().id,
  qty: Math.round(between(2, 14)),
  at: Math.round(between(SHIFT_START + 10 * MIN, FIXTURE_NOW - 5 * MIN)),
  byId: pick(['per-sari', 'per-dewi', 'per-agus']),
})).sort((a, b) => a.at - b.at);

// Escalation channels: the first red step goes to WhatsApp, the top of the ladder also gets an email.
for (const rule of rules) rule.escalations.forEach((step, i, all) => { step.channel = i === all.length - 1 && all.length > 2 ? 'EMAIL' : 'WHATSAPP'; });

// Planned downtime for the planned-vs-unplanned split: relabel a few changeovers as cleaning and preventive maintenance.
const changeovers = spans.filter((s) => s.stateCode === 'CHANGE');
changeovers.slice(0, 3).forEach((s) => { s.stateCode = 'CLEAN'; });
changeovers.slice(3, 5).forEach((s) => { s.stateCode = 'PM'; });

// ---------- everything below uses its own random stream so the shift data above never shifts ----------
const rnd2 = mulberry32(7);
const between2 = (lo: number, hi: number) => lo + rnd2() * (hi - lo);

const orders: ProductionOrder[] = machines.map((m, i) => {
  const potential = ((FIXTURE_NOW - SHIFT_START - 30 * MIN) / 1000) / m.idealCycleSec;
  const next = products[(products.findIndex((p) => p.id === m.productId) + 1) % products.length]!;
  return { id: `PO-${24100 + i * 7}`, batchNo: `B-0921-${pad(i + 1)}`, machineId: m.id, productId: m.productId, targetQty: Math.round((potential * between2(0.86, 1.04)) / 50) * 50, startedAt: SHIFT_START, nextProductId: next.id, changeoverMin: Math.round(between2(10, 18)) };
});

const thresholds: ThresholdRule[] = [
  { id: 'thr-plant-oee', name: 'Plant OEE under world class', metric: 'OEE', scope: 'PLANT', below: 85, notifyRole: 'Production Manager', active: true },
  { id: 'thr-line-b-avail', name: 'Polishing availability', metric: 'AVAILABILITY', scope: 'LINE', scopeId: 'lin-b', below: 90, notifyRole: 'Production Supervisor', active: true },
  { id: 'thr-m07-oee', name: 'Polishing #07 OEE', metric: 'OEE', scope: 'MACHINE', scopeId: 'mch-07', below: 75, notifyRole: 'Maintenance Leader', active: true },
  { id: 'thr-line-c-quality', name: 'Packing quality', metric: 'QUALITY', scope: 'LINE', scopeId: 'lin-c', below: 98, notifyRole: 'QC Leader', active: true },
];

/**
 * A year of history, one row per production day, machine and shift: [daysAgo, machineIndex, shiftIndex, planned, run, idealOutput, good] in minutes.
 * OEE climbs about seven points over the year, night shift trails, Sundays are off.
 */
const DAY = 86_400_000;
const trend: number[][] = [];
for (let daysAgo = 365; daysAgo >= 1; daysAgo--) {
  if (new Date(FIXTURE_NOW - daysAgo * DAY + 7 * 3_600_000).getUTCDay() === 0) continue;
  const progress = 1 - daysAgo / 365;
  const dayMood = between2(-0.025, 0.025);
  machines.forEach((m, mi) => {
    const rec = production[mi]!;
    for (let si = 0; si < 3; si++) {
      const planned = 450;
      const availability = Math.min(0.97, 0.8 + 0.08 * progress + (rec.speedFactor - 0.94) * 0.6 + dayMood - (si === 2 ? 0.03 : 0) + between2(-0.04, 0.04));
      const performance = Math.min(0.99, rec.speedFactor - 0.04 + 0.03 * progress - (si === 2 ? 0.015 : 0) + between2(-0.025, 0.025));
      const quality = Math.min(0.999, rec.yieldFactor - 0.008 + 0.006 * progress + between2(-0.006, 0.004));
      const run = Math.round(planned * availability);
      const ideal = Math.round(run * performance);
      trend.push([daysAgo, mi, si, planned, run, ideal, Math.round(ideal * quality)]);
    }
  });
}

const seed = { fixtureNow: FIXTURE_NOW, shiftStart: SHIFT_START, plant, departments, lines, machines, states, reasons, rules, products, cycleTimes, shifts, calendar, mappings, people, production, spans, events, history, insights, defects, rejects, orders, thresholds, trend };
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/fixtures/data/seed.json');
mkdirSync(dirname(out), { recursive: true });
// The trend table is large, so it goes in compact; everything else stays readable.
const { trend: trendRows, ...readable } = seed;
writeFileSync(out, `${JSON.stringify(readable, null, 1).slice(0, -2)},\n "trend": ${JSON.stringify(trendRows)}\n}`);
console.log(`seed.json: ${machines.length} machines, ${spans.length} spans, ${events.length} events, ${history.length} history rows, ${rejects.length} rejects`);
