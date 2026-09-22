import * as React from 'react';
import { useSearchParams } from 'react-router';
import { BellOff, BellRing, CircleHelp, SlidersHorizontal, Timer, TimerOff } from 'lucide-react';
import type { AndonEvent } from '@oee/types';
import { fmtDuration, isOpen, needsReason, responseKpis, slaState } from '@oee/fixtures';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  EmptyState,
  PageHeader,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  cn,
} from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { EventListItem } from '../../components/EventListItem';
import { ChipGroup, SearchFilter, SummaryCards } from '../../components/FilterBar';
import { useOpenEvent } from '../../components/useOpenEvent';

const PAGE = 8;
const TABS = [
  { key: 'open', label: 'Needs action', match: (e: AndonEvent) => isOpen(e) },
  { key: 'reason', label: 'Missing reason', match: (e: AndonEvent) => needsReason(e) },
  {
    key: 'resolved',
    label: 'Check fix',
    match: (e: AndonEvent) => e.status === 'RESOLVED',
  },
  { key: 'verified', label: 'Completed', match: (e: AndonEvent) => e.status === 'VERIFIED' },
] as const;

const TAB_HINT: Record<(typeof TABS)[number]['key'], string> = {
  open: 'Oldest first. Open an event and complete the action shown.',
  reason: 'Name the cause so the call reaches the right team.',
  resolved: 'The machine is running. Confirm that the fix is holding.',
  verified: 'Closed stops with a confirmed fix.',
};

export function EventsPage() {
  const { events, departments, machines, machineById, reasonById, viewerId, now } = useScoped();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'open';
  const [mine, setMine] = React.useState(false);
  const [l1, setL1] = React.useState('');
  const [q, setQ] = React.useState('');
  const [late, setLate] = React.useState(false);
  const [owner, setOwner] = React.useState('');
  const [machine, setMachine] = React.useState('');
  const [shown, setShown] = React.useState(PAGE);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [analysisOpen, setAnalysisOpen] = React.useState(false);
  const openEvent = useOpenEvent();

  const breached = (e: AndonEvent) =>
    slaState(e, reasonById.get(e.reasonId ?? ''), now)?.breached ?? false;
  const needle = q.trim().toLowerCase();
  const filtered = events.filter(
    (e) =>
      (!owner || e.ownerDepartmentId === owner) &&
      (!machine || e.machineId === machine) &&
      (!mine || e.assigneeId === viewerId) &&
      (!l1 || (l1 === 'none' ? !e.l1 : e.l1 === l1)) &&
      (!late || breached(e)) &&
      (!needle ||
        `${e.id} ${machineById.get(e.machineId)?.tag} ${machineById.get(e.machineId)?.name} ${reasonById.get(e.reasonId ?? '')?.l3 ?? ''} ${e.workOrderId ?? ''}`
          .toLowerCase()
          .includes(needle)),
  );
  const categories = [...new Set(events.flatMap((e) => e.l1 ?? []))].sort();
  const kpis = responseKpis(filtered);
  const filtersOn = !!(owner || machine || mine || l1 || q || late);
  const activeFilterCount = [owner, machine, mine, l1, late].filter(Boolean).length;
  const clear = () => {
    setOwner('');
    setMachine('');
    setMine(false);
    setL1('');
    setQ('');
    setLate(false);
  };
  // Response is reported per owner department. People see their own numbers on their own page.
  const byDepartment = departments
    .filter((d) => d.kind === 'SUPPORT')
    .map((d) => {
      const owned = events.filter((e) => e.ownerDepartmentId === d.id);
      const withSla = owned.flatMap(
        (e) => slaState(e, reasonById.get(e.reasonId ?? ''), now) ?? [],
      );
      return {
        department: d,
        kpis: responseKpis(owned),
        slaMet: withSla.length ? withSla.filter((s) => !s.breached).length / withSla.length : 1,
      };
    })
    .filter((r) => r.kpis.count > 0);
  const current = TABS.find((t) => t.key === tab)!;
  // Open events oldest first (longest pain on top), history newest first.
  const rows = filtered
    .filter(current.match)
    .sort((a, b) => (tab === 'open' ? a.startedAt - b.startedAt : b.startedAt - a.startedAt));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Andon Events"
        description="See what needs action now, then review completed stops."
        className="mb-2"
      />
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="bg-card shadow-card grid w-full grid-cols-2 gap-1 rounded-[22px] p-1 [scrollbar-width:none] sm:flex sm:w-auto sm:max-w-full sm:overflow-x-auto sm:rounded-full"
          role="tablist"
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setParams(t.key === 'open' ? {} : { tab: t.key }, { replace: true });
                  setShown(PAGE);
                }}
                className={cn(
                  'text-muted flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold sm:px-4 sm:text-sm',
                  active && 'bg-action text-white',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px]',
                    active ? 'bg-white/20' : 'bg-surface',
                  )}
                >
                  {filtered.filter(t.match).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchFilter value={q} onChange={setQ} placeholder="Search id, machine, reason" />
        </div>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal />
          Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </Button>
        {filtersOn ? (
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
        ) : null}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{current.label}</CardTitle>
          <CardDescription>{TAB_HINT[tab]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-5">
          {rows.slice(0, shown).map((e) => (
            <EventListItem key={e.id} event={e} onOpen={(ev) => openEvent(ev.id)} />
          ))}
          {rows.length === 0 ? (
            <EmptyState
              icon={<BellOff />}
              title={`No ${current.label.toLowerCase()} events`}
              description={
                filtersOn
                  ? 'No events match these filters.'
                  : tab === 'open'
                    ? 'No event needs action right now.'
                    : 'Nothing is waiting in this stage.'
              }
              action={
                filtersOn ? (
                  <Button variant="outline" onClick={clear}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {rows.length > shown ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown)} more
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setAnalysisOpen((value) => !value)}>
          {analysisOpen ? 'Hide performance summary' : 'Show performance summary'}
        </Button>
      </div>
      {analysisOpen ? (
        <>
          <SummaryCards
            items={[
              {
                label: 'Needs action',
                value: filtered.filter(isOpen).length,
                hint: 'Open work across the plant',
                icon: <BellRing />,
                tone: 'danger',
              },
              {
                label: 'Missing reason',
                value: filtered.filter(needsReason).length,
                hint: 'Cannot route to the right team yet',
                icon: <CircleHelp />,
                tone: 'warning',
              },
              {
                label: 'Technician has not arrived',
                value: filtered.filter(breached).length,
                hint: 'Click to filter',
                icon: <TimerOff />,
                tone: 'info',
                active: late,
                onClick: () => setLate((value) => !value),
              },
              {
                label: 'Average repair time',
                value: fmtDuration(kpis.mttrMs),
                hint: `Alert seen ${fmtDuration(kpis.mttaMs)} · arrival ${fmtDuration(kpis.responseMs)}`,
                icon: <Timer />,
                tone: 'ink',
              },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Response by owner department</CardTitle>
              <CardDescription>Today. Teams are compared, people are not.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {byDepartment.map(({ department, kpis: departmentKpis, slaMet }) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => setOwner(department.id)}
                  className="bg-surface-2 hover:bg-card hover:shadow-card rounded-2xl p-4 text-left transition-all"
                >
                  <p className="text-sm font-bold">{department.name}</p>
                  <p className="text-muted text-xs">
                    {departmentKpis.count} events · arrival target met {Math.round(slaMet * 100)}%
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ['Ack', departmentKpis.mttaMs],
                      ['Arrive', departmentKpis.responseMs],
                      ['Resolve', departmentKpis.mttrMs],
                    ].map(([label, ms]) => (
                      <div key={label}>
                        <dt className="text-muted text-[10.5px] font-medium">{label}</dt>
                        <dd className="text-[13px] font-extrabold tabular-nums">
                          {fmtDuration(ms as number)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </button>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full max-w-md border-0">
          <SheetHeader>
            <SheetTitle>Filter events</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-5">
            <button
              type="button"
              aria-pressed={mine}
              onClick={() => setMine((v) => !v)}
              className="bg-surface aria-pressed:bg-action flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-semibold aria-pressed:text-white"
            >
              <span>Assigned to me</span>
              <span>{mine ? 'On' : 'Off'}</span>
            </button>
            <Combobox
              label="Owner"
              searchable={false}
              value={owner}
              onChange={setOwner}
              placeholder="All owners"
              options={[
                { value: '', label: 'All owners' },
                ...departments
                  .filter((d) => d.kind === 'SUPPORT')
                  .map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Combobox
              label="Machine"
              value={machine}
              onChange={setMachine}
              placeholder="All machines"
              options={[
                { value: '', label: 'All machines' },
                ...machines.map((m) => ({
                  value: m.id,
                  label: `${m.tag} · ${m.name}`,
                  hint: m.code,
                })),
              ]}
            />
            <div>
              <p className="mb-2 text-sm font-semibold">Category</p>
              <ChipGroup
                label="Category"
                value={l1}
                onChange={setL1}
                className="flex-wrap overflow-visible"
                options={[
                  { value: '', label: 'All categories' },
                  ...categories.map((c) => ({ value: c, label: c })),
                  { value: 'none', label: 'No reason yet' },
                ]}
              />
            </div>
            <button
              type="button"
              aria-pressed={late}
              onClick={() => setLate((v) => !v)}
              className="bg-surface aria-pressed:bg-danger-soft aria-pressed:text-accent-strong flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-semibold"
            >
              <span>Technician has not arrived</span>
              <span>{late ? 'On' : 'Off'}</span>
            </button>
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={clear} disabled={!filtersOn}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              Show {rows.length} {rows.length === 1 ? 'event' : 'events'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
