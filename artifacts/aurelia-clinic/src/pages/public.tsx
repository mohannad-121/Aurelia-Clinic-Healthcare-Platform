import { tr } from '@/lib/i18n';
import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ArrowRight, Stethoscope, HeartPulse, CalendarCheck, ShieldCheck, Sparkles, Clock, UserRound, Plus, Minus, Smartphone, Quote, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { useGetClinic, useCreateInquiry } from '@workspace/api-client-react';
import type { Service, Doctor } from '@workspace/api-client-react';
import { useLocale, useLoc, useFmt, errMsg } from '@/lib/i18n';
import { useSeo } from '@/lib/seo';
import { toast } from '@/hooks/use-toast';
import { Reveal, PageHero, Skeletons, ErrorBlock, EmptyBlock, DemoPill, Initials } from '@/components/site';
import heroImg from '@/assets/hero.png';
import interiorImg from '@/assets/interior.png';

function useClinic() {
  const q = useGetClinic();
  return { ...q, clinic: q.data, services: (q.data?.services ?? []).filter((s) => s.published), doctors: (q.data?.doctors ?? []).filter((d) => d.published), faqs: (q.data?.faqs ?? []).filter((f) => f.published), posts: (q.data?.posts ?? []).filter((p) => p.published) };
}

function Emergency() {
  const { t } = useLocale();
  return <p className="text-xs text-muted-foreground mt-6 max-w-xl">{t('emergency')}</p>;
}

function ServiceCard({ s, i }: { s: Service; i: number }) {
  const { t } = useLocale();
  const loc = useLoc();
  const f = useFmt();
  return (
    <Reveal delay={(i % 3) * 0.07}>
      <Link href={`/services/${s.slug}`} className="group card p-7 flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all" data-testid={`card-service-${s.slug}`}>
        <div className="flex justify-between items-start">
          <span className="h-12 w-12 rounded-2xl bg-ice text-royal grid place-items-center group-hover:bg-royal group-hover:text-white transition-colors"><Stethoscope size={22} /></span>
          <ArrowUpRight className="text-[#9bbbe6] group-hover:text-royal transition-colors" />
        </div>
        <p className="eyebrow mt-6">{s.specialty}</p>
        <h3 className="text-xl font-bold text-navy mt-1">{loc(s, 'name')}</h3>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">{loc(s, 'description')}</p>
        <div className="flex gap-3 mt-5 text-xs font-semibold text-navy">
          <span className="pill"><Clock size={12} />{s.duration_minutes} {t('common.min')}</span>
          <span className="pill">{f.money(s.price)}</span>
          {s.is_demo && <span className="pill pill-demo">{tr('Demo')}</span>}
        </div>
      </Link>
    </Reveal>
  );
}

function DoctorCard({ d, i }: { d: Doctor; i: number }) {
  const loc = useLoc();
  const { t } = useLocale();
  return (
    <Reveal delay={(i % 4) * 0.06}>
      <div className="card overflow-hidden h-full flex flex-col group" data-testid={`card-doctor-${d.id}`}>
        <div className="aspect-[4/3] bg-gradient-to-br from-ice to-[#cfe5ff] grid place-items-center relative overflow-hidden">
          {d.image_url ? <img src={d.image_url} alt={loc(d, 'name')} className="h-full w-full object-cover" /> : <Initials name={loc(d, 'name')} size={96} />}
          {d.is_demo && <span className="pill pill-demo absolute top-3 start-3">{tr('Demo profile')}</span>}
        </div>
        <div className="p-6 flex flex-col flex-1">
          <p className="eyebrow">{d.specialty}</p>
          <h3 className="text-lg font-bold text-navy mt-1">{loc(d, 'name')}</h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">{loc(d, 'biography')}</p>
          <div className="flex gap-2 mt-5">
            <Link href={`/doctors/${d.id}`} className="btn btn-ghost btn-sm flex-1">{t('common.learn')}</Link>
            <Link href={`/book?doctor=${d.id}`} className="btn btn-primary btn-sm flex-1">{t('common.book')}</Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function FaqList({ limit }: { limit?: number }) {
  const { faqs, isLoading } = useClinic();
  const loc = useLoc();
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <Skeletons n={4} h={64} />;
  const list = limit ? faqs.slice(0, limit) : faqs;
  if (!list.length) return <EmptyBlock title={tr("No questions published yet")} />;
  return (
    <div className="grid gap-3">
      {list.map((f) => (
        <div key={f.id} className="card !rounded-2xl" data-testid={`faq-${f.id}`}>
          <button className="w-full flex justify-between items-center gap-4 p-5 text-start font-semibold text-navy" aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}>
            {loc(f, 'question')}{open === f.id ? <Minus size={18} className="text-royal shrink-0" /> : <Plus size={18} className="text-royal shrink-0" />}
          </button>
          <motion.div initial={false} animate={{ height: open === f.id ? 'auto' : 0, opacity: open === f.id ? 1 : 0 }} className="overflow-hidden">
            <p className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">{loc(f, 'answer')}</p>
          </motion.div>
        </div>
      ))}
    </div>
  );
}

export function Home() {
  const { t } = useLocale();
  const loc = useLoc();
  const { clinic, services, doctors, isLoading, isError, refetch } = useClinic();
  const [step, setStep] = useState(0);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 60]);
  useSeo(tr("Private healthcare in Amman"), clinic?.settings.description ?? tr("Aurelia Clinic is a modern private general healthcare clinic in Jordan with online booking and a patient portal."));
  const heroCms = clinic?.content.find((c) => c.slug === 'home-hero' && c.published);
  const steps = [
    [tr("Choose"), tr("Pick a service and, if you wish, a doctor."), CalendarCheck],
    [tr("Reserve"), tr("See real open times and save your slot."), Clock],
    [tr("Arrive"), tr("Check in at reception with your reference."), Building2],
    [tr("Follow up"), tr("Manage visits from your private portal."), Smartphone],
  ] as const;
  const testimonials = clinic?.testimonials ?? [];
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-ice via-white to-white">
        <div className="absolute inset-0 grid-lines opacity-70 [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" />
        <div className="absolute -top-40 -end-40 h-[560px] w-[560px] rounded-full bg-azure/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-14 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow mb-6 flex items-center gap-3"><span className="h-px w-10 bg-royal" />{clinic?.settings.name ?? tr("Aurelia Clinic")} · Amman</motion.p>
            <h1 className="display text-[2.9rem] sm:text-7xl lg:text-[5.6rem]">
              {(heroCms?.title ? [loc(heroCms, 'title')] : [t('hero.title1'), t('hero.title2')]).map((l, i) => (
                <span key={i} className="block overflow-hidden pb-1">
                  <motion.span className={`block ${i === 1 ? 'text-royal' : ''}`} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>{l}</motion.span>
                </span>
              ))}
            </h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-7 text-lg text-muted-foreground max-w-xl leading-relaxed">{heroCms?.excerpt || t('hero.sub')}</motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }} className="mt-9 flex flex-wrap gap-3">
              <Link href="/book" className="btn btn-primary !py-4 !px-8" data-testid="button-hero-book">{t('nav.book')}<ArrowRight size={17} className="rtl:rotate-180" /></Link>
              <Link href="/services" className="btn btn-ghost !py-4 !px-8" data-testid="button-hero-services">{t('hero.explore')}</Link>
            </motion.div>
            <Emergency />
          </div>
          <motion.div style={{ y }} className="relative">
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[4/5] shadow-2xl ring-1 ring-royal/10">
              <img src={heroImg} alt={tr("Illustrative patient consultation scene")} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent" />
            </div>
            <div className="glass drift absolute -start-6 bottom-12 rounded-2xl p-4 shadow-xl w-60 hidden sm:block">
              <p className="eyebrow">{t('nav.book')}</p>
              <p className="font-bold text-navy mt-1">{t('book.title')}</p>
              <div className="flex gap-1.5 mt-3">{[t('book.s1'), t('book.s2'), t('book.s3')].map((s, i) => <span key={s} className={`pill ${i === 1 ? '!bg-royal !text-white' : ''}`}>{s}</span>)}</div>
              <p className="text-[10px] text-muted-foreground mt-2">{t('demo.label')}</p>
            </div>
            <div className="glass absolute -end-3 top-10 rounded-2xl px-4 py-3 shadow-xl hidden sm:flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-royal text-white grid place-items-center"><ShieldCheck size={20} /></span>
              <span className="text-sm font-bold text-navy leading-tight">{tr('Private by design')}<span className="block text-xs font-medium text-muted-foreground">{tr('Secure patient portal')}</span></span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <Reveal><p className="eyebrow mb-3">{t('sec.specialties')}</p><h2 className="display text-4xl sm:text-6xl max-w-2xl">{tr('General care, organised by specialty.')}</h2></Reveal>
          <div className="flex items-center gap-3">{clinic && !clinic.configured && <DemoPill />}<Link href="/services" className="btn btn-ghost btn-sm">{t('common.viewAll')}<ArrowUpRight size={14} /></Link></div>
        </div>
        {isLoading ? <Skeletons n={3} h={220} /> : isError ? <ErrorBlock onRetry={() => refetch()} /> : services.length === 0 ? <EmptyBlock title={tr("Services will appear here once published")} /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{services.slice(0, 6).map((s, i) => <ServiceCard key={s.id} s={s} i={i} />)}</div>
        )}
      </section>

      <section className="bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-10" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 grid lg:grid-cols-[1fr_1.4fr] gap-14">
          <Reveal><p className="eyebrow !text-azure mb-3">{t('sec.why')}</p><h2 className="display !text-white text-4xl sm:text-6xl">{tr('A calmer way to see a doctor.')}</h2></Reveal>
          <div className="grid sm:grid-cols-2 gap-px bg-white/15 rounded-3xl overflow-hidden">
            {[[CalendarCheck, tr("Convenience"), tr("Book, move or cancel online within clinic policy.")], [HeartPulse, tr("Personalised care"), tr("Time set aside for each visit, with the doctor you choose.")], [UserRound, tr("Professional service"), tr("A reception team that follows up, not just answers.")], [Sparkles, tr("Modern facilities"), tr("Bright, accessible rooms designed to feel unhurried.")]].map(([Ic, h, p], i) => {
              const Icon = Ic as typeof Sparkles;
              return <Reveal key={i} delay={i * 0.08} className="bg-navy p-8"><Icon className="text-azure" size={26} /><h3 className="text-xl font-bold mt-5">{h as string}</h3><p className="text-white/65 text-sm mt-2">{p as string}</p></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <Reveal><p className="eyebrow mb-3">{t('sec.specialists')}</p><h2 className="display text-4xl sm:text-6xl">{tr('The people behind your care.')}</h2></Reveal>
          <Link href="/doctors" className="btn btn-ghost btn-sm">{t('common.viewAll')}<ArrowUpRight size={14} /></Link>
        </div>
        {isLoading ? <Skeletons n={3} h={300} /> : doctors.length === 0 ? <EmptyBlock title={tr("Doctor profiles will appear here once published")} /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{doctors.slice(0, 4).map((d, i) => <DoctorCard key={d.id} d={d} i={i} />)}</div>
        )}
        {clinic && !clinic.configured && <p className="text-xs text-muted-foreground mt-4">{tr('Profiles shown are fictional demo content, not verified professionals.')}</p>}
      </section>

      <section className="bg-ice">
        <div className="mx-auto max-w-7xl px-5 py-24 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal><p className="eyebrow mb-3">{t('sec.visit')}</p><h2 className="display text-4xl sm:text-6xl">{tr('Four steps. No phone queue.')}</h2>
            <div className="mt-10 grid gap-3">
              {steps.map(([h, p, Ic], i) => {
                const Icon = Ic;
                return (
                  <button key={h} onClick={() => setStep(i)} className={`text-start flex gap-4 items-center rounded-2xl p-4 transition-all ${step === i ? 'bg-white shadow-lg' : 'hover:bg-white/60'}`} data-testid={`button-step-${i}`}>
                    <span className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${step === i ? 'bg-royal text-white' : 'bg-white text-royal'}`}><Icon size={20} /></span>
                    <span><span className="font-bold text-navy block">{i + 1}. {h}</span>{step === i && <span className="text-sm text-muted-foreground">{p}</span>}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card p-8 relative overflow-hidden min-h-[320px]">
              <p className="eyebrow">{t('sec.digital')}</p>
              <h3 className="display text-3xl mt-3">{tr('Your portal keeps every visit in one place.')}</h3>
              <ul className="mt-6 grid gap-3 text-sm text-ink">
                {[tr("View upcoming and previous appointments"), tr("Cancel or request changes within clinic policy"), tr("Update contact details and communication preferences"), tr("Reach reception from your account")].map((x) => <li key={x} className="flex gap-3"><ShieldCheck size={18} className="text-royal shrink-0" />{x}</li>)}
              </ul>
              <div className="flex gap-3 mt-8"><Link href="/register" className="btn btn-navy btn-sm">{t('auth.register')}</Link><Link href="/login" className="btn btn-ghost btn-sm">{t('nav.login')}</Link></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
        <Reveal><div className="rounded-[2.5rem] overflow-hidden aspect-[16/11] shadow-xl"><img src={interiorImg} alt={tr("Clinic reception hall")} className="h-full w-full object-cover" loading="lazy" /></div></Reveal>
        <Reveal delay={0.1}><p className="eyebrow mb-3">{t('sec.clinic')}</p><h2 className="display text-4xl sm:text-5xl">{tr('Designed to lower your shoulders.')}</h2><p className="mt-5 text-muted-foreground">{tr('Natural light, quiet waiting areas and step-free access. Calm spaces make appointments easier for everyone.')}</p><Link href="/about" className="btn btn-ghost mt-7">{t('nav.about')}<ArrowUpRight size={15} /></Link></Reveal>
      </section>

      <section className="bg-pearl border-y">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="flex items-center gap-4 mb-10"><h2 className="display text-4xl sm:text-5xl">{t('sec.testimonials')}</h2>{clinic && !clinic.configured && <DemoPill />}</div>
          {testimonials.length === 0 ? <EmptyBlock title={tr("No approved patient testimonials yet")} hint={tr("We only publish reviews that patients have approved. Nothing is invented here.")} /> : (
            <div className="grid md:grid-cols-3 gap-5">{testimonials.slice(0, 3).map((r) => (
              <div key={r.id} className="card p-7"><Quote className="text-azure" /><p className="mt-4 text-ink">{String(r.data.quote ?? r.data.body ?? r.data.content ?? '')}</p><p className="mt-5 text-sm font-bold text-navy">{String(r.data.patient_name ?? r.data.name ?? r.data.author ?? tr("Patient"))}</p></div>
            ))}</div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-24">
        <h2 className="display text-4xl sm:text-5xl mb-10">{t('sec.faq')}</h2>
        <FaqList limit={5} />
        <Link href="/faq" className="btn btn-ghost mt-8">{t('common.viewAll')}</Link>
      </section>

      <section className="px-5 pb-24">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-gradient-to-br from-navy via-[#14449a] to-royal text-white p-10 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 grid-lines opacity-15" />
          <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
            <h2 className="display !text-white text-5xl sm:text-7xl">{t('sec.cta')}</h2>
            <div><p className="text-white/75 mb-6">{tr('Choose a service, pick a time, and we will hold it for you once you confirm.')}</p><Link href="/book" className="btn btn-white !py-4 !px-8" data-testid="button-cta-book">{t('nav.book')}<ArrowRight size={17} className="rtl:rotate-180" /></Link></div>
          </div>
        </div>
      </section>
    </>
  );
}

export function About() {
  const { clinic } = useClinic();
  const { t } = useLocale();
  useSeo(tr("About the clinic"), tr("Learn about Aurelia Clinic, a private general healthcare clinic in Amman."));
  const page = clinic?.content.find((c) => c.slug === 'about' && c.published);
  const loc = useLoc();
  return (
    <>
      <PageHero eyebrow={t('nav.about')} title={page ? loc(page, 'title') : tr("A private clinic built around time, clarity and trust.")} sub={clinic?.settings.headline} />
      <section className="mx-auto max-w-7xl px-5 py-20 grid lg:grid-cols-2 gap-12 items-start">
        <img src={interiorImg} alt={tr("Clinic interior")} className="rounded-[2rem] shadow-xl w-full" loading="lazy" />
        <div className="grid gap-6">
          {page ? page.body.split('\n').filter(Boolean).map((p, i) => <p key={i} className="text-lg text-ink leading-relaxed">{p}</p>) : <p className="text-lg text-ink leading-relaxed">{clinic?.settings.description ?? tr("Aurelia is a general healthcare clinic that pairs unhurried consultations with a modern digital front door.")}</p>}
          <div className="grid grid-cols-2 gap-4">
            {[[tr("Hours"), clinic?.settings.hours], [tr("Address"), clinic?.settings.address], [tr("Phone"), clinic?.settings.phone], [tr("Email"), clinic?.settings.email]].map(([k, v]) => <div key={k as string} className="card !rounded-2xl p-5"><p className="eyebrow">{k}</p><p className="font-semibold text-navy mt-1 text-sm">{v || '—'}</p></div>)}
          </div>
          <Emergency />
        </div>
      </section>
    </>
  );
}

export function Services() {
  const { t } = useLocale();
  const { services, isLoading, isError, refetch, clinic } = useClinic();
  const [sp, setSp] = useState('all');
  useSeo(tr("Services"), tr("Browse the general healthcare services offered at Aurelia Clinic."));
  const specs = ['all', ...Array.from(new Set(services.map((s) => s.specialty)))];
  const list = services.filter((s) => sp === 'all' || s.specialty === sp);
  return (
    <>
      <PageHero eyebrow={t('nav.services')} title={tr("Everything under one calm roof.")} sub={tr("Filter by specialty, compare duration and fees, then book in minutes.")}>{clinic && !clinic.configured && <div className="mt-6"><DemoPill /></div>}</PageHero>
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-wrap gap-2 mb-10">{specs.map((s) => <button key={s} onClick={() => setSp(s)} className={`btn btn-sm ${sp === s ? 'btn-navy' : 'btn-ghost'}`} data-testid={`filter-${s}`}>{s === 'all' ? 'All' : s}</button>)}</div>
        {isLoading ? <Skeletons n={3} h={220} /> : isError ? <ErrorBlock onRetry={() => refetch()} /> : list.length === 0 ? <EmptyBlock title={tr("No services published")} /> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{list.map((s, i) => <ServiceCard key={s.id} s={s} i={i} />)}</div>}
      </section>
    </>
  );
}

export function ServiceDetail() {
  const { slug } = useParams();
  const { t } = useLocale();
  const loc = useLoc();
  const f = useFmt();
  const { services, doctors, isLoading } = useClinic();
  const s = services.find((x) => x.slug === slug);
  useSeo(s ? s.name : tr("Service"), s?.description.slice(0, 150) ?? tr("Service details"));
  if (isLoading) return <div className="mx-auto max-w-5xl px-5 py-20"><Skeletons /></div>;
  if (!s) return <div className="mx-auto max-w-3xl px-5 py-24"><EmptyBlock title={tr("Service not found")} action={<Link href="/services" className="btn btn-ghost">{t('nav.services')}</Link>} /></div>;
  const team = doctors.filter((d) => d.service_ids?.includes(s.id));
  return (
    <>
      <PageHero eyebrow={s.specialty} title={loc(s, 'name')} sub={loc(s, 'description')}>
        <div className="mt-8 flex flex-wrap gap-3 items-center"><span className="pill"><Clock size={12} />{s.duration_minutes} {t('common.min')}</span><span className="pill">{f.money(s.price)}</span>{s.is_demo && <DemoPill />}<Link href={`/book?service=${s.id}`} className="btn btn-primary ms-3">{t('nav.book')}</Link></div>
      </PageHero>
      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-2xl font-bold text-navy mb-6">{t('sec.specialists')}</h2>
        {team.length === 0 ? <EmptyBlock title={tr("Doctors for this service will be listed here")} /> : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{team.map((d, i) => <DoctorCard key={d.id} d={d} i={i} />)}</div>}
        <Emergency />
      </section>
    </>
  );
}

export function Doctors() {
  const { t } = useLocale();
  const { doctors, isLoading, isError, refetch, clinic } = useClinic();
  useSeo(tr("Our doctors"), tr("Meet the doctors and specialists at Aurelia Clinic."));
  return (
    <>
      <PageHero eyebrow={t('nav.doctors')} title={tr("Specialists who take their time.")} sub={tr("Choose a doctor directly, or let us find the first available time.")}>{clinic && !clinic.configured && <p className="mt-6 text-xs text-muted-foreground max-w-lg">{tr('Profiles shown are fictional demo content and not verified professionals.')}</p>}</PageHero>
      <section className="mx-auto max-w-7xl px-5 py-16">
        {isLoading ? <Skeletons n={4} h={300} /> : isError ? <ErrorBlock onRetry={() => refetch()} /> : doctors.length === 0 ? <EmptyBlock title={tr("No doctor profiles published")} /> : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{doctors.map((d, i) => <DoctorCard key={d.id} d={d} i={i} />)}</div>}
      </section>
    </>
  );
}

export function DoctorProfile() {
  const { id } = useParams();
  const { t } = useLocale();
  const loc = useLoc();
  const { doctors, services, isLoading } = useClinic();
  const d = doctors.find((x) => x.id === id);
  useSeo(d ? d.name : tr("Doctor"), d?.biography.slice(0, 150) ?? tr("Doctor profile"));
  if (isLoading) return <div className="mx-auto max-w-5xl px-5 py-20"><Skeletons /></div>;
  if (!d) return <div className="mx-auto max-w-3xl px-5 py-24"><EmptyBlock title={tr("Doctor not found")} action={<Link href="/doctors" className="btn btn-ghost">{t('nav.doctors')}</Link>} /></div>;
  const svc = services.filter((s) => d.service_ids?.includes(s.id));
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 grid lg:grid-cols-[1fr_1.4fr] gap-12">
      <div className="rounded-[2.5rem] bg-gradient-to-br from-ice to-[#cfe5ff] aspect-square lg:aspect-[4/5] grid place-items-center overflow-hidden">{d.image_url ? <img src={d.image_url} alt={loc(d, 'name')} className="h-full w-full object-cover" /> : <Initials name={loc(d, 'name')} size={160} />}</div>
      <div>
        <p className="eyebrow">{d.specialty}</p>
        <h1 className="display text-5xl sm:text-6xl mt-2">{loc(d, 'name')}</h1>
        {d.is_demo && <div className="mt-4"><DemoPill /></div>}
        <p className="mt-6 text-lg text-ink leading-relaxed">{loc(d, 'biography')}</p>
        {d.languages && <p className="mt-4 text-sm"><b className="text-navy">{t('common.languages')}:</b> {d.languages}</p>}
        <h2 className="font-bold text-navy mt-8 mb-3">{t('nav.services')}</h2>
        <div className="flex flex-wrap gap-2">{svc.length ? svc.map((s) => <Link key={s.id} href={`/services/${s.slug}`} className="pill !text-sm !px-4 !py-1.5">{loc(s, 'name')}</Link>) : <span className="text-sm text-muted-foreground">—</span>}</div>
        <Link href={`/book?doctor=${d.id}`} className="btn btn-primary mt-10" data-testid="button-book-doctor">{t('nav.book')}</Link>
        <Emergency />
      </div>
    </section>
  );
}

export function Contact() {
  const { t } = useLocale();
  const { clinic } = useClinic();
  const create = useCreateInquiry();
  const [v, setV] = useState({ name: '', email: '', phone: '', message: '', consent: false, website: '' });
  const [done, setDone] = useState(false);
  useSeo(tr("Contact"), tr("Contact Aurelia Clinic reception by phone, email or secure message."));
  const s = clinic?.settings;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ data: v }, { onSuccess: () => { setDone(true); toast({ title: t('form.sent') }); }, onError: (er) => toast({ title: errMsg(er), variant: 'destructive' }) });
  };
  const set = (k: string, val: string | boolean) => setV((x) => ({ ...x, [k]: val }));
  return (
    <>
      <PageHero eyebrow={t('nav.contact')} title={tr("Talk to reception.")} sub={tr("Questions about bookings, services or fees. We reply during opening hours.")} />
      <section className="mx-auto max-w-7xl px-5 py-16 grid lg:grid-cols-[1fr_1.3fr] gap-10">
        <div className="grid gap-4 content-start">
          {[[Phone, s?.phone], [Mail, s?.email], [MapPin, s?.address], [Clock, s?.hours]].map(([Ic, val], i) => { const Icon = Ic as typeof Phone; return <div key={i} className="card !rounded-2xl p-5 flex gap-4 items-center"><span className="h-11 w-11 rounded-xl bg-ice text-royal grid place-items-center"><Icon size={19} /></span><bdi className="font-semibold text-navy text-sm">{(val as string) || '—'}</bdi></div>; })}
          <Emergency />
        </div>
        <form onSubmit={submit} className="card p-8 grid gap-4" data-testid="form-contact">
          {done ? <div className="py-10 text-center"><ShieldCheck className="mx-auto text-royal mb-3" size={40} /><p className="font-bold text-navy text-lg">{t('form.sent')}</p></div> : (<>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label" htmlFor="c-name">{t('form.name')}</label><input id="c-name" className="field" required minLength={2} value={v.name} onChange={(e) => set('name', e.target.value)} data-testid="input-name" /></div>
              <div><label className="label" htmlFor="c-phone">{t('form.phone')}</label><input id="c-phone" className="field" required minLength={7} value={v.phone} onChange={(e) => set('phone', e.target.value)} data-testid="input-phone" /></div>
            </div>
            <div><label className="label" htmlFor="c-email">{t('form.email')}</label><input id="c-email" type="email" className="field" required value={v.email} onChange={(e) => set('email', e.target.value)} data-testid="input-email" /></div>
            <div><label className="label" htmlFor="c-msg">{t('form.message')}</label><textarea id="c-msg" className="field min-h-32" required minLength={5} maxLength={2000} value={v.message} onChange={(e) => set('message', e.target.value)} data-testid="input-message" /></div>
            <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={v.website} onChange={(e) => set('website', e.target.value)} aria-hidden />
            <label className="flex gap-3 text-xs text-muted-foreground items-start"><input type="checkbox" required checked={v.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5" data-testid="checkbox-consent" />{t('form.consent')}</label>
            <button className="btn btn-primary justify-self-start" disabled={create.isPending} data-testid="button-send">{create.isPending ? t('common.loading') : t('form.send')}</button>
            <p className="text-xs text-muted-foreground">{tr('Do not send medical details or emergencies through this form.')}</p>
          </>)}
        </form>
      </section>
    </>
  );
}

export function Faq() {
  const { t } = useLocale();
  useSeo('FAQ', tr("Answers to common questions about booking, fees and visiting Aurelia Clinic."));
  return (
    <>
      <PageHero eyebrow={t('nav.faq')} title={tr("Good questions, plain answers.")} />
      <section className="mx-auto max-w-4xl px-5 py-16"><FaqList /><Emergency /></section>
    </>
  );
}

export function Articles() {
  const { t } = useLocale();
  const loc = useLoc();
  const { posts, isLoading, isError, refetch } = useClinic();
  useSeo(tr("Journal"), tr("Administrative and wellbeing articles from Aurelia Clinic."));
  return (
    <>
      <PageHero eyebrow={t('nav.articles')} title={tr("Notes from the clinic.")} sub={tr("General information only. Articles are not medical advice.")} />
      <section className="mx-auto max-w-7xl px-5 py-16">
        {isLoading ? <Skeletons n={3} h={240} /> : isError ? <ErrorBlock onRetry={() => refetch()} /> : posts.length === 0 ? <EmptyBlock title={tr("No articles published yet")} /> : (
          <div className="grid md:grid-cols-3 gap-6">{posts.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 0.06}><Link href={`/articles/${p.slug}`} className="card overflow-hidden flex flex-col h-full group hover:-translate-y-1 transition-transform" data-testid={`card-post-${p.slug}`}>
              <div className="aspect-[16/10] bg-gradient-to-br from-ice to-[#cfe5ff] overflow-hidden">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />}</div>
              <div className="p-6"><h3 className="font-bold text-navy text-lg">{loc(p, 'title')}</h3><p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p><span className="text-royal text-sm font-semibold mt-4 inline-flex items-center gap-1">{t('common.readMore')}<ArrowUpRight size={14} /></span></div>
            </Link></Reveal>
          ))}</div>
        )}
      </section>
    </>
  );
}

export function ArticleDetail() {
  const { slug } = useParams();
  const { t } = useLocale();
  const loc = useLoc();
  const { posts, isLoading } = useClinic();
  const p = posts.find((x) => x.slug === slug);
  useSeo(p ? p.title : tr("Article"), p?.excerpt ?? tr("Article"));
  if (isLoading) return <div className="mx-auto max-w-3xl px-5 py-20"><Skeletons /></div>;
  if (!p) return <div className="mx-auto max-w-3xl px-5 py-24"><EmptyBlock title={tr("Article not found")} action={<Link href="/articles" className="btn btn-ghost">{t('nav.articles')}</Link>} /></div>;
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/articles" className="eyebrow">{t('nav.articles')}</Link>
      <h1 className="display text-4xl sm:text-6xl mt-4">{loc(p, 'title')}</h1>
      {p.image_url && <img src={p.image_url} alt="" className="rounded-[2rem] mt-8 w-full" />}
      <div className="mt-8 grid gap-5 text-lg leading-relaxed text-ink">{loc(p, 'body').split('\n').filter(Boolean).map((x, i) => <p key={i}>{x}</p>)}</div>
      <p className="mt-10 text-xs text-muted-foreground border-t pt-4">{tr('General information only, not medical advice.')} {t('emergency')}</p>
    </article>
  );
}

export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const { clinic } = useClinic();
  const priv = kind === 'privacy';
  useSeo(priv ? tr("Privacy policy") : tr("Terms and conditions"), priv ? tr("How Aurelia Clinic handles your administrative data.") : tr("Terms for using the Aurelia Clinic website and booking service."));
  const page = clinic?.content.find((c) => c.slug === kind && c.published);
  const sections: [string, string][] = priv ? [
    [tr("What we collect"), tr("Only the administrative details needed to schedule and manage your visit: name, email, phone, appointment history, and communication preferences. The booking system does not store clinical records.")],
    [tr("Consent"), tr("We record your consent when you register, book or send an inquiry. You can update communication preferences in your portal at any time.")],
    [tr("Security"), tr("Sign-in uses secure HttpOnly sessions. Access to records is restricted by role. No system is perfectly secure and this template requires legal and security review before use with real patients.")],
    [tr("Your choices"), tr("Contact reception to request access, correction or deletion of your administrative data.")],
  ] : [
    [tr("Using this site"), tr("The website provides clinic information and appointment scheduling. It does not provide medical advice, diagnosis or treatment.")],
    [tr("Appointments"), `${tr('Bookings are confirmed only once saved and shown with a reference.')} ${tr('Cancellation is allowed up to')} ${clinic?.settings.cancellation_hours ?? 24} ${tr('hours before the visit.')}`],
    [tr("Emergencies"), tr("In an emergency call 911 or visit the nearest emergency department. Do not use this site or the assistant for urgent needs.")],
    [tr("Changes"), tr("We may update these terms. Continued use means you accept the current version.")],
  ];
  return (
    <>
      <PageHero eyebrow={tr("Legal")} title={priv ? tr("Privacy policy") : tr("Terms and conditions")} sub={tr("Draft template. Requires review by qualified legal counsel before use with real patients.")} />
      <section className="mx-auto max-w-3xl px-5 py-14 grid gap-8">
        {page ? page.body.split('\n').filter(Boolean).map((x, i) => <p key={i} className="text-ink leading-relaxed">{x}</p>) : sections.map(([h, p]) => <div key={h}><h2 className="text-xl font-bold text-navy">{h}</h2><p className="mt-2 text-ink leading-relaxed">{p}</p></div>)}
      </section>
    </>
  );
}
