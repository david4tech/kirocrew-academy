import { describe, expect, it } from 'vitest';
import { buildRoutePath } from './api';

describe('buildRoutePath', () => {
  it('builds a path with no params', () => {
    expect(buildRoutePath('GET_ME')).toBe('/me');
  });

  it('substitutes a single path param', () => {
    expect(buildRoutePath('START_ATTEMPT', { challengeId: 'w1.t2.c3' })).toBe('/challenges/w1.t2.c3/start');
  });

  it('url encodes path param values', () => {
    expect(buildRoutePath('SUBMIT_ATTEMPT', { challengeId: 'w1 t2/c3' })).toBe(
      '/challenges/w1%20t2%2Fc3/attempt',
    );
  });

  it('builds the hint route with its param', () => {
    expect(buildRoutePath('REVEAL_HINT', { challengeId: 'w2.t1.c9' })).toBe('/challenges/w2.t1.c9/hint');
  });

  it('leaves a route with no params untouched when params are passed anyway', () => {
    expect(buildRoutePath('GET_LEADERBOARD', {})).toBe('/leaderboard');
  });
});
