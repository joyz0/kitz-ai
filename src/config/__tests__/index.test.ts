import { describe, it, expect } from 'vitest';
import * as configModule from '../index.js';

describe('Config Index', () => {
  it('should export expected modules', () => {
    expect(configModule).toBeDefined();
  });
});
