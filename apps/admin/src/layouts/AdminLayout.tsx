import * as React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Bell,
  Check,
  Cog,
  Home,
  LayoutGrid,
  Menu,
  Monitor,
  Pause,
  Plus,
  Search,
  Shuffle,
  Smartphone,
  Tablet,
  UserRound,
} from 'lucide-react';
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetTitle,
  cn,
} from '@oee/ui';
import { fmtClock, type ClockSpeed } from '@oee/fixtures';
import { useScoped } from '../state/app-state';
import { useArrivalToast } from '../components/useArrivalToast';
import { RaiseAndonDialog } from '../components/RaiseAndonDialog';
import { useOpenEvent } from '../components/useOpenEvent';
import { MoreMenu, RailNav } from './SidebarNav';
import { currentNav, isActive } from './nav-items';

const SPEEDS: ClockSpeed[] = [0, 1, 10, 60];

/** Plant time plus the demo speed switch. At 60x a fresh stop reaches the plant manager in 30 seconds. */
function DemoClock() {
  const { now, speed, autoStops, setAutoStops, dispatch } = useScoped();
  return (
    <div
      className="bg-card shadow-card flex h-11 shrink-0 items-center gap-1 rounded-full p-1 pl-4"
      role="group"
      aria-label="Demo clock"
    >
      <span className="mr-1 font-mono text-xs font-semibold tabular-nums">{fmtClock(now)}</span>
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={speed === s}
          aria-label={s === 0 ? 'Pause clock' : `Run clock at ${s}x`}
          onClick={() => dispatch({ type: 'clock/setSpeed', speed: s })}
          className={cn(
            'text-muted hover:text-foreground hidden h-9 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold sm:flex',
            speed === s && 'bg-ink text-on-ink hover:text-on-ink',
          )}
        >
          {s === 0 ? <Pause className="size-3.5" /> : `${s}x`}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={autoStops}
        onClick={() => setAutoStops(!autoStops)}
        title="Random stops from the state engine. Most clear inside 2 minutes and end as micro stops."
        className={cn(
          'text-muted hover:text-foreground ml-1 hidden h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold lg:flex',
          autoStops && 'bg-action text-white hover:text-white',
        )}
      >
        <Shuffle className="size-3.5" />
        Auto stops
      </button>
      {/* Phones get one button that steps through the speeds. */}
      <button
        type="button"
        aria-label={`Clock speed ${speed}x, tap to change`}
        onClick={() =>
          dispatch({
            type: 'clock/setSpeed',
            speed: SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!,
          })
        }
        className="bg-ink text-on-ink flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold sm:hidden"
      >
        {speed === 0 ? <Pause className="size-3.5" /> : `${speed}x`}
      </button>
    </div>
  );
}

const BAR_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/events', label: 'Events', icon: Bell },
  { to: '/andon', label: 'Board', icon: LayoutGrid },
  { to: '/machines', label: 'Machines', icon: Cog },
] as const;

export function AdminLayout() {
  const { openEvents, people, personById, viewerId, plant, inbox, dispatch } = useScoped();
  const openEvent = useOpenEvent();
  const { toast, dismiss } = useArrivalToast();
  const unread = inbox.filter((n) => n.unread).length;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [raising, setRaising] = React.useState(false);
  const [q, setQ] = React.useState('');
  const user = personById.get(viewerId) ?? people[0]!;
  const nav = currentNav(pathname);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/machines${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    setSearchOpen(false);
  };
  const searchForm = (
    <form onSubmit={submitSearch} className="w-full md:max-w-sm">
      <Input
        aria-label="Search machines"
        placeholder="Search machines by tag, name or asset id"
        leftIcon={<Search />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="[&_input]:bg-card [&_input]:shadow-card [&_input]:h-11 [&_input]:rounded-full [&_input]:border-0"
      />
    </form>
  );
  const barLink = (item: (typeof BAR_LINKS)[number]) => {
    const active = isActive(item.to, pathname);
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-label={item.label}
        className={cn(
          'relative flex size-11 items-center justify-center rounded-2xl transition-colors',
          active ? 'bg-action shadow-glow text-white' : 'text-on-ink-muted hover:text-white',
        )}
      >
        <item.icon className="size-5" />
        {item.to === '/events' && openEvents.length && !active ? (
          <span className="text-danger absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold">
            {openEvents.length}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="bg-surface relative flex h-dvh gap-4 overflow-hidden p-3 lg:p-4 print:block print:h-auto print:overflow-visible print:bg-white print:p-0">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-[8%] -top-[30%] h-[120%] w-[70%] opacity-70 blur-xl [background:radial-gradient(45%_40%_at_60%_30%,rgb(237_28_36_/_0.10),transparent_70%),radial-gradient(40%_55%_at_85%_55%,rgb(237_28_36_/_0.07),transparent_70%)]" />
      </div>
      <div className="relative hidden shrink-0 md:block print:hidden">
        <RailNav onRaise={() => setRaising(true)} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex h-14 shrink-0 items-center gap-2 sm:gap-3 print:hidden">
          <div className="hidden min-w-0 lg:block">
            <h2 className="truncate text-lg font-bold leading-tight">{plant.name}</h2>
            <p className="text-muted truncate text-xs">Shift 1 · {nav?.label ?? 'Control Tower'}</p>
          </div>
          <div className="hidden min-w-0 flex-1 2xl:ml-4 2xl:block">{searchForm}</div>
          <DemoClock />
          <Button
            variant="ghost"
            size="icon"
            className="bg-card shadow-card ml-auto 2xl:hidden"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <Search />
          </Button>
          <Button
            variant="outline"
            className="hidden sm:inline-flex"
            onClick={() => setRaising(true)}
          >
            <Plus />
            Raise Andon
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="bg-card shadow-card relative"
            aria-label={`Inbox, ${unread} unread`}
          >
            <Link to="/inbox">
            <Bell />
            {unread ? (
              <span className="border-surface bg-action absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 px-1 text-[10.5px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="bg-card shadow-card hover:bg-surface-2 flex h-11 items-center gap-2.5 rounded-full pl-1.5 pr-1.5 focus:outline-none xl:pr-3"
                aria-label="Account menu"
              >
                <Avatar name={user.name} color={user.color} size="sm" className="size-8" />
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-sm font-semibold">{user.name}</span>
                  <span className="text-muted block text-[11px]">{user.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="text-foreground block text-sm font-semibold">{user.name}</span>
                <span className="block font-normal">{user.role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/me')}>
                <UserRound />
                My response stats
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>View the demo as</DropdownMenuLabel>
              <div className="max-h-52 overflow-y-auto">
                {people.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => dispatch({ type: 'viewer/set', personId: p.id })}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {p.name} <span className="text-muted">· {p.role}</span>
                    </span>
                    {p.id === viewerId ? <Check className="text-action" /> : null}
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/board')}>
                <Monitor />
                Andon TV board
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/operator')}>
                <Tablet />
                Line tablet
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/m')}>
                <Smartphone />
                Responder phone app
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {searchOpen ? <div className="-mt-2 2xl:hidden">{searchForm}</div> : null}

        <main className="min-h-0 flex-1 overflow-y-auto pb-24 pr-0.5 md:pb-2 print:overflow-visible print:pb-0">
          <Outlet />
        </main>

        <nav
          aria-label="Primary"
          className="bg-ink shadow-float fixed inset-x-3 bottom-3 z-40 flex h-[68px] items-center justify-between rounded-[22px] px-3 md:hidden print:hidden"
        >
          {BAR_LINKS.slice(0, 2).map(barLink)}
          <button
            type="button"
            onClick={() => setRaising(true)}
            aria-label="Raise Andon"
            className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <Plus className="size-5" />
          </button>
          {BAR_LINKS.slice(2).map(barLink)}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="text-on-ink-muted flex size-11 items-center justify-center rounded-2xl hover:text-white"
          >
            <Menu className="size-5" />
          </button>
        </nav>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          hideClose
          aria-describedby={undefined}
          className="bg-ink text-on-ink max-h-[80dvh] overflow-y-auto rounded-t-[28px] border-0 p-0 pb-[max(env(safe-area-inset-bottom),1rem)]"
        >
          <SheetTitle className="sr-only">More destinations</SheetTitle>
          <MoreMenu onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
      {raising ? <RaiseAndonDialog open onClose={() => setRaising(false)} /> : null}
      {toast ? (
        <div
          role="status"
          className="bg-ink text-on-ink shadow-float animate-in fade-in slide-in-from-bottom-2 fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl p-4 md:inset-x-auto md:bottom-6 md:right-6"
        >
          <span className="bg-action mt-1 size-2.5 shrink-0 animate-pulse rounded-full" />
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              dispatch({ type: 'notifications/read', ids: [toast.id] });
              dismiss();
              if (toast.eventId) openEvent(toast.eventId);
              else navigate('/oee');
            }}
          >
            <span className="block text-sm font-bold">{toast.title}</span>
            <span className="text-on-ink-muted block text-xs">{toast.body}</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-on-ink-muted text-xs font-semibold hover:text-white"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
