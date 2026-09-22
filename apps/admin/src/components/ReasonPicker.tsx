import * as React from 'react';
import type { DowntimeReason } from '@oee/types';
import {
  Boxes,
  CircleHelp,
  Cog,
  Gauge,
  ScanSearch,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@oee/ui';
import { useScoped } from '../state/app-state';

const L1_ICON: Record<string, LucideIcon> = {
  Machine: Cog,
  Material: Boxes,
  Quality: ScanSearch,
  Operator: User,
  Tooling: Wrench,
  Process: Gauge,
  Other: CircleHelp,
};

const CATEGORY_LABEL: Record<string, string> = {
  Machine: 'Mesin',
  Material: 'Material',
  Quality: 'Kualitas',
  Operator: 'Operator',
  Tooling: 'Perkakas',
  Process: 'Proses',
  Other: 'Lainnya',
};
const GROUP_LABEL: Record<string, string> = {
  Electrical: 'Kelistrikan',
  Mechanical: 'Mekanik',
  Pneumatic: 'Pneumatik',
  Supply: 'Pasokan',
  Incoming: 'Material masuk',
  Inspection: 'Pemeriksaan',
  Reject: 'Cacat produk',
  Availability: 'Ketersediaan operator',
  Wear: 'Keausan',
  Setup: 'Persiapan',
  Speed: 'Kecepatan',
  'Minor Stop': 'Berhenti singkat',
  Cleaning: 'Pembersihan',
  Unclassified: 'Belum diketahui',
};
const REASON_LABEL: Record<string, string> = {
  'Motor Overload': 'Motor kelebihan beban',
  'Sensor Fault': 'Sensor bermasalah',
  'Servo Alarm': 'Alarm servo',
  'Bearing Failure': 'Bearing rusak',
  'Belt Slip': 'Belt selip',
  'Cylinder Leak': 'Silinder bocor',
  'Material Late': 'Material terlambat',
  'Material Empty': 'Material habis',
  'Wrong Material': 'Material salah',
  'Material Defect': 'Material cacat',
  'Waiting QC': 'Menunggu QC',
  'Surface Scratch': 'Permukaan tergores',
  'Dimension Out': 'Dimensi tidak sesuai',
  'Startup Defect': 'Cacat saat mulai',
  'No Operator': 'Operator tidak ada',
  'Operator Delay': 'Operator terlambat',
  'Polishing Wheel Worn': 'Roda poles aus',
  'Die Damage': 'Cetakan rusak',
  Changeover: 'Ganti produk',
  'Parameter Adjustment': 'Penyesuaian parameter',
  'Reduced Speed': 'Kecepatan turun',
  'Micro Stop': 'Berhenti singkat',
  'Unplanned Cleaning': 'Pembersihan tidak terencana',
  Other: 'Penyebab lain',
};

export const categoryLabel = (value: string) => CATEGORY_LABEL[value] ?? value;
export const reasonLabel = (value: string) => REASON_LABEL[value] ?? value;

/** Level 1 categories an operator picks from. "Other" always sits last. */
function useReasonCategories() {
  const { reasons } = useScoped();
  return React.useMemo(() => {
    const l1s = [
      ...new Set(reasons.filter((r) => r.lossClass === 'AVAILABILITY').map((r) => r.l1)),
    ];
    return [...l1s.filter((l) => l !== 'Other'), ...l1s.filter((l) => l === 'Other')];
  }, [reasons]);
}
const reasonsIn = (reasons: DowntimeReason[], l1: string) =>
  reasons.filter((r) => r.l1 === l1 && r.lossClass === 'AVAILABILITY');

/** Big touch tiles for level 1. `size="lg"` is the shopfloor tablet, `md` is the desk. */
export function CategoryTiles({
  value,
  onPick,
  size = 'md',
  preferred = [],
  collapsed = false,
}: {
  value?: string;
  onPick: (l1: string) => void;
  size?: 'md' | 'lg';
  preferred?: string[];
  collapsed?: boolean;
}) {
  const categories = useReasonCategories();
  const ordered = [
    ...preferred.filter((item) => categories.includes(item)),
    ...categories.filter((item) => !preferred.includes(item)),
  ];
  const visible = collapsed ? ordered.slice(0, 3) : ordered;
  return (
    <div className={cn('grid gap-3', size === 'lg' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3')}>
      {visible.map((l1) => {
        const Icon = L1_ICON[l1] ?? CircleHelp;
        const active = value === l1;
        return (
          <button
            key={l1}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(l1)}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-2xl font-semibold uppercase tracking-wide transition-transform active:scale-[0.98]',
              size === 'lg' ? 'h-28 text-base sm:h-32' : 'h-20 text-xs',
              active
                ? 'bg-ink text-on-ink'
                : size === 'lg'
                  ? 'bg-card shadow-card hover:bg-surface-2'
                  : 'bg-surface hover:bg-border/60',
            )}
          >
            <Icon className={size === 'lg' ? 'size-7' : 'size-5'} />
            {categoryLabel(l1)}
          </button>
        );
      })}
    </div>
  );
}

/** Level 2 and 3 as chips grouped by level 2. Leaders and maintenance fill these in after the operator's first tap. */
export function ReasonChips({
  l1,
  value,
  onPick,
  size = 'md',
}: {
  l1: string;
  value?: string;
  onPick: (reasonId: string) => void;
  size?: 'md' | 'lg';
}) {
  const { reasons } = useScoped();
  const groups = React.useMemo(() => {
    const byL2 = new Map<string, DowntimeReason[]>();
    for (const r of reasonsIn(reasons, l1)) byL2.set(r.l2, [...(byL2.get(r.l2) ?? []), r]);
    return [...byL2];
  }, [reasons, l1]);
  return (
    <div className="space-y-3">
      {groups.map(([l2, items]) => (
        <div key={l2}>
          <p className="text-muted mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
            {GROUP_LABEL[l2] ?? l2}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={value === r.id}
                onClick={() => onPick(r.id)}
                className={cn(
                  'border-border bg-card hover:bg-surface aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-on-ink rounded-full border font-semibold transition-colors',
                  size === 'lg' ? 'h-14 px-6 text-base' : 'h-10 px-4 text-xs',
                )}
              >
                {reasonLabel(r.l3)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
