import { getChildLogger } from '../logger/logger.js';

export interface GatewayMessage {
  type: string;
  payload: any;
  timestamp?: number;
  id?: string;
}

export class Protocol {
  private logger = getChildLogger({ name: 'gateway-protocol' });

  constructor() {}

  /**
   * 序列化消息为JSON字符串
   */
  public serialize(message: GatewayMessage): string {
    try {
      const serialized = JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now(),
        id: message.id || this.generateId(),
      });
      return serialized;
    } catch (error) {
      this.logger.error('Error serializing message', error);
      throw new Error('Failed to serialize message');
    }
  }

  /**
   * 解析JSON字符串为消息对象
   */
  public parse(data: string): GatewayMessage {
    try {
      const message = JSON.parse(data);

      // 验证消息格式
      if (!message.type || typeof message.type !== 'string') {
        throw new Error('Invalid message type');
      }

      return message;
    } catch (error) {
      this.logger.error('Error parsing message', error);
      throw new Error('Failed to parse message');
    }
  }

  /**
   * 生成唯一消息ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * 验证消息格式
   */
  public validate(message: GatewayMessage): boolean {
    return typeof message.type === 'string' && message.payload !== undefined;
  }
}
