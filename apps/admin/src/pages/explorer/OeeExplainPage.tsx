import { Link, useSearchParams } from 'react-router';
import { aggregateOee, fmtHm, fmtIdr, fmtInt, fmtPct, potentialOee } from '@oee/fixtures';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { LossLegend, OeeWaterfall } from '../../components/charts';
import { BackButton } from '../../components/BackButton';

const Formula = ({ name, value, top, bottom }: { name: string; value: number; top: string; bottom: string }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
    <div className="min-w-0 flex-1"><p className="text-sm font-bold">{name}</p><p className="truncate text-xs text-muted">{top} ÷ {bottom}</p></div>
    <p className="text-xl font-bold tabular-nums">{fmtPct(value)}</p>
  </div>
);

/** Every OEE figure opens this: the times and counts behind it, and the formula that joins them. Scope comes from the URL, so the page stays live and shareable. */
export function OeeExplainPage() {
  const [params] = useSearchParams();
  const { oeeByMachine, machineById } = useScoped();
  const ids = (params.get('m') ?? '').split(',').filter((id) => machineById.has(id));
  const scope = params.get('scope') || (ids.length === 1 ? machineById.get(ids[0]!)?.name : undefined) || 'this selection';
  const result = aggregateOee(ids.flatMap((id) => oeeByMachine.get(id) ?? []));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <BackButton fallback="/oee" />
        <span className="text-muted">·</span>
        <Link to="/oee" className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-black/5 hover:text-foreground">OEE Explorer</Link>
      </div>
      <PageHeader title={`How ${scope} gets to ${fmtPct(result.oee)}`} description={`Shift so far, ${ids.length} ${ids.length === 1 ? 'machine' : 'machines'}. Breaks and planned stops sit outside planned production time.`} className="mb-2" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Planned time to good output</CardTitle><LossLegend /></CardHeader>
          <CardContent><OeeWaterfall result={result} /></CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>The formula</CardTitle><CardDescription>Three ratios, multiplied.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <Formula name="Availability" value={result.availability} top={`run time ${fmtHm(result.runMs)}`} bottom={`planned ${fmtHm(result.plannedMs)}`} />
              <Formula name="Performance" value={result.performance} top={`${fmtInt(result.total)} pcs × ideal cycle`} bottom={`run time ${fmtHm(result.runMs)}`} />
              <Formula name="Quality" value={result.quality} top={`${fmtInt(result.good)} good pcs`} bottom={`${fmtInt(result.total)} total pcs`} />
              <div className="flex items-center gap-3 rounded-2xl bg-ink p-3.5 text-on-ink">
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">OEE</p><p className="truncate text-xs text-on-ink-muted">{fmtPct(result.availability)} × {fmtPct(result.performance)} × {fmtPct(result.quality)}</p></div>
                <p className="text-xl font-bold tabular-nums">{fmtPct(result.oee)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>What it cost</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[['Rejected', `${fmtInt(result.total - result.good)} pcs`], ['Lost against ideal', `${fmtInt(result.lostPcs)} pcs`], ['Lost production value', fmtIdr(result.lostValue)], ['Potential OEE, top 3 losses gone', fmtPct(potentialOee(result))]].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-surface-2 p-3.5"><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 font-bold tabular-nums">{value}</dd></div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
      {ids.length > 1 ? (
        <Card>
          <CardHeader><CardTitle>Machines in this figure</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ids.map((id) => { const m = machineById.get(id)!; return <Link key={id} to={`/oee/explain?scope=${encodeURIComponent(m.name)}&m=${id}`} className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-surface">{m.tag} · {fmtPct(oeeByMachine.get(id)?.oee ?? 0)}</Link>; })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
