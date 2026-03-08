import readline from 'readline';
import { getChildLogger } from '../logger/logger.js';
import chalk from 'chalk';
import * as prompts from '@clack/prompts';
import { highlight } from 'cli-highlight';
import QRCode from 'qrcode-terminal';

export class TUI {
  private logger = getChildLogger({ name: 'tui' });
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * 显示信息
   */
  public info(message: string): void {
    console.log(chalk.white(message));
  }

  /**
   * 显示错误
   */
  public error(message: string, ...args: any[]): void {
    console.error(chalk.red(message), ...args);
  }

  /**
   * 显示警告
   */
  public warn(message: string, ...args: any[]): void {
    console.warn(chalk.yellow(message), ...args);
  }

  /**
   * 显示成功信息
   */
  public success(message: string, ...args: any[]): void {
    console.log(chalk.green(message), ...args);
  }

  /**
   * 显示强调信息
   */
  public highlight(message: string, ...args: any[]): void {
    console.log(chalk.cyan(message), ...args);
  }

  /**
   * 显示提示
   */
  public prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(question), (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * 显示确认提示
   */
  public async confirm(
    question: string,
    defaultAnswer: boolean = true,
  ): Promise<boolean> {
    const result = await prompts.confirm({
      message: question,
      initialValue: defaultAnswer,
    });
    return result as boolean;
  }

  /**
   * 显示选择提示
   */
  public async select(question: string, options: string[]): Promise<string> {
    const result = await prompts.select({
      message: question,
      options: options.map((option, index) => ({
        value: option,
        label: option,
      })),
    });
    return result as string;
  }

  /**
   * 显示文本输入提示
   */
  public async text(
    question: string,
    placeholder: string = '',
  ): Promise<string> {
    const result = await prompts.text({
      message: question,
      placeholder,
    });
    return result as string;
  }

  /**
   * 显示密码输入提示
   */
  public async password(question: string): Promise<string> {
    const result = await prompts.password({
      message: question,
    });
    return result as string;
  }

  /**
   * 显示代码高亮
   */
  public code(code: string, language: string = 'typescript'): void {
    console.log(highlight(code, { language }));
  }

  /**
   * 显示二维码
   */
  public qrcode(data: string): void {
    QRCode.generate(data, { small: true });
  }

  /**
   * 清除屏幕
   */
  public clear(): void {
    console.clear();
  }

  /**
   * 显示进度条
   */
  public showProgress(progress: number, total: number, message: string): void {
    const percentage = Math.round((progress / total) * 100);
    const barLength = 50;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);

    process.stdout.write(`\r${message}: [${bar}] ${percentage}%`);

    if (progress === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * 关闭TUI
   */
  public close(): void {
    this.rl.close();
  }
}
