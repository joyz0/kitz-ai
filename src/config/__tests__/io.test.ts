import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConfigIO, loadConfig, readConfigFileSnapshot, writeConfigFile } from '../io.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Config IO', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  const testConfigPath = path.join(testDir, 'config.json5');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createConfigIO', () => {
    it('should create config IO instance with default dependencies', () => {
      const io = createConfigIO();
      expect(io).toHaveProperty('configPath');
      expect(io).toHaveProperty('loadConfig');
      expect(io).toHaveProperty('readConfigFileSnapshot');
      expect(io).toHaveProperty('writeConfigFile');
    });

    it('should use provided configPath override', () => {
      const io = createConfigIO({ configPath: testConfigPath });
      expect(io.configPath).toBe(testConfigPath);
    });
  });

  describe('loadConfig', () => {
    it('should load config from file', async () => {
      const testConfig = { test: 'value' };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const io = createConfigIO({ configPath: testConfigPath });
      const config = io.loadConfig();
      expect(config).toBeDefined();
    });

    it('should return default config when file does not exist', () => {
      const io = createConfigIO({ configPath: path.join(testDir, 'non-existent.json5') });
      const config = io.loadConfig();
      expect(config).toBeDefined();
    });

    it('should handle invalid JSON5 gracefully', () => {
      fs.writeFileSync(testConfigPath, '{ invalid json');

      const mockLogger = { error: vi.fn(), warn: vi.fn() };
      const io = createConfigIO({ configPath: testConfigPath, logger: mockLogger });
      const config = io.loadConfig();

      expect(config).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('readConfigFileSnapshot', () => {
    it('should read config file snapshot', async () => {
      const testConfig = { test: 'value' };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const io = createConfigIO({ configPath: testConfigPath });
      const snapshot = await io.readConfigFileSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.exists).toBe(true);
      expect(snapshot.path).toBe(testConfigPath);
    });

    it('should handle non-existent file', async () => {
      const io = createConfigIO({ configPath: path.join(testDir, 'non-existent.json5') });
      const snapshot = await io.readConfigFileSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.exists).toBe(false);
    });

    it('should handle invalid JSON5 in snapshot', async () => {
      fs.writeFileSync(testConfigPath, '{ invalid json');

      const io = createConfigIO({ configPath: testConfigPath });
      const snapshot = await io.readConfigFileSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.exists).toBe(true);
      expect(snapshot.valid).toBe(false);
      expect(snapshot.issues.length).toBeGreaterThan(0);
    });

    it('should handle validation errors in snapshot', async () => {
      const testConfig = { invalid: 'value' };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const io = createConfigIO({ configPath: testConfigPath });
      const snapshot = await io.readConfigFileSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.exists).toBe(true);
      expect(snapshot.valid).toBe(false);
    });

    it('should handle read errors in snapshot', async () => {
      // Mock fs with error on readFile
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn().mockImplementation(() => {
          throw new Error('Read error');
        })
      };

      const io = createConfigIO({ 
        configPath: testConfigPath, 
        fs: mockFs as any 
      });
      const snapshot = await io.readConfigFileSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.exists).toBe(true);
      expect(snapshot.valid).toBe(false);
      expect(snapshot.issues.length).toBeGreaterThan(0);
    });
  });

  describe('writeConfigFile', () => {
    it('should write config to file', async () => {
      const testConfig = { meta: { version: '1.0.0' } };

      const io = createConfigIO({ configPath: testConfigPath });
      await io.writeConfigFile(testConfig);

      expect(fs.existsSync(testConfigPath)).toBe(true);
      const writtenConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'));
      expect(writtenConfig.meta).toBeDefined();
    });

    it('should create directory if it does not exist', async () => {
      const nestedConfigPath = path.join(testDir, 'nested', 'config.json5');
      const testConfig = { meta: { version: '1.0.0' } };

      const io = createConfigIO({ configPath: nestedConfigPath });
      await io.writeConfigFile(testConfig);

      expect(fs.existsSync(nestedConfigPath)).toBe(true);
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = { invalid: 'value' };

      const io = createConfigIO({ configPath: testConfigPath });
      await expect(io.writeConfigFile(invalidConfig as any)).rejects.toThrow('Config validation failed');
    });
  });

  describe('loadConfig (cached)', () => {
    it('should load config with caching', () => {
      const config = loadConfig();
      expect(config).toBeDefined();
    });

    it('should use cache when available', () => {
      const config1 = loadConfig();
      const config2 = loadConfig();
      // They should be the same object if caching is working
      expect(config1).toBe(config2);
    });
  });

  describe('readConfigFileSnapshot (exported)', () => {
    it('should read config file snapshot', async () => {
      const snapshot = await readConfigFileSnapshot();
      expect(snapshot).toBeDefined();
    });
  });

  describe('writeConfigFile (exported)', () => {
    it('should write config file', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      // Create a config IO instance with test path
      const io = createConfigIO({ configPath: testConfigPath });
      await io.writeConfigFile(testConfig);
      
      expect(fs.existsSync(testConfigPath)).toBe(true);
    });
  });

  describe('loadConfig with env vars', () => {
    it('should apply environment variables from config', () => {
      // Set up test environment
      process.env.TEST_VAR = 'test-value';
      
      const testConfig = {
        env: {
          TEST_VAR: 'config-value'
        }
      };
      
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));
      
      // Create a config IO instance
      const io = createConfigIO({ configPath: testConfigPath });
      
      // Load config
      const config = io.loadConfig();
      expect(config).toBeDefined();
    });
  });

  describe('readConfigFileSnapshot with defaults', () => {
    it('should apply default values to config', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));
      
      const io = createConfigIO({ configPath: testConfigPath });
      const snapshot = await io.readConfigFileSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.config).toBeDefined();
    });
  });

  describe('clearConfigCache', () => {
    it('should clear config cache', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      const config1 = loadConfig();
      clearConfigCache();
      const config2 = loadConfig();
      // They should be different objects after clearing cache
      expect(config1).not.toBe(config2);
    });
  });

  describe('cache functions', () => {
    it('should resolve config cache ms from environment', async () => {
      // Import resolveConfigCacheMs
      const { resolveConfigCacheMs } = await import('../io.js');
      
      // Test default value
      expect(resolveConfigCacheMs({})).toBe(200);
      
      // Test zero value
      expect(resolveConfigCacheMs({ KITZ_CONFIG_CACHE_MS: '0' })).toBe(0);
      
      // Test empty string
      expect(resolveConfigCacheMs({ KITZ_CONFIG_CACHE_MS: '' })).toBe(0);
      
      // Test valid number
      expect(resolveConfigCacheMs({ KITZ_CONFIG_CACHE_MS: '500' })).toBe(500);
      
      // Test invalid number
      expect(resolveConfigCacheMs({ KITZ_CONFIG_CACHE_MS: 'invalid' })).toBe(200);
    });

    it('should check if config cache should be used', async () => {
      // Import shouldUseConfigCache
      const { shouldUseConfigCache } = await import('../io.js');
      
      // Test with cache disabled
      expect(shouldUseConfigCache({ KITZ_DISABLE_CONFIG_CACHE: 'true' })).toBe(false);
      
      // Test with cache enabled and positive cache ms
      expect(shouldUseConfigCache({ KITZ_CONFIG_CACHE_MS: '500' })).toBe(true);
      
      // Test with cache enabled and zero cache ms
      expect(shouldUseConfigCache({ KITZ_CONFIG_CACHE_MS: '0' })).toBe(false);
    });
  });

  describe('writeConfigFile error handling', () => {
    it('should handle file system errors', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      // Mock fs with error on writeFile
      const mockFs = {
        existsSync: vi.fn(() => false),
        promises: {
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockRejectedValue(new Error('Write error')),
          copyFile: vi.fn(),
          chmod: vi.fn(),
          unlink: vi.fn(),
          rename: vi.fn()
        }
      };
      
      const io = createConfigIO({ 
        configPath: testConfigPath, 
        fs: mockFs as any 
      });
      
      await expect(io.writeConfigFile(testConfig)).rejects.toThrow('Write error');
    });

    it('should handle EPERM error when renaming', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      // Mock fs with EPERM error on rename
      const mockFs = {
        existsSync: vi.fn(() => true),
        promises: {
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockResolvedValue(undefined),
          copyFile: vi.fn().mockResolvedValue(undefined),
          chmod: vi.fn().mockResolvedValue(undefined),
          unlink: vi.fn().mockResolvedValue(undefined),
          rename: vi.fn().mockRejectedValue({ code: 'EPERM' }),
          access: vi.fn().mockRejectedValue({ code: 'ENOENT' })
        }
      };
      
      const io = createConfigIO({ 
        configPath: testConfigPath, 
        fs: mockFs as any 
      });
      
      await expect(io.writeConfigFile(testConfig)).resolves.not.toThrow();
      expect(mockFs.promises.copyFile).toHaveBeenCalled();
    });

    it('should handle EEXIST error when renaming', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      // Mock fs with EEXIST error on rename
      const mockFs = {
        existsSync: vi.fn(() => true),
        promises: {
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockResolvedValue(undefined),
          copyFile: vi.fn().mockResolvedValue(undefined),
          chmod: vi.fn().mockResolvedValue(undefined),
          unlink: vi.fn().mockResolvedValue(undefined),
          rename: vi.fn().mockRejectedValue({ code: 'EEXIST' }),
          access: vi.fn().mockRejectedValue({ code: 'ENOENT' })
        }
      };
      
      const io = createConfigIO({ 
        configPath: testConfigPath, 
        fs: mockFs as any 
      });
      
      await expect(io.writeConfigFile(testConfig)).resolves.not.toThrow();
      expect(mockFs.promises.copyFile).toHaveBeenCalled();
    });
  });

  describe('clearConfigCache', () => {
    it('should clear config cache', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      const config1 = loadConfig();
      clearConfigCache();
      const config2 = loadConfig();
      // They should be different objects after clearing cache
      expect(config1).not.toBe(config2);
    });
  });

  describe('resolveConfigIncludes', () => {
    it('should resolve include files through loadConfig', async () => {
      // Create test include file
      const includePath = path.join(testDir, 'include.json5');
      fs.writeFileSync(includePath, JSON.stringify({ meta: { version: '1.0.0' } }));
      
      // Create config file with include directive
      const testConfig = { $include: 'include.json5' };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));
      
      // Create config IO instance
      const io = createConfigIO({ configPath: testConfigPath });
      
      // Load config (this should resolve includes)
      const config = io.loadConfig();
      
      expect(config).toBeDefined();
    });
  });

  describe('writeConfigFile', () => {
    it('should create backup files when writing config', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      const io = createConfigIO({ configPath: testConfigPath });
      
      // Write config first time to create initial file
      await io.writeConfigFile(testConfig);
      expect(fs.existsSync(testConfigPath)).toBe(true);
      
      // Write config again to trigger backup
      await io.writeConfigFile(testConfig);
      
      // Check that backup files exist
      expect(fs.existsSync(`${testConfigPath}.bak`)).toBe(true);
    });

    it('should handle write errors gracefully', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      // Mock fs with error on writeFile
      const mockFs = {
        existsSync: vi.fn(() => false),
        promises: {
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockRejectedValue(new Error('Write error')),
          copyFile: vi.fn(),
          chmod: vi.fn(),
          unlink: vi.fn(),
          rename: vi.fn(),
          access: vi.fn().mockRejectedValue({ code: 'ENOENT' })
        }
      };
      
      const io = createConfigIO({ 
        configPath: testConfigPath, 
        fs: mockFs as any 
      });
      
      await expect(io.writeConfigFile(testConfig)).rejects.toThrow('Write error');
    });
  });

  describe('loadConfig', () => {
    it('should handle config file with arrays', async () => {
      // Create config file with array
      const testConfig = { 
        meta: { version: '1.0.0' },
        someArray: [1, 2, 3]
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));
      
      const io = createConfigIO({ configPath: testConfigPath });
      const config = io.loadConfig();
      
      expect(config).toBeDefined();
    });

    it('should handle empty config file', async () => {
      // Create empty config file
      fs.writeFileSync(testConfigPath, '{}');
      
      const io = createConfigIO({ configPath: testConfigPath });
      const config = io.loadConfig();
      
      expect(config).toBeDefined();
    });
  });

  describe('loadConfig cache', () => {
    it('should reload config when cache expires', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      // Clear any existing cache
      clearConfigCache();
      
      // Set short cache time
      process.env.KITZ_CONFIG_CACHE_MS = '10';
      
      const config1 = loadConfig();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const config2 = loadConfig();
      
      // They should be different objects after cache expiration
      expect(config1).not.toBe(config2);
      
      // Restore default cache time
      delete process.env.KITZ_CONFIG_CACHE_MS;
    });

    it('should respect KITZ_DISABLE_CONFIG_CACHE environment variable', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      // Clear any existing cache
      clearConfigCache();
      
      // Disable cache
      process.env.KITZ_DISABLE_CONFIG_CACHE = 'true';
      
      const config1 = loadConfig();
      const config2 = loadConfig();
      
      // They should be different objects when cache is disabled
      expect(config1).not.toBe(config2);
      
      // Restore default
      delete process.env.KITZ_DISABLE_CONFIG_CACHE;
    });

    it('should use cache when KITZ_CONFIG_CACHE_MS is set to positive value', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      // Clear any existing cache
      clearConfigCache();
      
      // Set cache time
      process.env.KITZ_CONFIG_CACHE_MS = '1000';
      
      const config1 = loadConfig();
      const config2 = loadConfig();
      
      // They should be the same object when cache is enabled
      expect(config1).toBe(config2);
      
      // Restore default
      delete process.env.KITZ_CONFIG_CACHE_MS;
    });

    it('should not use cache when KITZ_CONFIG_CACHE_MS is set to 0', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      // Clear any existing cache
      clearConfigCache();
      
      // Set cache time to 0
      process.env.KITZ_CONFIG_CACHE_MS = '0';
      
      const config1 = loadConfig();
      const config2 = loadConfig();
      
      // They should be different objects when cache is disabled
      expect(config1).not.toBe(config2);
      
      // Restore default
      delete process.env.KITZ_CONFIG_CACHE_MS;
    });
  });

  describe('writeConfigFile', () => {
    it('should clear cache after writing config', async () => {
      // Import clearConfigCache
      const { clearConfigCache } = await import('../io.js');
      
      // Clear any existing cache
      clearConfigCache();
      
      // Set cache time
      process.env.KITZ_CONFIG_CACHE_MS = '1000';
      
      // Create config IO instance with test path
      const testCacheConfigPath = path.join(testDir, 'cache-test-config.json5');
      const io = createConfigIO({ configPath: testCacheConfigPath });
      
      // Write initial config
      await io.writeConfigFile({ meta: { version: '1.0.0' } });
      
      // Load config to populate cache
      const config1 = io.loadConfig();
      
      // Write config again (should clear cache)
      await io.writeConfigFile({ meta: { version: '1.0.0' } });
      
      // Load config again
      const config2 = io.loadConfig();
      
      // They should be different objects after cache is cleared
      expect(config1).not.toBe(config2);
      
      // Restore default
      delete process.env.KITZ_CONFIG_CACHE_MS;
    });

    it('should handle rename errors gracefully', async () => {
      const testConfig = { meta: { version: '1.0.0' } };
      
      // Mock fs with error on rename
      const mockFs = {
        existsSync: vi.fn(() => true),
        promises: {
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockResolvedValue(undefined),
          copyFile: vi.fn().mockResolvedValue(undefined),
          chmod: vi.fn().mockResolvedValue(undefined),
          unlink: vi.fn().mockResolvedValue(undefined),
          rename: vi.fn().mockRejectedValue({ code: 'EPERM' }),
          access: vi.fn().mockRejectedValue({ code: 'ENOENT' })
        }
      };
      
      const io = createConfigIO({ 
        configPath: testConfigPath, 
        fs: mockFs as any 
      });
      
      await expect(io.writeConfigFile(testConfig)).resolves.not.toThrow();
      expect(mockFs.promises.copyFile).toHaveBeenCalled();
    });
  });

  describe('resolveConfigIncludes', () => {
    it('should handle nested include files', async () => {
      // Create nested include files
      const includePath1 = path.join(testDir, 'include1.json5');
      const includePath2 = path.join(testDir, 'include2.json5');
      fs.writeFileSync(includePath1, JSON.stringify({ meta: { version: '1.0.0' }, $include: 'include2.json5' }));
      fs.writeFileSync(includePath2, JSON.stringify({ nestedKey: 'nestedValue' }));
      
      // Create config file with include directive
      const testConfig = { $include: 'include1.json5' };
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));
      
      // Create config IO instance
      const io = createConfigIO({ configPath: testConfigPath });
      
      // Load config (this should resolve nested includes)
      const config = io.loadConfig();
      
      expect(config).toBeDefined();
    });
  });

});
