import { tr } from '@/lib/i18n';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Languages, MessageCircle, Send, Phone, MapPin, Clock, Mail, ArrowUpRight, ShieldAlert, User } from 'lucide-react';
import { useGetClinic, useAskAssistant } from '@workspace/api-client-react';
import { useLocale, useFmt, errMsg } from '@/lib/i18n';
import { useAuth, STAFF_ROLES } from '@/hooks/use-auth';

export function Logo({ light = false, size = 36 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" data-testid="logo">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect width="40" height="40" rx="12" fill={light ? '#fff' : '#102D69'} />
        <path d="M20 8v24M8 20h24" stroke="#1686FF" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="20" cy="20" r="7.5" stroke={light ? '#102D69' : '#fff'} strokeWidth="1.6" />
      </svg>
      <span className={`font-extrabold tracking-tight text-lg leading-none ${light ? 'text-white' : 'text-navy'}`}>
        Aurelia<span className="block text-[0.6rem] font-semibold tracking-[0.3em] uppercase text-azure mt-1">{tr('Clinic')}</span>
      </span>
    </span>
  );
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function Skeletons({ n = 3, h = 120 }: { n?: number; h?: number }) {
  return (
    <div className="grid gap-4" aria-busy>
      {Array.from({ length: n }).map((_, i) => <div key={i} className="skel" style={{ height: h }} />)}
    </div>
  );
}

export function ErrorBlock({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="card p-8 text-center" data-testid="error-block">
      <p className="text-ink mb-4">{t('common.error')}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

export function EmptyBlock({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#bcd6f5] bg-ice/50 p-10 text-center" data-testid="empty-block">
      <svg className="mx-auto mb-4" width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
        <circle cx="28" cy="28" r="26" stroke="#1686FF" strokeOpacity=".4" strokeWidth="1.5" strokeDasharray="4 5" />
        <path d="M28 18v20M18 28h20" stroke="#1263DF" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="font-bold text-navy">{title}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoPill() {
  const { t } = useLocale();
  return <span className="pill pill-demo">{t('demo.label')}</span>;
}

export function Initials({ name, size = 56 }: { name: string; size?: number }) {
  const i = name.replace(/^(Dr\.?|د\.)\s*/i, '').split(/\s+/).slice(0, 2).map((s) => s[0]).join('');
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-navy to-royal text-white font-bold" style={{ width: size, height: size, fontSize: size / 3 }}>
      {i}
    </span>
  );
}

function Nav() {
  const { t, locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  const { authenticated, profile } = useAuth();
  const links = [
    ['/', 'nav.home'], ['/about', 'nav.about'], ['/services', 'nav.services'], ['/doctors', 'nav.doctors'], ['/articles', 'nav.articles'], ['/contact', 'nav.contact'],
  ];
  useEffect(() => setOpen(false), [loc]);
  const home = profile && STAFF_ROLES.includes(profile.role) ? '/dashboard' : profile?.role === 'doctor' ? '/doctor' : '/portal';
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/60">
      <div className="mx-auto max-w-7xl px-5 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" aria-label={tr("Aurelia Clinic")} data-testid="link-logo"><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-7" aria-label={tr("Primary")}>
          {links.map(([h, k]) => (
            <Link key={h} href={h} className={`nav-link ${loc === h || (h !== '/' && loc.startsWith(h)) ? 'active' : ''}`} data-testid={`link-nav-${k}`}>{t(k)}</Link>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} data-testid="button-locale" aria-label={tr("Switch language")}>
            <Languages size={15} />{locale === 'en' ? 'العربية' : tr("English")}
          </button>
          <Link href={authenticated ? home : '/login'} className="btn btn-ghost btn-sm" data-testid="link-portal"><User size={15} />{authenticated ? t('nav.portal') : t('nav.login')}</Link>
          <Link href="/book" className="btn btn-primary btn-sm" data-testid="link-book-nav">{t('nav.book')}</Link>
        </div>
        <button className="lg:hidden p-2 rounded-full bg-ice text-navy" onClick={() => setOpen(!open)} aria-label={tr("Menu")} data-testid="button-menu">{open ? <X /> : <Menu />}</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden overflow-hidden bg-white border-t">
            <div className="p-5 grid gap-1">
              {links.map(([h, k]) => <Link key={h} href={h} className="py-3 font-semibold text-navy border-b border-ice">{t(k)}</Link>)}
              <Link href={authenticated ? home : '/login'} className="py-3 font-semibold text-navy">{authenticated ? t('nav.portal') : t('nav.login')}</Link>
              <div className="flex gap-3 pt-3">
                <button className="btn btn-ghost btn-sm" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}><Languages size={15} />{locale === 'en' ? 'العربية' : tr("English")}</button>
                <Link href="/book" className="btn btn-primary btn-sm flex-1">{t('nav.book')}</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  const fm = useFmt();
  const { t } = useLocale();
  const { data } = useGetClinic();
  const s = data?.settings;
  return (
    <footer className="bg-navy text-white mt-0 relative overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-20 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-8 grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-5 text-white/70 max-w-sm text-sm leading-relaxed">{data?.content.find((c) => c.slug === 'footer' && c.published)?.excerpt || s?.description || tr("A private general healthcare clinic in Amman, Jordan.")}</p>
          <p className="mt-6 flex gap-2 text-xs text-white/70 max-w-sm"><ShieldAlert size={16} className="shrink-0 text-azure" />{t('emergency')}</p>
        </div>
        <div>
          <h4 className="eyebrow !text-azure mb-4">{tr('Aurelia')}</h4>
          <ul className="grid gap-2.5 text-sm text-white/80">
            {[['/about', 'nav.about'], ['/services', 'nav.services'], ['/doctors', 'nav.doctors'], ['/articles', 'nav.articles'], ['/faq', 'nav.faq']].map(([h, k]) => <li key={h}><Link href={h} className="hover:text-white">{t(k)}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="eyebrow !text-azure mb-4">{t('nav.portal')}</h4>
          <ul className="grid gap-2.5 text-sm text-white/80">
            <li><Link href="/book" className="hover:text-white">{t('nav.book')}</Link></li>
            <li><Link href="/login" className="hover:text-white">{t('nav.login')}</Link></li>
            <li><Link href="/register" className="hover:text-white">{t('auth.register')}</Link></li>
            <li><Link href="/privacy" className="hover:text-white">{t('footer.privacy')}</Link></li>
            <li><Link href="/terms" className="hover:text-white">{t('footer.terms')}</Link></li>
          </ul>
        </div>
        <div className="grid gap-3 text-sm text-white/80 content-start">
          <h4 className="eyebrow !text-azure mb-1">{t('nav.contact')}</h4>
          <span className="flex gap-2"><MapPin size={16} className="shrink-0 mt-0.5 text-azure" />{s?.address || tr("Amman, Jordan")}</span>
          <span className="flex gap-2"><Phone size={16} className="shrink-0 mt-0.5 text-azure" /><bdi>{s?.phone || '—'}</bdi></span>
          <span className="flex gap-2"><Mail size={16} className="shrink-0 mt-0.5 text-azure" />{s?.email || '—'}</span>
          <span className="flex gap-2"><Clock size={16} className="shrink-0 mt-0.5 text-azure" />{s?.hours || '—'}</span>
        </div>
      </div>
      <div className="relative mx-auto max-w-7xl px-5 py-6 border-t border-white/10 text-xs text-white/50 flex flex-wrap justify-between gap-2">
        <span>© {new Date().getFullYear()} {s?.name || tr("Aurelia Clinic")}. {t('footer.rights')}</span>
        <span>{fm.tz} · {fm.currency}</span>
      </div>
    </footer>
  );
}

interface Msg { from: 'user' | 'bot'; text: string; links?: { label: string; href: string }[]; mode?: string }

function ChatWidget() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sid, setSid] = useState<string | undefined>();
  const ask = useAskAssistant();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, ask.isPending]);
  const send = (m: string) => {
    if (!m.trim() || ask.isPending) return;
    setMsgs((x) => [...x, { from: 'user', text: m }]);
    setText('');
    ask.mutate({ data: { message: m, locale, session_id: sid, save_conversation: false } }, {
      onSuccess: (r) => { setSid(r.session_id); setMsgs((x) => [...x, { from: 'bot', text: r.reply, links: r.links, mode: r.mode }]); },
      onError: (e) => setMsgs((x) => [...x, { from: 'bot', text: errMsg(e) }]),
    });
  };
  const quick = locale === 'ar' ? ['ما هي ساعات العمل؟', 'كيف أحجز موعدًا؟', 'ما هي الخدمات؟'] : [tr("What are your opening hours?"), tr("How do I book?"), tr("Which services do you offer?")];
  return (
    <div className="fixed bottom-5 end-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} className="absolute bottom-16 end-0 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[min(560px,70dvh)] card overflow-hidden flex flex-col shadow-2xl" role="dialog" aria-label={t('chat.title')}>
            <div className="bg-gradient-to-br from-navy to-royal text-white p-4">
              <div className="font-bold">{t('chat.title')}</div>
              <div className="text-xs text-white/80 mt-0.5">{t('chat.mode')}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid gap-3 content-start bg-pearl">
              {msgs.length === 0 && (
                <div className="grid gap-2">
                  <p className="text-sm text-ink">{locale === 'ar' ? 'مرحبًا! أستطيع الإجابة عن معلومات العيادة والحجز فقط.' : tr("Hello. I can answer clinic information and booking questions only, with no medical advice.")}</p>
                  {quick.map((q) => <button key={q} className="text-start text-sm rounded-xl border border-[#cfe0f5] bg-white px-3 py-2 hover:bg-ice" onClick={() => send(q)}>{q}</button>)}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${m.from === 'user' ? 'bg-royal text-white justify-self-end' : 'bg-white border border-[#e0ebf9] text-ink'}`}>
                  {m.text}
                  {m.mode && <div className="pill mt-2">{m.mode === 'ai' ? 'AI' : 'FAQ'}</div>}
                  {m.links?.map((l) => <Link key={l.href} href={l.href} className="flex items-center gap-1 mt-2 text-royal font-semibold text-xs">{l.label}<ArrowUpRight size={12} /></Link>)}
                </div>
              ))}
              {ask.isPending && <div className="skel h-8 w-24" />}
              <div ref={end} />
            </div>
            <form className="p-3 border-t flex gap-2 bg-white" onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('chat.ph')} maxLength={1500} data-testid="input-chat" />
              <button className="btn btn-primary !px-3.5" aria-label={tr("Send")} data-testid="button-chat-send"><Send size={16} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button className="h-14 w-14 rounded-full bg-gradient-to-br from-royal to-azure text-white grid place-items-center shadow-xl hover:scale-105 transition-transform" onClick={() => setOpen(!open)} aria-label={t('chat.title')} data-testid="button-chat">
        {open ? <X /> : <MessageCircle />}
      </button>
    </div>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const { data } = useGetClinic();
  const { t } = useLocale();
  const [loc] = useLocation();
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      {data && !data.configured && (
        <div className="bg-[#fff4d6] text-[#5e4000] text-xs px-5 py-2 text-center font-medium" data-testid="banner-demo">{t('demo.banner')}</div>
      )}
      {data?.content.filter((c) => c.slug === 'announcement' && c.published).map((c) => <div key={c.id} className="bg-navy text-white text-sm px-5 py-2.5 text-center" data-testid="banner-announcement"><b>{c.title}</b>{c.excerpt ? ` · ${c.excerpt}` : ''}</div>)}
      <Nav />
      <AnimatePresence mode="wait">
        <motion.main key={loc} className="flex-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {children}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <ChatWidget />
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ice to-white">
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-14 lg:pt-24 lg:pb-20">
        <Reveal><p className="eyebrow mb-4">{eyebrow}</p></Reveal>
        <Reveal delay={0.08}><h1 className="display text-5xl sm:text-6xl lg:text-7xl max-w-4xl">{title}</h1></Reveal>
        {sub && <Reveal delay={0.16}><p className="mt-6 text-lg text-muted-foreground max-w-2xl">{sub}</p></Reveal>}
        {children}
      </div>
    </section>
  );
}
