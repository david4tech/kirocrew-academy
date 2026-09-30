#!/usr/bin/env node
/**
 * Validates every authored content pack and emits two bundles:
 *   web/src/generated/content.public.json  challenges without solutions or hint text
 *   api/src/generated/content.full.json    everything, including solutions
 *
 * Run with --include-reference to also validate content/_reference, which is the
 * authoring template and is never shipped.
 * Exits non-zero on the first invalid pack so CI blocks a broken challenge.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const contentDir = join(root, 'content');

const sharedDist = join(root, 'packages/shared/dist/index.js');
if (!existsSync(sharedDist)) {
  console.error('shared package is not built. Run: npm run build:shared');
  process.exit(1);
}
const { worldSchema, CHALLENGE_KINDS } = await import(sharedDist);

const includeReference = process.argv.includes('--include-reference');

function collectPackPaths() {
  const paths = readdirSync(contentDir)
    .filter((f) => /^world-\d+.*\.json$/.test(f))
    .sort()
    .map((f) => join(contentDir, f));

  if (includeReference) {
    const refDir = join(contentDir, '_reference');
    if (existsSync(refDir)) {
      for (const f of readdirSync(refDir).filter((x) => x.endsWith('.json')).sort()) {
        paths.push(join(refDir, f));
      }
    }
  }
  return paths;
}

function formatIssues(issues) {
  return issues
    .map((i) => `    ${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('\n');
}

/** Removes everything the client must not see. */
function toPublicWorld(world) {
  return {
    ...world,
    topics: world.topics.map((topic) => ({
      ...topic,
      challenges: topic.challenges.map((challenge) => {
        const { solution, hints, ...rest } = challenge;
        void solution;
        return { ...rest, hintTiers: hints.length };
      }),
    })),
  };
}

const packPaths = collectPackPaths();
if (packPaths.length === 0) {
  console.warn('no content packs found in content/, emitting empty bundles');
}

const worlds = [];
let failed = false;
const stats = [];

for (const packPath of packPaths) {
  const raw = JSON.parse(readFileSync(packPath, 'utf8'));
  const parsed = worldSchema.safeParse(raw);
  if (!parsed.success) {
    failed = true;
    console.error(`\nFAIL ${packPath}`);
    console.error(formatIssues(parsed.error.issues));
    continue;
  }
  const world = parsed.data;
  const isReference = packPath.includes(`${'_reference'}`);
  if (!isReference) worlds.push(world);

  const challenges = world.topics.flatMap((t) => t.challenges);
  const byKind = Object.fromEntries(
    CHALLENGE_KINDS.map((k) => [k, challenges.filter((c) => c.kind === k).length]),
  );
  stats.push({
    pack: packPath.replace(`${root}/`, ''),
    world: world.id,
    topics: world.topics.length,
    challenges: challenges.length,
    bosses: challenges.filter((c) => c.boss).length,
    roleVariants: challenges.filter((c) => c.roleVariants && Object.keys(c.roleVariants).length > 0).length,
    byKind,
    reference: isReference,
  });
}

// Challenge ids must be unique across the whole shipped set, not just per pack.
const seen = new Map();
for (const world of worlds) {
  for (const topic of world.topics) {
    for (const challenge of topic.challenges) {
      if (seen.has(challenge.id)) {
        failed = true;
        console.error(`FAIL duplicate challenge id ${challenge.id} in ${world.id} and ${seen.get(challenge.id)}`);
      }
      seen.set(challenge.id, world.id);
    }
  }
}

// World order must be a contiguous sequence starting at 1.
const orders = worlds.map((w) => w.order).sort((a, b) => a - b);
orders.forEach((order, index) => {
  if (order !== index + 1) {
    failed = true;
    console.error(`FAIL world order is not contiguous from 1: got ${orders.join(', ')}`);
  }
});

console.log('\nContent summary');
for (const s of stats) {
  const kinds = Object.entries(s.byKind)
    .map(([k, n]) => `${k}=${n}`)
    .join(' ');
  console.log(
    `  ${s.world}${s.reference ? ' (reference)' : ''} topics=${s.topics} challenges=${s.challenges} ` +
      `bosses=${s.bosses} roleVariants=${s.roleVariants}\n    ${kinds}`,
  );
}
console.log(`  total shipped challenges: ${seen.size}`);

if (failed) {
  console.error('\ncontent build failed');
  process.exit(1);
}

const manifestMeta = {
  version: process.env.CONTENT_VERSION ?? `0.1.0+${new Date().toISOString().slice(0, 10)}`,
  generatedAt: new Date().toISOString(),
};

const publicManifest = { ...manifestMeta, worlds: worlds.map(toPublicWorld) };
const fullManifest = { ...manifestMeta, worlds };

const webOut = join(root, 'web/src/generated');
const apiOut = join(root, 'api/src/generated');
mkdirSync(webOut, { recursive: true });
mkdirSync(apiOut, { recursive: true });
writeFileSync(join(webOut, 'content.public.json'), `${JSON.stringify(publicManifest, null, 2)}\n`);
writeFileSync(join(apiOut, 'content.full.json'), `${JSON.stringify(fullManifest, null, 2)}\n`);

// A leaked solution in the public bundle is the one failure mode worth asserting.
const publicText = readFileSync(join(webOut, 'content.public.json'), 'utf8');
if (/"solution"\s*:/.test(publicText) || /"hints"\s*:/.test(publicText)) {
  console.error('FAIL public bundle contains solution or hint data');
  process.exit(1);
}

console.log(`\nwrote ${join('web/src/generated', 'content.public.json')} and ${join('api/src/generated', 'content.full.json')}`);
