import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AuthLayout, FormField, inputClasses } from './AuthLayout';
import { Button } from '../../components/Button';
import { confirmRegistration, resendConfirmationCode, type AuthErrorInfo } from '../../lib/auth';

export function ConfirmSignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await confirmRegistration(email, code);
      navigate('/auth/sign-in?confirmed=1');
    } catch (err) {
      setError((err as AuthErrorInfo).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resendConfirmationCode(email);
      setNotice('A new code is on its way.');
    } catch (err) {
      setError((err as AuthErrorInfo).message);
    }
  }

  return (
    <AuthLayout title="Confirm your email" subtitle="Enter the code we sent to your inbox." mood="thinking">
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
        <FormField label="Confirmation code" id="code">
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
        {notice && <p className="text-sm text-success">{notice}</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Confirming...' : 'Confirm account'}
        </Button>
        <Button type="button" variant="ghost" onClick={handleResend}>
          Resend code
        </Button>
      </form>
    </AuthLayout>
  );
}
