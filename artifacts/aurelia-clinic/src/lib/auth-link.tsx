import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useVerifyEmailLink, getGetSessionQueryKey } from '@workspace/api-client-react';
import { homeFor } from '@/hooks/use-auth';
import { errMsg } from '@/lib/i18n';

// Tokens are captured exactly once at module load, then stripped from the address bar.
interface Captured { access_token: string; refresh_token: string; type: string }
function capture(): { tokens: Captured | null; error: string | null } {
  if (typeof window === 'undefined' || !window.location.hash) return { tokens: null, error: null };
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const at = h.get('access_token');
  const rt = h.get('refresh_token');
  const err = h.get('error_description') ?? h.get('error');
  if (!(at && rt) && !err) return { tokens: null, error: null };
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return { tokens: at && rt ? { access_token: at, refresh_token: rt, type: h.get('type') ?? 'signup' } : null, error: err };
}
const initial = capture();
let started = false;

interface Ctx { status: 'idle' | 'verifying' | 'done' | 'error'; type: string | null; message: string | null }
const LinkCtx = createContext<Ctx>({ status: 'idle', type: null, message: null });
export const useAuthLink = () => useContext(LinkCtx);

export function AuthLinkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>(initial.tokens ? { status: 'verifying', type: initial.tokens.type, message: null } : initial.error ? { status: 'error', type: null, message: initial.error } : { status: 'idle', type: null, message: null });
  const verify = useVerifyEmailLink();
  const qc = useQueryClient();
  const [loc, nav] = useLocation();
  useEffect(() => {
    if (initial.error && !initial.tokens && loc !== '/reset-password') nav('/reset-password');
    if (!initial.tokens || started) return;
    started = true;
    const { type, ...tokens } = initial.tokens;
    verify.mutate({ data: tokens }, {
      onSuccess: (s) => {
        qc.setQueryData(getGetSessionQueryKey(), s);
        if (!s.authenticated) { setState({ status: 'error', type, message: s.message ?? 'The link could not be verified.' }); nav('/reset-password'); return; }
        setState({ status: 'done', type, message: null });
        nav(type === 'recovery' || type === 'invite' ? '/reset-password' : homeFor(s.profile?.role));
      },
      onError: (e) => { setState({ status: 'error', type, message: errMsg(e) }); nav('/reset-password'); },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <LinkCtx.Provider value={state}>{children}</LinkCtx.Provider>;
}
