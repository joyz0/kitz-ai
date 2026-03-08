import { getChildLogger, type Logger } from '../logger/logger.js';

export interface ParsedArgs {
  command?: string;
  args: string[];
  options: Record<string, any>;
  help?: boolean;
  version?: boolean;
}

export class ArgsParser {
  private logger: Logger;

  constructor() {
    this.logger = getChildLogger({ name: 'args-parser' });
  }

  /**
   * 解析命令行参数
   */
  public parse(args: string[]): ParsedArgs {
    const result: ParsedArgs = {
      args: [],
      options: {},
    };

    let commandFound = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // 处理选项
      if (arg.startsWith('--')) {
        const optionName = arg.substring(2);
        if (optionName === 'help') {
          result.help = true;
        } else if (optionName === 'version') {
          result.version = true;
        } else {
          // 检查下一个参数是否是值
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            result.options[optionName] = args[i + 1];
            i++;
          } else {
            result.options[optionName] = true;
          }
        }
      } else if (arg.startsWith('-')) {
        const optionName = arg.substring(1);
        if (optionName === 'h') {
          result.help = true;
        } else if (optionName === 'v') {
          result.version = true;
        } else {
          result.options[optionName] = true;
        }
      } else if (!commandFound) {
        // 第一个非选项参数是命令
        result.command = arg;
        commandFound = true;
      } else {
        // 其他非选项参数是命令参数
        result.args.push(arg);
      }
    }

    return result;
  }

  /**
   * 分词输入字符串
   */
  public tokenize(input: string): string[] {
    const tokens: string[] = [];
    let currentToken = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
      } else if (char === ' ' && !inQuotes) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }

    if (currentToken) {
      tokens.push(currentToken);
    }

    return tokens;
  }

  /**
   * 验证参数
   */
  public validate(args: ParsedArgs, requiredArgs: string[] = []): boolean {
    if (requiredArgs.length > 0 && args.args.length < requiredArgs.length) {
      this.logger.warn(
        `Missing required arguments: ${requiredArgs.slice(args.args.length).join(', ')}`,
      );
      return false;
    }
    return true;
  }
}
