import WebSocket from 'ws';
import { getChildLogger } from '../logger/logger.js';
import { Protocol,  type GatewayMessage } from './protocol.js';

type MessageHandler = (message: GatewayMessage) => void;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private logger = getChildLogger({ name: 'gateway-client' });
  private protocol: Protocol;
  private messageHandlers: Map<string, MessageHandler[]>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private url: string,
    private token: string,
  ) {
    this.protocol = new Protocol();
    this.messageHandlers = new Map<string, MessageHandler[]>();
    // 初始化时不创建WebSocket实例，只在connect时创建
  }

  /**
   * 获取WebSocket实例（用于测试）
   */
  public getWebSocket(): WebSocket | null {
    return this.ws;
  }

  /**
   * 连接到网关服务器
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.logger.info('Connected to gateway server');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (message: any) => {
          this.handleMessage(message);
        });

        this.ws.on('close', () => {
          this.logger.info('Disconnected from gateway server');
          this.attemptReconnect();
        });

        this.ws.on('error', (error: Error) => {
          this.logger.error('WebSocket error', error);
          reject(error);
        });
      } catch (error) {
        this.logger.error('Failed to connect', error);
        reject(error);
      }
    });
  }

  /**
   * 发送消息到服务器
   */
  public send(type: string, payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot send message: not connected');
      return;
    }

    const message: GatewayMessage = {
      type,
      payload: {
        ...payload,
        token: this.token,
      },
    };

    try {
      const serialized = this.protocol.serialize(message);
      this.ws.send(serialized);
    } catch (error) {
      this.logger.error('Error sending message', error);
    }
  }

  /**
   * 注册消息处理器
   */
  public on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(handler);
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: Buffer): void {
    try {
      const parsed = this.protocol.parse(message.toString());
      const handlers = this.messageHandlers.get(parsed.type) || [];

      handlers.forEach((handler) => {
        try {
          handler(parsed);
        } catch (error) {
          this.logger.error('Error in message handler', error);
        }
      });
    } catch (error) {
      this.logger.error('Error handling message', error);
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    // 对于测试，使用固定的延迟时间，确保测试能够正确验证
    const delay = this.reconnectDelay;

    this.logger.info(
      `Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error('Reconnect failed', error);
      });
    }, delay);
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    try {
      return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    } catch (error) {
      this.logger.error('Error checking connection status', error);
      return false;
    }
  }

  /**
   * 手动设置WebSocket实例（用于测试）
   */
  public setWebSocket(ws: WebSocket): void {
    this.ws = ws;
  }
}
