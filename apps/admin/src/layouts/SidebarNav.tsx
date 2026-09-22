import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Factory, Monitor, Plus, Smartphone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Rail,
  RailAction,
  RailGroup,
  RailItem,
  RailWorkspace,
  WitMark,
} from '@oee/ui';
import { useScoped } from '../state/app-state';
import { NAV_SECTIONS, OPERATOR_NAV, isActive } from './nav-items';

const STORAGE_KEY = 'oee.admin.sidebar';
function readExpanded() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? window.matchMedia('(min-width: 1280px)').matches : saved === '1';
  } catch {
    return true;
  }
}

export function RailNav({ onRaise }: { onRaise: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { plant, openEvents } = useScoped();
  const [expanded, setExpanded] = React.useState(readExpanded);
  const toggle = () =>
    setExpanded((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, prev ? '0' : '1');
      } catch {
        /* private mode: keep the in-memory state */
      }
      return !prev;
    });

  return (
    <Rail
      expanded={expanded}
      onToggle={toggle}
      header={
        <Link
          to="/"
          aria-label="Control Tower home"
          className="flex size-11 items-center justify-center rounded-2xl bg-white/5"
        >
          <WitMark dark className="text-base" />
        </Link>
      }
      action={
        <RailAction label="Raise Andon" onClick={onRaise}>
          <Plus />
        </RailAction>
      }
      workspace={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <RailWorkspace icon={<Factory />} kicker={plant.company} name={plant.name} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuLabel>Shopfloor screens</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => navigate('/board')}>
              <Monitor />
              Andon TV board
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(OPERATOR_NAV.to)}>
              <OPERATOR_NAV.icon />
              {OPERATOR_NAV.label}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/m')}>
              <Smartphone />
              Responder phone app
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {NAV_SECTIONS.map((section, i) => {
        const items = section.items.map((item) => (
          <RailItem
            key={item.to}
            asChild
            icon={<item.icon />}
            label={item.label}
            active={isActive(item.to, pathname)}
            badge={item.to === '/events' ? openEvents.length : undefined}
            sub={i === 2}
          >
            <Link to={item.to} />
          </RailItem>
        ));
        // Master data is reference material: one icon when collapsed, a group when expanded.
        if (i !== 2)
          return (
            <React.Fragment key={section.label}>
              {i > 0 ? <div className="my-1 h-px w-8 shrink-0 self-center bg-white/10" /> : null}
              {items}
            </React.Fragment>
          );
        const first = section.items[0]!;
        const active = section.items.some((item) => isActive(item.to, pathname));
        return (
          <React.Fragment key={section.label}>
            <div className="my-1 h-px w-8 shrink-0 self-center bg-white/10" />
            <RailGroup
              icon={<section.icon />}
              label={section.label}
              active={active}
              defaultOpen={active}
              collapsedTo={
                <RailItem asChild icon={<section.icon />} label={section.label} active={active}>
                  <Link to={first.to} />
                </RailItem>
              }
            >
              {items}
            </RailGroup>
          </React.Fragment>
        );
      })}
    </Rail>
  );
}

/** Phone "More" menu body, rendered inside a dark bottom sheet. */
export function MoreMenu({ onNavigate }: { onNavigate: () => void }) {
  const { pathname } = useLocation();
  return (
    <div className="pb-2">
      <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-white/20" />
      {[
        ...NAV_SECTIONS,
        {
          label: 'Shopfloor screens',
          icon: Monitor,
          items: [
            { to: '/board', label: 'Andon TV board', icon: Monitor },
            OPERATOR_NAV,
            { to: '/m', label: 'Responder phone', icon: Smartphone },
          ],
        },
      ].map((section) => (
        <section key={section.label}>
          <p className="text-on-ink-muted px-5 pt-4 text-[11px] font-semibold uppercase tracking-wider">
            {section.label}
          </p>
          <div className="grid grid-cols-3 gap-2 p-4 pb-0">
            {section.items.map((item) => {
              const active = isActive(item.to, pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className="flex flex-col items-center gap-2 rounded-2xl p-3 hover:bg-white/10"
                >
                  <span
                    className={
                      active
                        ? 'bg-action shadow-glow flex size-11 items-center justify-center rounded-2xl text-white'
                        : 'flex size-11 items-center justify-center rounded-2xl bg-white/10'
                    }
                  >
                    <item.icon className="size-5" />
                  </span>
                  <span className="text-center text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
