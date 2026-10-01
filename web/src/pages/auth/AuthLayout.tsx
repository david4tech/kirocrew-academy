import type { ReactNode } from 'react';
import { KiroGhost } from '../../components/KiroGhost';
import type { GhostMood } from '../../components/KiroGhost';

export function AuthLayout({
  title,
  subtitle,
  mood = 'idle',
  children,
}: {
  title: string;
  subtitle?: string;
  mood?: GhostMood;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 py-10">
      <KiroGhost size={88} mood={mood} float label="" />
      <div className="w-full rounded-2xl border border-border bg-bg-raised p-6 shadow-glow">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClasses =
  'w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 text-text placeholder:text-text-faint focus-visible:border-kiro-400';
