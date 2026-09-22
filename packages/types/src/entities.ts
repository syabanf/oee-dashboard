import type { AndonLevel, DayKind, Disposition, EventStatus, IntegrationSource, LossClass, MaturityStage, MessageDirection, MessageSystem, NotifyChannel, OeeMetric, Priority, WorkOrderStatus } from './enums';

export interface Plant { id: string; name: string; company: string }
export interface Department { id: string; plantId: string; name: string; /** Support departments own Andon responses, production departments own lines. */ kind: 'PRODUCTION' | 'SUPPORT' }
export interface Line { id: string; departmentId: string; name: string; code: string }

export interface Machine {
  id: string;
  /** Canonical internal id. PLC tags and CMMS asset ids map to it, never replace it. */
  code: string;
  tag: string;
  name: string;
  lineId: string;
  machineType: string;
  manufacturer: string;
  plc: string;
  protocol: string;
  ipAddress: string;
  idealCycleSec: number;
  ratedCapacityPerHour: number;
  targetAvailability: number;
  targetPerformance: number;
  targetQuality: number;
  targetOee: number;
  cmmsAssetId: string;
  active: boolean;
  productId: string;
  stateCode: string;
  stateSince: number;
}

export interface MachineState {
  id: string;
  code: string;
  name: string;
  lossClass: LossClass;
  andonLevel: AndonLevel;
  /** Share of ideal output the machine still makes in this state: 1 running, 0.8 reduced speed, 0 stopped. */
  outputFactor: number;
  description: string;
}

export interface DowntimeReason {
  id: string;
  l1: string;
  l2: string;
  l3: string;
  ownerDepartmentId: string;
  slaMin: number;
  lossClass: LossClass;
  createsWorkOrder: boolean;
  requiresComment: boolean;
}

export interface EscalationStep { afterMin: number; role: string; channel: NotifyChannel }
export interface AndonRule {
  id: string;
  code: string;
  name: string;
  /** Reason category (L1) this rule routes. */
  l1: string;
  priority: Priority;
  triggerAfterSec: number;
  notifyRole: string;
  escalations: EscalationStep[];
}

export interface Product { id: string; sku: string; name: string; category: string; valuePerPcs: number }
export interface CycleTime { id: string; machineId: string; productId: string; idealCycleSec: number }
export interface Shift { id: string; name: string; start: string; end: string; breakStart: string; breakEnd: string }
export interface CalendarDay { id: string; date: string; label: string; kind: DayKind }
export interface IntegrationMapping { id: string; machineId: string; source: IntegrationSource; externalId: string }
export interface Person { id: string; name: string; role: string; departmentId: string; color: string }

export interface AndonEvent {
  id: string;
  machineId: string;
  stateCode: string;
  status: EventStatus;
  startedAt: number;
  acknowledgedAt?: number;
  classifiedAt?: number;
  assignedAt?: number;
  arrivedAt?: number;
  resolvedAt?: number;
  verifiedAt?: number;
  l1?: string;
  reasonId?: string;
  ruleId?: string;
  ownerDepartmentId?: string;
  assigneeId?: string;
  workOrderId?: string;
  note?: string;
  partsUsed?: string;
  /** Who opened the event: the state engine after the silent phase, or a person pulling the Andon. */
  source?: 'STATE_ENGINE' | 'PERSON';
}

/** The CMMS side of a downtime event. Created on assignment when the reason asks for one. */
export interface WorkOrder {
  id: string;
  eventId: string;
  machineId: string;
  assetId: string;
  title: string;
  status: WorkOrderStatus;
  createdAt: number;
  updatedAt: number;
  technicianId?: string;
  downtimeMin?: number;
  partsUsed?: string;
}

/** One request or inbound payload in the integration log. `payload` is pretty-printed JSON. */
export interface IntegrationMessage {
  id: string;
  at: number;
  direction: MessageDirection;
  system: MessageSystem;
  method: string;
  path: string;
  summary: string;
  status: number;
  latencyMs: number;
  payload: string;
  eventId?: string;
}

export interface DefectReason { id: string; category: string; name: string; /** What usually happens to a part with this defect. */ disposition: Disposition }
/** Rejects a person logged at the line or the QC station, on top of what inline inspection catches. */
export interface RejectEntry { id: string; machineId: string; defectId: string; qty: number; at: number; byId?: string }

/** The job a machine runs now, and the changeover that follows it. */
export interface ProductionOrder {
  id: string;
  batchNo: string;
  machineId: string;
  productId: string;
  targetQty: number;
  startedAt: number;
  nextProductId: string;
  changeoverMin: number;
}

/** Alert when a metric for a plant, line or machine falls below a floor. Evaluated on the shift so far. */
export interface ThresholdRule {
  id: string;
  name: string;
  metric: OeeMetric;
  scope: 'PLANT' | 'LINE' | 'MACHINE';
  scopeId?: string;
  /** Floor in percent. */
  below: number;
  notifyRole: string;
  active: boolean;
}

/** One stretch of a single machine state. `end: null` means still open. */
export interface StateSpan { id: string; machineId: string; stateCode: string; start: number; end: number | null; eventId?: string }

/** Actual speed against ideal while running (0..1) and first-pass yield (0..1). Counts derive from state spans. */
export interface ProductionRecord { machineId: string; speedFactor: number; yieldFactor: number }

/** 30-day loss history per reason, the input for the loss tree and the opportunity ranking. */
export interface LossHistory { id: string; reasonId: string; machineId: string; minutes: number; occurrences: number }

export interface Insight {
  id: string;
  machineId: string;
  stage: MaturityStage;
  title: string;
  pattern: string;
  correlation: string;
  recommendation: string;
  confidence: number;
  dismissed: boolean;
}
