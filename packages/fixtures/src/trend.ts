import type { Machine, OeeMetric } from '@oee/types';
import { seed } from './seed';

const DAY = 86_400_000;
const WIB = 7 * 3_600_000;

export interface TrendPoint { key: string; label: string; planned: number; run: number; ideal: number; good: number }
export type TrendRange = 'SHIFT' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export const TREND_RANGE_LABEL: Record<TrendRange, string> = { SHIFT: 'Shift', DAY: 'Day', WEEK: 'Week', MONTH: 'Month', YEAR: 'Year' };
/** How far each range looks back, and how it groups days. */
const RANGE: Record<TrendRange, { days: number; bucket: 'shift' | 'day' | 'week' | 'month' }> = {
  SHIFT: { days: 5, bucket: 'shift' }, DAY: { days: 14, bucket: 'day' }, WEEK: { days: 84, bucket: 'week' }, MONTH: { days: 183, bucket: 'month' }, YEAR: { days: 365, bucket: 'month' },
};
const CREWS = ['Crew A', 'Crew B', 'Crew C'];
export type CompareBy = 'SHIFT' | 'LINE' | 'MACHINE' | 'CREW';

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', month: 'short', year: '2-digit' });

const empty = (key: string, label: string): TrendPoint => ({ key, label, planned: 0, run: 0, ideal: 0, good: 0 });
function addRow(p: TrendPoint, row: number[]) { p.planned += row[3]!; p.run += row[4]!; p.ideal += row[5]!; p.good += row[6]!; }

export const trendMetric = (p: TrendPoint, metric: OeeMetric) => {
  const div = (a: number, b: number) => (b > 0 ? a / b : 0);
  return { OEE: div(p.good, p.planned), AVAILABILITY: div(p.run, p.planned), PERFORMANCE: div(p.ideal, p.run), QUALITY: div(p.good, p.ideal) }[metric];
};

/** Crews rotate one shift forward every week. */
const crewOf = (daysAgo: number, shiftIndex: number) => (Math.floor(daysAgo / 7) + shiftIndex) % CREWS.length;

function rowsFor(range: TrendRange, machineIndexes: Set<number>) {
  return seed.trend.filter((r) => r[0]! <= RANGE[range].days && machineIndexes.has(r[1]!));
}

/** OEE history for a set of machines, oldest first, bucketed by the range. */
export function trendSeries(range: TrendRange, machineIndexes: Set<number>): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  for (const row of rowsFor(range, machineIndexes)) {
    const at = seed.fixtureNow - row[0]! * DAY;
    const { bucket } = RANGE[range];
    // Weeks start on Monday in plant time.
    const weekStart = at - ((new Date(at + WIB).getUTCDay() + 6) % 7) * DAY;
    const label = bucket === 'shift' ? `${dayFmt.format(at)} S${row[2]! + 1}` : bucket === 'week' ? `w/c ${dayFmt.format(weekStart)}` : bucket === 'day' ? dayFmt.format(at) : monthFmt.format(at);
    const key = label;
    let p = points.get(key);
    if (!p) points.set(key, (p = empty(key, label)));
    addRow(p, row);
  }
  return [...points.values()];
}

/** The same history cut by shift, line, machine or crew, for side-by-side comparison. */
export function trendCompare(range: TrendRange, by: CompareBy, machines: Machine[], machineIndexes: Set<number>, lineName: (lineId: string) => string, shiftNames: string[]): TrendPoint[] {
  const groups = new Map<string, TrendPoint>();
  for (const row of rowsFor(range, machineIndexes)) {
    const machine = machines[row[1]!];
    if (!machine) continue;
    const [key, label] = by === 'SHIFT' ? [`s${row[2]}`, shiftNames[row[2]!] ?? `Shift ${row[2]! + 1}`]
      : by === 'LINE' ? [machine.lineId, lineName(machine.lineId)]
      : by === 'MACHINE' ? [machine.id, `${machine.tag} · ${machine.name}`]
      : [`c${crewOf(row[0]!, row[2]!)}`, CREWS[crewOf(row[0]!, row[2]!)]!];
    let p = groups.get(key);
    if (!p) groups.set(key, (p = empty(key, label)));
    addRow(p, row);
  }
  return [...groups.values()].sort((a, b) => trendMetric(b, 'OEE') - trendMetric(a, 'OEE'));
}
