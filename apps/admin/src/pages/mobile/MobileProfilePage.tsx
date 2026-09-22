import { Link } from 'react-router';
import { Check, Lock, Monitor } from 'lucide-react';
import { fmtHm, responseKpis } from '@oee/fixtures';
import { Avatar, cn } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { MobileHeader } from './MobileHeader';

export function MobileProfilePage() {
  const { events, people, personById, departmentById, viewerId, dispatch } = useScoped();
  const me = personById.get(viewerId);
  const mine = events.filter((e) => e.assigneeId === viewerId);
  const kpis = responseKpis(mine);
  const tiles = [
    ['Panggilan hari ini', String(mine.length), 'bg-ink text-on-ink'],
    ['Waktu tiba', fmtHm(kpis.responseMs), 'bg-action text-white'],
    ['Waktu perbaikan', fmtHm(kpis.mttrMs), 'bg-card'],
  ] as const;
  return (
    <div className="space-y-6">
      <MobileHeader
        kicker={`${me?.role} · ${departmentById.get(me?.departmentId ?? '')?.name}`}
        title="Saya"
      />
      <div className="grid grid-cols-3 gap-3">
        {tiles.map(([label, value, tone]) => (
          <div key={label} className={cn('shadow-card rounded-[24px] px-4 py-5', tone)}>
            <p className="truncate text-xl font-bold tabular-nums leading-none">{value}</p>
            <p className="mt-2 text-xs font-medium opacity-80">{label}</p>
          </div>
        ))}
      </div>
      <p className="bg-info-soft text-info flex items-center gap-2 rounded-[24px] p-4 text-xs font-medium">
        <Lock className="size-4 shrink-0" />
        Hanya Anda yang melihat angka ini. Layar tim membandingkan departemen, bukan orang.
      </p>
      <section>
        <h2 className="mb-3 text-base font-bold">Lihat demo sebagai</h2>
        <div className="space-y-2">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => dispatch({ type: 'viewer/set', personId: p.id })}
              className="bg-card shadow-card flex w-full items-center gap-3 rounded-[24px] p-3 text-left active:scale-[0.98]"
            >
              <Avatar name={p.name} color={p.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="text-muted block truncate text-xs">{p.role}</span>
              </span>
              {p.id === viewerId ? <Check className="text-action size-5" /> : null}
            </button>
          ))}
        </div>
      </section>
      <Link
        to="/"
        className="bg-info-soft text-info flex items-center justify-center gap-2 rounded-[24px] p-4 text-sm font-semibold"
      >
        <Monitor className="size-4" />
        Buka Control Tower
      </Link>
    </div>
  );
}
