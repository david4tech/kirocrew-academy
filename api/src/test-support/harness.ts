/**
 * Wires the fake repository and the reference world into the content/
 * repository test seams, so handler tests exercise real logic end to end
 * without DynamoDB or the shipped content bundle.
 */

import { beforeEach, afterEach } from 'vitest';
import { setRepositoryForTests, type Repository } from '../lib/repository.js';
import { setWorldsForTests } from '../lib/content.js';
import { createFakeRepository } from './fake-repository.js';
import { loadReferenceWorld } from './reference-world.js';

export function useTestHarness(): { repo: () => Repository } {
  let repo: Repository;

  beforeEach(() => {
    repo = createFakeRepository();
    setRepositoryForTests(repo);
    setWorldsForTests([loadReferenceWorld()]);
  });

  afterEach(() => {
    setRepositoryForTests(undefined);
    setWorldsForTests(undefined);
  });

  return { repo: () => repo };
}
