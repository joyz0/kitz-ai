import { describe, it, expect, beforeEach } from 'vitest';
import { BackoffStrategy, createBackoffStrategy, ExponentialBackoff, FixedBackoff, LinearBackoff } from '../backoff.js';

describe('Backoff Strategies', () => {
  describe('ExponentialBackoff', () => {
    let backoff: BackoffStrategy;

    beforeEach(() => {
      backoff = new ExponentialBackoff({ baseDelay: 100, maxDelay: 1000, jitter: 0 });
    });

    it('should create exponential backoff instance', () => {
      expect(backoff).toBeInstanceOf(ExponentialBackoff);
    });

    it('should return exponentially increasing delays', () => {
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(backoff.next());
      }

      expect(delays[0]).toBe(100); // 100 * 2^0
      expect(delays[1]).toBe(200); // 100 * 2^1
      expect(delays[2]).toBe(400); // 100 * 2^2
      expect(delays[3]).toBe(800); // 100 * 2^3
      expect(delays[4]).toBe(1000); // 达到最大延迟
    });

    it('should respect max delay', () => {
      for (let i = 0; i < 10; i++) {
        const delay = backoff.next();
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });

    it('should reset attempts', () => {
      backoff.next();
      backoff.next();
      expect(backoff.getAttempts()).toBe(2);
      backoff.reset();
      expect(backoff.getAttempts()).toBe(0);
      const delay = backoff.next();
      expect(delay).toBe(100); // 重置后应该从基础延迟开始
    });

    it('should apply jitter', () => {
      const jitterBackoff = new ExponentialBackoff({ baseDelay: 100, jitter: 0.1 });
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(jitterBackoff.next());
      }

      // 检查延迟是否在预期范围内（±10%）
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[0]).toBeLessThanOrEqual(110);
      expect(delays[1]).toBeGreaterThanOrEqual(180);
      expect(delays[1]).toBeLessThanOrEqual(220);
    });
  });

  describe('FixedBackoff', () => {
    let backoff: BackoffStrategy;

    beforeEach(() => {
      backoff = new FixedBackoff(500);
    });

    it('should create fixed backoff instance', () => {
      expect(backoff).toBeInstanceOf(FixedBackoff);
    });

    it('should return fixed delay', () => {
      for (let i = 0; i < 5; i++) {
        const delay = backoff.next();
        expect(delay).toBe(500);
      }
    });

    it('should track attempts', () => {
      for (let i = 0; i < 3; i++) {
        backoff.next();
      }
      expect(backoff.getAttempts()).toBe(3);
    });

    it('should reset attempts', () => {
      backoff.next();
      backoff.next();
      expect(backoff.getAttempts()).toBe(2);
      backoff.reset();
      expect(backoff.getAttempts()).toBe(0);
    });

    it('should use default delay when not specified', () => {
      const defaultBackoff = new FixedBackoff();
      const delay = defaultBackoff.next();
      expect(delay).toBe(1000);
    });
  });

  describe('LinearBackoff', () => {
    let backoff: BackoffStrategy;

    beforeEach(() => {
      backoff = new LinearBackoff({ baseDelay: 100, maxDelay: 500 });
    });

    it('should create linear backoff instance', () => {
      expect(backoff).toBeInstanceOf(LinearBackoff);
    });

    it('should return linearly increasing delays', () => {
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(backoff.next());
      }

      expect(delays[0]).toBe(100); // 100 * 1
      expect(delays[1]).toBe(200); // 100 * 2
      expect(delays[2]).toBe(300); // 100 * 3
      expect(delays[3]).toBe(400); // 100 * 4
      expect(delays[4]).toBe(500); // 达到最大延迟
    });

    it('should respect max delay', () => {
      for (let i = 0; i < 10; i++) {
        const delay = backoff.next();
        expect(delay).toBeLessThanOrEqual(500);
      }
    });

    it('should reset attempts', () => {
      backoff.next();
      backoff.next();
      expect(backoff.getAttempts()).toBe(2);
      backoff.reset();
      expect(backoff.getAttempts()).toBe(0);
      const delay = backoff.next();
      expect(delay).toBe(100); // 重置后应该从基础延迟开始
    });

    it('should use default values when not specified', () => {
      const defaultBackoff = new LinearBackoff();
      const delay = defaultBackoff.next();
      expect(delay).toBe(1000);
    });
  });

  describe('createBackoffStrategy', () => {
    it('should create exponential backoff', () => {
      const backoff = createBackoffStrategy('exponential');
      expect(backoff).toBeInstanceOf(ExponentialBackoff);
    });

    it('should create fixed backoff', () => {
      const backoff = createBackoffStrategy('fixed', { delay: 500 });
      expect(backoff).toBeInstanceOf(FixedBackoff);
    });

    it('should create linear backoff', () => {
      const backoff = createBackoffStrategy('linear');
      expect(backoff).toBeInstanceOf(LinearBackoff);
    });

    it('should create exponential backoff by default', () => {
      const backoff = createBackoffStrategy('unknown' as any);
      expect(backoff).toBeInstanceOf(ExponentialBackoff);
    });
  });
});
