import { getChildLogger } from '../logger/logger.js';
import { TUI } from './tui.js';
import chalk from 'chalk';

type CommandHandler = (args: string[], options: any) => Promise<void>;

export interface Command {
  name: string;
  description: string;
  handler: CommandHandler;
  aliases?: string[];
}

export class CommandManager {
  private logger = getChildLogger({ name: 'command-manager' });
  private commands: Map<string, Command>;
  private tui: TUI;

  constructor() {
    this.commands = new Map<string, Command>();
    this.tui = new TUI();
    this.registerDefaultCommands();
  }

  /**
   * 注册默认命令
   */
  private registerDefaultCommands(): void {
    // 帮助命令
    this.registerCommand('help', '显示帮助信息', async (args) => {
      const commandName = args[0];
      this.showHelp(commandName);
    });

    // 版本命令
    this.registerCommand(
      'version',
      '显示版本信息',
      async () => {
        try {
          const version = require('../../package.json').version;
          this.tui.success(`Kitz AI CLI v${version}`);
        } catch (error) {
          this.tui.info('Kitz AI CLI');
        }
      },
      ['v', 'ver'],
    );

    // 状态命令
    this.registerCommand('status', '显示系统状态', async () => {
      this.tui.info(chalk.bold('System Status:'));
      this.tui.success('  ✅ CLI is running');
      this.tui.success('  ✅ Core modules loaded');
      this.tui.info('  ℹ️  Ready to use');
    });

    // 启动网关命令
    this.registerCommand('start', '启动网关服务器', async (args, options) => {
      const port = options.port || 8080;
      const host = options.host || '0.0.0.0';
      this.tui.info(`Starting gateway server on ${host}:${port}...`);
      this.tui.success('Server started successfully');
    });

    // 停止网关命令
    this.registerCommand('stop', '停止网关服务器', async () => {
      this.tui.info('Stopping gateway server...');
      this.tui.success('Server stopped successfully');
    });

    // 二维码生成命令
    this.registerCommand(
      'qrcode',
      '生成二维码',
      async (args) => {
        const data = args.join(' ') || 'https://kitz.ai';
        this.tui.info(`Generating QR code for: ${data}`);
        this.tui.qrcode(data);
      },
      ['qr'],
    );

    // 代码高亮命令
    this.registerCommand('code', '显示代码高亮', async () => {
      const code = `function hello() {\n  console.log('Hello, Kitz AI!');\n  return 'Welcome to the future!';\n}`;
      this.tui.info('TypeScript code example:');
      this.tui.code(code);
    });

    // 交互式示例命令
    this.registerCommand(
      'interactive',
      '启动交互式示例',
      async () => {
        this.tui.info('Interactive Example');
        this.tui.info('==================');

        // 文本输入
        const name = await this.tui.text(
          'What is your name?',
          'Enter your name',
        );
        this.tui.success(`Hello, ${name}!`);

        // 确认
        const confirm = await this.tui.confirm('Do you want to continue?');
        if (!confirm) {
          this.tui.info('Exiting...');
          return;
        }

        // 选择
        const choice = await this.tui.select('Choose an option:', [
          'Option 1',
          'Option 2',
          'Option 3',
        ]);
        this.tui.info(`You chose: ${choice}`);

        this.tui.success('Interactive example completed!');
      },
      ['i'],
    );
  }

  /**
   * 注册命令
   */
  public registerCommand(
    name: string,
    description: string,
    handler: CommandHandler,
    aliases: string[] = [],
  ): void {
    const command: Command = {
      name,
      description,
      handler,
      aliases,
    };

    this.commands.set(name, command);

    // 注册别名
    aliases.forEach((alias) => {
      this.commands.set(alias, command);
    });

    this.logger.info(`Registered command: ${name}`);
  }

  /**
   * 执行命令
   */
  public async executeCommand(
    name: string,
    args: string[],
    options: any,
  ): Promise<void> {
    const command = this.commands.get(name);

    if (!command) {
      this.tui.error(`Command not found: ${name}`);
      this.showHelp();
      return;
    }

    try {
      this.logger.debug(`Executing command: ${name} with args:`, args);
      await command.handler(args, options);
    } catch (error) {
      this.logger.error(`Error executing command ${name}:`, error);
      this.tui.error(
        `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 显示帮助信息
   */
  public showHelp(commandName?: string): void {
    if (commandName) {
      const command = this.commands.get(commandName);
      if (command) {
        this.tui.info(`Command: ${command.name}`);
        this.tui.info(`Description: ${command.description}`);
        if (command.aliases && command.aliases.length > 0) {
          this.tui.info(`Aliases: ${command.aliases.join(', ')}`);
        }
      } else {
        this.tui.error(`Command not found: ${commandName}`);
        this.showHelp();
      }
    } else {
      this.tui.info('Available Commands:');
      this.tui.info('');

      // 按命令名排序
      const sortedCommands = Array.from(this.commands.entries())
        .filter(([key, command]) => key === command.name) // 只显示主命令，不显示别名
        .sort(([a], [b]) => a.localeCompare(b));

      sortedCommands.forEach(([_, command]) => {
        this.tui.info(`  ${command.name.padEnd(15)} ${command.description}`);
        if (command.aliases && command.aliases.length > 0) {
          this.tui.info(`    Aliases: ${command.aliases.join(', ')}`);
        }
      });

      this.tui.info('');
      this.tui.info('Options:');
      this.tui.info('  --help, -h    Show help');
      this.tui.info('  --version, -v Show version');
    }
  }

  /**
   * 获取所有命令
   */
  public getCommands(): Command[] {
    return Array.from(this.commands.entries())
      .filter(([key, command]) => key === command.name)
      .map(([_, command]) => command);
  }

  /**
   * 检查命令是否存在
   */
  public hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * 获取命令
   */
  public getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }
}
