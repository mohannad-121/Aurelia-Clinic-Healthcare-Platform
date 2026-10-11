import { tr } from '@/lib/i18n';
import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '@workspace/api-client-react';
import { useFmt } from '@/lib/i18n';
import { addDays, dowOf } from '@/lib/tz';
import { StatusPill } from '@/components/admin';

export function ApptCalendar({ appts, actions }: { appts: Appointment[]; actions?: (a: Appointment) => ReactNode }) {
  const f = useFmt();
  const [mode, setMode] = useState<'day' | 'week'>('week');
  const [anchor, setAnchor] = useState(() => f.ymd(new Date()));
  const start = mode === 'week' ? addDays(anchor, -dowOf(anchor)) : anchor;
  const keys = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => addDays(start, i));
  const step = mode === 'week' ? 7 : 1;
  const today = f.ymd(new Date());
  return (
    <div data-testid="calendar">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button className="btn btn-ghost btn-sm" aria-label={tr("Previous")} onClick={() => setAnchor(addDays(anchor, -step))}><ChevronLeft size={16} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(today)}>{tr('Today')}</button>
        <button className="btn btn-ghost btn-sm" aria-label={tr("Next")} onClick={() => setAnchor(addDays(anchor, step))}><ChevronRight size={16} /></button>
        <b className="text-navy text-sm mx-2">{keys[0]}{keys.length > 1 ? ` – ${keys[6]}` : ''}</b>
        <div className="ms-auto flex gap-1">{(['day', 'week'] as const).map((m) => <button key={m} className={`btn btn-sm ${mode === m ? 'btn-navy' : 'btn-ghost'}`} onClick={() => setMode(m)}>{m === 'day' ? 'Day' : tr("Week")}</button>)}</div>
      </div>
      <div className={`grid gap-3 ${mode === 'week' ? 'md:grid-cols-7' : ''}`}>
        {keys.map((k) => {
          const items = appts.filter((a) => f.ymd(a.starts_at) === k).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          return (
            <div key={k} className={`rounded-2xl border p-3 min-h-28 ${k === today ? 'bg-ice border-royal/40' : 'bg-white'}`}>
              <p className="text-xs font-bold text-navy mb-2">{f.weekday(`${k}T12:00:00Z`)} {k.slice(5)}</p>
              {items.length === 0 ? <p className="text-xs text-muted-foreground">{tr('No appointments')}</p> : <div className="grid gap-2">{items.map((a) => (
                <div key={a.id} className="rounded-xl bg-pearl border p-2 text-xs">
                  <p className="font-bold text-royal">{f.time(a.starts_at)}</p>
                  <p className="font-semibold text-navy truncate">{a.patient_name}</p>
                  <p className="text-muted-foreground truncate">{a.service_name}{mode === 'day' || ` · ${a.doctor_name}`}</p>
                  <div className="mt-1"><StatusPill s={a.status} /></div>
                  {actions && <div className="mt-2 flex flex-wrap gap-1">{actions(a)}</div>}
                </div>
              ))}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
