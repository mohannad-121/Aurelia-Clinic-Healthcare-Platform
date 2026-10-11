import { tr } from '@/lib/i18n';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { useLogin, useRegister, useRecoverPassword, useSetPassword, getGetSessionQueryKey, getListAppointmentsQueryKey } from '@workspace/api-client-react';
import { useLocale, errMsg } from '@/lib/i18n';
import { useSeo } from '@/lib/seo';
import { useAuth, STAFF_ROLES, homeFor } from '@/hooks/use-auth';
import { useAuthLink } from '@/lib/auth-link';
import { Logo } from '@/components/site';

export function AuthShell({ title, children, eyebrow }: { title: string; children: ReactNode; eyebrow?: string }) {
  const { t, locale, setLocale } = useLocale();
  const { session } = useAuth();
  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_1.1fr] bg-white">
      <aside className="hidden lg:flex flex-col justify-between bg-navy text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-10" />
        <div className="absolute -bottom-40 -start-40 h-[520px] w-[520px] rounded-full bg-royal/50 blur-3xl" />
        <Link href="/" className="relative"><Logo light /></Link>
        <div className="relative"><h2 className="display !text-white text-6xl">{tr('Your care,')}<br />{tr('kept private.')}</h2><p className="mt-6 text-white/70 max-w-sm flex gap-3"><ShieldCheck className="shrink-0 text-azure" />{tr('Secure sessions, role-based access and administrative data only.')}</p></div>
        <p className="relative text-xs text-white/50">{t('emergency')}</p>
      </aside>
      <main className="flex flex-col p-6 sm:p-12">
        <div className="flex justify-between items-center lg:justify-end"><Link href="/" className="lg:hidden"><Logo /></Link><button className="btn btn-ghost btn-sm" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}>{locale === 'en' ? 'العربية' : tr("English")}</button></div>
        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-md">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h1 className="display text-4xl mb-8">{title}</h1>
            {session && !session.configured && <div className="mb-6 rounded-2xl bg-[#fff4d6] text-[#5e4000] text-sm p-4 flex gap-3" data-testid="notice-setup"><TriangleAlert size={18} className="shrink-0" />{t('auth.setup')}</div>}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function useAfterLogin() {
  const qc = useQueryClient();
  const [, nav] = useLocation();
  return (s: { authenticated: boolean; profile?: { role: string } }) => {
    qc.setQueryData(getGetSessionQueryKey(), s);
    qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
    const next = new URLSearchParams(window.location.search).get('next');
    const role = s.profile?.role ?? 'patient';
    nav(next && next.startsWith('/') ? next : STAFF_ROLES.includes(role) ? '/dashboard' : role === 'doctor' ? '/doctor' : '/portal');
  };
}

export function Login() {
  const { t } = useLocale();
  useSeo(tr("Sign in"), tr("Sign in to your Aurelia Clinic patient or staff account."));
  const login = useLogin();
  const after = useAfterLogin();
  const [v, setV] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  return (
    <AuthShell title={t('auth.login')} eyebrow={t('nav.portal')}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setErr(''); login.mutate({ data: v }, { onSuccess: (s) => (s.authenticated ? after(s) : setErr(s.message ?? tr("Sign-in failed."))), onError: (x) => setErr(errMsg(x)) }); }} data-testid="form-login">
        <div><label className="label" htmlFor="l-email">{t('form.email')}</label><input id="l-email" type="email" required autoComplete="email" className="field" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} data-testid="input-email" /></div>
        <div><label className="label" htmlFor="l-pw">{t('form.password')}</label><input id="l-pw" type="password" required minLength={8} autoComplete="current-password" className="field" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} data-testid="input-password" /></div>
        {err && <p role="alert" className="text-sm text-[#a1281d]" data-testid="text-error">{err}</p>}
        <button className="btn btn-primary" disabled={login.isPending} data-testid="button-login">{login.isPending ? t('common.loading') : t('nav.login')}</button>
        <div className="flex justify-between text-sm"><Link href="/forgot-password" className="text-royal font-semibold">{t('auth.forgotLink')}</Link><span>{t('auth.noAccount')} <Link href="/register" className="text-royal font-semibold">{t('auth.register').split(' ')[0]}</Link></span></div>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { t } = useLocale();
  useSeo(tr("Create account"), tr("Create your Aurelia Clinic patient account."));
  const reg = useRegister();
  const after = useAfterLogin();
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '', consent: false });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <AuthShell title={t('auth.register')} eyebrow={t('nav.portal')}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setErr(''); reg.mutate({ data: v }, { onSuccess: (s) => (s.authenticated ? after(s) : setMsg(s.message ?? tr("Check your email to verify your account."))), onError: (x) => setErr(errMsg(x)) }); }} data-testid="form-register">
        <div><label className="label" htmlFor="r-name">{t('form.name')}</label><input id="r-name" required minLength={2} className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} data-testid="input-name" /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label" htmlFor="r-email">{t('form.email')}</label><input id="r-email" type="email" required className="field" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} data-testid="input-email" /></div>
          <div><label className="label" htmlFor="r-phone">{t('form.phone')}</label><input id="r-phone" required minLength={7} className="field" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} data-testid="input-phone" /></div>
        </div>
        <div><label className="label" htmlFor="r-pw">{t('form.password')} (12+)</label><input id="r-pw" type="password" required minLength={12} autoComplete="new-password" className="field" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} data-testid="input-password" /></div>
        <label className="flex gap-3 text-xs text-muted-foreground items-start"><input type="checkbox" required className="mt-0.5" checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} data-testid="checkbox-consent" />{t('form.consent')}</label>
        {err && <p role="alert" className="text-sm text-[#a1281d]">{err}</p>}
        {msg && <p className="text-sm text-[#14683a]" data-testid="text-info">{msg}</p>}
        <button className="btn btn-primary" disabled={reg.isPending} data-testid="button-register">{reg.isPending ? t('common.loading') : t('auth.register')}</button>
        <p className="text-sm">{t('auth.haveAccount')} <Link href="/login" className="text-royal font-semibold">{t('nav.login')}</Link></p>
      </form>
    </AuthShell>
  );
}

export function Forgot() {
  const { t } = useLocale();
  useSeo(tr("Reset password"), tr("Request a password reset link for your Aurelia Clinic account."));
  const rec = useRecoverPassword();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  return (
    <AuthShell title={t('auth.forgot')}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setErr(''); rec.mutate({ data: { email } }, { onSuccess: (r) => setMsg(r.message), onError: (x) => setErr(errMsg(x)) }); }} data-testid="form-forgot">
        <div><label className="label" htmlFor="f-email">{t('form.email')}</label><input id="f-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" /></div>
        {err && <p role="alert" className="text-sm text-[#a1281d]">{err}</p>}
        {msg && <p className="text-sm text-[#14683a]" data-testid="text-info">{msg}</p>}
        <button className="btn btn-primary" disabled={rec.isPending} data-testid="button-forgot">{t('auth.sendLink')}</button>
        <Link href="/login" className="text-sm text-royal font-semibold">{t('nav.login')}</Link>
      </form>
    </AuthShell>
  );
}

export function ResetPassword() {
  const { t } = useLocale();
  useSeo(tr("Set a new password"), tr("Complete your Aurelia Clinic password reset or account invitation."));
  const link = useAuthLink();
  const { authenticated, profile } = useAuth();
  const setPw = useSetPassword();
  const [, nav] = useLocation();
  const [pw, setPwv] = useState('');
  const [c, setC] = useState('');
  const [err, setErr] = useState('');
  const canSet = authenticated && link.status === 'done' && (link.type === 'recovery' || link.type === 'invite');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 12) return setErr(tr("Use at least 12 characters."));
    if (pw !== c) return setErr(tr("The passwords do not match."));
    setPw.mutate({ data: { password: pw } }, { onSuccess: () => nav(homeFor(profile?.role)), onError: (x) => setErr(errMsg(x)) });
  };
  return (
    <AuthShell title={t('auth.setPw')}>
      {link.status === 'verifying' ? (
        <p className="text-sm text-muted-foreground" data-testid="text-verifying">{t('auth.verifying')}…</p>
      ) : canSet ? (
        <form className="grid gap-4" onSubmit={submit} data-testid="form-set-password">
          <div><label className="label" htmlFor="np">{t('auth.newPw')}</label><input id="np" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="field" value={pw} onChange={(e) => setPwv(e.target.value)} data-testid="input-new-password" /></div>
          <div><label className="label" htmlFor="cp">{t('auth.confirmPw')}</label><input id="cp" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="field" value={c} onChange={(e) => setC(e.target.value)} data-testid="input-confirm-password" /></div>
          {err && <p role="alert" className="text-sm text-[#a1281d]">{err}</p>}
          <button className="btn btn-primary" disabled={setPw.isPending} data-testid="button-set-password">{setPw.isPending ? t('common.loading') : t('auth.setPw')}</button>
        </form>
      ) : (
        <div className="grid gap-4" data-testid="reset-password-invalid">
          <p className="text-sm text-muted-foreground">{link.status === 'error' ? (link.message ?? tr("This link could not be verified.")) : tr("Open this page from the link in your reset or invitation email.")} Request a new link if it has expired.</p>
          <Link href="/forgot-password" className="btn btn-primary">{t('auth.sendLink')}</Link>
          <Link href="/login" className="text-sm text-royal font-semibold">{t('nav.login')}</Link>
        </div>
      )}
    </AuthShell>
  );
}
