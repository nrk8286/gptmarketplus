import { describe, expect, it } from 'vitest';
import { getGptModels, getPredictionMarkets } from './database';

// D1 bind() replaces the statement's parameter set; it never appends to it.
function database() {
  const executed: { query: string; values: unknown[] }[] = [];
  const db = {
    prepare(query: string) {
      const statement = (values: unknown[] = []) => ({
        bind: (...next: unknown[]) => statement(next),
        async first() { executed.push({ query, values }); return { count: 3 }; },
        async all() { executed.push({ query, values }); return { results: [] }; },
      });
      return statement();
    },
  } as unknown as D1Database;
  return { db, executed };
}

describe('model query bindings', () => {
  it('keeps every filter when binding pagination', async () => {
    const { db, executed } = database();
    const result = await getGptModels(db, { category: 'coding', isPublic: true, isFeatured: true, creatorId: 'creator', limit: 5, offset: 10 });
    expect(result.total).toBe(3);
    expect(executed.map(({ values }) => values)).toEqual([
      ['coding', 1, 1, 'creator'], ['coding', 1, 1, 'creator', 5, 10],
    ]);
  });

  it('supports queries without filters', async () => {
    const { db, executed } = database();
    await getGptModels(db);
    expect(executed.map(({ values }) => values)).toEqual([[], [20, 0]]);
  });

  it('keeps market filters together with pagination', async () => {
    const { db, executed } = database();
    await getPredictionMarkets(db, { category: 'technology', status: 'open', isFeatured: true, limit: 7, offset: 14 });
    expect(executed.map(({ values }) => values)).toEqual([
      ['technology', 'open', 1], ['technology', 'open', 1, 7, 14],
    ]);
  });
});
