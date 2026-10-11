-- Aurelia Clinic. Apply to a Supabase project only, never the Replit database.
begin;
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table public.clinic_settings (
 id uuid primary key default gen_random_uuid(),
 name text not null default 'Aurelia Clinic',
 headline text not null default 'Care Designed Around You.',
 description text not null default 'Modern healthcare with compassionate professionals and exceptional service.',
 timezone text not null default 'Asia/Amman', currency text not null default 'JOD',
 email text not null default '', phone text not null default '', address text not null default '',
 hours text not null default 'Sunday–Thursday, 09:00–18:00',
 logo_url text not null default '', cancellation_hours integer not null default 24 check(cancellation_hours>=0),
 approval_required boolean not null default true, updated_at timestamptz not null default now()
);
create unique index clinic_singleton on public.clinic_settings ((true));
insert into public.clinic_settings default values;

create table public.branches (
 id uuid primary key default gen_random_uuid(), name text not null, address text not null default '',
 phone text not null default '', published boolean not null default false, created_at timestamptz default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null, email text not null, phone text not null default '',
 role text not null default 'patient' check(role in ('super_admin','clinic_admin','receptionist','doctor','patient')),
 communication_preference text not null default 'email' check(communication_preference in ('email','phone','none')),
 consent boolean not null default false, assigned_to uuid references public.profiles(id),
 status text not null default 'active' check(status in ('active','inactive')), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.specialties (
 id uuid primary key default gen_random_uuid(), name text not null unique, name_ar text not null default ''
);
create table public.services (
 id uuid primary key default gen_random_uuid(), name text not null, name_ar text not null default '',
 slug text not null unique, description text not null default '', description_ar text not null default '',
 specialty text not null, specialty_id uuid references public.specialties(id),
 duration_minutes integer not null default 30 check(duration_minutes between 5 and 240),
 price numeric(10,2) not null default 0 check(price>=0), icon text not null default 'Stethoscope',
 published boolean not null default false, is_demo boolean not null default false, created_at timestamptz default now()
);
create table public.doctors (
 id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id),
 name text not null, name_ar text not null default '', specialty text not null, biography text not null default '',
 biography_ar text not null default '', image_url text not null default '', languages text not null default 'English, Arabic',
 published boolean not null default false, is_demo boolean not null default false, created_at timestamptz default now()
);
create table public.doctor_services (
 doctor_id uuid references public.doctors(id) on delete cascade,
 service_id uuid references public.services(id) on delete cascade, primary key(doctor_id,service_id)
);
create table public.working_schedules (
 id uuid primary key default gen_random_uuid(), doctor_id uuid not null references public.doctors(id) on delete cascade,
 weekday integer not null check(weekday between 0 and 6), start_time time not null, end_time time not null,
 break_start time, break_end time, unique(doctor_id,weekday),
 check(end_time>start_time),
 check((break_start is null and break_end is null) or (break_start>=start_time and break_end<=end_time and break_end>break_start))
);
create table public.schedule_exceptions (
 id uuid primary key default gen_random_uuid(), doctor_id uuid references public.doctors(id) on delete cascade,
 date date not null, starts_at timestamptz, ends_at timestamptz, reason text not null default '',
 check((starts_at is null and ends_at is null) or ends_at>starts_at), created_at timestamptz default now()
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('AUR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 patient_id uuid not null references public.profiles(id), doctor_id uuid not null references public.doctors(id),
 service_id uuid not null references public.services(id), starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show')),
 notes text not null default '' check(length(notes)<=1000), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at>starts_at),
 exclude using gist (doctor_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
 where (status not in ('cancelled','no_show'))
);
create index appointments_patient_time on public.appointments(patient_id,starts_at);
create index appointments_status_time on public.appointments(status,starts_at);
create table public.crm_leads (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text not null default '',
 message text not null default '', status text not null default 'new_inquiry'
 check(status in ('new_inquiry','contacted','interested','appointment_requested','appointment_booked','converted','closed')),
 assigned_to uuid references public.profiles(id), consent boolean not null default false, is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contact_inquiries (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.crm_leads(id),
 message text not null, created_at timestamptz not null default now()
);
create table public.crm_tasks (
 id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
 lead_id uuid references public.crm_leads(id), patient_id uuid references public.profiles(id),
 assigned_to uuid references public.profiles(id), due_at timestamptz,
 status text not null default 'open' check(status in ('open','completed')), created_at timestamptz default now()
);
create table public.crm_notes (
 id uuid primary key default gen_random_uuid(), patient_id uuid references public.profiles(id),
 lead_id uuid references public.crm_leads(id), body text not null, created_by uuid references public.profiles(id),
 created_at timestamptz default now(), check(patient_id is not null or lead_id is not null)
);
create table public.crm_interactions (
 id uuid primary key default gen_random_uuid(), patient_id uuid references public.profiles(id),
 lead_id uuid references public.crm_leads(id), channel text not null default 'internal',
 body text not null, created_by uuid references public.profiles(id), created_at timestamptz default now()
);
create table public.crm_tags (id uuid primary key default gen_random_uuid(), name text not null unique, color text default '#1263DF');
create table public.patient_tags (
 patient_id uuid references public.profiles(id) on delete cascade,
 tag_id uuid references public.crm_tags(id) on delete cascade, primary key(patient_id,tag_id)
);
create table public.schedule_requests (
 id uuid primary key default gen_random_uuid(), doctor_id uuid not null references public.doctors(id),
 weekday integer not null check(weekday between 0 and 6), start_time time not null, end_time time not null,
 reason text not null default '', status text not null default 'pending' check(status in ('pending','approved','rejected')),
 check(end_time>start_time), created_at timestamptz not null default now()
);
create table public.website_content (
 id uuid primary key default gen_random_uuid(), title text not null, title_ar text not null default '',
 slug text not null unique, body text not null default '', body_ar text not null default '',
 excerpt text not null default '', image_url text not null default '',
 seo_title text not null default '', seo_description text not null default '', published boolean not null default false,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.faqs (
 id uuid primary key default gen_random_uuid(), question text not null, answer text not null,
 question_ar text not null default '', answer_ar text not null default '', published boolean not null default false,
 approved boolean not null default false, created_at timestamptz default now()
);
create table public.blog_posts (
 id uuid primary key default gen_random_uuid(), title text not null, title_ar text not null default '',
 slug text not null unique, body text not null, body_ar text not null default '', excerpt text not null default '',
 image_url text not null default '', published boolean not null default false, created_at timestamptz default now()
);
create table public.testimonials (
 id uuid primary key default gen_random_uuid(), name text not null, quote text not null,
 approved boolean not null default false, published boolean not null default false, is_demo boolean not null default false,
 created_at timestamptz default now()
);
create table public.notification_preferences (
 patient_id uuid primary key references public.profiles(id) on delete cascade,
 email_enabled boolean not null default false, sms_enabled boolean not null default false, updated_at timestamptz default now()
);
create table public.notification_templates (
 id uuid primary key default gen_random_uuid(), name text not null, channel text not null check(channel in ('email','sms')),
 subject text not null default '', body text not null
);
create table public.notification_delivery_logs (
 id uuid primary key default gen_random_uuid(), patient_id uuid references public.profiles(id),
 appointment_id uuid references public.appointments(id), channel text not null,
 status text not null default 'not_configured' check(status in ('not_configured','queued','sent','failed')),
 provider_reference text, created_at timestamptz default now(),
 check(status<>'sent' or provider_reference is not null)
);
create table public.waitlist (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id),
 service_id uuid not null references public.services(id), doctor_id uuid references public.doctors(id),
 date date not null, status text not null default 'waiting' check(status in ('waiting','contacted','booked','closed')),
 created_at timestamptz default now()
);
create table public.chat_sessions (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz default now()
);
create table public.chat_messages (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.chat_sessions(id) on delete cascade,
 role text not null check(role in ('user','assistant')), content text not null check(length(content)<=8000),
 created_at timestamptz default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id),
 action text not null, resource text not null, record_id text, created_at timestamptz not null default now()
);
create table public.patient_consents (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id) on delete cascade,
 purpose text not null, granted boolean not null, version text not null default '1',
 created_at timestamptz default now()
);

-- Never use user-controlled auth metadata as a source of roles.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email,phone,consent)
 values(new.id,coalesce(new.raw_user_meta_data->>'name','Patient'),coalesce(new.email,''),
 coalesce(new.raw_user_meta_data->>'phone',''),coalesce((new.raw_user_meta_data->>'consent')::boolean,false));
 insert into public.patient_consents(patient_id,purpose,granted)
 values(new.id,'privacy',coalesce((new.raw_user_meta_data->>'consent')::boolean,false));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.my_role() returns text language sql stable security definer set search_path=public as $$
 select role from public.profiles where id=auth.uid() and status='active'
$$;
create function public.is_reception() returns boolean language sql stable as $$
 select coalesce(public.my_role() in ('super_admin','clinic_admin','receptionist'),false)
$$;
create function public.is_admin() returns boolean language sql stable as $$
 select coalesce(public.my_role() in ('super_admin','clinic_admin'),false)
$$;
create function public.my_doctor_id() returns uuid language sql stable security definer set search_path=public as $$
 select id from public.doctors where profile_id=auth.uid()
$$;

create function public.protect_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.role()='service_role' or (auth.uid() is null and auth.role() is null) then return new; end if;
 if new.id<>old.id or new.email<>old.email then raise exception 'Identity cannot be changed'; end if;
 if new.role<>old.role and coalesce(public.my_role(),'')<>'super_admin' then raise exception 'Only super administrators assign roles'; end if;
 if old.role='super_admin' and coalesce(public.my_role(),'')<>'super_admin' then raise exception 'Protected administrator'; end if;
 if not public.is_reception() and (new.status<>old.status or new.assigned_to is distinct from old.assigned_to or new.is_demo<>old.is_demo) then
 raise exception 'Not authorized'; end if;
 new.updated_at=now(); return new;
end; $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

-- RLS enabled on every application table. No private table is exposed to anon.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public'
 loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;
create policy settings_public on public.clinic_settings for select using(true);
create policy settings_admin on public.clinic_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy profiles_read on public.profiles for select to authenticated using(
 id=auth.uid() or public.is_reception() or (public.my_role()='doctor' and exists(
 select 1 from public.appointments a where a.patient_id=profiles.id and a.doctor_id=public.my_doctor_id())));
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid() or public.is_reception())
 with check(id=auth.uid() or public.is_reception());
create policy specialties_read on public.specialties for select using(true);
create policy specialties_admin on public.specialties for all to authenticated using(public.is_admin()) with check(public.is_admin());

do $$ declare t text; begin
 foreach t in array array['services','doctors','branches','website_content','blog_posts'] loop
 execute format('create policy public_published on public.%I for select using(published or public.is_admin())',t);
 execute format('create policy admin_manage on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop;
end $$;
create policy doctors_self on public.doctors for select to authenticated using(profile_id=auth.uid());
create policy doctors_reception on public.doctors for select to authenticated using(public.is_reception());
create policy services_reception on public.services for select to authenticated using(public.is_reception());
create policy services_appointment_history on public.services for select to authenticated using(
 exists(select 1 from public.appointments a where a.service_id=services.id and (a.patient_id=auth.uid() or a.doctor_id=public.my_doctor_id())));
create policy doctors_appointment_history on public.doctors for select to authenticated using(
 exists(select 1 from public.appointments a where a.doctor_id=doctors.id and a.patient_id=auth.uid()));
create policy faq_public on public.faqs for select using((published and approved) or public.is_admin());
create policy faq_admin on public.faqs for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy testimonial_public on public.testimonials for select using((published and approved) or public.is_admin());
create policy testimonial_admin on public.testimonials for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy doctor_services_public on public.doctor_services for select using(
 exists(select 1 from public.doctors d where d.id=doctor_id and d.published));
create policy doctor_services_admin on public.doctor_services for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy schedules_read on public.working_schedules for select to authenticated using(
 public.is_reception() or doctor_id=public.my_doctor_id());
create policy schedules_admin on public.working_schedules for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy exceptions_staff on public.schedule_exceptions for all to authenticated using(
 public.is_reception() or (doctor_id=public.my_doctor_id() and public.my_role()='doctor'))
 with check(public.is_reception() or (doctor_id=public.my_doctor_id() and public.my_role()='doctor'));
create policy appointments_read on public.appointments for select to authenticated using(
 patient_id=auth.uid() or public.is_reception() or (public.my_role()='doctor' and doctor_id=public.my_doctor_id()));
-- All appointment writes go through authorized transactional RPCs below.
do $$ declare t text; begin
 foreach t in array array['crm_leads','contact_inquiries','crm_tasks','crm_notes','crm_interactions','crm_tags','patient_tags'] loop
 execute format('create policy reception_manage on public.%I for all to authenticated using(public.is_reception()) with check(public.is_reception())',t);
 end loop;
end $$;
create policy templates_admin on public.notification_templates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy notification_logs_read on public.notification_delivery_logs for select to authenticated using(public.is_reception());
create policy preferences_own on public.notification_preferences for all to authenticated using(patient_id=auth.uid()) with check(patient_id=auth.uid());
create policy waitlist_own_read on public.waitlist for select to authenticated using(patient_id=auth.uid() or public.is_reception());
create policy waitlist_own_insert on public.waitlist for insert to authenticated with check(patient_id=auth.uid());
create policy waitlist_staff on public.waitlist for update to authenticated using(public.is_reception()) with check(public.is_reception());
create policy schedule_requests_read on public.schedule_requests for select to authenticated using(public.is_reception() or doctor_id=public.my_doctor_id());
create policy schedule_requests_insert on public.schedule_requests for insert to authenticated with check(
 public.is_admin() or (public.my_role()='doctor' and doctor_id=public.my_doctor_id() and status='pending'));
create policy schedule_requests_admin on public.schedule_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy chat_session_own on public.chat_sessions for all to authenticated using(patient_id=auth.uid()) with check(patient_id=auth.uid());
create policy chat_message_own on public.chat_messages for all to authenticated using(
 exists(select 1 from public.chat_sessions s where s.id=session_id and s.patient_id=auth.uid()))
 with check(exists(select 1 from public.chat_sessions s where s.id=session_id and s.patient_id=auth.uid()));
create policy audit_admin on public.audit_logs for select to authenticated using(public.is_admin());
create policy consents_own on public.patient_consents for select to authenticated using(patient_id=auth.uid());
create policy consents_insert on public.patient_consents for insert to authenticated with check(patient_id=auth.uid());

-- Audit omits changed row values to avoid duplicating patient PII.
create function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_logs(actor_id,action,resource,record_id)
 values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(new.id,old.id)::text);
 return coalesce(new,old);
end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','doctors','services','working_schedules','schedule_exceptions','schedule_requests','appointments','crm_leads','crm_tasks','crm_notes','crm_interactions','website_content','faqs','blog_posts','testimonials','clinic_settings'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
 end loop;
end $$;

-- Public availability contains only names and bookable times, never patient details.
create function public.available_slots(p_service uuid,p_date date,p_doctor uuid default null)
 returns table(doctor_id uuid,doctor_name text,starts_at timestamptz,ends_at timestamptz)
 language sql stable security definer set search_path=public as $$
 with cfg as (select timezone from public.clinic_settings limit 1),
 slots as (
 select d.id,d.name,
 ((p_date+w.start_time) at time zone cfg.timezone) + (g.n*interval '1 minute') as s,
 ((p_date+w.start_time) at time zone cfg.timezone) + ((g.n+v.duration_minutes)*interval '1 minute') as e,
 w.break_start,w.break_end,cfg.timezone
 from public.doctors d join public.doctor_services ds on ds.doctor_id=d.id
 join public.services v on v.id=ds.service_id
 join public.working_schedules w on w.doctor_id=d.id and w.weekday=extract(dow from p_date)
 cross join cfg
 cross join lateral generate_series(0,extract(epoch from(w.end_time-w.start_time))::integer/60-v.duration_minutes,v.duration_minutes) g(n)
 where v.id=p_service and v.published and d.published and (p_doctor is null or d.id=p_doctor)
 and p_date between (now() at time zone cfg.timezone)::date and (now() at time zone cfg.timezone)::date+180
 )
 select id,name,s,e from slots x where s>now()+interval '1 hour'
 and not (x.break_start is not null and
 tstzrange(s,e,'[)') && tstzrange((p_date+x.break_start) at time zone x.timezone,(p_date+x.break_end) at time zone x.timezone,'[)'))
 and not exists(select 1 from public.schedule_exceptions ex where (ex.doctor_id=x.id or ex.doctor_id is null) and ex.date=p_date
 and (ex.starts_at is null or tstzrange(s,e,'[)') && tstzrange(ex.starts_at,ex.ends_at,'[)')))
 and not exists(select 1 from public.appointments a where a.doctor_id=x.id and a.status not in ('cancelled','no_show')
 and tstzrange(s,e,'[)') && tstzrange(a.starts_at,a.ends_at,'[)'))
 order by s,id
$$;

create function public.book_appointment(p_service uuid,p_doctor uuid,p_starts_at timestamptz,p_notes text default '',p_patient uuid default null)
 returns public.appointments language plpgsql security definer set search_path=public as $$
declare result public.appointments; chosen record; tz text; patient uuid; approve boolean;
begin
 if auth.uid() is null or public.my_role() is null then raise exception 'Sign in required'; end if;
 patient=coalesce(p_patient,auth.uid());
 if patient<>auth.uid() and not public.is_reception() then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.profiles where id=patient and role='patient' and status='active') then raise exception 'Active patient required'; end if;
 select timezone,approval_required into tz,approve from public.clinic_settings limit 1;
 perform pg_advisory_xact_lock(hashtextextended(p_doctor::text,0));
 select * into chosen from public.available_slots(p_service,(p_starts_at at time zone tz)::date,p_doctor) s
 where s.starts_at=p_starts_at;
 if not found then raise exception 'This slot is no longer available'; end if;
 insert into public.appointments(patient_id,doctor_id,service_id,starts_at,ends_at,status,notes)
 values(patient,p_doctor,p_service,chosen.starts_at,chosen.ends_at,case when approve then 'pending' else 'confirmed' end,p_notes)
 returning * into result;
 insert into public.patient_consents(patient_id,purpose,granted) values(patient,'booking_privacy',true);
 return result;
end; $$;

create function public.change_appointment(p_id uuid,p_status text default null,p_starts_at timestamptz default null,p_doctor uuid default null)
 returns public.appointments language plpgsql security definer set search_path=public as $$
declare a public.appointments; result public.appointments; chosen record; cfg public.clinic_settings; d uuid;
begin
 select * into a from public.appointments where id=p_id for update;
 if not found then raise exception 'Appointment not found'; end if;
 if auth.uid() is null or public.my_role() is null then raise exception 'Not authorized'; end if;
 if not public.is_reception() then
  if public.my_role()='doctor' and a.doctor_id=public.my_doctor_id() then
   if p_starts_at is not null or p_doctor is not null or p_status not in ('checked_in','in_progress','completed','no_show') then raise exception 'Not authorized'; end if;
  elsif a.patient_id=auth.uid() and public.my_role()='patient' then
   select * into cfg from public.clinic_settings limit 1;
   if a.status not in ('pending','confirmed') or a.starts_at<now()+make_interval(hours=>cfg.cancellation_hours) then raise exception 'Contact reception: change window closed'; end if;
   if p_status is not null and p_status<>'cancelled' then raise exception 'Not authorized'; end if;
   if p_doctor is not null and p_starts_at is null then raise exception 'Choose a new slot'; end if;
  else raise exception 'Not authorized'; end if;
 end if;
 if a.status in ('completed','cancelled','no_show') and (p_starts_at is not null or p_doctor is not null) then raise exception 'Create a new booking for an inactive appointment'; end if;
 if p_starts_at is not null then
  select * into cfg from public.clinic_settings limit 1;
  d=coalesce(p_doctor,a.doctor_id);
  perform pg_advisory_xact_lock(hashtextextended(d::text,0));
  -- The temporary cancellation remains inside the transaction; rollback restores it on failure.
  update public.appointments set status='cancelled' where id=a.id;
  select * into chosen from public.available_slots(a.service_id,(p_starts_at at time zone cfg.timezone)::date,d) s where s.starts_at=p_starts_at;
  if not found then raise exception 'This slot is no longer available'; end if;
  update public.appointments set doctor_id=d,starts_at=chosen.starts_at,ends_at=chosen.ends_at,
  status=case when public.is_reception() then coalesce(p_status,a.status) when cfg.approval_required then 'pending' else 'confirmed' end,updated_at=now()
  where id=a.id returning * into result;
 else
  if p_doctor is not null then raise exception 'Select a new appointment time'; end if;
  update public.appointments set status=coalesce(p_status,status),updated_at=now() where id=a.id returning * into result;
 end if;
 return result;
end; $$;

create function public.submit_inquiry(p_name text,p_email text,p_phone text,p_message text,p_consent boolean)
 returns uuid language plpgsql security definer set search_path=public as $$
declare lead uuid;
begin
 if not p_consent then raise exception 'Privacy consent required'; end if;
 insert into public.crm_leads(name,email,phone,message,consent) values(p_name,p_email,p_phone,p_message,p_consent) returning id into lead;
 insert into public.contact_inquiries(lead_id,message) values(lead,p_message); return lead;
end $$;

-- Doctor/service relation changes are atomic.
create function public.save_doctor(p_id uuid,p_data jsonb,p_services uuid[])
 returns public.doctors language plpgsql security definer set search_path=public as $$
declare d public.doctors;
begin
 if not public.is_admin() then raise exception 'Not authorized'; end if;
 if p_id is null then
 insert into public.doctors(name,name_ar,specialty,biography,biography_ar,image_url,languages,profile_id,published,is_demo)
 values(p_data->>'name',coalesce(p_data->>'name_ar',''),p_data->>'specialty',coalesce(p_data->>'biography',''),
 coalesce(p_data->>'biography_ar',''),coalesce(p_data->>'image_url',''),coalesce(p_data->>'languages','English, Arabic'),
 nullif(p_data->>'profile_id','')::uuid,coalesce((p_data->>'published')::boolean,false),coalesce((p_data->>'is_demo')::boolean,false))
 returning * into d;
 else
 update public.doctors set
 name=coalesce(p_data->>'name',name),name_ar=coalesce(p_data->>'name_ar',name_ar),
 specialty=coalesce(p_data->>'specialty',specialty),biography=coalesce(p_data->>'biography',biography),
 biography_ar=coalesce(p_data->>'biography_ar',biography_ar),image_url=coalesce(p_data->>'image_url',image_url),
 languages=coalesce(p_data->>'languages',languages),
 profile_id=case when p_data ? 'profile_id' then nullif(p_data->>'profile_id','')::uuid else profile_id end,
 published=coalesce((p_data->>'published')::boolean,published),is_demo=coalesce((p_data->>'is_demo')::boolean,is_demo)
 where id=p_id returning * into d;
 if not found then raise exception 'Doctor not found'; end if;
 end if;
 if p_services is not null then
 delete from public.doctor_services where doctor_id=d.id;
 insert into public.doctor_services(doctor_id,service_id) select d.id,unnest(p_services);
 end if;
 return d;
end $$;

create function public.save_patient(p_id uuid,p_data jsonb,p_tags uuid[] default null)
 returns public.profiles language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
 if not public.is_reception() then raise exception 'Not authorized'; end if;
 select * into p from public.profiles where id=p_id and role='patient' for update;
 if not found then raise exception 'Patient not found'; end if;
 update public.profiles set name=coalesce(p_data->>'name',name),phone=coalesce(p_data->>'phone',phone),
 communication_preference=coalesce(p_data->>'communication_preference',communication_preference),
 consent=coalesce((p_data->>'consent')::boolean,consent),status=coalesce(p_data->>'status',status),
 assigned_to=case when p_data ? 'assigned_to' then nullif(p_data->>'assigned_to','')::uuid else assigned_to end
 where id=p_id returning * into p;
 if p_tags is not null then
 delete from public.patient_tags where patient_id=p_id;
 insert into public.patient_tags(patient_id,tag_id) select p_id,unnest(p_tags);
 end if;
 return p;
end $$;

create function public.review_schedule_request(p_id uuid,p_status text)
 returns public.schedule_requests language plpgsql security definer set search_path=public as $$
declare r public.schedule_requests;
begin
 if not public.is_admin() then raise exception 'Not authorized'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Invalid request decision'; end if;
 select * into r from public.schedule_requests where id=p_id for update;
 if not found or r.status<>'pending' then raise exception 'Only pending requests can be reviewed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(r.doctor_id::text,0));
 if p_status='approved' then
 insert into public.working_schedules(doctor_id,weekday,start_time,end_time) values(r.doctor_id,r.weekday,r.start_time,r.end_time)
 on conflict(doctor_id,weekday) do update set start_time=excluded.start_time,end_time=excluded.end_time,break_start=null,break_end=null;
 end if;
 update public.schedule_requests set status=p_status where id=p_id returning * into r;
 return r;
end $$;

create function public.update_self_profile(p_data jsonb)
 returns public.profiles language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
 if auth.uid() is null or public.my_role() is null then raise exception 'Not authorized'; end if;
 update public.profiles set name=coalesce(p_data->>'name',name),phone=coalesce(p_data->>'phone',phone),
 communication_preference=coalesce(p_data->>'communication_preference',communication_preference),
 consent=coalesce((p_data->>'consent')::boolean,consent) where id=auth.uid() returning * into p;
 if p_data ? 'consent' then
 insert into public.patient_consents(patient_id,purpose,granted) values(auth.uid(),'communications',p.consent);
 end if;
 insert into public.notification_preferences(patient_id,email_enabled,sms_enabled)
 values(auth.uid(),p.consent and p.communication_preference='email',false)
 on conflict(patient_id) do update set email_enabled=excluded.email_enabled,sms_enabled=false,updated_at=now();
 return p;
end $$;

-- Do not inherit PostgreSQL's default PUBLIC execute privileges.
revoke all on function public.handle_new_user(),public.protect_profile(),public.audit_change() from public;
revoke all on function public.available_slots(uuid,date,uuid) from public;
grant execute on function public.available_slots(uuid,date,uuid) to anon,authenticated,service_role;
revoke all on function public.book_appointment(uuid,uuid,timestamptz,text,uuid),public.change_appointment(uuid,text,timestamptz,uuid),public.save_doctor(uuid,jsonb,uuid[]) from public;
grant execute on function public.book_appointment(uuid,uuid,timestamptz,text,uuid),public.change_appointment(uuid,text,timestamptz,uuid),public.save_doctor(uuid,jsonb,uuid[]) to authenticated;
revoke all on function public.submit_inquiry(text,text,text,text,boolean) from public;
grant execute on function public.submit_inquiry(text,text,text,text,boolean) to service_role;
revoke all on function public.save_patient(uuid,jsonb,uuid[]),public.review_schedule_request(uuid,text) from public;
grant execute on function public.save_patient(uuid,jsonb,uuid[]),public.review_schedule_request(uuid,text) to authenticated;
revoke all on function public.update_self_profile(jsonb) from public;
grant execute on function public.update_self_profile(jsonb) to authenticated;

grant usage on schema public to anon,authenticated,service_role;
grant select,insert,update,delete on all tables in schema public to authenticated,service_role;
grant select on public.clinic_settings,public.services,public.doctors,public.doctor_services,public.faqs,
 public.blog_posts,public.website_content,public.testimonials,public.branches,public.specialties to anon;

-- Public website media only; never put patient files in this bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clinic-media','clinic-media',true,3000000,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy clinic_media_read on storage.objects for select using(bucket_id='clinic-media');
create policy clinic_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='clinic-media' and public.is_admin());
create policy clinic_media_admin_update on storage.objects for update to authenticated using(bucket_id='clinic-media' and public.is_admin()) with check(bucket_id='clinic-media' and public.is_admin());
create policy clinic_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='clinic-media' and public.is_admin());
commit;
