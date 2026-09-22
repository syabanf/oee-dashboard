import type {
  AndonEvent, AndonRule, CalendarDay, CycleTime, DefectReason, Department, DowntimeReason, Insight, IntegrationMapping, Line, LossHistory,
  Machine, MachineState, Person, Plant, Product, ProductionOrder, ProductionRecord, RejectEntry, Shift, StateSpan, ThresholdRule,
} from '@oee/types';
import raw from '../data/seed.json';

export interface Seed {
  fixtureNow: number;
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
  /** [daysAgo, machineIndex, shiftIndex, planned, run, idealOutput, good], minutes. */
  trend: number[][];
}

export const seed = raw as Seed;
