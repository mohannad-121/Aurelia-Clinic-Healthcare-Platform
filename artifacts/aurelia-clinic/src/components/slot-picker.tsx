import { tr } from '@/lib/i18n';
import { useState, type ReactNode } from 'react';
import { useGetAvailability, getGetAvailabilityQueryKey } from '@workspace/api-client-react';
import { useFmt, useLocale, errMsg } from '@/lib/i18n';
import { addDays } from '@/lib/tz';
import { Skeletons } from '@/components/site';

export interface SlotValue { doctor_id: string; doctor_name: string; starts_at: string }

export function SlotPicker({ serviceId, doctorId, value, onChange, empty }: { serviceId: string; doctorId?: string; value: SlotValue | null; onChange: (s: SlotValue | null) => void; empty?: (date: string) => ReactNode }) {
  const f = useFmt();
  const { t } = useLocale();
  const today = f.ymd(new Date());
  const [date, setDate] = useState(today);
  const params = { service_id: serviceId, ...(doctorId ? { doctor_id: doctorId } : {}), date };
  const q = useGetAvailability(params, { query: { enabled: !!serviceId, queryKey: getGetAvailabilityQueryKey(params), refetchInterval: 30000 } });
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const slots = q.data?.slots ?? [];
  return (
    <div data-testid="slot-picker">
      <div className="flex gap-2 overflow-x-auto pb-3">
        {days.map((k) => (
          <button type="button" key={k} onClick={() => { setDate(k); onChange(null); }} className={`shrink-0 w-16 rounded-2xl border py-3 text-center ${date === k ? 'bg-navy text-white border-navy' : 'hover:border-azure'}`} data-testid={`day-${k}`}>
            <span className="text-[10px] uppercase block opacity-70">{f.weekday(`${k}T12:00:00Z`)}</span><span className="text-xl font-bold">{k.slice(8)}</span>
          </button>
        ))}
      </div>
      <input type="date" className="field max-w-48" value={date} min={today} onChange={(e) => { if (e.target.value) { setDate(e.target.value); onChange(null); } }} aria-label={tr("Date")} />
      <p className="text-xs text-muted-foreground mt-2">{t('book.tz')}: {f.tz}</p>
      <div className="mt-4">
        {q.isLoading ? <Skeletons n={1} h={80} /> : q.isError ? <p className="text-sm text-[#a1281d]">{errMsg(q.error)}</p> : slots.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((s) => {
              const on = value?.starts_at === s.starts_at && value.doctor_id === s.doctor_id;
              return <button type="button" key={s.starts_at + s.doctor_id} onClick={() => onChange({ doctor_id: s.doctor_id, doctor_name: s.doctor_name, starts_at: s.starts_at })} className={`rounded-xl border px-2 py-2.5 text-sm font-semibold ${on ? 'bg-royal text-white border-royal' : 'hover:border-azure'}`} data-testid={`slot-${s.starts_at}`}>{f.time(s.starts_at)}{!doctorId && <span className="block text-[10px] font-normal opacity-70 truncate">{s.doctor_name}</span>}</button>;
            })}
          </div>
        ) : (empty ? empty(date) : <p className="text-sm text-muted-foreground">{q.data?.message ?? tr("No open times on this day.")}</p>)}
      </div>
    </div>
  );
}
