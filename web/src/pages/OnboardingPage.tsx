import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ROLES, ROLE_LABELS, type Role } from '@kirocrew-academy/shared';
import { KiroGhost } from '../components/KiroGhost';
import { Button } from '../components/Button';
import { api, ApiClientError } from '../lib/api';
import { useAcademyStore } from '../store/academyStore';

export function OnboardingPage() {
  const navigate = useNavigate();
  const setProfile = useAcademyStore((s) => s.setProfile);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!role) {
      setError('Pick a role to continue.');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Display name needs at least 2 characters.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const profile = await api.patchMe({ displayName: displayName.trim(), role });
      setProfile(profile);
      navigate('/map');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save your profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10">
      <KiroGhost size={96} mood="happy" float label="" />
      <div className="w-full rounded-2xl border border-border bg-bg-raised p-6 shadow-glow">
        <h1 className="text-2xl font-bold text-text">Tell Kiro about yourself</h1>
        <p className="mt-1 text-sm text-text-muted">
          Pick the role that best matches your day to day. Challenges adapt their scenario to it.
        </p>

        <form className="mt-6 flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-text">Your role</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    role === r
                      ? 'border-kiro-400 bg-kiro-900/40 text-text'
                      : 'border-border-strong bg-bg-inset text-text-muted hover:border-kiro-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="h-4 w-4 accent-kiro-500"
                  />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-sm font-medium text-text">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              required
              minLength={2}
              maxLength={40}
              className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 text-text placeholder:text-text-faint focus-visible:border-kiro-400"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should the leaderboard know you?"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Enter the Academy'}
          </Button>
        </form>
      </div>
    </div>
  );
}
