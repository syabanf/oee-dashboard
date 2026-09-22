import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/cn';

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}
export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  label?: string;
  /** Search row. Turn off only for fixed enums of 6 or fewer values. */
  searchable?: boolean;
  /** `field` matches the input shape, `soft` sits inside white cards, `inline` is the small filter pill. */
  variant?: 'field' | 'soft' | 'inline';
  className?: string;
  disabled?: boolean;
}

function usePhone() {
  const [phone, setPhone] = React.useState(() => window.matchMedia('(max-width: 767px)').matches);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

/** Searchable dropdown. A popover on tablet and up, a bottom sheet on phones. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select',
  label,
  searchable = true,
  variant = 'field',
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  const phone = usePhone();
  const listId = React.useId();
  const selected = options.find((o) => o.value === value);

  const q = query.trim().toLowerCase();
  const matches = q
    ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q))
    : options;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setQuery('');
    setHighlight(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
  };
  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    onOpenChange(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(matches.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = matches[highlight];
      if (hit) choose(hit);
    }
  };

  const trigger = (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between gap-2 text-sm disabled:opacity-50',
        variant === 'inline'
          ? 'h-8 rounded-full px-3 font-medium hover:bg-black/5'
          : 'h-11 w-full rounded-2xl px-4',
        variant === 'field' && 'border-border bg-card border',
        variant === 'soft' && 'bg-surface',
        className,
      )}
    >
      <span className={cn('truncate', !selected && 'text-muted')}>
        {selected?.label ?? placeholder}
      </span>
      <ChevronDown className="size-4 shrink-0 opacity-60" />
    </button>
  );

  const panel = (
    <div onKeyDown={onKeyDown}>
      {searchable ? (
        <div className="border-border flex h-11 items-center gap-2 border-b px-3">
          <Search className="text-muted size-4 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            placeholder="Search"
            aria-label={label ? `Search ${label}` : 'Search'}
            aria-activedescendant={matches[highlight] ? `${listId}-${highlight}` : undefined}
            className="placeholder:text-muted h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {options.length > 20 ? (
            <span className="text-muted text-xs tabular-nums">
              {matches.length} of {options.length}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        id={listId}
        role="listbox"
        tabIndex={searchable ? -1 : 0}
        className={cn('overflow-y-auto p-1 outline-none', phone ? 'max-h-[55dvh]' : 'max-h-64')}
      >
        {matches.map((o, i) => (
          <button
            key={o.value}
            id={`${listId}-${i}`}
            type="button"
            role="option"
            aria-selected={i === highlight}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => choose(o)}
            className="hover:bg-surface aria-selected:bg-surface flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{o.label}</span>
              {o.hint ? <span className="text-muted block truncate text-xs">{o.hint}</span> : null}
            </span>
            {o.value === value ? <Check className="text-action ml-auto size-4 shrink-0" /> : null}
          </button>
        ))}
        {matches.length === 0 ? (
          <p className="text-muted px-3 py-6 text-center text-sm">No matches for “{query}”</p>
        ) : null}
      </div>
    </div>
  );

  if (phone) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="bg-ink/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[2px]" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="bg-card shadow-float data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-hidden rounded-t-[28px] pb-[max(env(safe-area-inset-bottom),1rem)] focus:outline-none"
          >
            <DialogPrimitive.Title className="sr-only">
              {label ?? placeholder}
            </DialogPrimitive.Title>
            <div className="bg-border mx-auto mb-1 mt-3 h-1.5 w-10 rounded-full" />
            {panel}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="border-border bg-card shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 z-50 min-w-[max(var(--radix-popover-trigger-width),12rem)] overflow-hidden rounded-2xl border"
        >
          {panel}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
