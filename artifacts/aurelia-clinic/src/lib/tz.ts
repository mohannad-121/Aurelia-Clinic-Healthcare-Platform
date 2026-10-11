export const DEFAULT_TZ = 'Asia/Amman';

export function validTz(tz?: string): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

function offsetMs(tz: string, ms: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p: Record<string, string> = {};
  for (const x of dtf.formatToParts(new Date(ms))) p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

/** 'YYYY-MM-DDTHH:mm' wall-clock time in tz -> UTC ISO string */
export function zonedToIso(local: string, tz: string): string {
  const [d, t = '00:00'] = local.split('T');
  const [y, m, da] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, da, h, mi);
  let ts = guess - offsetMs(tz, guess);
  ts = guess - offsetMs(tz, ts);
  return new Date(ts).toISOString();
}

/** ISO instant -> 'YYYY-MM-DDTHH:mm' wall-clock in tz (for datetime-local inputs) */
export function isoToZoned(iso: unknown, tz: string): string {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (isNaN(+d)) return '';
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p: Record<string, string> = {};
  for (const x of dtf.formatToParts(d)) p[x.type] = x.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function ymdInTz(date: Date | string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(typeof date === 'string' ? new Date(date) : date);
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dowOf(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}
