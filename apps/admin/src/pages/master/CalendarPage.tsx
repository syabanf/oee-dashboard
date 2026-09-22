import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { DayKind, Shift } from '@oee/types';
import { DAY_KIND_LABEL } from '@oee/types';
import { fmtDay } from '@oee/fixtures';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, SplitStats, type BadgeProps } from '@oee/ui';
import { ConfirmDelete } from '../../components/master/ConfirmDelete';
import { ShiftDialog, emptyShift } from '../../components/master/ShiftDialog';
import { useScoped } from '../../state/app-state';

const KIND_VARIANT: Record<DayKind, NonNullable<BadgeProps['variant']>> = { PRODUCTION: 'success', NON_PRODUCTION: 'muted', HOLIDAY: 'info', OVERTIME: 'warning' };
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const span = (from: string, to: string) => (minutes(to) - minutes(from) + 1440) % 1440;
const planned = (s: Shift) => span(s.start, s.end) - span(s.breakStart, s.breakEnd);

export function CalendarPage() {
  const { shifts, calendar, dispatch } = useScoped();
  const [editing, setEditing] = React.useState<Shift | null>(null);
  const [removing, setRemoving] = React.useState<Shift | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader title="Shifts & Calendar" description="Availability divides by planned production time. Breaks, holidays and non-production days stay out of the denominator." className="mb-2" actions={<Button onClick={() => setEditing(emptyShift())}><Plus />Add shift</Button>} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {shifts.map((s) => (
          <Card key={s.id} className="flex flex-col p-5">
            <div className="flex items-center gap-1"><p className="flex-1 text-base font-semibold">{s.name}</p><Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil /></Button><Button variant="ghost" size="icon" className="size-8 text-accent" aria-label={`Delete ${s.name}`} onClick={() => setRemoving(s)}><Trash2 /></Button></div>
            <p className="mt-1 text-3xl font-bold tabular-nums leading-none tracking-tight">{s.start}<span className="text-muted"> – </span>{s.end}</p>
            <p className="mb-4 mt-2 text-xs text-muted">Break {s.breakStart} – {s.breakEnd}</p>
            <SplitStats items={[{ label: 'Shift', value: `${span(s.start, s.end)} min` }, { label: 'Break', value: `${span(s.breakStart, s.breakEnd)} min` }, { label: 'Planned', value: `${planned(s)} min` }]} />
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Production calendar</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {calendar.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="min-w-0"><span className="block font-semibold">{fmtDay(d.date)}</span><span className="block text-xs text-muted">{d.label}</span></span>
                <Badge variant={KIND_VARIANT[d.kind]} dot>{DAY_KIND_LABEL[d.kind]}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <ShiftDialog shift={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete open={!!removing} title={`Delete ${removing?.name}?`} description="Trend comparisons keep the shift's history under its number." onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) dispatch({ type: 'shifts/remove', id: removing.id }); setRemoving(null); }} />
    </div>
  );
}
