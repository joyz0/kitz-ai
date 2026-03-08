import { getChildLogger, type Logger } from '../logger/logger.js';
import { CommandManager } from './commands.js';
import { TUI } from './tui.js';

export class HelpSystem {
  private logger: Logger;
  private commandManager: CommandManager;
  private tui: TUI;

  constructor(commandManager: CommandManager) {
    this.logger = getChildLogger({ name: 'help-system' });
    this.commandManager = commandManager;
    this.tui = new TUI();
  }

  /**
   * 显示帮助信息
   */
  public showHelp(commandName?: string): void {
    if (commandName) {
      this.showCommandHelp(commandName);
    } else {
      this.showGeneralHelp();
    }
  }

  /**
   * 显示通用帮助信息
   */
  private showGeneralHelp(): void {
    this.tui.info('Kitz AI CLI');
    this.tui.info('============');
    this.tui.info('');
    this.tui.info('A command-line interface for Kitz AI gateway.');
    this.tui.info('');
    this.tui.info('Usage:');
    this.tui.info('  kitz [command] [args] [options]');
    this.tui.info('');
    this.tui.info('Available Commands:');
    this.tui.info('');

    // 获取所有命令
    const commands = this.commandManager.getCommands();
    commands.sort((a, b) => a.name.localeCompare(b.name));

    commands.forEach((command) => {
      this.tui.info(`  ${command.name.padEnd(15)} ${command.description}`);
      if (command.aliases && command.aliases.length > 0) {
        this.tui.info(`    Aliases: ${command.aliases.join(', ')}`);
      }
    });

    this.tui.info('');
    this.tui.info('Options:');
    this.tui.info('  --help, -h    Show help');
    this.tui.info('  --version, -v Show version');
    this.tui.info('');
    this.tui.info('Examples:');
    this.tui.info('  kitz help                Show this help message');
    this.tui.info(
      '  kitz start --port 8080   Start gateway server on port 8080',
    );
    this.tui.info('  kitz status              Check system status');
  }

  /**
   * 显示命令帮助信息
   */
  private showCommandHelp(commandName: string): void {
    const command = this.commandManager.getCommand(commandName);
    if (!command) {
      this.tui.error(`Command not found: ${commandName}`);
      this.showGeneralHelp();
      return;
    }

    this.tui.info(`Command: ${command.name}`);
    this.tui.info(`Description: ${command.description}`);

    if (command.aliases && command.aliases.length > 0) {
      this.tui.info(`Aliases: ${command.aliases.join(', ')}`);
    }

    this.tui.info('');
    this.tui.info('Usage:');
    this.tui.info(`  kitz ${command.name} [args] [options]`);
    this.tui.info('');

    // 显示命令特定的帮助信息
    this.showCommandSpecificHelp(command.name);
  }

  /**
   * 显示命令特定的帮助信息
   */
  private showCommandSpecificHelp(commandName: string): void {
    switch (commandName) {
      case 'start':
        this.tui.info('Options:');
        this.tui.info('  --port, -p    Port to listen on (default: 8080)');
        this.tui.info('  --host, -h    Host to listen on (default: 0.0.0.0)');
        this.tui.info('');
        this.tui.info('Example:');
        this.tui.info('  kitz start --port 3000');
        break;
      case 'stop':
        this.tui.info('Example:');
        this.tui.info('  kitz stop');
        break;
      case 'status':
        this.tui.info('Example:');
        this.tui.info('  kitz status');
        break;
      default:
        break;
    }
  }

  /**
   * 显示版本信息
   */
  public showVersion(): void {
    try {
      const version = require('../../package.json').version;
      this.tui.info(`Kitz AI CLI v${version}`);
    } catch (error) {
      this.tui.info('Kitz AI CLI');
    }
  }
}
