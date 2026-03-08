import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandManager } from '../commands.js';
import { TUI } from '../tui.js';
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';

// Mock dependencies
vi.mock('../tui.js');
vi.mock('../../package.json', () => ({
  version: '1.0.0',
}));

const mockTUI = vi.mocked(TUI);

describe('CommandManager', () => {
  let commandManager: CommandManager;
  let mockTUIInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create mock TUI instance
    mockTUIInstance = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      qrcode: vi.fn(),
      code: vi.fn(),
      text: vi.fn(),
      confirm: vi.fn(),
      select: vi.fn(),
    };

    // Set up mock TUI constructor
    mockTUI.mockImplementation(function () {
      return mockTUIInstance;
    });

    // Create CommandManager instance
    commandManager = new CommandManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize and register default commands', () => {
      expect(mockTUI).toHaveBeenCalledTimes(1);

      // Check that default commands are registered
      expect(commandManager.hasCommand('help')).toBe(true);
      expect(commandManager.hasCommand('version')).toBe(true);
      expect(commandManager.hasCommand('status')).toBe(true);
      expect(commandManager.hasCommand('start')).toBe(true);
      expect(commandManager.hasCommand('stop')).toBe(true);
      expect(commandManager.hasCommand('qrcode')).toBe(true);
      expect(commandManager.hasCommand('code')).toBe(true);
      expect(commandManager.hasCommand('interactive')).toBe(true);
    });
  });

  describe('registerCommand', () => {
    it('should register a new command', () => {
      const handler = vi.fn();
      commandManager.registerCommand('test', 'Test command', handler);

      expect(commandManager.hasCommand('test')).toBe(true);
      expect(commandManager.getCommand('test')).toBeDefined();
    });

    it('should register command aliases', () => {
      const handler = vi.fn();
      commandManager.registerCommand('test', 'Test command', handler, [
        't',
        'testing',
      ]);

      expect(commandManager.hasCommand('test')).toBe(true);
      expect(commandManager.hasCommand('t')).toBe(true);
      expect(commandManager.hasCommand('testing')).toBe(true);
    });
  });

  describe('executeCommand', () => {
    it('should execute a registered command', async () => {
      const handler = vi.fn();
      commandManager.registerCommand('test', 'Test command', handler);

      await commandManager.executeCommand('test', ['arg1', 'arg2'], {
        option: 'value',
      });

      expect(handler).toHaveBeenCalledWith(['arg1', 'arg2'], {
        option: 'value',
      });
    });

    it('should handle non-existent command', async () => {
      await commandManager.executeCommand('non-existent', [], {});

      expect(mockTUIInstance.error).toHaveBeenCalledWith(
        'Command not found: non-existent',
      );
    });

    it('should handle command execution errors', async () => {
      const error = new Error('Command error');
      const handler = vi.fn().mockRejectedValue(error);
      commandManager.registerCommand('test', 'Test command', handler);

      await commandManager.executeCommand('test', [], {});

      expect(mockTUIInstance.error).toHaveBeenCalledWith(
        'Error executing command: Command error',
      );
    });
  });

  describe('showHelp', () => {
    it('should show help for all commands', () => {
      commandManager.showHelp();

      expect(mockTUIInstance.info).toHaveBeenCalledWith('Available Commands:');
    });

    it('should show help for a specific command', () => {
      const handler = vi.fn();
      commandManager.registerCommand('test', 'Test command', handler, ['t']);

      commandManager.showHelp('test');

      expect(mockTUIInstance.info).toHaveBeenCalledWith('Command: test');
      expect(mockTUIInstance.info).toHaveBeenCalledWith(
        'Description: Test command',
      );
      expect(mockTUIInstance.info).toHaveBeenCalledWith('Aliases: t');
    });

    it('should handle non-existent command in showHelp', () => {
      commandManager.showHelp('non-existent');

      expect(mockTUIInstance.error).toHaveBeenCalledWith(
        'Command not found: non-existent',
      );
    });
  });

  describe('getCommands', () => {
    it('should return all registered commands', () => {
      const commands = commandManager.getCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('hasCommand', () => {
    it('should return true for existing command', () => {
      expect(commandManager.hasCommand('help')).toBe(true);
    });

    it('should return false for non-existent command', () => {
      expect(commandManager.hasCommand('non-existent')).toBe(false);
    });
  });

  describe('getCommand', () => {
    it('should return command for existing command', () => {
      const command = commandManager.getCommand('help');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    it('should return undefined for non-existent command', () => {
      const command = commandManager.getCommand('non-existent');
      expect(command).toBeUndefined();
    });
  });
});
