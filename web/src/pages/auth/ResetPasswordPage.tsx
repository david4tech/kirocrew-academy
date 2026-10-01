import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AuthLayout, FormField, inputClasses } from './AuthLayout';
import { Button } from '../../components/Button';
import { confirmPasswordReset, type AuthErrorInfo } from '../../lib/auth';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordReset(email, code, newPassword);
      navigate('/auth/sign-in?reset=1');
    } catch (err) {
      setError((err as AuthErrorInfo).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Enter the code we sent and your new password." mood="thinking">
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
        <FormField label="Reset code" id="code">
          <input
            id="code"
            type="text"
            inputMode="numeric"
            required
            autoComplete="one-time-code"
            className={inputClasses}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="New password" id="new-password">
          <input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            className={inputClasses}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </FormField>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
