import * as React from 'react';
import { Link } from 'react-router';
import { ChevronRight, Inbox } from 'lucide-react';
import type { AndonEvent } from '@oee/types';
import { eventElapsed, fmtClockShort, fmtDuration, isOpen, slaState } from '@oee/fixtures';
import { Combobox, EmptyState, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ANDON_TONE, SlaBadge } from '../../components/badges';
import { categoryLabel, reasonLabel } from '../../components/ReasonPicker';
import { MobileHeader } from './MobileHeader';

const PAGE = 6;
type Tab = 'new' | 'mine' | 'done';

function nextCallAction(event: AndonEvent) {
  if (!event.l1) return 'Pilih penyebab';
  if (!event.reasonId) return 'Pilih penyebab yang tepat';
  if (!event.assigneeId) return 'Terima panggilan';
  if (event.status === 'ASSIGNED') return 'Tandai sudah tiba';
  if (event.status === 'IN_PROGRESS') return 'Catat perbaikan';
  return 'Lihat detail perbaikan';
}

export function CallsPage() {
  const { events, lines, machineById, reasonById, personById, stateByCode, viewerId, now } =
    useScoped();
  const [tab, setTab] = React.useState<Tab>('new');
  const [line, setLine] = React.useState('');
  const [shown, setShown] = React.useState(PAGE);
  const me = personById.get(viewerId);

  // "New" is work waiting for my department: no owner yet counts for production, who classify stops.
  const forMe = (e: AndonEvent) =>
    e.ownerDepartmentId
      ? e.ownerDepartmentId === me?.departmentId
      : me?.departmentId === 'dep-prod';
  const inLine = events.filter((e) => !line || machineById.get(e.machineId)?.lineId === line);
  const lists: Record<Tab, AndonEvent[]> = {
    new: inLine
      .filter((e) => isOpen(e) && !e.assigneeId && forMe(e))
      .sort((a, b) => a.startedAt - b.startedAt),
    mine: inLine
      .filter((e) => isOpen(e) && e.assigneeId === viewerId)
      .sort((a, b) => a.startedAt - b.startedAt),
    done: inLine
      .filter((e) => !isOpen(e) && e.assigneeId === viewerId)
      .sort((a, b) => b.startedAt - a.startedAt),
  };
  const rows = lists[tab];
  const pick = (next: Tab) => {
    setTab(next);
    setShown(PAGE);
  };

  return (
    <div className="space-y-6">
      <MobileHeader
        kicker={`${me?.role} · ${fmtClockShort(now)}`}
        title={`Halo, ${me?.name.split(' ')[0]}`}
      />
      <Combobox
        label="Lini"
        searchable={false}
        value={line}
        onChange={(value) => {
          setLine(value);
          setShown(PAGE);
        }}
        placeholder="Semua lini"
        options={[
          { value: '', label: 'Semua lini' },
          ...lines.map((item) => ({ value: item.id, label: item.name })),
        ]}
        className="shadow-card rounded-2xl border-0"
      />
      <div className="bg-card shadow-card flex gap-1 rounded-full p-1" role="tablist">
        {(
          [
            ['new', 'Menunggu'],
            ['mine', 'Pekerjaan saya'],
            ['done', 'Selesai'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => pick(key)}
            className={cn(
              'text-muted flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold',
              tab === key && 'bg-action text-white',
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px]',
                tab === key ? 'bg-white/20' : 'bg-surface',
              )}
            >
              {lists[key].length}
            </span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {rows.slice(0, shown).map((e) => {
          const machine = machineById.get(e.machineId);
          const tone = ANDON_TONE[stateByCode.get(e.stateCode)?.andonLevel ?? 'STOP'];
          const open = isOpen(e);
          return (
            <Link
              key={e.id}
              to={`/m/calls/${e.id}`}
              className={cn(
                'shadow-card block rounded-[24px] p-4 transition-transform active:scale-[0.98]',
                open ? 'bg-card' : 'bg-card/70',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-full',
                    !open ? 'bg-surface text-muted' : tone.soft,
                  )}
                >
                  <tone.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">
                      {machine?.tag} · {machine?.name}
                    </span>
                    <span className="text-muted shrink-0 font-mono text-[11px]">{e.id}</span>
                  </div>
                  <p className="text-muted mt-0.5 truncate text-[13px]">
                    Sejak {fmtClockShort(e.startedAt)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-snug">
                {reasonById.get(e.reasonId ?? '')?.l3
                  ? reasonLabel(reasonById.get(e.reasonId ?? '')!.l3)
                  : e.l1
                    ? `${categoryLabel(e.l1)}, pilih detail`
                    : 'Menunggu alasan'}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-sm font-bold tabular-nums">
                  {fmtDuration(eventElapsed(e, now))}
                </span>
                <SlaBadge sla={slaState(e, reasonById.get(e.reasonId ?? ''), now)} language="id" />
              </div>
              <div className="border-border text-action mt-3 flex items-center justify-between border-t pt-3 text-sm font-semibold">
                <span>{nextCallAction(e)}</span>
                <ChevronRight className="size-4" />
              </div>
            </Link>
          );
        })}
        {rows.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title={
              tab === 'new'
                ? 'Tidak ada panggilan'
                : tab === 'mine'
                  ? 'Belum ada pekerjaan Anda'
                  : 'Belum ada pekerjaan selesai'
            }
            description={
              tab === 'new'
                ? 'Panggilan untuk tim Anda akan muncul di sini.'
                : tab === 'mine'
                  ? 'Terima panggilan agar pekerjaan masuk ke sini.'
                  : 'Pekerjaan selesai muncul bersama catatan perbaikannya.'
            }
          />
        ) : null}
        {rows.length > shown ? (
          <div className="text-muted flex items-center justify-center gap-2 py-4 text-xs">
            {rows.length - shown} lainnya
            <button
              type="button"
              className="text-action font-semibold"
              onClick={() => setShown((n) => n + PAGE)}
            >
              Tampilkan
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
