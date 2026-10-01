import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { getCurrentAuthUser } from '../lib/auth';
import { useAcademyStore } from '../store/academyStore';
import { LoadingGhost } from './LoadingGhost';

/** Redirects to /auth/sign-in when there is no active Cognito session. */
export function RequireAuth() {
  const [status, setStatus] = useState<'checking' | 'authed' | 'anon'>('checking');
  const setAuthUser = useAcademyStore((s) => s.setAuthUser);

  useEffect(() => {
    let cancelled = false;
    getCurrentAuthUser().then((user) => {
      if (cancelled) return;
      if (user) {
        setAuthUser({ email: user.signInDetails?.loginId ?? user.username, sub: user.userId });
        setStatus('authed');
      } else {
        setStatus('anon');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [setAuthUser]);

  if (status === 'checking') return <LoadingGhost label="Checking your session..." />;
  if (status === 'anon') return <Navigate to="/auth/sign-in" replace />;
  return <Outlet />;
}
