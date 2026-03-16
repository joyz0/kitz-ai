import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConfigRuntimeRefreshError,
  setRuntimeConfigSnapshot,
  clearRuntimeConfigSnapshot,
  getRuntimeConfigSnapshot,
  getRuntimeConfigSourceSnapshot,
  projectConfigOntoRuntimeSourceSnapshot,
  setRuntimeConfigSnapshotRefreshHandler,
  getRuntimeConfigSnapshotRefreshHandler,
  applyConfigOverrides,
} from '../runtime-overrides.js';
import type { OpenClawConfig } from '../zod-schema.js';

describe('Runtime Overrides', () => {
  beforeEach(() => {
    clearRuntimeConfigSnapshot();
  });

  describe('applyConfigOverrides', () => {
    it('should return the config as-is when no overrides are applied', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };
      const result = applyConfigOverrides(config);
      expect(result).toEqual(config);
    });
  });

  describe('setRuntimeConfigSnapshot', () => {
    it('should set the runtime config snapshot', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };
      const sourceConfig: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      setRuntimeConfigSnapshot(config, sourceConfig);
      expect(getRuntimeConfigSnapshot()).toEqual(config);
      expect(getRuntimeConfigSourceSnapshot()).toEqual(sourceConfig);
    });

    it('should set the runtime config snapshot without source config', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      setRuntimeConfigSnapshot(config);
      expect(getRuntimeConfigSnapshot()).toEqual(config);
      expect(getRuntimeConfigSourceSnapshot()).toBeNull();
    });
  });

  describe('clearRuntimeConfigSnapshot', () => {
    it('should clear the runtime config snapshot', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      setRuntimeConfigSnapshot(config);
      expect(getRuntimeConfigSnapshot()).toEqual(config);

      clearRuntimeConfigSnapshot();
      expect(getRuntimeConfigSnapshot()).toBeNull();
      expect(getRuntimeConfigSourceSnapshot()).toBeNull();
    });
  });

  describe('projectConfigOntoRuntimeSourceSnapshot', () => {
    it('should return the original config when no runtime snapshot exists', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      const result = projectConfigOntoRuntimeSourceSnapshot(config);
      expect(result).toEqual(config);
    });

    it('should return the source snapshot when config is the same as runtime snapshot', () => {
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };
      const sourceConfig: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
      };

      setRuntimeConfigSnapshot(config, sourceConfig);
      const result = projectConfigOntoRuntimeSourceSnapshot(config);
      expect(result).toEqual(sourceConfig);
    });

    it('should project config onto source snapshot', () => {
      const runtimeSnapshot: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
        logging: {
          level: 'info',
        },
      };
      const sourceConfig: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
        logging: {
          level: 'info',
        },
      };
      const config: OpenClawConfig = {
        meta: {
          version: '1.0.0',
        },
        logging: {
          level: 'debug',
        },
      };

      setRuntimeConfigSnapshot(runtimeSnapshot, sourceConfig);
      const result = projectConfigOntoRuntimeSourceSnapshot(config);
      expect(result.logging?.level).toBe('debug');
    });
  });

  describe('setRuntimeConfigSnapshotRefreshHandler', () => {
    it('should set and get the refresh handler', () => {
      const refreshHandler = {
        refresh: vi.fn().mockResolvedValue(true),
      };

      const oldHandler = setRuntimeConfigSnapshotRefreshHandler(refreshHandler);
      expect(oldHandler).toBeNull();
      expect(getRuntimeConfigSnapshotRefreshHandler()).toEqual(refreshHandler);

      const newHandler = {
        refresh: vi.fn().mockResolvedValue(true),
      };
      const previousHandler = setRuntimeConfigSnapshotRefreshHandler(newHandler);
      expect(previousHandler).toEqual(refreshHandler);
      expect(getRuntimeConfigSnapshotRefreshHandler()).toEqual(newHandler);
    });

    it('should clear the refresh handler when setting null', () => {
      const refreshHandler = {
        refresh: vi.fn().mockResolvedValue(true),
      };

      setRuntimeConfigSnapshotRefreshHandler(refreshHandler);
      expect(getRuntimeConfigSnapshotRefreshHandler()).toEqual(refreshHandler);

      setRuntimeConfigSnapshotRefreshHandler(null);
      expect(getRuntimeConfigSnapshotRefreshHandler()).toBeNull();
    });
  });

  describe('ConfigRuntimeRefreshError', () => {
    it('should create an error with the correct name', () => {
      const error = new ConfigRuntimeRefreshError('Test error');
      expect(error.name).toBe('ConfigRuntimeRefreshError');
      expect(error.message).toBe('Test error');
    });

    it('should create an error with a cause', () => {
      const cause = new Error('Cause error');
      const error = new ConfigRuntimeRefreshError('Test error', { cause });
      expect(error.name).toBe('ConfigRuntimeRefreshError');
      expect(error.message).toBe('Test error');
      expect((error as any).cause).toBe(cause);
    });
  });
});
