import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Download, FileSpreadsheet, Gauge, Printer, Trophy } from 'lucide-react';
import type { OeeMetric } from '@oee/types';
import { OEE_METRICS, OEE_METRIC_LABEL } from '@oee/types';
import { TREND_RANGE_LABEL, aggregateOee, averageTargetOee, fmtClockShort, fmtInt, fmtPct, hourlyOee, toCsv, toExcelHtml, trendCompare, trendMetric, trendSeries, type CompareBy, type TrendRange } from '@oee/fixtures';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Combobox, PageHeader, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { SummaryCards } from '../../components/FilterBar';
import { TrendLine } from '../../components/TrendLine';
import { downloadFile } from '../../lib/download';

type Range = 'HOUR' | TrendRange;
const RANGES: Range[] = ['HOUR', 'SHIFT', 'DAY', 'WEEK', 'MONTH', 'YEAR'];
const RANGE_HINT: Record<Range, string> = { HOUR: 'Today, live', SHIFT: 'Last 5 days', DAY: 'Last 14 days', WEEK: 'Last 12 weeks', MONTH: 'Last 6 months', YEAR: 'Last 12 months' };
const COMPARE: { key: CompareBy; label: string }[] = [{ key: 'SHIFT', label: 'Shift' }, { key: 'LINE', label: 'Line' }, { key: 'MACHINE', label: 'Machine' }, { key: 'CREW', label: 'Crew' }];
const pills = 'h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-muted hover:text-foreground';

interface Row { label: string; oee: number; availability: number; performance: number; quality: number; plannedHours: number }

export function TrendsPage() {
  const { machines, lines, lineById, shifts, oeeByMachine, kpi, shiftStart } = useScoped();
  const [range, setRange] = React.useState<Range>('DAY');
  const [metric, setMetric] = React.useState<OeeMetric>('OEE');
  const [scope, setScope] = React.useState('');
  const [by, setBy] = React.useState<CompareBy>('SHIFT');

  const scoped = machines.filter((m) => m.active && (!scope || m.lineId === scope || m.id === scope));
  const indexes = React.useMemo(() => new Set(scoped.map((m) => machines.indexOf(m))), [scoped, machines]);
  const target = metric === 'OEE' ? averageTargetOee(scoped) : undefined;
  const history: TrendRange = range === 'HOUR' ? 'DAY' : range;

  const rows: Row[] = React.useMemo(() => {
    if (range === 'HOUR') {
      return hourlyOee(scoped, kpi, shiftStart).map((h) => ({ label: fmtClockShort(h.from), oee: h.result.oee, availability: h.result.availability, performance: h.result.performance, quality: h.result.quality, plannedHours: h.result.plannedMs / 3_600_000 }));
    }
    const past = trendSeries(range, indexes).map((p) => ({ label: p.label, oee: trendMetric(p, 'OEE'), availability: trendMetric(p, 'AVAILABILITY'), performance: trendMetric(p, 'PERFORMANCE'), quality: trendMetric(p, 'QUALITY'), plannedHours: p.planned / 60 }));
    if (range !== 'DAY') return past;
    // The daily view ends on today's live shift, so history and the floor meet on one line.
    const today = aggregateOee(scoped.flatMap((m) => oeeByMachine.get(m.id) ?? []));
    return [...past, { label: 'Today', oee: today.oee, availability: today.availability, performance: today.performance, quality: today.quality, plannedHours: today.plannedMs / 3_600_000 }];
  }, [range, scoped, indexes, kpi, shiftStart, oeeByMachine]);

  const pick = (r: Row) => ({ OEE: r.oee, AVAILABILITY: r.availability, PERFORMANCE: r.performance, QUALITY: r.quality })[metric];
  const compare = React.useMemo(() => trendCompare(history, by, machines, indexes, (id) => lineById.get(id)?.name ?? id, shifts.map((s) => s.name)), [history, by, machines, indexes, lineById, shifts]);
  const first = rows[0], last = rows.at(-1);
  const ranked = [...rows].sort((a, b) => pick(b) - pick(a));
  const mean = rows.length ? rows.reduce((a, r) => a + pick(r), 0) / rows.length : 0;
  const change = first && last ? pick(last) - pick(first) : 0;

  const header = ['Period', 'OEE %', 'Availability %', 'Performance %', 'Quality %', 'Planned hours'];
  const table = rows.map((r) => [r.label, (r.oee * 100).toFixed(1), (r.availability * 100).toFixed(1), (r.performance * 100).toFixed(1), (r.quality * 100).toFixed(1), r.plannedHours.toFixed(1)]);
  const scopeName = lineById.get(scope)?.name ?? machines.find((m) => m.id === scope)?.name ?? 'Plant';
  const fileBase = `oee-${range.toLowerCase()}-${scopeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Trends & Reports" description="The same OEE by the hour, shift, day, week, month or year. History runs to yesterday, and the daily view ends on today's live shift." className="mb-2 print:mb-0"
        actions={<div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => downloadFile(`${fileBase}.csv`, 'text/csv', toCsv(header, table))}><Download />CSV</Button>
          <Button variant="outline" onClick={() => downloadFile(`${fileBase}.xls`, 'application/vnd.ms-excel', toExcelHtml(`OEE ${TREND_RANGE_LABEL[history]} · ${scopeName}`, header, table))}><FileSpreadsheet />Excel</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer />PDF</Button>
        </div>} />

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-card p-1 shadow-card [scrollbar-width:none]" role="tablist" aria-label="Time range">
          {RANGES.map((r) => <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn(pills, range === r && 'bg-ink text-on-ink hover:text-on-ink')}>{r === 'HOUR' ? 'Hour' : TREND_RANGE_LABEL[r]}</button>)}
        </div>
        <div className="flex items-center rounded-full bg-card p-1 shadow-card">
          <Combobox variant="inline" label="Scope" value={scope} onChange={setScope} placeholder="Whole plant" options={[{ value: '', label: 'Whole plant' }, ...lines.map((l) => ({ value: l.id, label: l.name, hint: l.code })), ...machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: lineById.get(m.lineId)?.name }))]} />
        </div>
      </div>

      <SummaryCards items={[
        { label: `Latest ${OEE_METRIC_LABEL[metric]}`, value: fmtPct(last ? pick(last) : 0), hint: last?.label, icon: <Gauge />, tone: 'ink' },
        { label: 'Average over the range', value: fmtPct(mean), hint: `${rows.length} periods`, icon: <Gauge />, tone: 'info' },
        { label: 'Best period', value: fmtPct(ranked[0] ? pick(ranked[0]) : 0), hint: `${ranked[0]?.label ?? 'None'} · worst ${ranked.at(-1)?.label ?? 'none'} at ${fmtPct(ranked.at(-1) ? pick(ranked.at(-1)!) : 0)}`, icon: <Trophy />, tone: 'success' },
        { label: 'Change, first to last', value: `${change >= 0 ? '+' : '−'}${Math.abs(change * 100).toFixed(1)} pts`, hint: first && last ? `${first.label} → ${last.label}` : undefined, icon: change >= 0 ? <ArrowUpRight /> : <ArrowDownRight />, tone: change >= 0 ? 'success' : 'danger' },
      ]} />

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div><CardTitle>{OEE_METRIC_LABEL[metric]} · {scopeName}</CardTitle><CardDescription>{RANGE_HINT[range]}{first && last ? `. From ${fmtPct(pick(first))} to ${fmtPct(pick(last))}, ${pick(last) >= pick(first) ? 'up' : 'down'} ${Math.abs((pick(last) - pick(first)) * 100).toFixed(1)} points.` : ''}</CardDescription></div>
          <div className="flex gap-1 rounded-full bg-surface p-1 print:hidden" role="tablist" aria-label="Metric">{OEE_METRICS.map((m) => <button key={m} role="tab" aria-selected={metric === m} onClick={() => setMetric(m)} className={cn('h-8 rounded-full px-3 text-xs font-semibold text-muted', metric === m && 'bg-ink text-on-ink')}>{OEE_METRIC_LABEL[m]}</button>)}</div>
        </CardHeader>
        <CardContent><TrendLine points={rows.map((r) => ({ label: r.label, value: pick(r), note: `${fmtInt(r.plannedHours)} planned machine-hours` }))} target={target} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div><CardTitle>Comparison matrix</CardTitle><CardDescription>{RANGE_HINT[history]}, best first. Crews rotate weekly, so this compares teams, never named people.</CardDescription></div>
            <div className="flex gap-1 rounded-full bg-surface p-1 print:hidden" role="tablist" aria-label="Compare by">{COMPARE.map((c) => <button key={c.key} role="tab" aria-selected={by === c.key} onClick={() => setBy(c.key)} className={cn('h-8 rounded-full px-3 text-xs font-semibold text-muted', by === c.key && 'bg-ink text-on-ink')}>{c.label}</button>)}</div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted"><th className="pb-2 pr-3">{COMPARE.find((c) => c.key === by)?.label}</th>{OEE_METRICS.map((m) => <th key={m} className="pb-2 text-right">{OEE_METRIC_LABEL[m]}</th>)}</tr></thead>
              <tbody>
                {compare.map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <td className="py-2 pr-3 font-semibold">{p.label}</td>
                    {OEE_METRICS.map((m) => {
                      const column = compare.map((c) => trendMetric(c, m));
                      const lo = Math.min(...column), hi = Math.max(...column), v = trendMetric(p, m);
                      // One hue, light to dark: the best cell in each column is the darkest.
                      return <td key={m} className="py-1 pl-1 text-right"><span className="inline-block min-w-16 rounded-lg px-2 py-1 font-semibold tabular-nums" style={{ backgroundColor: `rgb(16 17 18 / ${0.04 + (hi > lo ? (v - lo) / (hi - lo) : 1) * 0.16})` }}>{fmtPct(v)}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Period table</CardTitle><CardDescription>What the exports contain.</CardDescription></CardHeader>
          <CardContent className="max-h-96 overflow-auto print:max-h-none">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">{['Period', 'OEE', 'A', 'P', 'Q'].map((h, i) => <th key={h} className={cn('pb-2', i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
              <tbody>{[...rows].reverse().map((r) => <tr key={r.label} className="border-t border-border tabular-nums"><td className="py-2 font-medium">{r.label}</td><td className="text-right font-bold">{fmtPct(r.oee)}</td><td className="text-right">{fmtPct(r.availability)}</td><td className="text-right">{fmtPct(r.performance)}</td><td className="text-right">{fmtPct(r.quality)}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
