import { tr } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { addDays } from '@/lib/tz';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { useGetClinic, useGetAvailability, getGetAvailabilityQueryKey, useCreateAppointment, useJoinWaitlist, getListAppointmentsQueryKey } from '@workspace/api-client-react';
import type { Appointment } from '@workspace/api-client-react';
import { useLocale, useLoc, useFmt, errMsg } from '@/lib/i18n';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Skeletons, EmptyBlock, PageHero } from '@/components/site';

export default function Book() {
  const { t, locale } = useLocale();
  const loc = useLoc();
  const f = useFmt();
  useSeo(tr("Book an appointment"), tr("Choose a service, doctor and time to book your visit at Aurelia Clinic."));
  const qp = new URLSearchParams(window.location.search);
  const { data: clinic, isLoading } = useGetClinic();
  const { authenticated, profile, configured } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(qp.get('service') ?? '');
  const [doctorId, setDoctorId] = useState(qp.get('doctor') ?? '');
  const [date, setDate] = useState(f.ymd(new Date()));
  const [slot, setSlot] = useState<{ doctor_id: string; doctor_name: string; starts_at: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState<Appointment | null>(null);
  const [wl, setWl] = useState(false);

  const services = (clinic?.services ?? []).filter((s) => s.published);
  const service = services.find((s) => s.id === serviceId);
  const doctors = (clinic?.doctors ?? []).filter((d) => d.published && (!serviceId || d.service_ids?.includes(serviceId)));
  const params = { service_id: serviceId, ...(doctorId ? { doctor_id: doctorId } : {}), date };
  const avail = useGetAvailability(params, { query: { enabled: !!serviceId && step >= 2, queryKey: getGetAvailabilityQueryKey(params), refetchInterval: 30000 } });
  const create = useCreateAppointment();
  const waitlist = useJoinWaitlist();
  const todayKey = f.ymd(new Date());
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayKey, i)), [todayKey]);
  const labels = [t('book.s1'), t('book.s2'), t('book.s3'), t('book.s4'), t('book.s5')];

  const confirm = () => {
    if (!slot || !service) return;
    create.mutate({ data: { service_id: service.id, doctor_id: slot.doctor_id, starts_at: slot.starts_at, notes: notes || undefined, consent } }, {
      onSuccess: (a) => { setDone(a); qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAvailabilityQueryKey(params) }); },
      onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }),
    });
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center" data-testid="booking-done">
        <span className="mx-auto h-16 w-16 rounded-full bg-royal text-white grid place-items-center"><Check size={30} /></span>
        <h1 className="display text-5xl mt-6">{t('book.done')}</h1>
        <p className="mt-4 text-muted-foreground">{t('book.ref')}: <b className="font-mono text-navy" data-testid="text-reference">{done.reference}</b></p>
        <p className="mt-1 text-navy font-semibold">{f.dateTime(done.starts_at)} · {done.doctor_name}</p>
        <span className="pill mt-3">{done.status}</span>
        <div className="mt-8 flex gap-3 justify-center"><Link href="/portal" className="btn btn-primary">{t('nav.portal')}</Link><Link href="/" className="btn btn-ghost">{t('nav.home')}</Link></div>
      </div>
    );
  }

  return (
    <>
      <PageHero eyebrow={t('nav.book')} title={t('book.title')} />
      <section className="mx-auto max-w-5xl px-5 py-12">
        <ol className="flex gap-2 mb-10" aria-label={tr("Progress")}>
          {labels.map((l, i) => (
            <li key={l} className="flex-1">
              <div className="h-1.5 rounded-full bg-ice overflow-hidden"><motion.div className="h-full bg-royal" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} /></div>
              <span className={`text-[11px] font-semibold mt-2 block ${i === step ? 'text-royal' : 'text-muted-foreground'}`}>{i + 1}. {l}</span>
            </li>
          ))}
        </ol>

        <div className="card p-6 sm:p-9 min-h-[360px]">
          {step === 0 && (isLoading ? <Skeletons n={3} h={70} /> : services.length === 0 ? <EmptyBlock title={tr("No bookable services yet")} /> : (
            <div className="grid sm:grid-cols-2 gap-3">{services.map((s) => (
              <button key={s.id} onClick={() => { setServiceId(s.id); setSlot(null); setWl(false); const ok = (clinic?.doctors ?? []).find((d) => d.id === doctorId)?.service_ids?.includes(s.id); if (!ok) setDoctorId(''); }} className={`text-start rounded-2xl border p-5 transition-all ${serviceId === s.id ? 'border-royal bg-ice ring-2 ring-royal/20' : 'hover:border-azure'}`} data-testid={`option-service-${s.slug}`}>
                <p className="eyebrow">{s.specialty}</p><p className="font-bold text-navy mt-1">{loc(s, 'name')}</p>
                <p className="text-xs text-muted-foreground mt-2 flex gap-3"><span className="inline-flex items-center gap-1"><Clock size={12} />{s.duration_minutes} {t('common.min')}</span><span>{f.money(s.price)}</span></p>
              </button>
            ))}</div>
          ))}

          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => { setDoctorId(''); setSlot(null); }} className={`text-start rounded-2xl border p-5 ${!doctorId ? 'border-royal bg-ice ring-2 ring-royal/20' : ''}`} data-testid="option-doctor-any"><p className="font-bold text-navy">{t('book.anyDoctor')}</p></button>
              {doctors.map((d) => (
                <button key={d.id} onClick={() => { setDoctorId(d.id); setSlot(null); }} className={`text-start rounded-2xl border p-5 ${doctorId === d.id ? 'border-royal bg-ice ring-2 ring-royal/20' : 'hover:border-azure'}`} data-testid={`option-doctor-${d.id}`}><p className="font-bold text-navy">{loc(d, 'name')}</p><p className="text-xs text-muted-foreground mt-1">{d.specialty}</p></button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex gap-2 overflow-x-auto pb-3">{days.map((d) => {
                const k = d;
                return <button key={k} onClick={() => { setDate(k); setSlot(null); setWl(false); }} className={`shrink-0 w-16 rounded-2xl border py-3 text-center ${date === k ? 'bg-navy text-white border-navy' : 'hover:border-azure'}`} data-testid={`day-${k}`}><span className="text-[10px] uppercase block opacity-70">{f.weekday(`${k}T12:00:00Z`)}</span><span className="text-xl font-bold">{k.slice(8)}</span></button>;
              })}</div>
              <input type="date" className="field max-w-48 mt-3" value={date} min={todayKey} onChange={(e) => { setDate(e.target.value); setSlot(null); }} aria-label={tr("Date")} data-testid="input-date" />
              <div className="mt-6">
                {avail.isLoading ? <Skeletons n={1} h={80} /> : avail.isError ? <p className="text-sm text-[#a1281d]">{t('common.error')} <button className="underline" onClick={() => avail.refetch()}>{t('common.retry')}</button></p> : avail.data && avail.data.slots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" data-testid="slots">{avail.data.slots.map((s) => (
                    <button key={s.doctor_id + s.starts_at} onClick={() => setSlot(s)} className={`rounded-xl border py-2.5 text-sm font-semibold ${slot?.starts_at === s.starts_at && slot.doctor_id === s.doctor_id ? 'bg-royal text-white border-royal' : 'hover:border-azure'}`} title={s.doctor_name}>{f.time(s.starts_at)}</button>
                  ))}</div>
                ) : (
                  <div className="rounded-2xl bg-ice p-6" data-testid="no-slots">
                    <p className="font-semibold text-navy">{avail.data?.message ?? t('book.noSlots')}</p>
                    {!configured || avail.data?.configured === false ? <p className="text-sm text-muted-foreground mt-1">{tr('Live availability appears here once the clinic connects its scheduling database. No times are invented.')}</p> : authenticated && (
                      <button className="btn btn-ghost btn-sm mt-4" disabled={waitlist.isPending || wl} onClick={() => waitlist.mutate({ data: { service_id: serviceId, doctor_id: doctorId || undefined, date } }, { onSuccess: () => { setWl(true); toast({ title: tr("Added to the waitlist") }); }, onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) })}>{wl ? tr("On waitlist") : t('book.waitlist')}</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 max-w-lg">
              {authenticated && profile ? <div className="rounded-2xl bg-ice p-4 text-sm"><p className="font-bold text-navy">{profile.name}</p><p className="text-muted-foreground">{profile.email} · <bdi>{profile.phone}</bdi></p></div> : <div className="rounded-2xl bg-ice p-5 text-sm"><p className="mb-3 text-ink">{t('book.needLogin')}</p><div className="flex gap-2"><Link href={`/login?next=${encodeURIComponent('/book?service=' + serviceId + (doctorId ? '&doctor=' + doctorId : ''))}`} className="btn btn-navy btn-sm" data-testid="link-book-login">{t('nav.login')}</Link><Link href="/register" className="btn btn-ghost btn-sm">{t('auth.register')}</Link></div></div>}
              <div><label className="label" htmlFor="b-notes">{t('form.notes')}</label><textarea id="b-notes" className="field min-h-24" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-notes" /><p className="text-xs text-muted-foreground mt-1">{tr('Administrative notes only. Do not describe symptoms or emergencies here.')}</p></div>
              <label className="flex gap-3 text-xs text-muted-foreground items-start"><input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="checkbox-consent" />{t('form.consent')}</label>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3 max-w-lg" data-testid="review">
              {[[t('book.s1'), service ? loc(service, 'name') : '—'], [t('book.s2'), slot?.doctor_name ?? '—'], [t('book.s3'), slot ? f.dateTime(slot.starts_at) : '—'], ['Fee', service ? f.money(service.price) : '—']].map(([k, v]) => <div key={k} className="flex justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">{k}</span><b className="text-navy">{v}</b></div>)}
              {!authenticated && <p className="text-sm text-[#7a5200] bg-[#fff4d6] rounded-xl p-3">{t('book.needLogin')}</p>}
              <button className="btn btn-primary mt-3" disabled={!authenticated || !consent || !slot || create.isPending} onClick={confirm} data-testid="button-confirm">{create.isPending ? t('common.loading') : t('book.confirm')}</button>
              {!consent && authenticated && <p className="text-xs text-muted-foreground">{t('form.consent')}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)} data-testid="button-back"><ArrowLeft size={16} className="rtl:rotate-180" />{t('common.back')}</button>
          {step < 4 && <button className="btn btn-navy" onClick={() => setStep(step + 1)} disabled={(step === 0 && !serviceId) || (step === 2 && !slot)} data-testid="button-next">{t('common.next')}<ArrowRight size={16} className="rtl:rotate-180" /></button>}
        </div>
        <p className="text-xs text-muted-foreground mt-6">{t('emergency')} {tr('Times shown in clinic time zone')}: {f.tz}.</p>
      </section>
    </>
  );
}
