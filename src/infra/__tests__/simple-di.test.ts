import { describe, it, expect } from 'vitest';
import {
  createFactory,
  createDefaults,
  normalizeDependencies,
  Injectable,
  type ExtractDeps,
} from '../simple-di.js';

describe('Simple DI', () => {
  describe('createDefaults', () => {
    it('should create dependency config with defaults', () => {
      const defaults = { foo: 'bar', baz: 123 };
      const config = createDefaults(defaults);
      expect(config.defaults).toEqual(defaults);
      expect(config.validate).toBeUndefined();
    });
  });

  describe('normalizeDependencies', () => {
    it('should merge overrides with defaults', () => {
      const defaults = { foo: 'bar', baz: 123 };
      const overrides = { foo: 'override' };
      const config = createDefaults(defaults);

      const normalized = normalizeDependencies(overrides, config);
      expect(normalized).toEqual({ foo: 'override', baz: 123 });
    });

    it('should use defaults when no overrides provided', () => {
      const defaults = { foo: 'bar', baz: 123 };
      const config = createDefaults(defaults);

      const normalized = normalizeDependencies({}, config);
      expect(normalized).toEqual(defaults);
    });

    it('should validate dependencies when validate function is provided', () => {
      const defaults = { foo: 'bar', baz: 123 };
      const config = {
        defaults,
        validate: (deps: { foo: string; baz: number }) => deps.baz > 100,
      };

      const normalized = normalizeDependencies({}, config);
      expect(normalized).toEqual(defaults);
    });

    it('should throw error when validation fails', () => {
      const defaults = { foo: 'bar', baz: 99 };
      const config = {
        defaults,
        validate: (deps: { foo: string; baz: number }) => deps.baz > 100,
      };

      expect(() => normalizeDependencies({}, config)).toThrow('依赖项验证失败');
    });
  });

  describe('createFactory', () => {
    it('should create factory function with dependency injection', () => {
      const factory = (deps: { foo: string; baz: number }) => {
        return deps.foo + deps.baz;
      };
      const config = createDefaults({ foo: 'bar', baz: 123 });

      const diFactory = createFactory(factory, config);
      const result = diFactory();
      expect(result).toBe('bar123');
    });

    it('should allow overriding dependencies', () => {
      const factory = (deps: { foo: string; baz: number }) => {
        return deps.foo + deps.baz;
      };
      const config = createDefaults({ foo: 'bar', baz: 123 });

      const diFactory = createFactory(factory, config);
      const result = diFactory({ foo: 'override' });
      expect(result).toBe('override123');
    });
  });

  describe('Injectable decorator', () => {
    it('should return the same constructor', () => {
      class TestClass {
        constructor() {}
      }

      const decorated = Injectable(TestClass);
      expect(decorated).toBe(TestClass);
    });
  });

  describe('ExtractDeps type', () => {
    it('should extract dependency type from factory function', () => {
      const factory = (deps: { foo: string; baz: number }) => {
        return deps.foo + deps.baz;
      };

      // This is a type test, so we just verify the code compiles
      type Deps = ExtractDeps<typeof factory>;
      const deps: Deps = { foo: 'bar', baz: 123 };
      expect(deps).toEqual({ foo: 'bar', baz: 123 });
    });
  });
});
