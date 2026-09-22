import * as React from 'react';
import { Link } from 'react-router';
import { ChevronRight, Coins, Hourglass, Target, TrendingUp } from 'lucide-react';
import type { LossClass } from '@oee/types';
import { LOSS_CLASS_LABEL } from '@oee/types';
import { HISTORY_DAYS, fmtHm, fmtIdrShort, fmtInt, fmtPct, fmtPts, lossTree, opportunities, plannedMonthMin, type LossNode } from '@oee/fixtures';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Combobox, PageHeader, StatCard, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { LOSS_FILL, LossClassBadge } from '../../components/badges';
import { ChipGroup, FilterBar, FilterPill } from '../../components/FilterBar';

const MIN = 60_000;

export function LossesPage() {
  const { history, machines, reasonById, machineById, productById, departmentById } = useScoped();
  const [machine, setMachine] = React.useState('');
  const [path, setPath] = React.useState<string[]>([]);
  const [cut, setCut] = React.useState(50);
  const [component, setComponent] = React.useState<LossClass | ''>('');

  const rows = history.filter((h) => (!machine || h.machineId === machine) && (!component || reasonById.get(h.reasonId)?.lossClass === component));
  const planned = plannedMonthMin(machine ? 1 : machines.filter((m) => m.active).length);
  const tree = React.useMemo(() => lossTree(rows, reasonById, LOSS_CLASS_LABEL), [rows, reasonById]);
  const ranked = React.useMemo(() => opportunities(rows, reasonById, machineById, productById, planned), [rows, reasonById, machineById, productById, planned]);

  // Walk the drill-down path; a stale key (after a filter change) stops the walk at the last valid level.
  let nodes = tree;
  const crumbs: LossNode[] = [];
  for (const key of path) {
    const hit = nodes.find((n) => n.key === key);
    if (!hit) break;
    crumbs.push(hit);
    nodes = hit.children;
  }
  const lossClass = (crumbs[0]?.key ?? undefined) as LossClass | undefined;
  const levelMax = Math.max(1, ...nodes.map((n) => n.minutes));
  const total = rows.reduce((a, h) => a + h.minutes, 0);
  const top = ranked[0];
  // Machines that carry the node at the end of the drill path (or everything, at the root).
  const leafReasons = new Set<string>();
  const collect = (n: LossNode) => (n.children.length ? n.children.forEach(collect) : leafReasons.add(n.key));
  (crumbs.at(-1)?.children ?? tree).forEach(collect);
  if (crumbs.length && crumbs.at(-1)!.children.length === 0) leafReasons.add(crumbs.at(-1)!.key);
  const carriers = new Map<string, { minutes: number; occurrences: number }>();
  for (const h of rows) {
    if (!leafReasons.has(h.reasonId)) continue;
    const c = carriers.get(h.machineId) ?? { minutes: 0, occurrences: 0 };
    carriers.set(h.machineId, { minutes: c.minutes + h.minutes, occurrences: c.occurrences + h.occurrences });
  }
  const carrierRows = [...carriers].sort((a, b) => b[1].minutes - a[1].minutes).slice(0, 6);
  const carrierMax = carrierRows[0]?.[1].minutes ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader title="Loss Intelligence" description={`Last ${HISTORY_DAYS} days. OEE says where production time went. This page says what it is worth to get it back.`} className="mb-2" />
      <FilterBar count={rows.length} total={history.length} noun="loss records" onClear={machine || component ? () => { setMachine(''); setComponent(''); setPath([]); } : undefined}>
        <FilterPill><Combobox variant="inline" label="Machine" value={machine} onChange={(id) => { setMachine(id); setPath([]); }} placeholder="All machines" options={[{ value: '', label: 'All machines' }, ...machines.map((m) => ({ value: m.id, label: `${m.tag} · ${m.name}`, hint: m.code }))]} /></FilterPill>
        <ChipGroup label="OEE component" value={component} onChange={(c) => { setComponent(c); setPath([]); }} options={[{ value: '', label: 'All losses' }, { value: 'AVAILABILITY', label: 'Availability' }, { value: 'PERFORMANCE', label: 'Performance' }, { value: 'QUALITY', label: 'Quality' }]} />
      </FilterBar>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Lost production time" value={fmtHm(total * MIN)} hint={`${fmtPct(total / planned)} of planned time`} icon={<Hourglass />} tone="ink" />
        <StatCard label="Biggest loss group" value={top ? `${top.l1} · ${top.l2}` : 'None'} hint={top ? `${fmtHm(top.minutes * MIN)} · ${top.occurrences}x` : undefined} icon={<Target />} tone="danger" />
        <StatCard label={`OEE back at ${cut}% cut`} value={fmtPts(((top?.oeeGain ?? 0) * cut) / 100)} hint="From the biggest group alone" icon={<TrendingUp />} tone="success" />
        <StatCard label="Value of all losses" value={fmtIdrShort(ranked.reduce((a, o) => a + o.value, 0))} hint="Per month at ideal cycle" icon={<Coins />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>OEE loss tree</CardTitle>
            <nav aria-label="Loss tree path" className="flex flex-wrap items-center gap-1 text-sm">
              <button type="button" onClick={() => setPath([])} className={cn('rounded-full px-2 py-0.5 hover:bg-surface', crumbs.length === 0 ? 'font-semibold' : 'text-muted')}>OEE loss</button>
              {crumbs.map((c, i) => (
                <React.Fragment key={c.key}><ChevronRight className="size-3.5 text-muted" /><button type="button" onClick={() => setPath(path.slice(0, i + 1))} className={cn('rounded-full px-2 py-0.5 hover:bg-surface', i === crumbs.length - 1 ? 'font-semibold' : 'text-muted')}>{c.label}</button></React.Fragment>
              ))}
            </nav>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {nodes.map((n) => {
              const leaf = n.children.length === 0;
              const fill = LOSS_FILL[lossClass ?? (n.key as LossClass)];
              return (
                <button key={n.key} type="button" disabled={leaf} onClick={() => setPath([...crumbs.map((c) => c.key), n.key])} className="group block w-full rounded-2xl p-3 text-left enabled:hover:bg-surface-2">
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-1 font-semibold"><span className="truncate">{n.label}</span>{leaf ? null : <ChevronRight className="size-4 shrink-0 text-muted group-hover:text-foreground" />}</span>
                    <span className="shrink-0 tabular-nums"><span className="font-bold">{fmtHm(n.minutes * MIN)}</span><span className="ml-2 text-xs text-muted">{n.occurrences}x · {fmtPct(n.minutes / planned)} OEE</span></span>
                  </span>
                  <span className="mt-2 block h-2 rounded-full bg-surface"><span className={cn('block h-full rounded-full', fill)} style={{ width: `${(n.minutes / levelMax) * 100}%` }} /></span>
                </button>
              );
            })}
            {nodes.length === 0 ? <p className="py-8 text-center text-sm text-muted">No loss history for this machine.</p> : null}
            {crumbs.length ? <Button variant="outline" size="sm" className="mt-2" onClick={() => setPath(path.slice(0, crumbs.length - 1))}>Back up one level</Button> : null}
            {carrierRows.length ? (
              <section className="mt-4 border-t border-border pt-4">
                <h3 className="px-3 text-[13px] font-bold uppercase tracking-[0.4px]">Machines carrying {crumbs.at(-1)?.label ?? 'all losses'}</h3>
                <ul className="mt-1">
                  {carrierRows.map(([id, c]) => (
                    <li key={id}>
                      <Link to={`/machines/${id}`} className="block rounded-2xl p-3 hover:bg-surface-2">
                        <span className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate font-semibold">{machineById.get(id)?.tag} · {machineById.get(id)?.name}</span><span className="shrink-0 tabular-nums"><span className="font-bold">{fmtHm(c.minutes * MIN)}</span><span className="ml-2 text-xs text-muted">{c.occurrences}x</span></span></span>
                        <span className="mt-2 block h-1.5 rounded-full bg-surface"><span className="block h-full rounded-full bg-ink" style={{ width: `${(c.minutes / carrierMax) * 100}%` }} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div><CardTitle>Top opportunities</CardTitle><CardDescription>Ranked by production time returned, not by downtime count.</CardDescription></div>
            <label className="flex items-center gap-3 rounded-full bg-surface px-4 py-2 text-xs font-semibold">
              Reduce by
              <input type="range" min={10} max={100} step={10} value={cut} onChange={(e) => setCut(Number(e.target.value))} className="w-28 accent-ink" aria-label="Loss reduction percentage" />
              <span className="w-9 text-right tabular-nums">{cut}%</span>
            </label>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranked.slice(0, 5).map((o, i) => (
              <article key={o.key} className={cn('rounded-2xl p-4', i === 0 ? 'bg-ink text-on-ink' : 'bg-surface-2')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold"><span className={cn('mr-2 font-mono', i === 0 ? 'text-on-ink-muted' : 'text-muted')}>#{i + 1}</span>{o.l1} · {o.l2}</h3>
                  {i === 0 ? <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">{LOSS_CLASS_LABEL[o.lossClass]}</span> : <LossClassBadge lossClass={o.lossClass} />}
                </div>
                <p className={cn('mt-1 text-xs', i === 0 ? 'text-on-ink-muted' : 'text-muted')}>Mostly {o.topReason} · owner {departmentById.get(o.ownerDepartmentId)?.name} · {fmtHm(o.minutes * MIN)} a month</p>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {[['OEE', fmtPts((o.oeeGain * cut) / 100)], ['Output', `+${fmtInt((o.pcs * cut) / 100)} pcs`], ['Value', fmtIdrShort((o.value * cut) / 100)]].map(([label, value]) => (
                    <div key={label}><dt className={cn('text-[10.5px] font-medium', i === 0 ? 'text-on-ink-muted' : 'text-muted')}>{label}</dt><dd className="text-[15px] font-extrabold tabular-nums">{value}</dd></div>
                  ))}
                </dl>
              </article>
            ))}
            {top ? <p className="rounded-2xl bg-info-soft px-4 py-3 text-sm text-body">“If we cut <span className="font-semibold">{top.l1} · {top.l2}</span> by {cut}%, OEE rises about <span className="font-semibold">{((top.oeeGain * cut) / 100 * 100).toFixed(1)} percentage points</span>.”</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
