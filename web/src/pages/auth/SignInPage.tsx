import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout, FormField, inputClasses } from './AuthLayout';
import { Button } from '../../components/Button';
import { login, type AuthErrorInfo } from '../../lib/auth';

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmed = searchParams.get('confirmed') === '1';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.signedIn) navigate('/map');
    } catch (err) {
      setError((err as AuthErrorInfo).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to keep your streak alive." mood="idle">
      {confirmed && (
        <p className="mb-4 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
          Account confirmed. Sign in to continue.
        </p>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <FormField label="Email" id="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label="Password" id="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-4 flex flex-col gap-2 text-sm text-text-muted">
        <Link to="/auth/forgot-password" className="font-medium text-kiro-300 hover:text-kiro-200">
          Forgot your password?
        </Link>
        <span>
          New here?{' '}
          <Link to="/auth/sign-up" className="font-medium text-kiro-300 hover:text-kiro-200">
            Create an account
          </Link>
        </span>
      </div>
    </AuthLayout>
  );
}
