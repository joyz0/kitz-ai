import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLIProgram } from '../program.js';
import { CommandManager } from '../commands.js';
import { HelpSystem } from '../help.js';
import { TUI } from '../tui.js';
import { getMockLogger, resetMockLogger } from '../../logger/mock-logger.js';

// Mock dependencies
vi.mock('../commands.js');
vi.mock('../help.js');
vi.mock('../tui.js');
vi.mock('../../package.json', () => ({
  version: '1.0.0',
}));

const mockCommandManager = vi.mocked(CommandManager);
const mockHelpSystem = vi.mocked(HelpSystem);
const mockTUI = vi.mocked(TUI);

describe('CLIProgram', () => {
  let cliProgram: CLIProgram;
  let mockCommandManagerInstance: any;
  let mockHelpSystemInstance: any;
  let mockTUIInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockLogger();

    // Create mock instances
    mockCommandManagerInstance = {
      executeCommand: vi.fn(),
      registerCommand: vi.fn(),
    };
    mockHelpSystemInstance = {
      showHelp: vi.fn(),
    };
    mockTUIInstance = {
      info: vi.fn(),
      error: vi.fn(),
      prompt: vi.fn(),
      success: vi.fn(),
    };

    // Set up mock constructors
    mockCommandManager.mockImplementation(function () {
      return mockCommandManagerInstance;
    });
    mockHelpSystem.mockImplementation(function () {
      return mockHelpSystemInstance;
    });
    mockTUI.mockImplementation(function () {
      return mockTUIInstance;
    });

    // Create CLIProgram instance
    cliProgram = new CLIProgram();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize all dependencies', () => {
      expect(mockCommandManager).toHaveBeenCalledTimes(1);
      expect(mockHelpSystem).toHaveBeenCalledTimes(1);
      expect(mockTUI).toHaveBeenCalledTimes(1);
    });
  });

  describe('run', () => {
    it('should execute commands successfully', async () => {
      await cliProgram.run(['status']);
      expect(mockCommandManagerInstance.executeCommand).toHaveBeenCalledWith(
        'status',
        [],
        {},
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      mockCommandManagerInstance.executeCommand.mockRejectedValue(error);

      await cliProgram.run(['status']);

      expect(mockTUIInstance.error).toHaveBeenCalledWith(
        'An error occurred:',
        'Test error',
      );
      expect(mockHelpSystemInstance.showHelp).toHaveBeenCalled();
    });
  });

  describe('startInteractiveMode', () => {
    it('should start interactive mode and handle commands', async () => {
      // Mock prompt responses
      mockTUIInstance.prompt
        .mockResolvedValueOnce('status')
        .mockResolvedValueOnce('exit');
      mockCommandManagerInstance.executeCommand.mockResolvedValue(undefined);

      await cliProgram.startInteractiveMode();

      expect(mockTUIInstance.info).toHaveBeenCalledWith(
        'Starting interactive mode...',
      );
      expect(mockTUIInstance.info).toHaveBeenCalledWith(
        'Type help for available commands, exit to quit',
      );
      expect(mockCommandManagerInstance.executeCommand).toHaveBeenCalledWith(
        'status',
        [],
        expect.any(Object),
      );
      expect(mockTUIInstance.info).toHaveBeenCalledWith('Exiting...');
    });

    it('should handle empty input', async () => {
      // Mock prompt responses
      mockTUIInstance.prompt
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('exit');

      await cliProgram.startInteractiveMode();

      expect(mockTUIInstance.prompt).toHaveBeenCalledTimes(2);
      expect(mockTUIInstance.info).toHaveBeenCalledWith('Exiting...');
    });

    it('should handle quit command', async () => {
      // Mock prompt responses
      mockTUIInstance.prompt.mockResolvedValueOnce('quit');

      await cliProgram.startInteractiveMode();

      expect(mockTUIInstance.info).toHaveBeenCalledWith('Exiting...');
    });

    it('should handle errors in interactive mode', async () => {
      // Mock prompt responses
      const error = new Error('Interactive error');
      mockTUIInstance.prompt
        .mockResolvedValueOnce('status')
        .mockResolvedValueOnce('exit');
      mockCommandManagerInstance.executeCommand.mockRejectedValue(error);

      await cliProgram.startInteractiveMode();

      expect(mockTUIInstance.error).toHaveBeenCalledWith(
        'Error:',
        'Interactive error',
      );
    });
  });

  describe('registerCommand', () => {
    it('should register a custom command', () => {
      const handler = vi.fn();
      cliProgram.registerCommand('test', 'Test command', handler);

      expect(mockCommandManagerInstance.registerCommand).toHaveBeenCalledWith(
        'test',
        'Test command',
        handler,
      );
    });
  });
});
