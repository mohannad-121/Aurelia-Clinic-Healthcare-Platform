import { useQueryClient } from '@tanstack/react-query';
import { getGetSessionQueryKey, useGetSession, useLogout } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

export function useAuth() {
  const q = useGetSession();
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const logout = useLogout();
  const session = q.data;
  return {
    session,
    profile: session?.profile,
    authenticated: !!session?.authenticated,
    configured: session?.configured ?? false,
    isLoading: q.isLoading,
    signOut: () =>
      logout.mutate(undefined, {
        onSettled: () => {
          qc.clear();
          qc.setQueryData(getGetSessionQueryKey(), { authenticated: false, configured: session?.configured ?? false });
          nav('/');
        },
      }),
  };
}

export const STAFF_ROLES = ['super_admin', 'clinic_admin', 'receptionist'];

export function homeFor(role?: string) {
  return role && STAFF_ROLES.includes(role) ? '/dashboard' : role === 'doctor' ? '/doctor' : '/portal';
}
