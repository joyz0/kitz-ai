import { describe, it, expect, beforeEach, vi } from 'vitest';
// 导入 mock-logger 以确保 logger 模块被正确模拟
import { getMockLogger } from '../../../logger/mock-logger.js';
import { OpenAIProvider } from '../openai.js';

// 获取 mock logger 实例（确保 mock 生效）
const mockLogger = getMockLogger();

// 模拟 fetch
global.fetch = vi.fn();

describe('OpenAIProvider', () => {
  let openaiProvider: OpenAIProvider;
  const mockConfig = {
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    openaiProvider = new OpenAIProvider(mockConfig);
  });

  it('should create OpenAIProvider instance', () => {
    expect(openaiProvider).toBeDefined();
  });

  it('should return provider name', () => {
    expect(openaiProvider.getName()).toBe('openai');
  });

  it('should generate text successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: { content: 'Hello, world!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await openaiProvider.generate('Hello', {
      model: 'gpt-3.5-turbo',
    });

    expect(result).toEqual({
      success: true,
      text: 'Hello, world!',
      metadata: {
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
        finishReason: 'stop',
        executionTime: expect.any(Number),
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 1000,
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

    const result = await openaiProvider.generate('Hello', {
      model: 'gpt-3.5-turbo',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API error');
    expect(result.metadata.executionTime).toBeDefined();
  });

  it('should handle generate text network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await openaiProvider.generate('Hello', {
      model: 'gpt-3.5-turbo',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(result.metadata.executionTime).toBeDefined();
  });

  it('should embed text successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'text-embedding-ada-002',
        data: [
          {
            embedding: [0.1, 0.2, 0.3],
          },
        ],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await openaiProvider.embed('Hello', {
      model: 'text-embedding-ada-002',
    });

    expect(result).toEqual({
      success: true,
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        model: 'text-embedding-ada-002',
        usage: { prompt_tokens: 10, total_tokens: 10 },
        executionTime: expect.any(Number),
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: 'Hello',
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

    const result = await openaiProvider.embed('Hello', {
      model: 'text-embedding-ada-002',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API error');
    expect(result.metadata.executionTime).toBeDefined();
  });

  it('should get models successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 'gpt-3.5-turbo' }, { id: 'gpt-4' }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await openaiProvider.getModels();

    expect(result).toEqual(['gpt-3.5-turbo', 'gpt-4']);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      }),
    );
  });

  it('should handle get models error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await openaiProvider.getModels();

    expect(result).toEqual([]);
  });

  it('should check availability successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 'gpt-3.5-turbo' }],
      }),
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await openaiProvider.isAvailable();

    expect(result).toBe(true);
  });

  it('should handle availability check error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const result = await openaiProvider.isAvailable();

    expect(result).toBe(false);
  });
});
