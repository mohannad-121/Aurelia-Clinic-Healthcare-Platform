import { tr } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LayoutDashboard, CalendarDays, Users, Inbox, ListChecks, Stethoscope, HeartPulse, Clock, UserCog, BarChart3, Globe, BookOpenText, Newspaper, Quote, Settings, ScrollText, PanelLeftClose, PanelLeftOpen, LogOut, Plus, Pencil, Archive, Search, Menu, TriangleAlert, ExternalLink, Building2, Tag, Hourglass, Bell, FileText, CalendarClock, Eye } from 'lucide-react';
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey, useListAppointments, getListAppointmentsQueryKey, useUpdateAppointment, useCreateAppointment,
  useListRecords, getListRecordsQueryKey, useCreateRecord, useUpdateRecord, useDeleteRecord, useGetClinic,
} from '@workspace/api-client-react';
import type { Appointment, ResourceRecord } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useFmt, useLocale, errMsg } from '@/lib/i18n';
import { SlotPicker, type SlotValue } from '@/components/slot-picker';
import { ApptCalendar } from '@/components/calendar';
import { ImageUpload } from '@/components/media';
import { useSeo } from '@/lib/seo';
import { toast } from '@/hooks/use-toast';
import { Logo, Skeletons, ErrorBlock, EmptyBlock, Initials } from '@/components/site';
import { Modal, Confirm, RequireAuth, StatusPill } from '@/components/admin';

type Resource = Parameters<typeof useListRecords>[0];
type FType = 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'datetime' | 'time' | 'date' | 'email' | 'doctor' | 'service' | 'services' | 'image';
interface FieldDef { key: string; label: string; type?: FType; options?: [string, string][]; required?: boolean; wide?: boolean; createOnly?: boolean }
interface ModDef { key: string; label: string; icon: typeof Users; roles: string[]; resource?: Resource; fields?: FieldDef[]; cols?: string[]; archive?: 'published' | 'delete' | 'inactive' | 'closed'; blurb: string; noCreate?: boolean; readonlyCols?: boolean }

const ALL = ['super_admin', 'clinic_admin'];
const FRONT = [...ALL, 'receptionist'];
const WEEK: [string, string][] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => [String(i), d]);
const LEAD_STAGES: [string, string][] = [['new_inquiry', 'New inquiry'], ['contacted', 'Contacted'], ['interested', 'Interested'], ['appointment_requested', 'Appointment requested'], ['appointment_booked', 'Appointment booked'], ['converted', 'Converted'], ['closed', 'Closed']];
const COMM: [string, string][] = [['email', 'Email'], ['phone', 'Phone'], ['none', 'No contact']];

const MODS: ModDef[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, roles: FRONT, blurb: '' },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays, roles: [...FRONT, 'doctor'], blurb: 'Confirm, check in, reschedule and book on behalf of patients.' },
  { key: 'patients', label: 'Patients', icon: Users, roles: FRONT, resource: 'patients', archive: 'inactive', cols: ['name', 'email', 'phone', 'communication_preference', 'status'], blurb: 'Administrative directory. Adding a patient creates a real account invitation (name and email required). Delivery is not guaranteed or confirmed here.', fields: [{ key: 'name', label: 'Full name', required: true }, { key: 'email', label: 'Email (cannot be changed on an existing account)', type: 'email', createOnly: true }, { key: 'phone', label: 'Phone' }, { key: 'communication_preference', label: 'Preferred contact', type: 'select', options: COMM }, { key: 'assigned_to', label: 'Assigned staff (staff id)' }, { key: 'consent', label: 'Consent to be contacted', type: 'bool' }, { key: 'status', label: 'Status', type: 'select', options: [['active', 'Active'], ['inactive', 'Inactive']] }] },
  { key: 'leads', label: 'Leads', icon: Inbox, roles: FRONT, resource: 'leads', archive: 'delete', cols: ['name', 'email', 'phone', 'status'], blurb: 'Inquiries pipeline. Drag cards between stages.', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone' }, { key: 'message', label: 'Message', type: 'textarea', wide: true }, { key: 'status', label: 'Stage', type: 'select', options: LEAD_STAGES }, { key: 'consent', label: 'Consent recorded', type: 'bool' }, { key: 'assigned_to', label: 'Assigned to (staff id)' }] },
  { key: 'tasks', label: 'Tasks', icon: ListChecks, roles: FRONT, resource: 'tasks', archive: 'delete', cols: ['title', 'due_at', 'assigned_to', 'status'], blurb: 'Follow-ups and operational work.', fields: [{ key: 'title', label: 'Title', required: true, wide: true }, { key: 'description', label: 'Description', type: 'textarea', wide: true }, { key: 'due_at', label: 'Due', type: 'datetime' }, { key: 'assigned_to', label: 'Assigned to (staff id)' }, { key: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['completed', 'Completed']] }] },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, roles: ALL, resource: 'doctors', archive: 'published', cols: ['name', 'specialty', 'languages', 'published'], blurb: 'Profiles shown on the public website.', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'name_ar', label: 'Name (Arabic)' }, { key: 'specialty', label: 'Specialty', required: true }, { key: 'languages', label: 'Languages' }, { key: 'image_url', label: 'Photo (upload or HTTPS URL)', type: 'image', wide: true }, { key: 'service_ids', label: 'Services offered', type: 'services', wide: true }, { key: 'is_demo', label: 'Illustrative demo profile', type: 'bool' }, { key: 'biography', label: 'Biography', type: 'textarea', wide: true }, { key: 'biography_ar', label: 'Biography (Arabic)', type: 'textarea', wide: true }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'services', label: 'Services', icon: HeartPulse, roles: ALL, resource: 'services', archive: 'published', cols: ['name', 'specialty', 'duration_minutes', 'price', 'published'], blurb: 'Bookable services, fees in JOD.', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'name_ar', label: 'Name (Arabic)' }, { key: 'slug', label: 'URL slug', required: true }, { key: 'specialty', label: 'Specialty', required: true }, { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number' }, { key: 'price', label: 'Price (JOD)', type: 'number' }, { key: 'description', label: 'Description', type: 'textarea', wide: true }, { key: 'description_ar', label: 'Description (Arabic)', type: 'textarea', wide: true }, { key: 'is_demo', label: 'Illustrative demo service', type: 'bool' }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'schedules', label: 'Schedules', icon: Clock, roles: ALL, resource: 'schedules', archive: 'delete', cols: ['doctor_id', 'weekday', 'start_time', 'end_time'], blurb: 'Weekly working hours and breaks per doctor. Exceptions block specific dates.', fields: [{ key: 'doctor_id', label: 'Doctor', type: 'doctor', required: true }, { key: 'weekday', label: 'Weekday', type: 'select', options: WEEK, required: true }, { key: 'start_time', label: 'Starts', type: 'time', required: true }, { key: 'end_time', label: 'Ends', type: 'time', required: true }, { key: 'break_start', label: 'Break starts', type: 'time' }, { key: 'break_end', label: 'Break ends', type: 'time' }] },
  { key: 'exceptions', label: 'Exceptions', icon: TriangleAlert, roles: ALL, resource: 'exceptions', archive: 'delete', cols: ['doctor_id', 'date', 'reason'], blurb: 'Days off, holidays and blocked time.', fields: [{ key: 'doctor_id', label: 'Doctor', type: 'doctor', required: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'starts_at', label: 'From (optional)', type: 'datetime' }, { key: 'ends_at', label: 'To (optional)', type: 'datetime' }, { key: 'reason', label: 'Reason', wide: true }] },
  { key: 'staff', label: 'Staff', icon: UserCog, roles: ['super_admin'], resource: 'staff', archive: 'inactive', cols: ['name', 'email', 'role'], blurb: 'Role assignments. Access is enforced by the server, not by this menu.', fields: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email (create only)', type: 'email', createOnly: true }, { key: 'phone', label: 'Phone' }, { key: 'status', label: 'Status', type: 'select', options: [['active', 'Active'], ['inactive', 'Inactive']] }, { key: 'consent', label: 'Consent', type: 'bool' }, { key: 'communication_preference', label: 'Preferred contact', type: 'select', options: COMM }, { key: 'role', label: 'Role', type: 'select', options: [['super_admin', 'Super admin'], ['clinic_admin', 'Clinic admin'], ['receptionist', 'Receptionist'], ['doctor', 'Doctor'], ['patient', 'Patient']] }] },
  { key: 'branches', label: 'Branches', icon: Building2, roles: ALL, resource: 'branches', archive: 'published', cols: ['name', 'address', 'phone', 'published'], blurb: 'Clinic locations.', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address', wide: true }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'tags', label: 'Tags', icon: Tag, roles: FRONT, resource: 'tags', archive: 'delete', cols: ['name', 'color'], blurb: 'Labels for the patient directory.', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'color', label: 'Color (hex, e.g. #1263df)' }] },
  { key: 'waitlist', label: 'Waitlist', icon: Hourglass, roles: FRONT, resource: 'waitlist', archive: 'closed', noCreate: true, blurb: 'Patients waiting for an open time. Update the status as reception follows up; nothing is sent automatically.', fields: [{ key: 'status', label: 'Status', type: 'select', options: [['waiting', 'Waiting'], ['contacted', 'Contacted'], ['booked', 'Booked'], ['closed', 'Closed']] }] },
  { key: 'notifications', label: 'Delivery log', icon: Bell, roles: FRONT, resource: 'notifications', readonlyCols: true, blurb: 'Read-only log of notification delivery attempts. Reminders only send when a provider is configured; entries here are not proof of delivery to a patient.' },
  { key: 'templates', label: 'Templates', icon: FileText, roles: ALL, resource: 'templates', archive: 'delete', cols: ['name', 'channel', 'subject'], blurb: 'Message templates are stored for staff reference only. Nothing is sent from this screen.', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'channel', label: 'Channel', type: 'select', options: [['email', 'Email'], ['sms', 'SMS']] }, { key: 'subject', label: 'Subject', wide: true }, { key: 'body', label: 'Body', type: 'textarea', wide: true }] },
  { key: 'schedule_requests', label: 'Schedule requests', icon: CalendarClock, roles: ALL, resource: 'schedule_requests', readonlyCols: true, cols: ['doctor_id', 'weekday', 'start_time', 'end_time', 'reason', 'status'], blurb: 'Doctor-submitted working hour changes. Approving updates the working schedule; rejecting leaves it unchanged.' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, roles: ALL, blurb: '' },
  { key: 'content', label: 'Website CMS', icon: Globe, roles: ALL, resource: 'content', archive: 'published', cols: ['title', 'slug', 'published'], blurb: 'Published records by slug drive public pages: about, privacy, terms, footer, announcement, home-hero.', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'title_ar', label: 'Title (Arabic)' }, { key: 'slug', label: 'URL slug', required: true }, { key: 'excerpt', label: 'Excerpt', wide: true }, { key: 'body', label: 'Body', type: 'textarea', wide: true }, { key: 'body_ar', label: 'Body (Arabic)', type: 'textarea', wide: true }, { key: 'image_url', label: 'Image (upload or HTTPS URL)', type: 'image', wide: true }, { key: 'seo_title', label: 'SEO title' }, { key: 'seo_description', label: 'SEO description' }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'faqs', label: 'Knowledge', icon: BookOpenText, roles: ALL, resource: 'faqs', archive: 'published', cols: ['question', 'published'], blurb: 'FAQ entries. These also ground the clinic assistant.', fields: [{ key: 'question', label: 'Question', required: true, wide: true }, { key: 'answer', label: 'Answer', type: 'textarea', required: true, wide: true }, { key: 'question_ar', label: 'Question (Arabic)', wide: true }, { key: 'answer_ar', label: 'Answer (Arabic)', type: 'textarea', wide: true }, { key: 'approved', label: 'Approved for the assistant and public site', type: 'bool' }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'posts', label: 'Articles', icon: Newspaper, roles: ALL, resource: 'posts', archive: 'published', cols: ['title', 'slug', 'published'], blurb: 'Journal posts. Publishing updates the public site.', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'title_ar', label: 'Title (Arabic)' }, { key: 'slug', label: 'URL slug', required: true }, { key: 'excerpt', label: 'Excerpt', wide: true }, { key: 'body', label: 'Body', type: 'textarea', wide: true }, { key: 'body_ar', label: 'Body (Arabic)', type: 'textarea', wide: true }, { key: 'image_url', label: 'Image (upload or HTTPS URL)', type: 'image', wide: true }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'testimonials', label: 'Testimonials', icon: Quote, roles: ALL, resource: 'testimonials', archive: 'delete', cols: ['name', 'quote', 'published'], blurb: 'Only approved, real patient testimonials should be published.', fields: [{ key: 'name', label: 'Patient name', required: true }, { key: 'quote', label: 'Testimonial', type: 'textarea', required: true, wide: true }, { key: 'approved', label: 'Patient approved', type: 'bool' }, { key: 'is_demo', label: 'Illustrative demo entry', type: 'bool' }, { key: 'published', label: 'Published', type: 'bool' }] },
  { key: 'settings', label: 'Settings', icon: Settings, roles: ALL, blurb: '' },
  { key: 'audit', label: 'Audit log', icon: ScrollText, roles: ALL, resource: 'audit', blurb: 'Sensitive administrative actions. Read only.' },
];

const SETTINGS_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Clinic name' }, { key: 'logo_url', label: 'Logo (upload or HTTPS URL)', type: 'image', wide: true }, { key: 'headline', label: 'Headline', wide: true }, { key: 'description', label: 'Description', type: 'textarea', wide: true },
  { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address', wide: true }, { key: 'hours', label: 'Opening hours', wide: true },
  { key: 'timezone', label: 'Time zone' }, { key: 'currency', label: 'Currency' }, { key: 'cancellation_hours', label: 'Cancellation window (hours)', type: 'number' }, { key: 'approval_required', label: 'Staff must approve bookings', type: 'bool' },
];


function Setup({ what }: { what?: string }) {
  return <div className="rounded-2xl bg-[#fff4d6] text-[#5e4000] text-sm p-4 flex gap-3" data-testid="notice-setup"><TriangleAlert size={18} className="shrink-0" /><span>{what ?? tr("Could not load live data.")} If the clinic database is not connected yet, this module stays empty. No sample figures are shown.</span></div>;
}

function FieldInput({ f, value, onChange, editing }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; editing?: boolean }) {
  const { data: clinic } = useGetClinic();
  const fm = useFmt();
  const id = `f-${f.key}`;
  const base = { id, className: 'field', required: f.required, disabled: !!(f.createOnly && editing), 'data-testid': `input-${f.key}` };
  let el;
  switch (f.type) {
    case 'textarea': el = <textarea {...base} className="field min-h-28" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />; break;
    case 'number': el = <input {...base} type="number" step="any" value={value === undefined || value === null ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />; break;
    case 'bool': return <label className="flex items-center gap-3 text-sm font-semibold text-navy py-2"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} data-testid={`input-${f.key}`} />{f.label}</label>;
    case 'select': el = <select {...base} value={String(value ?? '')} onChange={(e) => onChange(f.key === 'weekday' ? Number(e.target.value) : e.target.value)}><option value="">{tr('Select')}</option>{f.options?.map(([v, l]) => <option key={v} value={v}>{tr(l)}</option>)}</select>; break;
    case 'doctor': el = <select {...base} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">{tr('Select doctor')}</option>{(clinic?.doctors ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>; break;
    case 'services': { const ids = Array.isArray(value) ? (value as string[]) : []; return <div className="sm:col-span-2"><p className="label">{tr(f.label)}</p><div className="flex flex-wrap gap-2">{(clinic?.services ?? []).map((sv) => <label key={sv.id} className={`pill cursor-pointer !text-sm !px-3 !py-1.5 ${ids.includes(sv.id) ? '!bg-royal !text-white' : ''}`}><input type="checkbox" className="sr-only" checked={ids.includes(sv.id)} onChange={() => onChange(ids.includes(sv.id) ? ids.filter((x) => x !== sv.id) : [...ids, sv.id])} />{sv.name}</label>)}</div></div>; }
    case 'service': el = <select {...base} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">{tr('Select service')}</option>{(clinic?.services ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>; break;
    case 'datetime': el = <input {...base} type="datetime-local" value={fm.toLocal(value)} onChange={(e) => onChange(e.target.value ? fm.toIso(e.target.value) : null)} />; break;
    case 'image': return <div className="sm:col-span-2"><ImageUpload label={tr(f.label)} value={String(value ?? '')} onChange={onChange} /></div>;
    case 'time': el = <input {...base} type="time" value={String(value ?? '').slice(0, 5)} onChange={(e) => onChange(e.target.value || null)} />; break;
    case 'date': el = <input {...base} type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />; break;
    case 'email': el = <input {...base} type="email" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />; break;
    default: el = <input {...base} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
  }
  return <div className={f.wide || f.type === 'textarea' ? 'sm:col-span-2' : ''}><label className="label" htmlFor={id}>{tr(f.label)}{f.required && ' *'}</label>{el}</div>;
}

function clean(fields: FieldDef[], d: Record<string, unknown>, editing?: boolean) {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    if (editing && f.createOnly) continue;
    const v = d[f.key];
    if (v === undefined || v === null) { if (['time', 'datetime', 'doctor'].includes(f.type ?? '')) o[f.key] = null; continue; }
    o[f.key] = v;
  }
  return o;
}

function RecordForm({ fields, initial, busy, onSubmit, onCancel, editing }: { editing?: boolean; fields: FieldDef[]; initial: Record<string, unknown>; busy: boolean; onSubmit: (d: Record<string, unknown>) => void; onCancel: () => void }) {
  const [d, setD] = useState<Record<string, unknown>>(initial);
  return (
    <form className="grid sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(clean(fields, d, editing)); }} data-testid="form-record">
      {fields.map((f) => <FieldInput key={f.key} editing={editing} f={f} value={d[f.key]} onChange={(v) => setD((x) => ({ ...x, [f.key]: v }))} />)}
      <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{tr('Cancel')}</button><button className="btn btn-primary btn-sm" disabled={busy} data-testid="button-save-record">{busy ? tr("Saving") : tr("Save")}</button></div>
    </form>
  );
}

function useRecordOps(resource: Resource) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: getListRecordsQueryKey(resource) });
  const onError = (e: unknown) => toast({ title: errMsg(e), variant: 'destructive' });
  const create = useCreateRecord();
  const update = useUpdateRecord();
  const del = useDeleteRecord();
  return {
    create: (data: Record<string, unknown>, done?: () => void) => create.mutate({ resource, data: { data } }, { onSuccess: () => { refresh(); toast({ title: tr("Saved") }); done?.(); }, onError }),
    update: (id: string, data: Record<string, unknown>, done?: () => void) => update.mutate({ resource, id, data: { data } }, { onSuccess: () => { refresh(); toast({ title: tr("Saved") }); done?.(); }, onError }),
    remove: (id: string, done?: () => void) => del.mutate({ resource, id }, { onSuccess: () => { refresh(); toast({ title: tr("Removed") }); done?.(); }, onError }),
    busy: create.isPending || update.isPending || del.isPending,
  };
}

function cell(m: ModDef, key: string, r: ResourceRecord, doctorName: (id: string) => string, f: ReturnType<typeof useFmt>) {
  const v = r.data[key];
  if (key === 'published') return <span className={`pill ${v ? 'pill-ok' : ''}`}>{v ? tr("Published") : tr("Draft")}</span>;
  if (key === 'doctor_id') return doctorName(String(v ?? ''));
  if (key === 'weekday') return tr(WEEK[Number(v)]?.[1] ?? String(v ?? ''));
  if (key === 'color') return <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border" style={{ background: String(v ?? '#ccc') }} />{String(v ?? '')}</span>;
  if (key === 'price') return f.money(Number(v ?? 0));
  if (key === 'created_at' || key === 'due_at' || key === 'starts_at') return v ? f.dateTime(String(v)) : '—';
  if (key === 'status' || key === 'role') return <span className="pill">{tr(String(v ?? '—').replace(/_/g, ' '))}</span>;
  void m;
  return <span className="line-clamp-2 max-w-xs">{String(v ?? '—')}</span>;
}

function Module({ m }: { m: ModDef }) {
  const resource = m.resource as Resource;
  const f = useFmt();
  const { data: clinic } = useGetClinic();
  const q = useListRecords(resource, { query: { queryKey: getListRecordsQueryKey(resource), refetchInterval: m.key === 'tasks' || m.key === 'leads' ? 30000 : false } });
  const ops = useRecordOps(resource);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<ResourceRecord | 'new' | null>(null);
  const [rm, setRm] = useState<ResourceRecord | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const doctorName = (id: string) => clinic?.doctors.find((d) => d.id === id)?.name ?? (id ? id.slice(0, 8) : '—');
  const rows = (q.data ?? []).filter((r) => JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (m.key === 'tasks' ? (filter === 'overdue' ? r.data.status !== 'completed' && !!r.data.due_at && new Date(String(r.data.due_at)).getTime() < Date.now() : r.data.status === filter) : String(r.data.status ?? r.data.published) === filter)));
  const readonly = !m.fields;
  const [detail, setDetail] = useState<ResourceRecord | null>(null);
  const [follow, setFollow] = useState<ResourceRecord | null>(null);
  const archive = (r: ResourceRecord) => (m.archive === 'published' ? ops.update(r.id, { published: false }, () => setRm(null)) : m.archive === 'inactive' ? ops.update(r.id, { status: 'inactive' }, () => setRm(null)) : m.archive === 'closed' ? ops.update(r.id, { status: 'closed' }, () => setRm(null)) : ops.remove(r.id, () => setRm(null)));
  const verb = m.archive === 'published' ? tr("Archive") : m.archive === 'inactive' ? tr("Deactivate") : m.archive === 'closed' ? tr("Close") : tr("Delete");
  const cols = m.cols ?? (m.readonlyCols ? Object.keys(q.data?.[0]?.data ?? {}).filter((k) => !/_id$|^id$/.test(k)).slice(0, 6) : []);
  const isKanban = m.key === 'leads';
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-sm"><Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="field !ps-10" placeholder={tr("Search")} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" /></div>
        {m.key === 'tasks' && <select className="field !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="filter-tasks"><option value="all">{tr('All tasks')}</option><option value="open">{tr('Open')}</option><option value="completed">{tr('Completed')}</option><option value="overdue">{tr('Overdue')}</option></select>}
        {m.archive === 'published' && <select className="field !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">{tr('All')}</option><option value="true">{tr('Published')}</option><option value="false">{tr('Drafts')}</option></select>}
        {!readonly && !m.noCreate && <button className="btn btn-primary btn-sm ms-auto" onClick={() => setEdit('new')} data-testid="button-add"><Plus size={15} />{tr('Add')}</button>}
      </div>
      {q.isLoading ? <Skeletons n={4} h={56} /> : q.isError ? <div className="grid gap-4"><Setup what={errMsg(q.error)} /><ErrorBlock onRetry={() => q.refetch()} /></div> : rows.length === 0 ? <EmptyBlock title={`${tr(m.label)} · ${tr('Nothing here yet')}`} hint={tr(m.blurb)} action={!readonly && !m.noCreate && <button className="btn btn-primary btn-sm" onClick={() => setEdit('new')}>{tr('Add the first one')}</button>} /> : isKanban ? (
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban">
          {LEAD_STAGES.map(([st, label0]) => { const label = tr(label0); return (
            <div key={st} className="w-64 shrink-0 rounded-2xl bg-ice/70 p-3" onDragOver={(e) => e.preventDefault()} onDrop={() => { const r = rows.find((x) => x.id === drag); if (r && r.data.status !== st) ops.update(r.id, { status: st }); setDrag(null); }}>
              <p className="eyebrow mb-3 flex justify-between">{label}<span>{rows.filter((r) => (r.data.status ?? 'new_inquiry') === st).length}</span></p>
              <div className="grid gap-2 min-h-16">
                {rows.filter((r) => (r.data.status ?? 'new_inquiry') === st).map((r) => (
                  <div key={r.id} draggable onDragStart={() => setDrag(r.id)} className="card !rounded-xl p-3 cursor-grab active:cursor-grabbing" data-testid={`card-lead-${r.id}`}>
                    <p className="font-bold text-navy text-sm">{String(r.data.name ?? '')}</p><p className="text-xs text-muted-foreground line-clamp-2">{String(r.data.message ?? '')}</p><p className="text-[11px] mt-1"><bdi>{String(r.data.phone ?? '')}</bdi></p>
                    <div className="flex gap-1 mt-2"><select className="field !py-1 !text-xs" value={String(r.data.status ?? 'new_inquiry')} onChange={(e) => ops.update(r.id, { status: e.target.value })} aria-label={tr("Stage")}>{LEAD_STAGES.map(([v, l]) => <option key={v} value={v}>{tr(l)}</option>)}</select><button className="p-1.5 rounded-lg hover:bg-ice" onClick={() => setEdit(r)} aria-label={tr("Edit")}><Pencil size={13} /></button><button className="p-1.5 rounded-lg hover:bg-ice" onClick={() => setFollow(r)} aria-label={tr("Create follow-up task")} title={tr("Follow-up task")}><ListChecks size={13} /></button></div>
                  </div>
                ))}
              </div>
            </div>
          ); })}
        </div>
      ) : (
        <div className="card overflow-x-auto"><table className="tbl" data-testid={`table-${m.key}`}>
          <thead><tr>{m.key === 'audit' ? <><th>{tr('Time')}</th><th>{tr('Details')}</th></> : <>{m.key === 'tasks' && <th />}{cols.map((c) => <th key={c}>{tr(c.replace(/_/g, ' '))}</th>)}{(!readonly || m.key === 'schedule_requests') && <th />}</>}</tr></thead>
          <tbody>{rows.map((r) => m.key === 'audit' ? (
            <tr key={r.id}><td className="whitespace-nowrap">{r.data.created_at ? f.dateTime(String(r.data.created_at)) : '—'}</td><td className="font-mono text-xs">{Object.entries(r.data).filter(([k]) => k !== 'created_at').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')}</td></tr>
          ) : (
            <tr key={r.id} data-testid={`row-${m.key}-${r.id}`}>
              {m.key === 'tasks' && <td><input type="checkbox" checked={r.data.status === 'completed'} onChange={(e) => ops.update(r.id, { status: e.target.checked ? 'completed' : 'open' })} aria-label={tr("Complete task")} data-testid={`check-task-${r.id}`} /></td>}
              {cols.map((c) => <td key={c} className={m.key === 'tasks' && r.data.status === 'completed' ? 'line-through opacity-60' : ''}>{cell(m, c, r, doctorName, f)}</td>)}
              {m.key === 'schedule_requests' ? <td className="whitespace-nowrap text-end">{r.data.status === 'pending' && <><button className="btn btn-primary btn-sm" disabled={ops.busy} onClick={() => ops.update(r.id, { status: 'approved' })} data-testid={`button-approve-${r.id}`}>{tr('Approve')}</button> <button className="btn btn-danger btn-sm" disabled={ops.busy} onClick={() => ops.update(r.id, { status: 'rejected' })}>{tr('Reject')}</button></>}</td> : !readonly && <td className="whitespace-nowrap text-end">{m.key === 'patients' && <button className="btn btn-ghost btn-sm" onClick={() => setDetail(r)} data-testid={`button-view-${r.id}`}><Eye size={13} />{tr('View')}</button>} <button className="btn btn-ghost btn-sm" onClick={() => setEdit(r)} data-testid={`button-edit-${r.id}`}><Pencil size={13} />{tr('Edit')}</button> {!(m.archive === 'inactive' && r.data.status === 'inactive') && <button className="btn btn-danger btn-sm" onClick={() => setRm(r)} data-testid={`button-archive-${r.id}`}><Archive size={13} />{verb}</button>}</td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`${edit === 'new' ? tr('Add') : tr('Edit')} · ${tr(m.label)}`} wide>
        {edit && m.fields && <RecordForm key={edit === 'new' ? 'new' : edit.id} editing={edit !== 'new'} fields={m.fields} initial={edit === 'new' ? (m.key === 'tasks' ? { status: 'open' } : m.key === 'leads' ? { status: 'new_inquiry', consent: false } : m.archive === 'published' ? { published: false, approved: false } : m.key === 'patients' ? { status: 'active', communication_preference: 'email' } : {}) : edit.data} busy={ops.busy} onCancel={() => setEdit(null)} onSubmit={(d) => (edit === 'new' ? ops.create(d, () => setEdit(null)) : ops.update(edit.id, d, () => setEdit(null)))} />}
      </Modal>
      {detail && <PatientDetail rec={detail} onClose={() => setDetail(null)} />}
      {follow && <LeadFollowUp lead={follow} onClose={() => setFollow(null)} />}
      <Confirm open={!!rm} title={`${verb} this entry?`} body={m.archive === 'published' ? tr("It will be unpublished and hidden from the public website. You can publish it again later.") : m.archive === 'inactive' ? tr("The account is not deleted. Its status is set to inactive and it can be reactivated by editing it.") : m.archive === 'closed' ? tr("The request is marked closed.") : tr("This cannot be undone.")} busy={ops.busy} onNo={() => setRm(null)} onYes={() => rm && archive(rm)} />
    </div>
  );
}

function Appointments() {
  const f = useFmt();
  const qc = useQueryClient();
  const { data: clinic } = useGetClinic();
  const q = useListAppointments({ query: { queryKey: getListAppointmentsQueryKey(), refetchInterval: 20000 } });
  const patients = useListRecords('patients', { query: { queryKey: getListRecordsQueryKey('patients') } });
  const upd = useUpdateAppointment();
  const create = useCreateAppointment();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [resched, setResched] = useState<Appointment | null>(null);
  const [slot, setSlot] = useState<SlotValue | null>(null);
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ patient_id: '', service_id: '', doctor_id: '', consent: false });
  const refresh = () => { qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); qc.invalidateQueries({ queryKey: ['/api/availability'] }); };
  const set = (a: Appointment, s: Appointment['status']) => upd.mutate({ id: a.id, data: { status: s } }, { onSuccess: () => { refresh(); toast({ title: `${tr('Marked')} ${tr(s.replace('_', ' '))}` }); }, onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) });
  const rows = (q.data ?? []).filter((a) => (status === 'all' || a.status === status) && `${a.patient_name} ${a.doctor_name} ${a.service_name} ${a.reference}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const days = useMemo(() => { const g: Record<string, Appointment[]> = {}; rows.forEach((a) => { const k = f.date(a.starts_at); (g[k] ??= []).push(a); }); return g; }, [rows, f]);
  const doctorsFor = (clinic?.doctors ?? []).filter((d) => !m.service_id || d.service_ids?.includes(m.service_id));
  const acts = (a: Appointment) => <>
    {a.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => set(a, 'confirmed')} data-testid={`button-confirm-${a.id}`}>{tr('Confirm')}</button>}
    {a.status === 'confirmed' && <button className="btn btn-primary btn-sm" onClick={() => set(a, 'checked_in')}>{tr('Check in')}</button>}
    {a.status === 'checked_in' && <button className="btn btn-primary btn-sm" onClick={() => set(a, 'in_progress')}>{tr('Start')}</button>}
    {a.status === 'in_progress' && <button className="btn btn-primary btn-sm" onClick={() => set(a, 'completed')}>{tr('Complete')}</button>}
    {!['completed', 'cancelled', 'no_show'].includes(a.status) && <><button className="btn btn-ghost btn-sm" onClick={() => { setSlot(null); setResched(a); }}>{tr('Reschedule')}</button><button className="btn btn-danger btn-sm" onClick={() => set(a, 'cancelled')}>{tr('Cancel')}</button></>}
    {['confirmed', 'checked_in'].includes(a.status) && <button className="btn btn-danger btn-sm" onClick={() => set(a, 'no_show')}>{tr('No show')}</button>}
  </>;
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-sm"><Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="field !ps-10" placeholder={tr("Search patient, doctor, reference")} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" /></div>
        <select className="field !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="filter-status"><option value="all">{tr('All statuses')}</option>{['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <div className="flex gap-1">{(['list', 'calendar'] as const).map((v) => <button key={v} className={`btn btn-sm ${view === v ? 'btn-navy' : 'btn-ghost'}`} onClick={() => setView(v)} data-testid={`view-${v}`}>{v === 'list' ? tr("List") : tr("Calendar")}</button>)}</div>
        <button className="btn btn-primary btn-sm ms-auto" onClick={() => { setSlot(null); setM({ patient_id: '', service_id: '', doctor_id: '', consent: false }); setManual(true); }} data-testid="button-manual-booking"><Plus size={15} />{tr('Manual booking')}</button>
      </div>
      {q.isLoading ? <Skeletons n={4} h={64} /> : q.isError ? <div className="grid gap-4"><Setup what={errMsg(q.error)} /><ErrorBlock onRetry={() => q.refetch()} /></div> : view === 'calendar' ? <ApptCalendar appts={rows} actions={acts} /> : rows.length === 0 ? <EmptyBlock title={tr("No appointments match")} hint={tr("Appointments created through the booking flow appear here.")} /> : (
        <div className="grid gap-6">{Object.entries(days).map(([day, list]) => (
          <div key={day}><p className="eyebrow mb-2">{day}</p><div className="card overflow-x-auto"><table className="tbl"><tbody>{list.map((a) => (
            <tr key={a.id} data-testid={`row-appt-${a.id}`}><td className="whitespace-nowrap font-bold text-navy">{f.time(a.starts_at)}</td><td><b>{a.patient_name}</b><div className="text-xs text-muted-foreground"><bdi>{a.patient_phone ?? ''}</bdi> {a.patient_email ?? ''}</div><div className="text-xs text-muted-foreground font-mono">{a.reference}</div></td><td>{a.service_name}<div className="text-xs text-muted-foreground">{a.doctor_name}</div></td><td><StatusPill s={a.status} /></td>
              <td className="text-end whitespace-nowrap"><div className="flex gap-1.5 justify-end">{acts(a)}</div></td></tr>
          ))}</tbody></table></div></div>
        ))}</div>
      )}
      <Modal open={!!resched} onClose={() => setResched(null)} title={tr("Reschedule appointment")} wide>
        {resched && <div>
          <p className="text-sm text-muted-foreground mb-4">{resched.patient_name} · {resched.service_name} · {resched.doctor_name} · {f.dateTime(resched.starts_at)}</p>
          <SlotPicker key={resched.id} serviceId={resched.service_id} doctorId={resched.doctor_id} value={slot} onChange={setSlot} />
          <p className="text-xs text-muted-foreground mt-3">{tr('Only open times from the server are offered. The booking stays unchanged if the server rejects the move.')}</p>
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-ghost btn-sm" onClick={() => setResched(null)}>{tr('Cancel')}</button><button className="btn btn-primary btn-sm" disabled={!slot || upd.isPending} data-testid="button-save-reschedule" onClick={() => slot && upd.mutate({ id: resched.id, data: { starts_at: slot.starts_at, doctor_id: slot.doctor_id } }, { onSuccess: () => { refresh(); setResched(null); toast({ title: tr("Rescheduled") }); }, onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) })}>{tr('Save')}</button></div>
        </div>}
      </Modal>
      <Modal open={manual} onClose={() => setManual(false)} title={tr("Manual booking")} wide>
        <div className="grid gap-4">
          <div><label className="label">{tr('Patient')}</label><select className="field" value={m.patient_id} onChange={(e) => setM({ ...m, patient_id: e.target.value })}><option value="">{tr('Select patient')}</option>{(patients.data ?? []).filter((p) => p.data.status !== 'inactive').map((p) => <option key={p.id} value={p.id}>{String(p.data.name ?? p.id)}</option>)}</select></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">{tr('Service')}</label><select className="field" value={m.service_id} onChange={(e) => { setSlot(null); setM({ ...m, service_id: e.target.value, doctor_id: '' }); }}><option value="">{tr('Select service')}</option>{(clinic?.services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="label">{tr('Doctor')}</label><select className="field" value={m.doctor_id} onChange={(e) => { setSlot(null); setM({ ...m, doctor_id: e.target.value }); }}><option value="">{tr('Any available doctor')}</option>{doctorsFor.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          {m.service_id ? <SlotPicker key={`${m.service_id}-${m.doctor_id}`} serviceId={m.service_id} doctorId={m.doctor_id || undefined} value={slot} onChange={setSlot} /> : <p className="text-sm text-muted-foreground">{tr('Choose a service to see open times.')}</p>}
          <label className="flex gap-3 text-sm items-start"><input type="checkbox" className="mt-1" checked={m.consent} onChange={(e) => setM({ ...m, consent: e.target.checked })} data-testid="checkbox-staff-consent" />{tr('I confirm the patient has agreed to the clinic privacy policy for this booking.')}</label>
          <div className="flex justify-end gap-2"><button className="btn btn-ghost btn-sm" onClick={() => setManual(false)}>{tr('Cancel')}</button><button className="btn btn-primary btn-sm" disabled={!m.patient_id || !m.service_id || !slot || !m.consent || create.isPending} data-testid="button-save-manual" onClick={() => slot && create.mutate({ data: { patient_id: m.patient_id, service_id: m.service_id, doctor_id: slot.doctor_id, starts_at: slot.starts_at, consent: m.consent } }, { onSuccess: () => { refresh(); setManual(false); toast({ title: tr("Appointment created") }); }, onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }) })}>{tr('Create')}</button></div>
        </div>
      </Modal>
    </div>
  );
}

function PatientDetail({ rec, onClose }: { rec: ResourceRecord; onClose: () => void }) {
  const f = useFmt();
  const appts = useListAppointments({ query: { queryKey: getListAppointmentsQueryKey() } });
  const notes = useListRecords('notes', { query: { queryKey: getListRecordsQueryKey('notes') } });
  const inter = useListRecords('interactions', { query: { queryKey: getListRecordsQueryKey('interactions') } });
  const tags = useListRecords('tags', { query: { queryKey: getListRecordsQueryKey('tags') } });
  const pOps = useRecordOps('patients');
  const nOps = useRecordOps('notes');
  const iOps = useRecordOps('interactions');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [ch, setCh] = useState('phone');
  const now = Date.now();
  const mine = (appts.data ?? []).filter((a) => a.patient_id === rec.id).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = mine.filter((a) => new Date(a.starts_at).getTime() >= now && !['cancelled', 'completed', 'no_show'].includes(a.status));
  const history = mine.filter((a) => !upcoming.includes(a)).reverse();
  const tagIds = Array.isArray(rec.data.tag_ids) ? (rec.data.tag_ids as string[]) : [];
  const [sel, setSel] = useState<string[]>(tagIds);
  const mineRec = (l?: ResourceRecord[]) => (l ?? []).filter((r) => r.data.patient_id === rec.id);
  const list = (arr: Appointment[]) => arr.length === 0 ? <p className="text-sm text-muted-foreground">{tr('None.')}</p> : <ul className="grid gap-2 text-sm">{arr.map((a) => <li key={a.id} className="flex justify-between gap-3"><span><b className="text-navy">{f.dateTime(a.starts_at)}</b> · {a.service_name} · {a.doctor_name}</span><StatusPill s={a.status} /></li>)}</ul>;
  return (
    <Modal open onClose={onClose} title={String(rec.data.name ?? tr("Patient"))} wide>
      <div className="grid gap-6" data-testid="patient-detail">
        <div className="grid sm:grid-cols-2 gap-3 text-sm rounded-2xl bg-ice p-4">
          <p><span className="text-muted-foreground">{tr('Email')}</span><br /><b>{String(rec.data.email ?? '—')}</b></p>
          <p><span className="text-muted-foreground">{tr('Phone')}</span><br /><b><bdi>{String(rec.data.phone ?? '—')}</bdi></b></p>
          <p><span className="text-muted-foreground">{tr('Status / contact preference')}</span><br /><b>{String(rec.data.status ?? '—')} · {String(rec.data.communication_preference ?? '—')}</b></p>
          <p><span className="text-muted-foreground">{tr('Assigned staff')}</span><br /><b className="font-mono text-xs">{String(rec.data.assigned_to ?? tr("Unassigned"))}</b></p>
        </div>
        <div><h4 className="eyebrow mb-2">{tr('Tags')}</h4>
          {(tags.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{tr('No tags yet. Create them in the Tags module.')}</p> : <div className="flex flex-wrap gap-2 items-center">{(tags.data ?? []).map((t) => <label key={t.id} className={`pill cursor-pointer ${sel.includes(t.id) ? '!bg-royal !text-white' : ''}`}><input type="checkbox" className="sr-only" checked={sel.includes(t.id)} onChange={() => setSel(sel.includes(t.id) ? sel.filter((x) => x !== t.id) : [...sel, t.id])} />{String(t.data.name)}</label>)}<button className="btn btn-ghost btn-sm" disabled={pOps.busy} onClick={() => pOps.update(rec.id, { tag_ids: sel })}>{tr('Save tags')}</button></div>}
        </div>
        <div><h4 className="eyebrow mb-2">{tr('Upcoming appointments')}</h4>{appts.isLoading ? <Skeletons n={1} h={50} /> : list(upcoming)}</div>
        <div><h4 className="eyebrow mb-2">{tr('History')}</h4>{list(history)}</div>
        <div><h4 className="eyebrow mb-2">{tr('Administrative notes')}</h4>
          <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); if (note.trim()) nOps.create({ body: note.trim(), patient_id: rec.id }, () => setNote('')); }}><input className="field" placeholder={tr("Administrative note (no clinical details)")} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-patient-note" /><button className="btn btn-primary btn-sm" disabled={nOps.busy}>{tr('Add')}</button></form>
          <ul className="grid gap-2 text-sm">{mineRec(notes.data).map((n) => <li key={n.id} className="rounded-xl bg-pearl p-3">{String(n.data.body)}<span className="block text-[11px] text-muted-foreground">{n.data.created_at ? f.dateTime(String(n.data.created_at)) : ''}</span></li>)}</ul>
        </div>
        <div><h4 className="eyebrow mb-2">{tr('Communication history')}</h4>
          <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); if (msg.trim()) iOps.create({ body: msg.trim(), channel: ch, patient_id: rec.id }, () => setMsg('')); }}><select className="field !w-auto" value={ch} onChange={(e) => setCh(e.target.value)} aria-label={tr("Channel")}>{['internal', 'phone', 'email', 'sms', 'in_person'].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select><input className="field" placeholder={tr("Log a contact (a record only; nothing is sent)")} maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)} data-testid="input-patient-interaction" /><button className="btn btn-primary btn-sm" disabled={iOps.busy}>{tr('Log')}</button></form>
          <ul className="grid gap-2 text-sm">{mineRec(inter.data).map((n) => <li key={n.id} className="rounded-xl bg-pearl p-3"><span className="pill me-2">{String(n.data.channel ?? '').replace('_', ' ')}</span>{String(n.data.body)}<span className="block text-[11px] text-muted-foreground">{n.data.created_at ? f.dateTime(String(n.data.created_at)) : ''}</span></li>)}</ul>
        </div>
      </div>
    </Modal>
  );
}

function LeadFollowUp({ lead, onClose }: { lead: ResourceRecord; onClose: () => void }) {
  const ops = useRecordOps('tasks');
  const fields = MODS.find((x) => x.key === 'tasks')?.fields ?? [];
  return (
    <Modal open onClose={onClose} title={`Follow-up · ${String(lead.data.name ?? 'lead')}`} wide>
      <RecordForm fields={fields} initial={{ title: `${tr('Follow up')}: ${String(lead.data.name ?? '')}`, status: 'open', assigned_to: lead.data.assigned_to ?? '' }} busy={ops.busy} onCancel={onClose} onSubmit={(d) => ops.create({ ...d, lead_id: lead.id }, onClose)} />
    </Modal>
  );
}

function Overview() {
  const f = useFmt();
  const q = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 30000 } });
  const tasks = useListRecords('tasks', { query: { queryKey: getListRecordsQueryKey('tasks') } });
  if (q.isLoading) return <div className="grid sm:grid-cols-4 gap-4"><Skeletons n={4} h={110} /></div>;
  if (q.isError || !q.data) return <div className="grid gap-4"><Setup what={q.error ? errMsg(q.error) : undefined} /><ErrorBlock onRetry={() => q.refetch()} /></div>;
  const s = q.data;
  const kpis: [string, number | string][] = [[tr("Total patients"), s.total_patients], [tr("New patients (last 30 days)"), s.new_patients], [tr("Today's appointments"), s.today_appointments], [tr("Upcoming"), s.upcoming_appointments], [tr("Pending confirmation"), s.pending_appointments], [tr("Completed (last 30 days)"), s.completed_appointments], [tr("Cancelled (last 30 days)"), s.cancelled_appointments], [tr("No shows (last 30 days)"), s.no_show_appointments], [tr("New inquiries"), s.new_inquiries], [tr("Conversion"), `${s.conversion_rate.toFixed(1)}%`]];
  const open = (tasks.data ?? []).filter((t) => t.data.status !== 'completed').slice(0, 5);
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{kpis.map(([l, v]) => <div key={l} className="card !rounded-2xl p-5" data-testid={`kpi-${l}`}><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{l}</p><p className="display text-4xl mt-2">{typeof v === 'number' ? f.num(v) : v}</p></div>)}</div>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="card p-6"><h3 className="font-bold text-navy mb-4">{tr('Bookings, last 7 days')}</h3><div className="h-64"><ResponsiveContainer><BarChart data={s.weekly}><CartesianGrid vertical={false} stroke="#e0ebf9" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} /><Tooltip cursor={{ fill: '#eaf5ff' }} /><Bar dataKey="value" fill="#1263DF" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card p-6"><h3 className="font-bold text-navy mb-4">{tr('Open tasks')}</h3>{open.length === 0 ? <p className="text-sm text-muted-foreground">{tr('Nothing open.')}</p> : <ul className="grid gap-3 text-sm">{open.map((t) => <li key={t.id} className="flex justify-between gap-3"><span className="font-semibold">{String(t.data.title)}</span><span className="text-muted-foreground">{t.data.due_at ? f.date(String(t.data.due_at)) : ''}</span></li>)}</ul>}</div>
      </div>
      <div className="card p-6"><h3 className="font-bold text-navy mb-4">{tr('Recent activity')}</h3>{s.activity.length === 0 ? <p className="text-sm text-muted-foreground">{tr('No recorded activity yet.')}</p> : <ul className="grid gap-2 text-sm">{s.activity.slice(0, 8).map((a) => <li key={a.id} className="text-muted-foreground font-mono text-xs">{Object.entries(a.data).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</li>)}</ul>}</div>
    </div>
  );
}

function Analytics() {
  const q = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  if (q.isLoading) return <Skeletons n={3} h={200} />;
  if (q.isError || !q.data) return <div className="grid gap-4"><Setup what={q.error ? errMsg(q.error) : undefined} /><ErrorBlock onRetry={() => q.refetch()} /></div>;
  const s = q.data;
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-6"><h3 className="font-bold text-navy mb-4">{tr('Service popularity')}</h3><div className="h-72"><ResponsiveContainer><BarChart data={s.services} layout="vertical"><CartesianGrid horizontal={false} stroke="#e0ebf9" /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="label" width={110} fontSize={12} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: '#eaf5ff' }} /><Bar dataKey="value" fill="#1686FF" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="card p-6"><h3 className="font-bold text-navy mb-4">Doctor utilisation, this week (booked minutes / configured working minutes, %)</h3><div className="grid gap-4">{s.utilization.length === 0 ? <p className="text-sm text-muted-foreground">{tr('No data yet.')}</p> : s.utilization.map((u) => <div key={u.label}><div className="flex justify-between text-sm mb-1"><span>{u.label}</span><b>{u.value}%</b></div><div className="h-2 rounded-full bg-ice"><div className="h-full rounded-full bg-royal" style={{ width: `${Math.min(100, u.value)}%` }} /></div></div>)}</div></div>
      <div className="card p-6 lg:col-span-2"><h3 className="font-bold text-navy mb-4">{tr('Bookings trend, last 7 days')}</h3><div className="h-64"><ResponsiveContainer><BarChart data={s.weekly}><CartesianGrid vertical={false} stroke="#e0ebf9" /><XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} fontSize={12} width={28} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: '#eaf5ff' }} /><Bar dataKey="value" fill="#102D69" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
    </div>
  );
}

function SettingsView() {
  const q = useListRecords('settings', { query: { queryKey: getListRecordsQueryKey('settings') } });
  const ops = useRecordOps('settings');
  const { data: clinic } = useGetClinic();
  const qc = useQueryClient();
  const rec = q.data?.[0];
  if (q.isLoading) return <Skeletons n={2} h={120} />;
  if (q.isError) return <div className="grid gap-4"><Setup what={errMsg(q.error)} /><ErrorBlock onRetry={() => q.refetch()} /></div>;
  const initial = rec?.data ?? (clinic?.settings as unknown as Record<string, unknown>) ?? {};
  return (
    <div className="card p-7 max-w-3xl">
      {!rec && <div className="mb-5"><Setup what={tr("No saved settings record found.")} /></div>}
      <RecordForm key={rec?.id ?? 'none'} fields={SETTINGS_FIELDS} initial={initial} busy={ops.busy} onCancel={() => undefined} onSubmit={(d) => { const done = () => qc.invalidateQueries({ queryKey: ['/api/clinic'] }); if (rec) ops.update(rec.id, d, done); else ops.create(d, done); }} />
    </div>
  );
}

export function Dashboard() {
  useSeo(tr("Dashboard"), tr("Aurelia Clinic operations dashboard."));
  return <RequireAuth roles={[...FRONT, 'doctor']}><DashboardInner /></RequireAuth>;
}

function DashboardInner() {
  const { module } = useParams();
  const key = module ?? 'overview';
  const [, nav] = useLocation();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [gs, setGs] = useState('');
  const role = profile?.role ?? 'patient';
  const { t } = useLocale();
  const lab = (m: ModDef) => { const v = t(`dash.${m.key}`); return v === `dash.${m.key}` ? tr(m.label) : v; };
  const nav_ = MODS.filter((m) => m.roles.includes(role));
  const cur = MODS.find((m) => m.key === key);
  const allowed = !!cur && cur.roles.includes(role);
  const body = () => {
    if (!cur || !allowed) return <EmptyBlock title={tr("Module not available")} hint={tr("This module does not exist or your role cannot open it.")} action={<Link href="/dashboard" className="btn btn-ghost btn-sm">{tr('Overview')}</Link>} />;
    if (cur.key === 'overview') return <Overview />;
    if (cur.key === 'appointments') return <Appointments />;
    if (cur.key === 'analytics') return <Analytics />;
    if (cur.key === 'settings') return <SettingsView />;
    return <Module key={cur.key} m={cur} />;
  };
  const SideLinks = ({ compact }: { compact: boolean }) => (
    <nav className="grid gap-1 p-3" aria-label={tr("Dashboard")}>{nav_.map((m) => { const Icon = m.icon; const on = m.key === key; return (
      <Link key={m.key} href={m.key === 'overview' ? '/dashboard' : `/dashboard/${m.key}`} onClick={() => setMobile(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${on ? 'bg-sidebar-primary text-white shadow-lg' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`} title={lab(m)} data-testid={`link-dash-${m.key}`}><Icon size={18} className="shrink-0" />{!compact && lab(m)}</Link>
    ); })}</nav>
  );
  return (
    <div className="min-h-[100dvh] flex bg-pearl">
      <aside className={`hidden lg:flex flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-[100dvh] transition-[width] duration-300 ${collapsed ? 'w-[76px]' : 'w-64'}`}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">{collapsed ? <Logo light size={34} /> : <Link href="/"><Logo light /></Link>}</div>
        <div className="flex-1 overflow-y-auto"><SideLinks compact={collapsed} /></div>
        <button className="m-3 p-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent flex items-center gap-3 text-sm" onClick={() => setCollapsed(!collapsed)} aria-label={tr("Collapse sidebar")}>{collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} />{tr('Collapse')}</>}</button>
      </aside>
      {mobile && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-navy/50" onClick={() => setMobile(false)} /><aside className="absolute inset-y-0 start-0 w-64 bg-sidebar text-sidebar-foreground overflow-y-auto"><div className="h-16 flex items-center px-4 border-b border-sidebar-border"><Logo light /></div><SideLinks compact={false} /></aside></div>}
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur border-b sticky top-0 z-30 px-4 sm:px-8 flex items-center gap-4">
          <button className="lg:hidden p-2 rounded-lg bg-ice" onClick={() => setMobile(true)} aria-label={tr("Menu")}><Menu size={18} /></button>
          <form className="relative flex-1 max-w-sm" onSubmit={(e) => { e.preventDefault(); const hit = nav_.find((m) => lab(m).toLowerCase().includes(gs.toLowerCase())); if (hit && gs) { nav(hit.key === 'overview' ? '/dashboard' : `/dashboard/${hit.key}`); setGs(''); } }}><Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="field !ps-10 !py-2" placeholder={tr("Jump to module")} value={gs} onChange={(e) => setGs(e.target.value)} data-testid="input-global-search" /></form>
          <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex"><ExternalLink size={14} />{tr('Public site')}</Link>
          {profile && <div className="flex items-center gap-2"><Initials name={profile.name} size={34} /><div className="hidden md:block leading-tight"><p className="text-sm font-bold text-navy">{profile.name}</p><p className="text-[11px] text-muted-foreground">{profile.role.replace('_', ' ')}</p></div></div>}
          <button className="p-2 rounded-lg hover:bg-ice" onClick={signOut} aria-label={tr("Sign out")} data-testid="button-logout"><LogOut size={18} /></button>
        </header>
        <main className="p-4 sm:p-8 max-w-[1400px]">
          <div className="mb-8"><p className="eyebrow">{tr('Aurelia operations')}</p><h1 className="display text-4xl sm:text-5xl mt-2" data-testid="text-module-title">{cur ? lab(cur) : tr("Not found")}</h1>{cur?.blurb && <p className="text-muted-foreground mt-2 max-w-2xl">{tr(cur.blurb)}</p>}</div>
          {body()}
        </main>
      </div>
    </div>
  );
}
