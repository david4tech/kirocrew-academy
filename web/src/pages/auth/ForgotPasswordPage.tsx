import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { AuthLayout, FormField, inputClasses } from './AuthLayout';
import { Button } from '../../components/Button';
import { requestPasswordReset, type AuthErrorInfo } from '../../lib/auth';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      navigate(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError((err as AuthErrorInfo).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll send a reset code to your email." mood="sad">
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
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending code...' : 'Send reset code'}
        </Button>
      </form>
    </AuthLayout>
  );
}
