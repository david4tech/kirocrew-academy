#!/usr/bin/env node
// Bundles each contractual handler into its own Lambda-ready ESM file.
// Explicit entry list, not a glob, so a *.test.ts file never gets bundled.
//
// content.ts resolves its JSON bundle relative to import.meta.url, one
// directory up (see api/src/lib/content.ts). To keep that logic correct both
// unbundled (src/lib -> src/generated) and bundled, handlers are emitted to
// dist/handlers/ (mirroring src/handlers/) and the content bundle is copied
// to dist/generated/ (mirroring src/generated/), preserving the same "one
// directory up" relationship on both sides.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, copyFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const handlers = ['health', 'me', 'progress', 'attempt', 'hint', 'leaderboard', 'daily'];

await build({
  entryPoints: handlers.map((name) => join(root, 'src', 'handlers', `${name}.ts`)),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: join(root, 'dist', 'handlers'),
  outExtension: { '.js': '.mjs' },
});

const generatedOut = join(root, 'dist', 'generated');
mkdirSync(generatedOut, { recursive: true });
copyFileSync(
  join(root, 'src', 'generated', 'content.full.json'),
  join(generatedOut, 'content.full.json'),
);

console.log(`built ${handlers.length} handlers to dist/handlers/, content bundle copied to dist/generated/`);
