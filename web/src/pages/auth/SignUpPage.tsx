import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthLayout, FormField, inputClasses } from './AuthLayout';
import { Button } from '../../components/Button';
import { registerAccount, type AuthErrorInfo } from '../../lib/auth';

export function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerAccount(email, password);
      navigate(`/auth/confirm?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError((err as AuthErrorInfo).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join the crew and start earning XP." mood="happy">
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
            autoComplete="new-password"
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
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/auth/sign-in" className="font-medium text-kiro-300 hover:text-kiro-200">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
