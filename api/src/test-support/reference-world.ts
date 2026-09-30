/**
 * Loads content/_reference/world-00-reference.json through the shared zod
 * schema, the same validation the content build applies, so tests exercise
 * real authored data instead of hand-rolled fixtures.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { worldSchema, type World } from '@kirocrew-academy/shared';

const here = dirname(fileURLToPath(import.meta.url));
const referencePath = join(here, '..', '..', '..', 'content', '_reference', 'world-00-reference.json');

export function loadReferenceWorld(): World {
  const raw = JSON.parse(readFileSync(referencePath, 'utf8'));
  const parsed = worldSchema.parse(raw);
  return parsed as World;
}
