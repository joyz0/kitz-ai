import { WebSocketServer } from 'ws';
import { getChildLogger } from '../logger/logger.js';
import { Protocol } from './protocol.js';
import { AuthManager } from './auth.js';
import { EventManager } from './events.js';

export class GatewayServer {
  private wss: WebSocketServer;
  private logger = getChildLogger({ name: 'gateway-server' });
  private protocol: Protocol;
  private authManager: AuthManager;
  private eventManager: EventManager;

  constructor(private port: number = 8080) {
    this.protocol = new Protocol();
    this.authManager = new AuthManager();
    this.eventManager = new EventManager();
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    try {
      this.wss.on('connection', (ws: any, req: any) => {
        this.logger.info('New connection established');

        ws.on('message', (message: any) => {
          this.handleMessage(ws, message);
        });

        ws.on('close', () => {
          this.logger.info('Connection closed');
        });

        ws.on('error', (error: Error) => {
          this.logger.error('Connection error', error);
        });
      });

      this.wss.on('error', (error: Error) => {
        this.logger.error('Server error', error);
      });

      this.wss.on('listening', () => {
        this.logger.info(`Gateway server listening on port ${this.port}`);
      });
    } catch (error) {
      this.logger.error('Error setting up event handlers', error);
    }
  }

  private async handleMessage(ws: any, message: Buffer): Promise<void> {
    try {
      const data = this.protocol.parse(message.toString());

      // 验证认证
      if (!(await this.authManager.authenticate(data))) {
        ws.send(
          this.protocol.serialize({
            type: 'error',
            payload: { message: 'Unauthorized' },
          }),
        );
        return;
      }

      // 处理事件
      const response = await this.eventManager.handleEvent(data);
      ws.send(this.protocol.serialize(response));
    } catch (error) {
      this.logger.error('Error handling message', error);
      if (ws && typeof ws.send === 'function') {
        ws.send(
          this.protocol.serialize({
            type: 'error',
            payload: { message: 'Internal server error' },
          }),
        );
      }
    }
  }

  public start(): void {
    this.logger.info('Starting gateway server...');
  }

  public stop(): void {
    this.logger.info('Stopping gateway server...');
    this.wss.close();
  }
}
