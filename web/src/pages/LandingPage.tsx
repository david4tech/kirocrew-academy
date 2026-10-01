import { Link } from 'react-router';
import { KiroGhost } from '../components/KiroGhost';
import { Button } from '../components/Button';
import { content } from '../lib/content';

const WORLD_COUNT = 7;

export function LandingPage() {
  const worlds = content.worlds.length > 0 ? content.worlds : placeholderWorlds();

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 py-10 text-center">
      <div className="flex flex-col items-center gap-6">
        <KiroGhost size={140} mood="happy" float label="Kiro, the KiroCrew ghost" />
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl">KiroCrew Academy</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
            Learn KiroCrew from first principles to advanced orchestration. Kiro the ghost guides you
            through {WORLD_COUNT} worlds of challenges, hints and boss trials, scoring every answer live.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth/sign-up">
            <Button>Start learning</Button>
          </Link>
          <Link to="/auth/sign-in">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </div>

      <section aria-label="Worlds" className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {worlds.map((world) => (
          <article
            key={world.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-raised p-5 text-left shadow-glow"
            style={{ borderColor: world.accent }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: world.accent }}>
              World {world.order}
            </span>
            <h2 className="text-lg font-bold text-text">{world.title}</h2>
            <p className="text-sm text-text-muted">{world.lore}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

/** Shown before real content packs exist, so the landing page still communicates the shape of the academy. */
function placeholderWorlds() {
  return Array.from({ length: WORLD_COUNT }, (_, i) => ({
    id: `w${i + 1}`,
    order: i + 1,
    title: `World ${i + 1}`,
    subtitle: '',
    lore: 'Challenges are being authored. Check back soon.',
    accent: '#8B5CF6',
    topics: [],
  }));
}
