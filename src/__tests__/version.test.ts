import { describe, it, expect } from 'vitest';
import { VERSION } from '../version.js';

describe('Version Module', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
