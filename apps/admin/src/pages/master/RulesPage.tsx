import * as React from 'react';
import { BellRing, Pencil, Plus, Siren, Timer, Trash2, TriangleAlert } from 'lucide-react';
import type { AndonRule, Priority } from '@oee/types';
import { NOTIFY_CHANNEL_LABEL, PRIORITIES, PRIORITY_LABEL } from '@oee/types';
import { Button, Card, EmptyState, PageHeader, SplitStats } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { PriorityBadge } from '../../components/badges';
import { ChipGroup, FilterBar, SearchFilter, SummaryCards } from '../../components/FilterBar';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { RuleDialog, emptyRule } from '../../components/master/RuleDialog';

export function RulesPage() {
  const { rules, events, dispatch } = useScoped();
  const [editing, setEditing] = React.useState<AndonRule | null>(null);
  const [removing, setRemoving] = React.useState<AndonRule | null>(null);
  const [priority, setPriority] = React.useState<Priority | ''>('');
  const [q, setQ] = React.useState('');
  const needle = q.trim().toLowerCase();
  const shown = rules.filter(
    (r) =>
      (!priority || r.priority === priority) &&
      (!needle ||
        `${r.code} ${r.name} ${r.l1} ${r.notifyRole} ${r.escalations.map((s) => s.role).join(' ')}`
          .toLowerCase()
          .includes(needle)),
  );
  const lastStep = (r: AndonRule) => r.escalations.at(-1)?.afterMin ?? r.triggerAfterSec / 60;
  return (
    <div>
      <PageHeader
        title="Andon Rules"
        description="Andon is an escalation engine. Each rule says when a stop becomes an alarm, who hears first, and who hears next if nobody fixes it."
        actions={
          <Button onClick={() => setEditing(emptyRule())}>
            <Plus />
            Add rule
          </Button>
        }
      />
      <div className="mb-4 space-y-4">
        <SummaryCards
          items={[
            {
              label: 'Andon rules',
              value: rules.length,
              hint: `${new Set(rules.map((r) => r.l1)).size} reason categories routed`,
              icon: <Siren />,
              tone: 'ink',
            },
            {
              label: 'Critical',
              value: rules.filter((r) => r.priority === 'CRITICAL').length,
              hint: 'Click to show only these',
              icon: <TriangleAlert />,
              tone: 'danger',
              active: priority === 'CRITICAL',
              onClick: () => setPriority(priority === 'CRITICAL' ? '' : 'CRITICAL'),
            },
            {
              label: 'Longest ladder',
              value: `${Math.max(0, ...rules.map(lastStep))} min`,
              hint: 'Until the top role hears',
              icon: <Timer />,
              tone: 'warning',
            },
            {
              label: 'Events routed today',
              value: events.filter((e) => e.ruleId).length,
              hint: `${events.filter((e) => !e.ruleId).length} without a rule yet`,
              icon: <BellRing />,
              tone: 'info',
            },
          ]}
        />
        <FilterBar
          count={shown.length}
          total={rules.length}
          noun="rules"
          onClear={
            priority || q
              ? () => {
                  setPriority('');
                  setQ('');
                }
              : undefined
          }
        >
          <SearchFilter value={q} onChange={setQ} placeholder="Search rule, category or role" />
          <ChipGroup
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: '', label: 'All' },
              ...PRIORITIES.map((p) => ({
                value: p,
                label: PRIORITY_LABEL[p],
                count: rules.filter((r) => r.priority === p).length,
              })),
            ]}
          />
        </FilterBar>
      </div>
      {rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Siren />}
            title="No Andon rules"
            description="Without a rule, stops never escalate."
            action={<Button onClick={() => setEditing(emptyRule())}>Add rule</Button>}
          />
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((rule) => (
          <Card key={rule.id} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="bg-surface flex size-[42px] shrink-0 items-center justify-center rounded-[13px] font-mono text-xs font-bold">
                {rule.code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{rule.name}</p>
                <p className="text-muted text-xs">Routes {rule.l1} stops</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit ${rule.name}`}
                onClick={() => setEditing(rule)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-accent size-8"
                aria-label={`Delete ${rule.name}`}
                onClick={() => setRemoving(rule)}
              >
                <Trash2 />
              </Button>
            </div>
            <ol className="my-4 space-y-2 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="bg-warning size-2 shrink-0 rounded-full" />
                <span className="text-muted w-14 shrink-0 font-mono text-xs">
                  T+{rule.triggerAfterSec}s
                </span>
                <span className="truncate">{rule.notifyRole}</span>
              </li>
              {rule.escalations.map((s) => (
                <li key={`${s.afterMin}-${s.role}`} className="flex items-center gap-2.5">
                  <span className="bg-accent size-2 shrink-0 rounded-full" />
                  <span className="text-muted w-14 shrink-0 font-mono text-xs">
                    T+{s.afterMin}m
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.role}</span>
                  <span className="text-muted shrink-0 text-xs">
                    {NOTIFY_CHANNEL_LABEL[s.channel]}
                  </span>
                </li>
              ))}
            </ol>
            <SplitStats
              items={[
                { label: 'Priority', value: <PriorityBadge priority={rule.priority} /> },
                { label: 'Steps', value: rule.escalations.length + 1 },
                { label: 'Events today', value: events.filter((e) => e.ruleId === rule.id).length },
              ]}
            />
          </Card>
        ))}
      </div>
      <RuleDialog rule={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete
        open={!!removing}
        title={`Delete ${removing?.name}?`}
        description={`${removing?.l1} stops fall back to the Waiting for a reason ladder.`}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) dispatch({ type: 'rules/remove', id: removing.id });
          setRemoving(null);
        }}
      />
    </div>
  );
}
