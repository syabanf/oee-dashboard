import type { Machine } from '@oee/types';
import { eventElapsed, fmtDuration, fmtPct } from '@oee/fixtures';
import { cn } from '@oee/ui';
import { useScoped } from '../state/app-state';
import { ANDON_TONE, eventTitle } from './badges';
import { categoryLabel, reasonLabel } from './ReasonPicker';

const STATE_LABEL_ID: Record<string, string> = {
  Running: 'Berjalan',
  'Material low': 'Material hampir habis',
  'Assistance requested': 'Meminta bantuan',
  'Reduced speed': 'Kecepatan turun',
  Idle: 'Tidak berproduksi',
  'Micro stop': 'Berhenti singkat',
  Stop: 'Berhenti',
  'Machine fault': 'Gangguan mesin',
  Changeover: 'Ganti produk',
  Setup: 'Persiapan',
  Cleaning: 'Pembersihan',
  'Preventive maintenance': 'Pemeliharaan terencana',
  Break: 'Istirahat',
  'Machine off': 'Mesin mati',
};

/** One machine on the Andon board. Stops are the only solid tiles; every other state is a soft tint. */
export function MachineTile({
  machine,
  onSelect,
  dark,
  language = 'en',
}: {
  machine: Machine;
  onSelect?: (machine: Machine) => void;
  dark?: boolean;
  language?: 'en' | 'id';
}) {
  const { stateByCode, openEventByMachine, reasonById, oeeByMachine, rules, now } = useScoped();
  const state = stateByCode.get(machine.stateCode);
  const level = state?.andonLevel ?? 'OFF';
  const tone = ANDON_TONE[level];
  const event = openEventByMachine.get(machine.id);
  const stopped = level === 'STOP';
  // A stop with no event yet sits in the silent phase: the state engine waits before it raises the alarm.
  const silentLeftMs =
    stopped && !event
      ? (rules.find((r) => r.l1 === 'Other')?.triggerAfterSec ?? 120) * 1000 -
        (now - machine.stateSince)
      : 0;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(machine)}
      disabled={!onSelect}
      className={cn(
        'flex min-h-[116px] w-full flex-col rounded-2xl p-3.5 text-left transition-transform enabled:active:scale-[0.98]',
        stopped ? tone.solid : dark ? 'bg-white/5 text-white' : 'bg-surface-2 hover:bg-surface',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold">{machine.tag}</span>
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full',
            stopped ? 'bg-white/20' : tone.soft,
            stopped && 'animate-pulse',
          )}
        >
          <tone.icon className="size-4" />
        </span>
      </span>
      <span
        className={cn(
          'mt-1 truncate text-xs',
          stopped ? 'text-white/80' : dark ? 'text-on-ink-muted' : 'text-muted',
        )}
      >
        {machine.name}
      </span>
      <span className="mt-auto pt-2">
        <span className="block truncate text-[13px] font-semibold">
          {event
            ? language === 'id'
              ? reasonById.get(event.reasonId ?? '')?.l3
                ? reasonLabel(reasonById.get(event.reasonId ?? '')!.l3)
                : event.l1
                  ? `${categoryLabel(event.l1)}, pilih detail`
                  : 'Menunggu alasan'
              : eventTitle(event, reasonById.get(event.reasonId ?? '')?.l3)
            : language === 'id'
              ? (STATE_LABEL_ID[state?.name ?? ''] ?? state?.name)
              : state?.name}
        </span>
        <span
          className={cn(
            'block text-xs tabular-nums',
            stopped ? 'text-white/80' : dark ? 'text-on-ink-muted' : 'text-muted',
          )}
        >
          {event
            ? fmtDuration(eventElapsed(event, now))
            : silentLeftMs > 0
              ? language === 'id'
                ? `Belum ada alarm · ${fmtDuration(silentLeftMs)}`
                : `Silent · alarm in ${fmtDuration(silentLeftMs)}`
              : `OEE ${fmtPct(oeeByMachine.get(machine.id)?.oee ?? 0)}`}
        </span>
      </span>
    </button>
  );
}
