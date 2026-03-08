import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TUI } from '../tui.js';
import chalk from 'chalk';
import * as prompts from '@clack/prompts';
import { highlight } from 'cli-highlight';
import QRCode from 'qrcode-terminal';

// Mock dependencies
vi.mock('chalk', () => {
  return {
    default: {
      white: vi.fn().mockReturnValue('white text'),
      green: vi.fn().mockReturnValue('green text'),
      red: vi.fn().mockReturnValue('red text'),
      yellow: vi.fn().mockReturnValue('yellow text'),
      cyan: vi.fn().mockReturnValue('cyan text'),
    },
  };
});
vi.mock('@clack/prompts');
vi.mock('cli-highlight');
vi.mock('qrcode-terminal');

const mockChalk = vi.mocked(chalk);
const mockPrompts = vi.mocked(prompts);
const mockHighlight = vi.mocked(highlight);
const mockQRCode = vi.mocked(QRCode);

describe('TUI', () => {
  let tui: TUI;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    mockPrompts.text = vi.fn();
    mockPrompts.confirm = vi.fn();
    mockPrompts.select = vi.fn() as any;
    mockPrompts.password = vi.fn();

    mockHighlight.mockReturnValue('highlighted code');
    mockQRCode.generate = vi.fn();

    // Create TUI instance
    tui = new TUI();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should display info message', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      tui.info('Test info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('white text');
      expect(mockChalk.white).toHaveBeenCalledWith('Test info message');
      consoleLogSpy.mockRestore();
    });
  });

  describe('success', () => {
    it('should display success message', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      tui.success('Test success message');
      expect(consoleLogSpy).toHaveBeenCalledWith('green text');
      expect(mockChalk.green).toHaveBeenCalledWith('Test success message');
      consoleLogSpy.mockRestore();
    });
  });

  describe('error', () => {
    it('should display error message', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      tui.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('red text');
      expect(mockChalk.red).toHaveBeenCalledWith('Test error message');
      consoleErrorSpy.mockRestore();
    });

    it('should display multiple error messages', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      tui.error('Error 1', 'Error 2');
      expect(consoleErrorSpy).toHaveBeenCalledWith('red text', 'Error 2');
      expect(mockChalk.red).toHaveBeenCalledWith('Error 1');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should display warning message', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      tui.warn('Test warning message');
      expect(consoleLogSpy).toHaveBeenCalledWith('yellow text');
      expect(mockChalk.yellow).toHaveBeenCalledWith('Test warning message');
      consoleLogSpy.mockRestore();
    });
  });

  describe('prompt', () => {
    it('should display prompt and return input', async () => {
      const mockInput = 'test input';
      const readlineCreateInterfaceSpy = vi
        .spyOn(require('readline'), 'createInterface')
        .mockReturnValue({
          question: vi.fn((prompt, callback) => callback(mockInput)),
          close: vi.fn(),
        } as any);

      const result = await tui.prompt('> ');

      expect(result).toBe(mockInput);
      readlineCreateInterfaceSpy.mockRestore();
    });
  });

  describe('text', () => {
    it('should display text prompt and return input', async () => {
      const mockInput = 'test text';
      mockPrompts.text.mockResolvedValue(mockInput);

      const result = await tui.text('Enter text:', 'Default');

      expect(result).toBe(mockInput);
      expect(mockPrompts.text).toHaveBeenCalledWith({
        message: 'Enter text:',
        default: 'Default',
      });
    });
  });

  describe('confirm', () => {
    it('should display confirm prompt and return boolean', async () => {
      const mockConfirm = true;
      mockPrompts.confirm.mockResolvedValue(mockConfirm);

      const result = await tui.confirm('Are you sure?');

      expect(result).toBe(mockConfirm);
      expect(mockPrompts.confirm).toHaveBeenCalledWith({
        message: 'Are you sure?',
      });
    });
  });

  describe('select', () => {
    it('should display select prompt and return selected option', async () => {
      const mockOptions = ['Option 1', 'Option 2'];
      const mockSelected = 'Option 1';
      mockPrompts.select.mockResolvedValue(mockSelected);

      const result = await tui.select('Choose an option:', mockOptions);

      expect(result).toBe(mockSelected);
      expect(mockPrompts.select).toHaveBeenCalledWith({
        message: 'Choose an option:',
        options: mockOptions.map((option) => ({
          value: option,
          label: option,
        })),
      });
    });
  });

  describe('password', () => {
    it('should display password prompt and return input', async () => {
      const mockPassword = 'secret';
      mockPrompts.password.mockResolvedValue(mockPassword);

      const result = await tui.password('Enter password:');

      expect(result).toBe(mockPassword);
      expect(mockPrompts.password).toHaveBeenCalledWith({
        message: 'Enter password:',
      });
    });
  });

  describe('code', () => {
    it('should display highlighted code', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const testCode = 'function test() {}';
      tui.code(testCode);
      expect(consoleLogSpy).toHaveBeenCalledWith('highlighted code');
      expect(mockHighlight).toHaveBeenCalledWith(testCode, {
        language: 'typescript',
      });
      consoleLogSpy.mockRestore();
    });
  });

  describe('qrcode', () => {
    it('should generate and display QR code', () => {
      const testData = 'https://kitz.ai';
      tui.qrcode(testData);
      expect(mockQRCode.generate).toHaveBeenCalledWith(
        testData,
        expect.any(Function),
      );
    });
  });
});
