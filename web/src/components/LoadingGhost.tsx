import { KiroGhost } from './KiroGhost';

/** Full screen loading state. The ghost is present everywhere, loading included. */
export function LoadingGhost({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 text-text-muted" role="status">
      <KiroGhost size={72} mood="thinking" float label="" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
