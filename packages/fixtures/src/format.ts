const TZ = 'Asia/Jakarta';
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const clockShort = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const day = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const pad = (n: number) => String(n).padStart(2, '0');

/** 14:32:11 in plant time. */
export const fmtClock = (ms: number) => clock.format(ms);
export const fmtClockShort = (ms: number) => clockShort.format(ms);
export const fmtDay = (ms: number | string) => day.format(typeof ms === 'string' ? Date.parse(`${ms}T00:00:00+07:00`) : ms);

/** Stopwatch style for live events: 08m 42s, 1h 04m. */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s % 60)}s`;
}
/** Report style for totals: 6h 21m, 42m. */
export function fmtHm(ms: number): string {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`;
}
export const fmtPct = (ratio: number, digits = 1) => `${(ratio * 100).toFixed(digits)}%`;
export const fmtPts = (ratio: number) => `${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(1)} pts`;
export const fmtInt = (n: number) => int.format(Math.round(n));
/** Rp 127,400,000 */
export const fmtIdr = (n: number) => `Rp ${int.format(Math.round(n))}`;
/** Rp 184 juta, for headline numbers. */
export function fmtIdrShort(n: number): string {
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} miliar`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} juta`;
  return fmtIdr(n);
}
