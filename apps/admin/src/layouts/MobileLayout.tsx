import { Link, Outlet, useLocation, useMatch } from 'react-router';
import { Bell, ListChecks, UserRound, type LucideIcon } from 'lucide-react';
import { cn } from '@oee/ui';
import { useScoped } from '../state/app-state';

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/m', label: 'Panggilan', icon: ListChecks },
  { to: '/m/inbox', label: 'Pesan', icon: Bell },
  { to: '/m/me', label: 'Saya', icon: UserRound },
];

/** Responder phone app shell: centred column, bottom tab bar, tab bar hidden on the call detail screen. */
export function MobileLayout() {
  const { pathname } = useLocation();
  const detail = useMatch('/m/calls/:eventId');
  const { inbox } = useScoped();
  const unread = inbox.filter((n) => n.unread).length;
  return (
    <div className="bg-surface relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main
        className={cn(
          'flex-1 px-5 pt-[max(env(safe-area-inset-top),0.75rem)]',
          detail ? 'pb-8' : 'pb-32',
        )}
      >
        <Outlet />
      </main>
      {detail ? null : (
        <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md">
          <div className="from-surface pointer-events-none h-8 bg-gradient-to-t to-transparent" />
          <div className="bg-card rounded-t-[28px] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-14px_rgba(16,17,18,0.25)]">
            <div className="flex items-stretch px-3 pb-2 pt-2">
              {TABS.map((tab) => {
                const active = pathname === tab.to;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className="group flex flex-1 flex-col items-center justify-center gap-1 py-1.5"
                  >
                    <span
                      className={cn(
                        'relative flex h-9 w-14 items-center justify-center rounded-full',
                        active
                          ? 'bg-action shadow-glow text-white'
                          : 'text-muted group-active:bg-surface',
                      )}
                    >
                      <tab.icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
                      {tab.to === '/m/inbox' && unread ? (
                        <span className="bg-action ring-card absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2">
                          {unread}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold',
                        active ? 'text-action' : 'text-muted',
                      )}
                    >
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
