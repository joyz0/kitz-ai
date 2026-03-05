import { describe, it, expect, vi } from 'vitest';
import { redactSensitiveText, redactToolDetail, getDefaultRedactPatterns } from '../redact.js';

describe('Logger Redact', () => {
  describe('redactSensitiveText', () => {
    it('should redact sensitive information', () => {
      const testText = 'API key: sk-1234567890abcdef, password="mysecret"';
      const redacted = redactSensitiveText(testText);
      expect(redacted).not.toContain('sk-1234567890abcdef');
      expect(redacted).not.toContain('mysecret');
    });

    it('should redact bearer tokens', () => {
      const testText = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = redactSensitiveText(testText);
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact PEM blocks', () => {
      const testText = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ\n-----END PRIVATE KEY-----';
      const redacted = redactSensitiveText(testText);
      expect(redacted).toContain('-----BEGIN PRIVATE KEY-----');
      expect(redacted).toContain('…redacted…');
      expect(redacted).toContain('-----END PRIVATE KEY-----');
    });

    it('should redact short PEM blocks', () => {
      const testText = '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----';
      const redacted = redactSensitiveText(testText);
      expect(redacted).toContain('-----BEGIN PRIVATE KEY-----');
      expect(redacted).toContain('…redacted…');
      expect(redacted).toContain('-----END PRIVATE KEY-----');
    });

    it('should not modify non-sensitive text', () => {
      const testText = 'Hello world, this is a test';
      const redacted = redactSensitiveText(testText);
      expect(redacted).toBe(testText);
    });

    it('should handle empty string', () => {
      const redacted = redactSensitiveText('');
      expect(redacted).toBe('');
    });

    it('should respect redact mode', () => {
      const testText = 'API key: sk-1234567890abcdef';
      const redacted = redactSensitiveText(testText, { mode: 'off' });
      expect(redacted).toBe(testText);
    });

    it('should handle empty patterns', () => {
      const testText = 'API key: sk-1234567890abcdef';
      const redacted = redactSensitiveText(testText, { patterns: [] });
      expect(redacted).toBe(testText);
    });

    it('should handle invalid patterns', () => {
      const testText = 'API key: sk-1234567890abcdef';
      const redacted = redactSensitiveText(testText, { patterns: ['[invalid-regex'] });
      expect(redacted).toBe(testText);
    });

    it('should handle regex patterns with flags', () => {
      const testText = 'API key: SK-1234567890ABCDEF';
      const redacted = redactSensitiveText(testText, { patterns: ['/SK-[A-Z0-9]{8,}/i'] });
      expect(redacted).not.toContain('SK-1234567890ABCDEF');
    });

    it('should handle empty pattern strings', () => {
      const testText = 'API key: sk-1234567890abcdef';
      const redacted = redactSensitiveText(testText, { patterns: ['', '   '] });
      expect(redacted).toBe(testText);
    });

    it('should handle null and undefined inputs', () => {
      expect(redactSensitiveText(null as any)).toBe(null);
      expect(redactSensitiveText(undefined as any)).toBe(undefined);
    });
  });

  describe('redactToolDetail', () => {
    it('should redact tool details', () => {
      const testDetail = 'API key: sk-1234567890abcdef';
      const redacted = redactToolDetail(testDetail);
      expect(redacted).not.toContain('sk-1234567890abcdef');
    });

    it('should not redact when mode is off', async () => {
      // Mock resolveLoggingConfig to return mode 'off'
      const configModule = await import('../config.js');
      vi.spyOn(configModule, 'resolveLoggingConfig').mockReturnValue({ redactSensitive: 'off' });
      const testDetail = 'API key: sk-1234567890abcdef';
      const redacted = redactToolDetail(testDetail);
      expect(redacted).toBe(testDetail);
      vi.restoreAllMocks();
    });
  });

  describe('getDefaultRedactPatterns', () => {
    it('should return default redact patterns', () => {
      const patterns = getDefaultRedactPatterns();
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return a copy of default patterns', () => {
      const patterns1 = getDefaultRedactPatterns();
      const patterns2 = getDefaultRedactPatterns();
      expect(patterns1).not.toBe(patterns2);
      expect(patterns1).toEqual(patterns2);
    });
  });
});
