import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Boxes, CircleCheck, ScanSearch, UserRound, Wrench } from 'lucide-react';
import {
  aggregateOee,
  eventElapsed,
  fmtClock,
  fmtDuration,
  fmtInt,
  fmtPct,
  hourlyOee,
} from '@oee/fixtures';
import { Button, Combobox, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { ANDON_TONE, AndonLegend } from '../../components/badges';
import { JobCard } from '../../components/JobCard';
import { MachineTile } from '../../components/MachineTile';
import {
  CategoryTiles,
  ReasonChips,
  categoryLabel,
  reasonLabel,
} from '../../components/ReasonPicker';
import { RejectPad } from '../../components/RejectPad';
import { ConfirmMachineRunning } from '../../components/ConfirmMachineRunning';

const HELP_CALLS = [
  { l1: 'Machine', label: 'Pemeliharaan', icon: Wrench },
  { l1: 'Quality', label: 'Kualitas', icon: ScanSearch },
  { l1: 'Material', label: 'Material', icon: Boxes },
  { l1: 'Operator', label: 'Supervisor', icon: UserRound },
];

const EXPECTED_REASON: Record<string, string> = {
  FAULT: 'Machine',
  LOW: 'Material',
  CHANGE: 'Process',
  SETUP: 'Process',
  MICRO: 'Process',
  SLOW: 'Process',
  CLEAN: 'Process',
};
const STATE_LABEL: Record<string, string> = {
  Running: 'Berjalan',
  'Material low': 'Material hampir habis',
  'Assistance requested': 'Meminta bantuan',
  'Reduced speed': 'Kecepatan turun',
  Idle: 'Tidak berproduksi',
  'Micro stop': 'Berhenti singkat',
  Stop: 'BERHENTI',
  'Machine fault': 'GANGGUAN MESIN',
  Changeover: 'Ganti produk',
  Setup: 'Persiapan',
  Cleaning: 'Pembersihan',
  'Preventive maintenance': 'Pemeliharaan terencana',
  Break: 'Istirahat',
  'Machine off': 'Mesin mati',
};
const DEPARTMENT_LABEL: Record<string, string> = {
  Maintenance: 'Pemeliharaan',
  Warehouse: 'Gudang',
  'Quality Control': 'Kualitas',
  Production: 'Produksi',
};

/** One tablet per line. Tap the machine, tap the category, tap the detail: a stop is named in three taps or fewer. */
export function OperatorPage() {
  const { lineId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    lines,
    lineById,
    machinesByLine,
    machineById,
    stateByCode,
    openEventByMachine,
    reasonById,
    departmentById,
    personById,
    oeeByMachine,
    history,
    kpi,
    shiftStart,
    now,
    dispatch,
  } = useScoped();
  const line = lineById.get(lineId ?? '') ?? lines[0];
  const machines = React.useMemo(
    () => (machinesByLine.get(line?.id ?? '') ?? []).filter((m) => m.active),
    [machinesByLine, line],
  );
  const hours = React.useMemo(
    () => hourlyOee(machines, kpi, shiftStart),
    [machines, kpi, shiftStart],
  );
  const selectedMachineId = params.get('machine') ?? '';
  const [showAllReasons, setShowAllReasons] = React.useState(false);
  React.useEffect(() => setShowAllReasons(false), [selectedMachineId]);
  if (!line) return null;

  const machine = machineById.get(selectedMachineId);
  const event = machine ? openEventByMachine.get(machine.id) : undefined;
  const reason = event?.reasonId ? reasonById.get(event.reasonId) : undefined;
  const state = machine ? stateByCode.get(machine.stateCode) : undefined;
  const tone = ANDON_TONE[state?.andonLevel ?? 'OFF'];
  const stopped = state?.andonLevel === 'STOP';
  const lineOee = aggregateOee(machines.flatMap((m) => oeeByMachine.get(m.id) ?? []));
  const thisHour = hours.at(-1);
  const expectedReason = EXPECTED_REASON[event?.stateCode ?? machine?.stateCode ?? ''];
  // Only suggest frequent reasons that fit the current PLC state.
  const usual = machine
    ? history
        .filter(
          (h) =>
            h.machineId === machine.id &&
            reasonById.get(h.reasonId)?.lossClass === 'AVAILABILITY' &&
            reasonById.get(h.reasonId)?.l1 !== 'Other' &&
            (!expectedReason || reasonById.get(h.reasonId)?.l1 === expectedReason),
        )
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 3)
        .flatMap((h) => reasonById.get(h.reasonId) ?? [])
    : [];

  return (
    <div className="bg-surface mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-5 p-4 pb-8 sm:p-6">
      <header className="flex items-center gap-3">
        <Link
          to="/"
          aria-label="Kembali ke Control Tower"
          className="bg-card shadow-card flex size-11 shrink-0 items-center justify-center rounded-full active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <Combobox
            label="Lini"
            searchable={false}
            value={line.id}
            onChange={(id) => navigate(`/operator/${id}`)}
            options={lines.map((l) => ({ value: l.id, label: `${l.code} · ${l.name}` }))}
            className="shadow-card rounded-full border-0"
          />
        </div>
        <span className="hidden font-mono text-sm font-semibold tabular-nums sm:block">
          {fmtClock(now)}
        </span>
      </header>

      <section className="space-y-3">
        <div
          className={cn(
            'flex flex-wrap items-end justify-between gap-2',
            machine && 'hidden sm:flex',
          )}
        >
          <div>
            <p className="text-action text-xs font-semibold uppercase tracking-wide">Langkah 1</p>
            <h2 className="text-[28px] font-bold leading-tight tracking-tight">Pilih mesin</h2>
            <p className="text-muted text-sm">{line.name}</p>
          </div>
          <AndonLegend language="id" />
        </div>
        <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', machine && 'hidden sm:grid')}>
          {machines.map((m) => (
            <div
              key={m.id}
              className={cn(
                'bg-card shadow-card rounded-[18px]',
                machine?.id === m.id && 'ring-ink ring-offset-surface ring-2 ring-offset-2',
              )}
            >
              <MachineTile
                machine={m}
                language="id"
                onSelect={() => setParams({ machine: m.id }, { replace: true })}
              />
            </div>
          ))}
        </div>
        {machine ? (
          <button
            type="button"
            onClick={() => setParams({}, { replace: true })}
            className="bg-card shadow-card flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left sm:hidden"
          >
            <span className="min-w-0">
              <span className="text-muted block text-xs">Mesin dipilih</span>
              <span className="block truncate font-semibold">
                {machine.tag} · {machine.name}
              </span>
            </span>
            <span className="text-action shrink-0 text-sm font-semibold">Ganti</span>
          </button>
        ) : null}
      </section>

      {!machine ? (
        <p className="bg-card text-muted shadow-card rounded-[24px] p-5 text-center text-sm">
          Ketuk mesin yang membutuhkan bantuan.
        </p>
      ) : null}

      {machine ? (
        <section
          className={cn(
            'shadow-float relative overflow-hidden rounded-[28px] p-6',
            stopped ? 'bg-accent-strong text-white' : 'bg-ink text-on-ink',
          )}
        >
          <p className="text-sm font-semibold uppercase tracking-wider opacity-70">
            {machine.tag} · {machine.name}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="flex items-center gap-3 text-3xl font-bold uppercase tracking-tight sm:text-5xl">
              <tone.icon className={cn('size-8 sm:size-11', stopped && 'animate-pulse')} />
              {STATE_LABEL[state?.name ?? ''] ?? state?.name}
            </h1>
            <p className="text-3xl font-bold tabular-nums sm:text-5xl">
              {event
                ? fmtDuration(eventElapsed(event, now))
                : fmtPct(oeeByMachine.get(machine.id)?.oee ?? 0)}
            </p>
          </div>
          <p className="mt-3 text-sm opacity-70">
            {event
              ? `Andon ${event.id} sejak ${fmtClock(event.startedAt)}`
              : `OEE shift ini · ${fmtInt(oeeByMachine.get(machine.id)?.good ?? 0)} produk baik`}
          </p>
          <div className="mt-4 hidden rounded-2xl bg-white/10 p-4 sm:block">
            <JobCard machine={machine} onInk />
          </div>
        </section>
      ) : null}

      {machine && event && !event.l1 ? (
        <section className="space-y-3">
          <p className="text-action text-xs font-semibold uppercase tracking-wide">Langkah 2</p>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight">
            Apa penyebab mesin berhenti?
          </h2>
          {usual.length && !showAllReasons ? (
            <div>
              <p className="text-muted mb-2 text-sm font-semibold">
                Penyebab yang paling sering pada {machine.tag}
              </p>
              <div className="flex flex-wrap gap-2">
                {usual.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'events/classify', id: event.id, l1: r.l1, reasonId: r.id })
                    }
                    className="bg-ink text-on-ink h-14 rounded-full px-6 text-base font-semibold transition-transform active:scale-[0.98]"
                  >
                    {reasonLabel(r.l3)}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="mt-3" onClick={() => setShowAllReasons(true)}>
                Pilih alasan lain
              </Button>
            </div>
          ) : (
            <>
              <CategoryTiles
                size="lg"
                preferred={expectedReason ? [expectedReason] : []}
                collapsed={!showAllReasons}
                onPick={(l1) => dispatch({ type: 'events/classify', id: event.id, l1 })}
              />
              {!showAllReasons ? (
                <Button variant="outline" onClick={() => setShowAllReasons(true)}>
                  Lihat semua kategori
                </Button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {machine && event?.l1 ? (
        <section className="bg-card shadow-card space-y-4 rounded-[24px] p-5">
          <div className="flex items-start gap-3">
            <span className="bg-success-soft text-success flex size-12 shrink-0 items-center justify-center rounded-full">
              <CircleCheck className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold">
                {reason
                  ? `${categoryLabel(event.l1)} › ${reasonLabel(reason.l3)}`
                  : categoryLabel(event.l1)}{' '}
                ·{' '}
                {DEPARTMENT_LABEL[departmentById.get(event.ownerDepartmentId ?? '')?.name ?? ''] ??
                  departmentById.get(event.ownerDepartmentId ?? '')?.name}{' '}
                sudah dipanggil
              </p>
              <p className="text-muted text-sm">
                {event.assigneeId
                  ? `${personById.get(event.assigneeId)?.name} ${event.arrivedAt ? 'sudah di mesin' : 'sedang menuju mesin'}.`
                  : 'Menunggu petugas menerima panggilan.'}
              </p>
            </div>
          </div>
          {!reason ? (
            <div>
              <p className="text-action text-xs font-semibold uppercase tracking-wide">Langkah 3</p>
              <p className="mb-2 mt-1 text-sm font-semibold">Pilih penyebab yang tepat</p>
              <ReasonChips
                size="lg"
                l1={event.l1}
                onPick={(reasonId) =>
                  dispatch({ type: 'events/classify', id: event.id, l1: event.l1!, reasonId })
                }
              />
            </div>
          ) : null}
          {reason && event.status === 'IN_PROGRESS' ? (
            <ConfirmMachineRunning
              language="id"
              className="h-14 w-full"
              onConfirm={() => dispatch({ type: 'events/resolve', id: event.id })}
            />
          ) : null}
        </section>
      ) : null}

      {machine && !event ? (
        <section className="space-y-3">
          <p className="text-action text-xs font-semibold uppercase tracking-wide">Langkah 2</p>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight">Pilih tindakan</h2>
          <p className="text-muted -mt-2 text-sm">
            {machine.tag} tetap berjalan. Tim tujuan akan menerima panggilan.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {HELP_CALLS.map((c) => (
              <button
                key={c.l1}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'events/raise',
                    machineId: machine.id,
                    stateCode: 'ASSIST',
                    l1: c.l1,
                  })
                }
                className="bg-card shadow-card flex h-28 flex-col items-center justify-center gap-2 rounded-2xl text-base font-semibold uppercase tracking-wide transition-transform active:scale-[0.98]"
              >
                <c.icon className="size-7" />
                {c.label}
              </button>
            ))}
          </div>
          <Button
            size="lg"
            className="h-14 w-full"
            onClick={() =>
              dispatch({ type: 'events/raise', machineId: machine.id, stateCode: 'STOP' })
            }
          >
            {machine.tag} berhenti
          </Button>
        </section>
      ) : null}

      {machine && !event ? (
        <details className="bg-card shadow-card rounded-[24px] p-5">
          <summary className="cursor-pointer text-base font-bold">
            Catat produk cacat pada {machine.tag}
          </summary>
          <div className="mt-4">
            <RejectPad machine={machine} language="id" />
          </div>
        </details>
      ) : null}

      <details className="space-y-3">
        <summary className="cursor-pointer text-base font-bold">Lihat progres lini</summary>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            [
              'Jam ini',
              `${fmtInt(thisHour?.result.good ?? 0)} / ${fmtInt(thisHour?.targetPcs ?? 0)}`,
              'produk baik / target',
            ],
            ['OEE lini', fmtPct(lineOee.oee), 'shift ini'],
            ['Produk baik', fmtInt(lineOee.good), 'shift ini'],
          ].map(([label, value, hint], index) => (
            <div
              key={label}
              className={cn(
                'bg-card shadow-card rounded-[24px] px-4 py-4',
                index === 0 && 'col-span-2 sm:col-span-1',
              )}
            >
              <p className="text-muted text-xs font-medium">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums leading-none sm:text-[28px]">
                {value}
              </p>
              <p className="text-muted mt-1.5 text-[11px]">{hint}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
