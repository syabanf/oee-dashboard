import { BellOff, UserCheck } from 'lucide-react';
import { fmtClockShort } from '@oee/fixtures';
import { EmptyState, cn } from '@oee/ui';
import { useScoped } from '../state/app-state';

/** The viewer's inbox rows. Opening one marks it read and hands the event to the caller. */
export function NotificationList({
  onOpen,
  onOpenAlert,
}: {
  onOpen: (eventId: string) => void;
  onOpenAlert: () => void;
}) {
  const { inbox, dispatch } = useScoped();
  if (inbox.length === 0)
    return (
      <EmptyState
        icon={<BellOff />}
        title="Nothing addressed to you"
        description="Escalations reach a role when its step on the ladder comes up. Switch the viewer from the account menu to read another role's inbox."
      />
    );
  return (
    <ul className="space-y-2">
      {inbox.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'notifications/read', ids: [n.id] });
              if (n.eventId) onOpen(n.eventId);
              else onOpenAlert();
            }}
            className={cn(
              'hover:bg-card hover:shadow-card flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all',
              n.unread ? 'bg-surface-2' : 'bg-surface-2/50',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                n.color === 'red'
                  ? 'bg-accent-soft text-accent'
                  : n.color === 'yellow'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-info-soft text-info',
              )}
            >
              {n.personId ? (
                <UserCheck className="size-4" />
              ) : (
                <span
                  className={cn(
                    'size-2.5 rounded-full',
                    n.color === 'red' ? 'bg-accent' : 'bg-warning',
                  )}
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn('block text-sm', n.unread ? 'font-bold' : 'text-body font-medium')}
              >
                {n.title}
              </span>
              <span className="text-muted block text-xs">{n.body}</span>
              <span className="text-muted mt-1 block text-[11px]">
                {fmtClockShort(n.at)} · {n.personId ? 'to you' : `to every ${n.role}`}
                {n.live ? '' : ' · event closed'}
              </span>
            </span>
            {n.unread ? (
              <span className="bg-action mt-2 size-2 shrink-0 rounded-full" aria-label="Unread" />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
