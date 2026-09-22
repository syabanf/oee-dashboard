import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button, Chip, Input, StatCard, cn, type StatTone } from '@oee/ui';

/** One row of filters above the content they scope, with the result count and a clear button on the right. */
export function FilterBar({
  children,
  count,
  total,
  noun,
  onClear,
  className,
}: {
  children: React.ReactNode;
  count: number;
  total: number;
  noun: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 print:hidden', className)}>
      {children}
      <p className="text-muted ml-auto flex items-center gap-1 text-xs tabular-nums">
        {count === total ? `${total} ${noun}` : `${count} of ${total} ${noun}`}
        {onClear ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            Clear
          </Button>
        ) : null}
      </p>
    </div>
  );
}

/** Holds inline comboboxes so they read as one control. */
export const FilterPill = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-card shadow-card flex max-w-full items-center gap-1 rounded-full p-1">
    {children}
  </div>
);

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}
/** Single-choice chips. The empty value is "all". */
export function ChipGroup<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ChipOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex max-w-full gap-2 overflow-x-auto [scrollbar-width:none]', className)}
    >
      {options.map((o) => (
        <Chip
          key={o.value || 'all'}
          active={value === o.value}
          onClick={() => onChange(o.value)}
          label={o.count === undefined ? o.label : `${o.label} · ${o.count}`}
          className="data-[active=true]:border-ink data-[active=true]:bg-ink shrink-0"
        />
      ))}
    </div>
  );
}

export const SearchFilter = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <Input
    aria-label={placeholder}
    placeholder={placeholder}
    leftIcon={<Search />}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="[&_input]:bg-card [&_input]:shadow-card w-full sm:w-64 [&_input]:h-10 [&_input]:rounded-full [&_input]:border-0"
  />
);

export interface SummaryItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  active?: boolean;
  onClick?: () => void;
}
/** The numbers that sum up what the filters currently show. A card with `onClick` doubles as a filter. */
export function SummaryCards({ items }: { items: SummaryItem[] }) {
  return (
    // Two-up on phones leaves about 100px for the number, so it steps down a size there.
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 [&_p.truncate]:text-[22px] sm:[&_p.truncate]:text-[28px]">
      {items.map(({ active, onClick, ...card }) =>
        onClick ? (
          <button
            key={card.label}
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className="rounded-card aria-pressed:ring-ink text-left transition-transform active:scale-[0.98] aria-pressed:ring-2"
          >
            <StatCard {...card} className="h-full" />
          </button>
        ) : (
          <StatCard key={card.label} {...card} />
        ),
      )}
    </div>
  );
}
