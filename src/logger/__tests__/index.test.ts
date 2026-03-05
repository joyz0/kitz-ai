import { describe, it, expect } from 'vitest';
import * as loggerModule from '../index.js';

describe('Logger Index', () => {
  it('should export expected modules', () => {
    expect(loggerModule).toBeDefined();
  });
});
