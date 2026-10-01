import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { LoadingGhost } from './LoadingGhost';
import { api, ApiClientError } from '../lib/api';
import { useAcademyStore } from '../store/academyStore';

/**
 * Fetches the profile once per mount and redirects to /onboarding when
 * profile.role is null, per the brief: onboarding shows once when the role
 * has not been chosen yet.
 */
export function RequireOnboarded() {
  const setProfile = useAcademyStore((s) => s.setProfile);
  const [status, setStatus] = useState<'checking' | 'needs-onboarding' | 'ready' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMe()
      .then((profile) => {
        if (cancelled) return;
        setProfile(profile);
        setStatus(profile.role === null ? 'needs-onboarding' : 'ready');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Could not load your profile.');
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setProfile]);

  if (status === 'checking') return <LoadingGhost label="Waking up Kiro..." />;
  if (status === 'error') {
    return (
      <div role="alert" className="mx-auto mt-16 max-w-md rounded-xl border border-danger bg-danger-bg p-4 text-sm text-danger">
        {error}
      </div>
    );
  }
  if (status === 'needs-onboarding') return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
