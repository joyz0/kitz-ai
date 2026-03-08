import { describe, it, expect, beforeEach, vi } from 'vitest';
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from '../../../logger/mock-logger.js';
import { GeminiProvider } from '../gemini.js';

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

// 模拟 fetch
global.fetch = vi.fn();

describe('GeminiProvider', () => {
  let geminiProvider: GeminiProvider;
  const mockConfig = {
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    geminiProvider = new GeminiProvider(mockConfig);
  });

  it('should create GeminiProvider instance', () => {
    expect(geminiProvider).toBeDefined();
  });

  it('should return provider name', () => {
    expect(geminiProvider.getName()).toBe('gemini');
  });

  it('should generate text successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'gemini-pro',
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello, world!' }],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geminiProvider.generate('Hello', {
      model: 'gemini-pro',
    });

    expect(result).toEqual({
      success: true,
      text: 'Hello, world!',
      metadata: {
        model: 'gemini-pro',
        finishReason: 'STOP',
        safetyRatings: [],
        executionTime: expect.any(Number),
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=test-api-key',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'Hello' }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
          model: 'gemini-pro',
        }),
      }),
    );
  });

  it('should handle generate text error', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: {
          message: 'API error',
        },
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geminiProvider.generate('Hello', {
      model: 'gemini-pro',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API error');
    expect(result.metadata.executionTime).toBeDefined();
  });

  it('should handle generate text network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await geminiProvider.generate('Hello', {
      model: 'gemini-pro',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(result.metadata.executionTime).toBeDefined();
  });

  it('should embed text successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geminiProvider.embed('Hello', {
      model: 'embedding-001',
    });

    expect(result).toEqual({
      success: true,
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        model: 'embedding-001',
        executionTime: expect.any(Number),
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key=test-api-key',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/embedding-001',
          content: {
            parts: [{ text: 'Hello' }],
          },
        }),
      }),
    );
  });

  it('should handle embed text error', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: {
          message: 'API error',
        },
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geminiProvider.embed('Hello', {
      model: 'embedding-001',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API error');
    expect(result.metadata.executionTime).toBeDefined();
  });

  it('should get models successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        models: [
          { name: 'models/gemini-pro' },
          { name: 'models/embedding-001' },
        ],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geminiProvider.getModels();

    expect(result).toEqual(['gemini-pro', 'embedding-001']);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1/models?key=test-api-key',
      expect.objectContaining({}),
    );
  });

  it('should handle get models error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await geminiProvider.getModels();

    expect(result).toEqual([]);
  });

  it('should check availability successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        models: [{ name: 'models/gemini-pro' }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geminiProvider.isAvailable();

    expect(result).toBe(true);
  });

  it('should handle availability check error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await geminiProvider.isAvailable();

    expect(result).toBe(false);
  });
});
