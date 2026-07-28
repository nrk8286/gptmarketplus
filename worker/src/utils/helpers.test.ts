import { describe, expect, it } from 'vitest';

import {
  getPaginationParams,
  validateEmail,
  validateUsername,
} from './helpers.js';

describe('getPaginationParams', () => {
  it('normalizes valid pagination values', () => {
    expect(getPaginationParams({ page: '3', limit: '25' })).toEqual({
      page: 3,
      limit: 25,
      offset: 50,
    });
  });

  it('uses safe defaults for invalid values and clamps limits', () => {
    expect(getPaginationParams({ page: 'not-a-number', limit: 'invalid' })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });
    expect(getPaginationParams({ page: '-4', limit: '500' })).toEqual({
      page: 1,
      limit: 100,
      offset: 0,
    });
  });
});

describe('account field validation', () => {
  it('accepts expected email and username formats', () => {
    expect(validateEmail('buyer@example.com')).toBe(true);
    expect(validateUsername('buyer_2026')).toBe(true);
  });

  it('rejects malformed email and username values', () => {
    expect(validateEmail('buyer@example')).toBe(false);
    expect(validateUsername('no spaces allowed')).toBe(false);
  });
});
