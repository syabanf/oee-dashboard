import type {
  AndonEvent,
  AndonLevel,
  EventStatus,
  LossClass,
  MachineState,
  Priority,
} from '@oee/types';
import {
  ANDON_LEVEL_LABEL,
  EVENT_STATUS_LABEL,
  LOSS_CLASS_LABEL,
  PRIORITY_LABEL,
} from '@oee/types';
import { fmtDuration, type AndonColor, type SlaState } from '@oee/fixtures';
import { Badge, cn, type BadgeProps } from '@oee/ui';
import {
  AlertTriangle,
  CircleCheck,
  Hand,
  OctagonX,
  Power,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

type Variant = NonNullable<BadgeProps['variant']>;

/** One place decides how an Andon level looks: solid dot, soft tile, icon. Status never relies on colour alone. */
export const ANDON_TONE: Record<
  AndonLevel,
  { dot: string; soft: string; solid: string; icon: LucideIcon }
> = {
  RUNNING: {
    dot: 'bg-success',
    soft: 'bg-success-soft text-success',
    solid: 'bg-success text-white',
    icon: CircleCheck,
  },
  WARNING: {
    dot: 'bg-warning',
    soft: 'bg-warning-soft text-warning',
    solid: 'bg-warning text-white',
    icon: TriangleAlert,
  },
  ATTENTION: {
    dot: 'bg-info',
    soft: 'bg-info-soft text-info',
    solid: 'bg-info text-white',
    icon: AlertTriangle,
  },
  STOP: {
    dot: 'bg-accent',
    soft: 'bg-accent-soft text-accent-strong',
    solid: 'bg-accent-strong text-white',
    icon: OctagonX,
  },
  ASSISTANCE: {
    dot: 'bg-assist',
    soft: 'bg-assist-soft text-assist',
    solid: 'bg-assist text-white',
    icon: Hand,
  },
  OFF: {
    dot: 'bg-silver',
    soft: 'bg-surface text-muted',
    solid: 'bg-silver text-white',
    icon: Power,
  },
};

const LEGEND_LEVELS: AndonLevel[] = ['RUNNING', 'WARNING', 'ATTENTION', 'ASSISTANCE', 'STOP'];
const ANDON_LEVEL_LABEL_ID: Record<AndonLevel, string> = {
  RUNNING: 'Berjalan',
  WARNING: 'Peringatan',
  ATTENTION: 'Perlu perhatian',
  STOP: 'Berhenti',
  ASSISTANCE: 'Minta bantuan',
  OFF: 'Mati',
};
/** The one state key. Board, TV, operator tablet and explorer all show this same strip. */
export const AndonLegend = ({
  dark,
  className,
  language = 'en',
}: {
  dark?: boolean;
  className?: string;
  language?: 'en' | 'id';
}) => (
  <div
    className={cn(
      'flex flex-wrap gap-x-4 gap-y-1.5 text-xs',
      dark ? 'text-on-ink-muted' : 'text-muted',
      className,
    )}
  >
    {LEGEND_LEVELS.map((l) => {
      const Icon = ANDON_TONE[l].icon;
      return (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full',
              ANDON_TONE[l].soft,
            )}
          >
            <Icon className="size-3" />
          </span>
          {language === 'id' ? ANDON_LEVEL_LABEL_ID[l] : ANDON_LEVEL_LABEL[l]}
        </span>
      );
    })}
  </div>
);

export function StateBadge({
  state,
  className,
}: {
  state: MachineState | undefined;
  className?: string;
}) {
  if (!state)
    return (
      <Badge variant="muted" className={className}>
        Unknown state
      </Badge>
    );
  const tone = ANDON_TONE[state.andonLevel];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone.soft,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', tone.dot)} />
      {state.name}
    </span>
  );
}
export const AndonLevelBadge = ({ level }: { level: AndonLevel }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
      ANDON_TONE[level].soft,
    )}
  >
    <span className={cn('size-1.5 rounded-full', ANDON_TONE[level].dot)} />
    {ANDON_LEVEL_LABEL[level]}
  </span>
);

const STATUS_VARIANT: Record<EventStatus, Variant> = {
  DETECTED: 'danger',
  ACKNOWLEDGED: 'warning',
  CLASSIFIED: 'warning',
  ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  VERIFIED: 'muted',
};
const EVENT_STATUS_LABEL_ID: Record<EventStatus, string> = {
  DETECTED: 'Terdeteksi',
  ACKNOWLEDGED: 'Sudah dilihat',
  CLASSIFIED: 'Penyebab dipilih',
  ASSIGNED: 'Petugas ditunjuk',
  IN_PROGRESS: 'Sedang diperbaiki',
  RESOLVED: 'Mesin berjalan',
  VERIFIED: 'Perbaikan terverifikasi',
};
export const EventStatusBadge = ({
  status,
  language = 'en',
}: {
  status: EventStatus;
  language?: 'en' | 'id';
}) => (
  <Badge variant={STATUS_VARIANT[status]} dot>
    {language === 'id'
      ? EVENT_STATUS_LABEL_ID[status]
      : status === 'RESOLVED'
        ? 'Machine running again'
        : status === 'VERIFIED'
          ? 'Fix verified'
          : EVENT_STATUS_LABEL[status]}
  </Badge>
);

const PRIORITY_VARIANT: Record<Priority, Variant> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'default',
};
export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Badge variant={PRIORITY_VARIANT[priority]}>{PRIORITY_LABEL[priority]}</Badge>
);

/** Chart identity colours for the three loss classes; neutral for everything else. */
export const LOSS_FILL: Record<LossClass, string> = {
  AVAILABILITY: 'bg-loss-a',
  PERFORMANCE: 'bg-loss-p',
  QUALITY: 'bg-loss-q',
  PRODUCTIVE: 'bg-success',
  PLANNED: 'bg-silver',
  EXCLUDED: 'bg-border',
};
export const LossClassBadge = ({ lossClass }: { lossClass: LossClass }) => (
  <span className="bg-surface text-body inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium">
    <span className={cn('size-2 rounded-[3px]', LOSS_FILL[lossClass])} />
    {LOSS_CLASS_LABEL[lossClass]}
  </span>
);

const COLOR_CLASS: Record<AndonColor, string> = {
  none: 'bg-silver',
  yellow: 'bg-warning',
  red: 'bg-accent',
};
const COLOR_LABEL: Record<AndonColor, string> = {
  none: 'No alarm',
  yellow: 'Andon yellow',
  red: 'Andon red',
};
export const AndonColorBadge = ({ color }: { color: AndonColor }) => (
  <span className="text-body inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold">
    <span
      className={cn('size-2 rounded-full', COLOR_CLASS[color], color === 'red' && 'animate-pulse')}
    />
    {COLOR_LABEL[color]}
  </span>
);

/** Response SLA as a badge: counting down, met, or breached by how much. */
export function SlaBadge({
  sla,
  language = 'en',
}: {
  sla: SlaState | undefined;
  language?: 'en' | 'id';
}) {
  if (!sla) return null;
  if (sla.met)
    return (
      <Badge variant="success">
        {language === 'id' ? 'Target kedatangan tercapai' : 'Arrival target met'}
      </Badge>
    );
  if (sla.breached)
    return (
      <Badge variant="danger">
        {language === 'id' ? 'Terlambat ' : 'Arrival late by '}
        {fmtDuration(-sla.remainingMs)}
      </Badge>
    );
  return (
    <Badge variant="warning">
      {language === 'id' ? 'Tiba dalam ' : 'Arrival due in '}
      {fmtDuration(sla.remainingMs)}
    </Badge>
  );
}

export const eventTitle = (event: AndonEvent, reasonName: string | undefined) =>
  reasonName ?? (event.l1 ? `${event.l1}, detail needed` : 'Waiting for a reason');

/** Plain-language action shown wherever an event appears in a work list. */
export const eventNextAction = (event: AndonEvent) => {
  if (event.status === 'DETECTED') return 'Acknowledge alert';
  if (!event.l1) return 'Choose a reason';
  if (!event.reasonId) return 'Add the exact reason';
  if (event.status === 'CLASSIFIED') return 'Assign an owner';
  if (event.status === 'ASSIGNED') return 'Mark technician arrival';
  if (event.status === 'IN_PROGRESS') return 'Record the fix';
  if (event.status === 'RESOLVED') return 'Verify the fix';
  return 'View details';
};
