import { fmtPct } from '@oee/fixtures';
import { Tooltip, TooltipContent, TooltipTrigger } from '@oee/ui';

export interface TrendLinePoint {
  label: string;
  value: number;
  note?: string;
}

/**
 * One metric over time as a 2px line with point markers and a dashed target. A line may start its axis
 * above zero, so a 5-point move stays readable; the axis labels say where it starts.
 */
export function TrendLine({
  points,
  target,
  height = 220,
}: {
  points: TrendLinePoint[];
  target?: number;
  height?: number;
}) {
  if (points.length === 0)
    return <p className="text-muted py-10 text-center text-sm">No history for this selection.</p>;
  const values = [...points.map((p) => p.value), ...(target ? [target] : [])];
  const lo = Math.max(0, Math.floor((Math.min(...values) - 0.03) * 20) / 20);
  const hi = Math.min(1, Math.ceil((Math.max(...values) + 0.02) * 20) / 20);
  const x = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100);
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const ticks = [lo, (lo + hi) / 2, hi];
  const every = Math.ceil(points.length / 8);
  return (
    <div>
      <div className="flex gap-2">
        <div
          className="text-muted flex w-9 shrink-0 flex-col justify-between text-right text-[10.5px] tabular-nums"
          style={{ height }}
        >
          {[...ticks].reverse().map((t) => (
            <span key={t}>{fmtPct(t, 0)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden
          >
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {target ? (
              <line
                x1="0"
                x2="100"
                y1={y(target)}
                y2={y(target)}
                className="stroke-accent"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none"
              className="stroke-ink"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {target ? (
            <span
              className="text-action absolute right-0 -translate-y-full pb-0.5 text-[10.5px] font-semibold"
              style={{ top: `${y(target)}%` }}
            >
              target {fmtPct(target, 0)}
            </span>
          ) : null}
          {points.map((p, i) => (
            <Tooltip key={p.label}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${p.label}: ${fmtPct(p.value)}`}
                  className="group absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
                  style={{ left: `${x(i)}%`, top: `${y(p.value)}%` }}
                >
                  <span className="bg-ink ring-card size-2 rounded-full ring-2 transition-transform group-hover:scale-150 group-focus-visible:scale-150" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold">{fmtPct(p.value)}</span> · {p.label}
                {p.note ? ` · ${p.note}` : ''}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="text-muted relative ml-11 mt-2 h-4 text-[10.5px] tabular-nums">
        {points.map((p, i) =>
          i % every === 0 || i === points.length - 1 ? (
            <span
              key={p.label}
              className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
              style={{ left: `${x(i)}%` }}
            >
              {p.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
