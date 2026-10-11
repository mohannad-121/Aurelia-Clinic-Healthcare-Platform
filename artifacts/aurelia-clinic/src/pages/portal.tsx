import { tr } from '@/lib/i18n';
import { useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, UserRound, BellRing, LogOut, Phone, CalendarX } from 'lucide-react';
import { useListAppointments, useUpdateAppointment, getListAppointmentsQueryKey, useUpdateProfile, getGetSessionQueryKey, useGetClinic, useListRecords, getListRecordsQueryKey, useCreateRecord, useDeleteRecord } from '@workspace/api-client-react';
import type { Appointment, ProfileInputCommunicationPreference } from '@workspace/api-client-react';
import { useLocale, useFmt, errMsg } from '@/lib/i18n';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Logo, Skeletons, ErrorBlock, EmptyBlock, Initials } from '@/components/site';
import { RequireAuth, StatusPill, Confirm, Modal } from '@/components/admin';
import { SlotPicker, type SlotValue } from '@/components/slot-picker';
import { ApptCalendar } from '@/components/calendar';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useLocale();
  const { profile, signOut } = useAuth();
  return (
    <div className="min-h-[100dvh] bg-pearl">
      <header className="bg-white border-b sticky top-0 z-30"><div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between"><Link href="/"><Logo /></Link><div className="flex items-center gap-3">{profile && <span className="hidden sm:flex items-center gap-2 text-sm font-semibold text-navy"><Initials name={profile.name} size={32} />{profile.name}</span>}<button className="btn btn-ghost btn-sm" onClick={signOut} data-testid="button-logout"><LogOut size={14} />{t('nav.logout')}</button></div></div></header>
      <main className="mx-auto max-w-5xl px-5 py-10"><h1 className="display text-4xl sm:text-5xl mb-8">{title}</h1>{children}</main>
    </div>
  );
}

export function ApptRow({ a, actions, showPatient }: { a: Appointment; actions?: React.ReactNode; showPatient?: boolean }) {
  const f = useFmt();
  return (
    <div className="card !rounded-2xl p-5 flex flex-wrap items-center gap-4 justify-between" data-testid={`row-appt-${a.id}`}>
      <div className="flex items-center gap-4"><div className="rounded-xl bg-ice text-center px-3 py-2 min-w-16"><p className="text-[10px] uppercase text-royal font-bold">{f.weekday(a.starts_at)}</p><p className="font-extrabold text-navy text-lg leading-none">{f.date(a.starts_at).split(' ')[0]}</p></div>
        <div><p className="font-bold text-navy">{showPatient ? `${a.patient_name} · ` : ''}{a.service_name}</p><p className="text-sm text-muted-foreground">{f.dateTime(a.starts_at)} · {a.doctor_name}</p><p className="text-[11px] font-mono text-muted-foreground">{a.reference}</p>{showPatient && (a.patient_phone || a.patient_email) && <p className="text-xs text-muted-foreground"><bdi>{a.patient_phone}</bdi> {a.patient_email}</p>}</div></div>
      <div className="flex items-center gap-2"><StatusPill s={a.status} />{actions}</div>
    </div>
  );
}

export function Portal() {
  useSeo(tr("Patient portal"), tr("Manage your Aurelia Clinic appointments, profile and preferences."));
  return <RequireAuth><PortalInner /></RequireAuth>;
}

function PortalInner() {
  const { t } = useLocale();
  const f = useFmt();
  const { profile } = useAuth();
  const { data: clinic } = useGetClinic();
  const qc = useQueryClient();
  const appts = useListAppointments({ query: { queryKey: getListAppointmentsQueryKey(), refetchInterval: 30000 } });
  const upd = useUpdateAppointment();
  const prof = useUpdateProfile();
  const [tab, setTab] = useState<'appts' | 'profile' | 'prefs'>('appts');
  const [cancel, setCancel] = useState<Appointment | null>(null);
  const [resch, setResch] = useState<Appointment | null>(null);
  const [slot, setSlot] = useState<SlotValue | null>(null);
  const [form, setForm] = useState({ name: profile?.name ?? '', phone: profile?.phone ?? '', communication_preference: (profile?.communication_preference ?? 'email') as ProfileInputCommunicationPreference, consent: profile?.consent ?? false });
  const now = Date.now();
  const list = appts.data ?? [];
  const up = list.filter((a) => new Date(a.starts_at).getTime() >= now && !['cancelled', 'completed', 'no_show'].includes(a.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = list.filter((a) => !up.includes(a)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const saveProfile = (patch: Partial<typeof form>) => prof.mutate({ data: { ...form, ...patch } }, { onSuccess: (p) => { qc.setQueryData(getGetSessionQueryKey(), { authenticated: true, configured: true, profile: p }); toast({ title: tr("Saved") }); }, onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) });
  const tabs = [['appts', tr("Appointments"), CalendarDays], ['profile', t('portal.profile'), UserRound], ['prefs', t('portal.prefs'), BellRing]] as const;
  return (
    <Shell title={`${t('portal.title')}`}>
      <div className="flex flex-wrap gap-2 mb-8">{tabs.map(([k, l, Ic]) => { const Icon = Ic; return <button key={k} onClick={() => setTab(k)} className={`btn btn-sm ${tab === k ? 'btn-navy' : 'btn-ghost'}`} data-testid={`tab-${k}`}><Icon size={14} />{l}</button>; })}<Link href="/book" className="btn btn-primary btn-sm ms-auto" data-testid="link-portal-book">{t('nav.book')}</Link></div>
      {tab === 'appts' && (appts.isLoading ? <Skeletons n={3} h={90} /> : appts.isError ? <ErrorBlock onRetry={() => appts.refetch()} /> : (
        <div className="grid gap-8">
          <div><h2 className="eyebrow mb-3">{t('portal.upcoming')}</h2>{up.length === 0 ? <EmptyBlock title={tr("No upcoming appointments")} action={<Link href="/book" className="btn btn-primary btn-sm">{t('nav.book')}</Link>} /> : <div className="grid gap-3">{up.map((a) => <ApptRow key={a.id} a={a} actions={<><button className="btn btn-ghost btn-sm" onClick={() => { setSlot(null); setResch(a); }} data-testid={`button-reschedule-${a.id}`}>{t('book.reschedule')}</button><button className="btn btn-danger btn-sm" onClick={() => setCancel(a)} data-testid={`button-cancel-${a.id}`}><CalendarX size={14} />{t('portal.cancel')}</button></>} />)}</div>}
            <p className="text-xs text-muted-foreground mt-3">{tr('Cancellation is allowed up to')} {clinic?.settings.cancellation_hours ?? 24} {tr('hours before the visit.')} {tr('Rescheduling moves your existing booking to a new open time; if the change is rejected, your current booking stays as it is.')}</p></div>
          <div><h2 className="eyebrow mb-3">{t('portal.past')}</h2>{past.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.none')}</p> : <div className="grid gap-3">{past.map((a) => <ApptRow key={a.id} a={a} />)}</div>}</div>
          <div className="card p-6 flex items-center justify-between gap-4 flex-wrap"><div><p className="font-bold text-navy">{tr('Need help?')}</p><p className="text-sm text-muted-foreground"><bdi>{clinic?.settings.phone}</bdi> · {clinic?.settings.hours}</p></div><Link href="/contact" className="btn btn-ghost btn-sm"><Phone size={14} />{t('nav.contact')}</Link></div>
        </div>
      ))}
      {tab === 'profile' && (
        <form className="card p-8 grid gap-4 max-w-lg" onSubmit={(e) => { e.preventDefault(); saveProfile({}); }} data-testid="form-profile">
          <div><label className="label">{t('form.name')}</label><input className="field" minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" /></div>
          <div><label className="label">{t('form.email')}</label><input className="field opacity-70" value={profile?.email ?? ''} disabled /></div>
          <div><label className="label">{t('form.phone')}</label><input className="field" minLength={7} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" /></div>
          <button className="btn btn-primary justify-self-start" disabled={prof.isPending} data-testid="button-save-profile">{t('common.save')}</button>
        </form>
      )}
      {tab === 'prefs' && (
        <div className="card p-8 grid gap-5 max-w-lg" data-testid="form-prefs">
          <div><label className="label">{t('portal.prefs')}</label><div className="grid grid-cols-3 gap-2">{(['email', 'phone', 'none'] as const).map((p) => <button key={p} onClick={() => setForm({ ...form, communication_preference: p })} className={`btn btn-sm ${form.communication_preference === p ? 'btn-navy' : 'btn-ghost'}`} data-testid={`pref-${p}`}>{p}</button>)}</div></div>
          <label className="flex gap-3 text-sm items-start"><input type="checkbox" className="mt-1" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} data-testid="checkbox-consent" />{t('form.consent')}</label>
          <p className="text-xs text-muted-foreground">{tr('Reminders are only sent once the clinic configures a delivery provider. Saving a preference does not mean a message was delivered.')}</p>
          <button className="btn btn-primary justify-self-start" disabled={prof.isPending} onClick={() => saveProfile({})} data-testid="button-save-prefs">{t('common.save')}</button>
        </div>
      )}
      <Modal open={!!resch} onClose={() => setResch(null)} title={t('book.reschedule')}>
        {resch && <div data-testid="modal-reschedule">
          <p className="text-sm text-muted-foreground mb-4">{resch.service_name} · {resch.doctor_name} · {f.dateTime(resch.starts_at)}</p>
          <SlotPicker key={resch.id} serviceId={resch.service_id} doctorId={resch.doctor_id} value={slot} onChange={setSlot} />
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-ghost btn-sm" onClick={() => setResch(null)}>{t('common.cancel')}</button><button className="btn btn-primary btn-sm" disabled={!slot || upd.isPending} data-testid="button-save-reschedule" onClick={() => slot && upd.mutate({ id: resch.id, data: { starts_at: slot.starts_at, doctor_id: slot.doctor_id } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }); setResch(null); toast({ title: tr("Appointment rescheduled") }); }, onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) })}>{upd.isPending ? t('common.loading') : t('book.confirm')}</button></div>
        </div>}
      </Modal>
      <Confirm open={!!cancel} title={t('portal.cancel')} body={cancel ? `${cancel.service_name} · ${cancel.reference}` : ''} busy={upd.isPending} onNo={() => setCancel(null)} onYes={() => cancel && upd.mutate({ id: cancel.id, data: { status: 'cancelled' } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }); setCancel(null); toast({ title: tr("Appointment cancelled") }); }, onError: (e) => { setCancel(null); toast({ title: errMsg(e), variant: 'destructive' }); } })} />
    </Shell>
  );
}

export function DoctorPortal() {
  useSeo(tr("Doctor schedule"), tr("Your assigned appointments and availability exceptions."));
  return <RequireAuth roles={['doctor', 'super_admin', 'clinic_admin']}><DoctorInner /></RequireAuth>;
}

function DoctorInner() {
  const f = useFmt();
  const qc = useQueryClient();
  const appts = useListAppointments({ query: { queryKey: getListAppointmentsQueryKey(), refetchInterval: 30000 } });
  const ex = useListRecords('exceptions', { query: { queryKey: getListRecordsQueryKey('exceptions'), refetchInterval: 60000 } });
  const upd = useUpdateAppointment();
  const create = useCreateRecord();
  const del = useDeleteRecord();
  const { profile } = useAuth();
  const reqs = useListRecords('schedule_requests', { query: { queryKey: getListRecordsQueryKey('schedule_requests') } });
  const [rq, setRq] = useState({ weekday: '1', start_time: '09:00', end_time: '17:00', reason: '' });
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [v, setV] = useState({ date: '', starts_at: '', ends_at: '', reason: '' });
  const list = [...(appts.data ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next: Record<string, [string, string]> = { confirmed: ['checked_in', tr("Check in")], checked_in: ['in_progress', tr("Start")], in_progress: ['completed', tr("Complete")] };
  const setStatus = (a: Appointment, status: Appointment['status']) => upd.mutate({ id: a.id, data: { status } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }), onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) });
  return (
    <Shell title={tr("Your schedule")}>
      <h2 className="eyebrow mb-3">{tr('Assigned appointments')}</h2>
      {appts.isLoading ? <Skeletons /> : appts.isError ? <ErrorBlock onRetry={() => appts.refetch()} /> : list.length === 0 ? <EmptyBlock title={tr("No assigned appointments")} /> : <>
<div className="flex gap-2 mb-4">{(['list', 'calendar'] as const).map((m) => <button key={m} className={`btn btn-sm ${view === m ? 'btn-navy' : 'btn-ghost'}`} onClick={() => setView(m)}>{m === 'list' ? tr("List") : tr("Calendar")}</button>)}</div>
{view === 'calendar' ? <ApptCalendar appts={list} actions={(a) => <>{next[a.status] && <button className="btn btn-primary btn-sm" onClick={() => setStatus(a, next[a.status][0] as Appointment['status'])}>{next[a.status][1]}</button>}</>} /> : <div className="grid gap-3">{list.map((a) => <ApptRow key={a.id} a={a} showPatient actions={<>{next[a.status] && <button className="btn btn-primary btn-sm" onClick={() => setStatus(a, next[a.status][0] as Appointment['status'])}>{next[a.status][1]}</button>}{['confirmed', 'checked_in'].includes(a.status) && <button className="btn btn-danger btn-sm" onClick={() => setStatus(a, 'no_show')}>{tr('No show')}</button>}</>} />)}</div>}
</>}
      <h2 className="eyebrow mt-12 mb-3">{tr('Working hours change request')}</h2>
      {profile?.doctor_id ? <form className="card p-6 grid sm:grid-cols-4 gap-4" data-testid="form-schedule-request" onSubmit={(e) => { e.preventDefault(); create.mutate({ resource: 'schedule_requests', data: { data: { doctor_id: profile.doctor_id, weekday: Number(rq.weekday), start_time: rq.start_time, end_time: rq.end_time, reason: rq.reason } } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListRecordsQueryKey('schedule_requests') }); setRq({ ...rq, reason: '' }); toast({ title: tr("Request submitted for review") }); }, onError: (er) => toast({ title: errMsg(er), variant: 'destructive' }) }); }}>
        <div><label className="label">{tr('Weekday')}</label><select className="field" value={rq.weekday} onChange={(e) => setRq({ ...rq, weekday: e.target.value })}>{[tr("Sunday"), tr("Monday"), tr("Tuesday"), tr("Wednesday"), tr("Thursday"), tr("Friday"), tr("Saturday")].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
        <div><label className="label">{tr('Starts')}</label><input type="time" required className="field" value={rq.start_time} onChange={(e) => setRq({ ...rq, start_time: e.target.value })} /></div>
        <div><label className="label">{tr('Ends')}</label><input type="time" required className="field" value={rq.end_time} onChange={(e) => setRq({ ...rq, end_time: e.target.value })} /></div>
        <div><label className="label">{tr('Reason')}</label><input className="field" value={rq.reason} onChange={(e) => setRq({ ...rq, reason: e.target.value })} /></div>
        <p className="sm:col-span-3 text-xs text-muted-foreground">{tr('Your working schedule changes only after an administrator approves the request.')}</p>
        <button className="btn btn-primary justify-self-end" disabled={create.isPending} data-testid="button-schedule-request">{tr('Submit request')}</button>
      </form> : <EmptyBlock title={tr("No doctor profile linked")} hint={tr("Ask an administrator to link your account to a doctor profile.")} />}
      <div className="grid gap-2 mt-4">{(reqs.data ?? []).filter((r) => r.data.doctor_id === profile?.doctor_id).map((r) => <div key={r.id} className="card !rounded-xl p-4 flex justify-between text-sm"><span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(r.data.weekday)]} {String(r.data.start_time ?? '').slice(0, 5)}–{String(r.data.end_time ?? '').slice(0, 5)} {String(r.data.reason ?? '')}</span><StatusPill s={String(r.data.status ?? 'pending')} /></div>)}</div>
      <h2 className="eyebrow mt-12 mb-3">{tr('Availability exceptions')}</h2>
      <form className="card p-6 grid sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ resource: 'exceptions', data: { data: { date: v.date, reason: v.reason, starts_at: v.starts_at ? f.toIso(`${v.date}T${v.starts_at}`) : null, ends_at: v.ends_at ? f.toIso(`${v.date}T${v.ends_at}`) : null } } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListRecordsQueryKey('exceptions') }); setV({ date: '', starts_at: '', ends_at: '', reason: '' }); toast({ title: tr("Exception saved") }); }, onError: (er) => toast({ title: errMsg(er), variant: 'destructive' }) }); }} data-testid="form-exception">
        <div><label className="label">{tr('Date')}</label><input type="date" required className="field" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></div>
        <div><label className="label">{tr('From (blank = all day)')}</label><input type="time" className="field" value={v.starts_at} onChange={(e) => setV({ ...v, starts_at: e.target.value })} /></div>
        <div><label className="label">{tr('To')}</label><input type="time" className="field" value={v.ends_at} onChange={(e) => setV({ ...v, ends_at: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">{tr('Reason')}</label><input className="field" value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></div>
        <button className="btn btn-primary justify-self-start" disabled={create.isPending} data-testid="button-save-exception">{tr('Add exception')}</button>
      </form>
      <div className="grid gap-2 mt-4">{(ex.data ?? []).map((r) => <div key={r.id} className="card !rounded-xl p-4 flex justify-between items-center text-sm"><span><b className="text-navy">{String(r.data.date ?? '')}</b> · {String(r.data.reason ?? '')}{r.data.starts_at ? ` · ${f.time(String(r.data.starts_at))}` : ''}</span><button className="btn btn-danger btn-sm" onClick={() => del.mutate({ resource: 'exceptions', id: r.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListRecordsQueryKey('exceptions') }) })}>{tr('Remove')}</button></div>)}</div>
    </Shell>
  );
}
