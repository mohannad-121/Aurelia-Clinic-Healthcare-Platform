import { tr } from '@/lib/i18n';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocale } from '@/lib/i18n';
import { Logo, Skeletons } from '@/components/site';

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-navy/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal aria-label={title} className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90dvh] overflow-y-auto p-7`} initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, opacity: 0 }}>
            <div className="flex justify-between items-start mb-5"><h2 className="text-xl font-bold text-navy">{title}</h2><button onClick={onClose} aria-label={tr("Close")} className="p-1.5 rounded-full hover:bg-ice"><X size={18} /></button></div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Confirm({ open, title, body, onYes, onNo, busy, danger = true }: { open: boolean; title: string; body: string; onYes: () => void; onNo: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onNo} title={title}>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="flex justify-end gap-2 mt-6"><button className="btn btn-ghost btn-sm" onClick={onNo}>{tr('Cancel')}</button><button className={`btn btn-sm ${danger ? 'btn-navy' : 'btn-primary'}`} disabled={busy} onClick={onYes} data-testid="button-confirm-yes">{tr('Confirm')}</button></div>
    </Modal>
  );
}

export const STATUS_STYLE: Record<string, string> = {
  pending: 'pill-warn', confirmed: '', checked_in: 'pill-ok', in_progress: 'pill-ok', completed: 'pill-ok', cancelled: 'pill-bad', no_show: 'pill-bad',
};
export function StatusPill({ s }: { s: string }) {
  return <span className={`pill ${STATUS_STYLE[s] ?? ''}`}>{tr(s.replace(/_/g, ' '))}</span>;
}

/** Route guard: shows branded login/setup panel instead of private content when unauthenticated. */
export function RequireAuth({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { session, authenticated, profile, isLoading } = useAuth();
  const { t } = useLocale();
  const [loc] = useLocation();
  if (isLoading) return <div className="min-h-[100dvh] grid place-items-center p-8"><div className="w-full max-w-md"><Skeletons n={3} h={70} /></div></div>;
  if (!authenticated) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-gradient-to-b from-ice to-white p-6" data-testid="gate">
        <div className="card p-10 max-w-md text-center">
          <Link href="/" className="inline-block mb-6"><Logo /></Link>
          <span className="mx-auto h-14 w-14 rounded-2xl bg-ice text-royal grid place-items-center mb-4"><LockKeyhole /></span>
          <h1 className="display text-3xl">{session && !session.configured ? tr("Setup required") : tr("Sign in required")}</h1>
          <p className="text-sm text-muted-foreground mt-3">{session && !session.configured ? t('auth.setup') : tr("This area is private. Sign in with your Aurelia account to continue.")}</p>
          <div className="flex gap-2 justify-center mt-6"><Link href={`/login?next=${encodeURIComponent(loc)}`} className="btn btn-primary" data-testid="link-gate-login">{t('nav.login')}</Link><Link href="/" className="btn btn-ghost">{t('nav.home')}</Link></div>
        </div>
      </div>
    );
  }
  if (roles && profile && !roles.includes(profile.role)) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6"><div className="card p-10 max-w-md text-center"><h1 className="display text-3xl">{tr('Not available for your role')}</h1><p className="text-sm text-muted-foreground mt-3">Your account ({profile.role.replace('_', ' ')}) does not have access to this area. Access is enforced by the server.</p><Link href="/" className="btn btn-ghost mt-6">{t('nav.home')}</Link></div></div>
    );
  }
  return <>{children}</>;
}
