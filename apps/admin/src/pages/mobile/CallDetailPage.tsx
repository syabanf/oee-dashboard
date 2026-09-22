import * as React from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import { eventElapsed, fmtClock, fmtDuration, isOpen, slaState } from '@oee/fixtures';
import { Button, EmptyState, Input, Textarea } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ANDON_TONE, EventStatusBadge, SlaBadge } from '../../components/badges';
import {
  CategoryTiles,
  ReasonChips,
  categoryLabel,
  reasonLabel,
} from '../../components/ReasonPicker';
import { ConfirmMachineRunning } from '../../components/ConfirmMachineRunning';

const EXPECTED_CATEGORY: Record<string, string> = {
  FAULT: 'Machine',
  LOW: 'Material',
  CHANGE: 'Process',
  SETUP: 'Process',
  MICRO: 'Process',
  SLOW: 'Process',
  CLEAN: 'Process',
};

export function CallDetailPage() {
  const { eventId } = useParams();
  const {
    events,
    machineById,
    lineById,
    reasonById,
    departmentById,
    personById,
    stateByCode,
    viewerId,
    now,
    dispatch,
  } = useScoped();
  const [note, setNote] = React.useState('');
  const [parts, setParts] = React.useState('');
  const [changeCategory, setChangeCategory] = React.useState(false);
  const [showAllCategories, setShowAllCategories] = React.useState(false);
  const event = events.find((e) => e.id === eventId);
  if (!event)
    return (
      <EmptyState
        title="Panggilan tidak ditemukan"
        description="Mesinnya mungkin sudah dihapus."
        action={
          <Button asChild>
            <Link to="/m">Daftar panggilan</Link>
          </Button>
        }
      />
    );

  const machine = machineById.get(event.machineId);
  const reason = reasonById.get(event.reasonId ?? '');
  const tone = ANDON_TONE[stateByCode.get(event.stateCode)?.andonLevel ?? 'STOP'];
  const mine = event.assigneeId === viewerId;
  const expectedCategory = EXPECTED_CATEGORY[event.stateCode];
  const pastFixes = reason
    ? events
        .filter((e) => e.id !== event.id && e.reasonId === reason.id && e.note && e.resolvedAt)
        .slice(-3)
        .reverse()
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3 pt-3">
        <Link
          to="/m"
          aria-label="Kembali ke daftar panggilan"
          className="bg-card shadow-card flex size-11 shrink-0 items-center justify-center rounded-full active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight">
            {machine?.tag} · {machine?.name}
          </h1>
          <p className="text-muted truncate text-xs">
            {lineById.get(machine?.lineId ?? '')?.name} · Andon {event.id}
          </p>
        </div>
      </header>

      <section className="bg-ink text-on-ink shadow-float relative overflow-hidden rounded-[28px] p-6">
        <div
          aria-hidden
          className="bg-accent/30 pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
              <tone.icon className="size-5" />
            </span>
            <EventStatusBadge status={event.status} language="id" />
          </div>
          <p className="mt-4 text-xl font-bold leading-snug">
            {reason
              ? reasonLabel(reason.l3)
              : event.l1
                ? `${categoryLabel(event.l1)}, pilih detail`
                : 'Menunggu alasan'}
          </p>
          <p className="mt-3 text-[44px] font-bold tabular-nums leading-none tracking-tight">
            {fmtDuration(eventElapsed(event, now))}
          </p>
          <p className="text-on-ink-muted mt-2 text-sm">
            {isOpen(event)
              ? `Berhenti sejak ${fmtClock(event.startedAt)}`
              : `Selesai pukul ${fmtClock(event.resolvedAt ?? event.startedAt)}`}
          </p>
        </div>
      </section>

      {isOpen(event) && !reason ? (
        <section className="bg-card shadow-card space-y-4 rounded-[24px] p-5">
          <div>
            <p className="text-action text-xs font-semibold uppercase tracking-wide">
              Lakukan sekarang
            </p>
            <h2 className="mt-1 text-base font-bold">
              {event.l1 ? 'Pilih penyebab yang tepat' : 'Apa penyebab mesin berhenti?'}
            </h2>
            <p className="text-muted text-sm">Penyebab menentukan tim yang menerima panggilan.</p>
          </div>
          {event.l1 && !changeCategory ? (
            <div className="bg-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div>
                <p className="text-muted text-xs">Kategori</p>
                <p className="font-semibold">{categoryLabel(event.l1)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setChangeCategory(true)}>
                Ganti
              </Button>
            </div>
          ) : (
            <CategoryTiles
              value={event.l1}
              preferred={expectedCategory ? [expectedCategory] : []}
              collapsed={!showAllCategories}
              onPick={(l1) => {
                dispatch({ type: 'events/classify', id: event.id, l1 });
                setChangeCategory(false);
              }}
            />
          )}
          {(!event.l1 || changeCategory) && !showAllCategories ? (
            <Button variant="outline" onClick={() => setShowAllCategories(true)}>
              Lihat semua kategori
            </Button>
          ) : null}
          {event.l1 && !changeCategory ? (
            <ReasonChips
              l1={event.l1}
              onPick={(reasonId) =>
                dispatch({ type: 'events/classify', id: event.id, l1: event.l1!, reasonId })
              }
            />
          ) : null}
        </section>
      ) : null}

      {isOpen(event) && reason && !event.assigneeId ? (
        <div className="bg-surface/90 sticky bottom-4 z-20 rounded-full p-1 backdrop-blur">
          <Button
            size="lg"
            className="w-full"
            onClick={() => dispatch({ type: 'events/assign', id: event.id, assigneeId: viewerId })}
          >
            Terima panggilan
          </Button>
        </div>
      ) : null}
      {mine && event.status === 'ASSIGNED' ? (
        <div className="bg-surface/90 sticky bottom-4 z-20 rounded-full p-1 backdrop-blur">
          <Button
            size="lg"
            className="w-full"
            onClick={() => dispatch({ type: 'events/arrive', id: event.id })}
          >
            Saya sudah di mesin
          </Button>
        </div>
      ) : null}
      {mine && event.status === 'IN_PROGRESS' ? (
        <section className="bg-card shadow-card space-y-3 rounded-[24px] p-5">
          <div>
            <p className="text-action text-xs font-semibold uppercase tracking-wide">
              Lakukan sekarang
            </p>
            <h2 className="mt-1 text-base font-bold">Catat perbaikan</h2>
            <p className="text-muted text-sm">
              Tulis apa yang diperbaiki agar teknisi berikutnya dapat menggunakannya.
            </p>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Apa yang diperbaiki?"
            className="bg-surface min-h-24 border-0"
          />
          <Input
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            placeholder="Suku cadang yang dipakai"
            className="[&_input]:bg-surface [&_input]:border-0"
          />
          <ConfirmMachineRunning
            language="id"
            className="sticky bottom-4 w-full"
            disabled={!note.trim()}
            onConfirm={() =>
              dispatch({
                type: 'events/resolve',
                id: event.id,
                note: note.trim(),
                partsUsed: parts.trim(),
              })
            }
          />
        </section>
      ) : null}

      <dl className="divide-border bg-card shadow-card divide-y rounded-[24px] px-5 py-1">
        {[
          [
            'Penyebab',
            reason
              ? `${categoryLabel(reason.l1)} › ${reasonLabel(reason.l3)}`
              : event.l1
                ? categoryLabel(event.l1)
                : 'Menunggu alasan',
          ],
          [
            'Pemilik',
            departmentById.get(event.ownerDepartmentId ?? '')?.name ??
              'Ditentukan setelah alasan dipilih',
          ],
          ['Petugas', personById.get(event.assigneeId ?? '')?.name ?? 'Belum ada'],
          [
            'Perintah kerja',
            event.workOrderId ??
              (reason?.createsWorkOrder ? 'Dibuat saat panggilan diterima' : 'Tidak diperlukan'),
          ],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[96px_1fr] gap-3 py-3.5 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[96px_1fr] gap-3 py-3.5 text-sm">
          <dt className="text-muted">Kedatangan</dt>
          <dd>
            <SlaBadge sla={slaState(event, reason, now)} language="id" />
            {reason ? null : 'Dimulai setelah alasan dipilih'}
          </dd>
        </div>
      </dl>

      {pastFixes.length ? (
        <section className="bg-info-soft rounded-[24px] p-5">
          <h2 className="text-base font-bold">Perbaikan sebelumnya</h2>
          <ul className="mt-3 space-y-3">
            {pastFixes.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="font-medium">{e.note}</p>
                <p className="text-body/70 text-xs">
                  {machineById.get(e.machineId)?.tag} · {fmtClock(e.startedAt)} ·{' '}
                  {fmtDuration(eventElapsed(e, now))}
                  {e.partsUsed ? ` · ${e.partsUsed}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isOpen(event) ? (
        <section className="bg-ink text-on-ink flex items-center gap-3 rounded-[24px] p-5">
          <span className="bg-success flex size-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <Check className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold">Mesin kembali dalam {fmtDuration(eventElapsed(event, now))}</p>
            <p className="text-on-ink-muted text-sm">{event.note ?? 'Tidak ada catatan.'}</p>
          </div>
        </section>
      ) : null}
      {isOpen(event) && event.assigneeId && !mine ? (
        <p className="bg-card text-muted shadow-card rounded-[24px] p-5 text-center text-sm">
          Panggilan ini sedang ditangani {personById.get(event.assigneeId)?.name}.
        </p>
      ) : null}
    </div>
  );
}
