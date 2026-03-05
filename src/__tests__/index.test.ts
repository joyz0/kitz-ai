import { describe, it, expect } from 'vitest';
import * as index from '../index.js';

describe('Core Module', () => {
  describe('Index exports', () => {
    it('should export expected modules', () => {
      expect(index).toBeDefined();
      // Add specific export tests here if needed
    });
  });
});
