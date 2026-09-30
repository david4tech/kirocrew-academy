/**
 * Loads the full content bundle and indexes it once at module scope.
 *
 * This MUST be a static JSON import, not a runtime readFileSync. The Lambda
 * artifact is built by CDK's NodejsFunction (see infra/lib/academy-api-stack.ts),
 * which points esbuild straight at src/handlers/<name>.ts and emits a single
 * bundled index.mjs at the asset root. It never runs api/scripts/build.mjs and
 * never copies content.full.json alongside the bundle, so any path derived from
 * import.meta.url resolves to a file that does not exist in the deployed
 * package. A static import makes esbuild inline the bundle into the artifact,
 * which is the only form that survives that build. Vite (vitest) inlines the
 * same import, so the unbundled test run behaves identically.
 *
 * The import attribute is required by module: NodeNext. The path is generated
 * and gitignored: run `npm run build:content -- --include-reference` before
 * typecheck, test or cdk synth (the deploy workflow already does, in that order).
 */

import type { Challenge, ContentManifest, PublicWorld, World } from '@kirocrew-academy/shared';
import fullBundle from '../generated/content.full.json' with { type: 'json' };

interface FullManifest {
  version: string;
  generatedAt: string;
  worlds: World[];
}

const manifest = fullBundle as FullManifest;
let challengeIndex = new Map<string, Challenge>();
let currentWorlds: World[] = manifest.worlds;

function rebuildIndex(worlds: World[]): void {
  challengeIndex = new Map();
  for (const world of worlds) {
    for (const topic of world.topics) {
      for (const challenge of topic.challenges) {
        challengeIndex.set(challenge.id, challenge);
      }
    }
  }
}
rebuildIndex(currentWorlds);

export function getContentVersion(): string {
  return manifest.version;
}

export function getChallengeCount(): number {
  return challengeIndex.size;
}

export function getWorlds(): World[] {
  return currentWorlds;
}

/** Worlds typed as the progression helpers accept (World or PublicWorld). */
export function getWorldsForProgression(): (World | PublicWorld)[] {
  return currentWorlds;
}

export function findChallenge(id: string): Challenge | undefined {
  return challengeIndex.get(id);
}

/**
 * Test-only seam: substitutes the world set findChallenge/getWorlds resolve
 * from. Used to point handlers at content/_reference in tests, since the
 * shipped bundle deliberately excludes the reference world. Pass undefined
 * to restore the real generated bundle.
 */
export function setWorldsForTests(worlds: World[] | undefined): void {
  currentWorlds = worlds ?? manifest.worlds;
  rebuildIndex(currentWorlds);
}
