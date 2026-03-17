// 测试 Model Catalog 模块的功能

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadModelCatalog, modelSupportsVision, modelSupportsDocument, findModelInCatalog, resetModelCatalogCacheForTest } from '../catalog.js';

describe('Model Catalog 模块测试', () => {
  beforeEach(() => {
    resetModelCatalogCacheForTest();
  });

  afterEach(() => {
    resetModelCatalogCacheForTest();
  });

  describe('loadModelCatalog', () => {
    it('应该返回模型目录数组', async () => {
      const catalog = await loadModelCatalog({ useCache: false });
      expect(Array.isArray(catalog)).toBe(true);
    });

    it('应该使用缓存', async () => {
      const catalog1 = await loadModelCatalog();
      const catalog2 = await loadModelCatalog();
      expect(catalog1).toBe(catalog2);
    });
  });

  describe('modelSupportsVision', () => {
    it('应该返回 true（如果模型支持视觉）', () => {
      const entry = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test-provider',
        input: ['text', 'image'],
      };
      const result = modelSupportsVision(entry);
      expect(result).toBe(true);
    });

    it('应该返回 false（如果模型不支持视觉）', () => {
      const entry = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test-provider',
        input: ['text'],
      };
      const result = modelSupportsVision(entry);
      expect(result).toBe(false);
    });

    it('应该返回 false（如果 entry 为 undefined）', () => {
      const result = modelSupportsVision(undefined);
      expect(result).toBe(false);
    });
  });

  describe('modelSupportsDocument', () => {
    it('应该返回 true（如果模型支持文档）', () => {
      const entry = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test-provider',
        input: ['text', 'document'],
      };
      const result = modelSupportsDocument(entry);
      expect(result).toBe(true);
    });

    it('应该返回 false（如果模型不支持文档）', () => {
      const entry = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test-provider',
        input: ['text'],
      };
      const result = modelSupportsDocument(entry);
      expect(result).toBe(false);
    });

    it('应该返回 false（如果 entry 为 undefined）', () => {
      const result = modelSupportsDocument(undefined);
      expect(result).toBe(false);
    });
  });

  describe('findModelInCatalog', () => {
    it('应该返回找到的模型（如果存在）', () => {
      const catalog = [
        {
          id: 'test-model',
          name: 'Test Model',
          provider: 'test-provider',
        },
        {
          id: 'another-model',
          name: 'Another Model',
          provider: 'another-provider',
        },
      ];
      const result = findModelInCatalog(catalog, 'test-provider', 'test-model');
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-model');
    });

    it('应该返回 undefined（如果不存在）', () => {
      const catalog = [
        {
          id: 'test-model',
          name: 'Test Model',
          provider: 'test-provider',
        },
      ];
      const result = findModelInCatalog(catalog, 'test-provider', 'non-existent-model');
      expect(result).toBeUndefined();
    });
  });
});
