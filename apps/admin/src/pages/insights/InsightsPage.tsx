import { Link } from 'react-router';
import * as React from 'react';
import { Check, Cog, Sparkles, Target } from 'lucide-react';
import type { MaturityStage } from '@oee/types';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ChipGroup, FilterBar, SummaryCards } from '../../components/FilterBar';

const LEVELS = ['Machine connectivity', 'Machine state', 'OEE', 'Andon', 'Reason and loss classification', 'Response workflow', 'Root cause analytics', 'Prediction', 'AI recommendation'];
/** Levels 1 to 6 run in this demo plant, level 7 is being built. */
const REACHED = 6;
const STAGES: MaturityStage[] = ['Descriptive', 'Diagnostic', 'Predictive', 'Prescriptive'];

export function InsightsPage() {
  const { insights, machineById, dispatch } = useScoped();
  const [stage, setStage] = React.useState<MaturityStage | ''>('');
  const pending = insights.filter((i) => !i.dismissed);
  const open = pending.filter((i) => !stage || i.stage === stage);
  return (
    <div className="space-y-4">
      <PageHeader title="AI Insights" description="AI comes last. It reads clean machine states, classified losses and response data, so those layers come first." className="mb-2" />
      <SummaryCards items={[
        { label: 'Open insights', value: pending.length, hint: `${insights.length - pending.length} dismissed`, icon: <Sparkles />, tone: 'ink' },
        { label: 'Machines flagged', value: new Set(pending.map((i) => i.machineId)).size, hint: 'With at least one open insight', icon: <Cog />, tone: 'warning' },
        { label: 'Predictive or better', value: pending.filter((i) => i.stage === 'Predictive' || i.stage === 'Prescriptive').length, hint: 'Warn before the loss happens', icon: <Target />, tone: 'info' },
        { label: 'Average confidence', value: `${Math.round((pending.reduce((a, i) => a + i.confidence, 0) / Math.max(1, pending.length)) * 100)}%`, hint: 'Across open insights', icon: <Check />, tone: 'success' },
      ]} />
      <FilterBar count={open.length} total={pending.length} noun="insights" onClear={stage ? () => setStage('') : undefined}>
        <ChipGroup label="Stage" value={stage} onChange={setStage} options={[{ value: '', label: 'All stages' }, ...STAGES.map((s) => ({ value: s, label: s, count: pending.filter((i) => i.stage === s).length }))]} />
      </FilterBar>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Maturity ladder</CardTitle><CardDescription>{STAGES.join(' → ')}</CardDescription></CardHeader>
          <CardContent>
            <ol className="space-y-1.5">
              {LEVELS.map((label, i) => {
                const done = i < REACHED, current = i === REACHED;
                return (
                  <li key={label} className={cn('flex items-center gap-3 rounded-2xl p-2.5 text-sm', current ? 'bg-ink text-on-ink' : done ? 'bg-surface-2' : 'text-muted')}>
                    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', done ? 'bg-success-soft text-success' : current ? 'bg-white/15' : 'bg-surface')}>{done ? <Check className="size-3.5" /> : i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                    {current ? <span className="text-[11px] font-semibold text-on-ink-muted">In progress</span> : null}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {open.map((insight) => {
            const machine = machineById.get(insight.machineId);
            return (
              <Card key={insight.id}>
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[13px] bg-info-soft text-info"><Sparkles className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">OEE Intelligence · {machine?.name}</p>
                    <CardTitle className="mt-0.5">{insight.title}</CardTitle>
                  </div>
                  <Badge variant="info">{insight.stage}</Badge>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[['Pattern detected', insight.pattern], ['Possible correlation', insight.correlation], ['Recommendation', insight.recommendation]].map(([label, text], i) => (
                      <div key={label} className={cn('rounded-2xl p-4', i === 2 ? 'bg-ink text-on-ink' : 'bg-surface-2')}>
                        <dt className={cn('text-[11px] font-semibold uppercase tracking-wider', i === 2 ? 'text-on-ink-muted' : 'text-muted')}>{label}</dt>
                        <dd className="mt-1 text-sm font-medium leading-snug">{text}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">Confidence {Math.round(insight.confidence * 100)}% · illustrative output for the demo</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'insights/dismiss', id: insight.id })}>Dismiss</Button>
                      {machine ? <Button asChild variant="secondary" size="sm"><Link to={`/machines/${machine.id}`}>Open machine</Link></Button> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {open.length === 0 ? <Card><EmptyState icon={<Sparkles />} title="No open insights" description="New patterns appear here as loss data accumulates." action={<Button asChild variant="outline"><Link to="/losses">Open loss intelligence</Link></Button>} /></Card> : null}
        </div>
      </div>
    </div>
  );
}
