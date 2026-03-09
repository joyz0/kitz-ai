import { getChildLogger } from "../logger/logger.js";
import type { GatewayMessage } from "./protocol.js";

type EventHandler = (payload: any) => Promise<any>;

export class EventManager {
  private logger = getChildLogger({ name: "gateway-events" });
  private eventHandlers: Map<string, EventHandler>;

  constructor() {
    this.eventHandlers = new Map<string, EventHandler>();
    this.registerDefaultHandlers();
  }

  /**
   * 注册默认事件处理器
   */
  private registerDefaultHandlers(): void {
    this.registerHandler("ping", async (payload) => {
      return { message: "pong" };
    });

    this.registerHandler("echo", async (payload) => {
      return { message: payload.message };
    });
  }

  /**
   * 注册事件处理器
   */
  public registerHandler(eventType: string, handler: EventHandler): void {
    try {
      const isExisting = this.eventHandlers.has(eventType);
      this.eventHandlers.set(eventType, handler);
      if (!isExisting) {
        this.logger.info(`Registered handler for event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error("Error registering event handler", error);
    }
  }

  /**
   * 处理事件
   */
  public async handleEvent(message: GatewayMessage): Promise<GatewayMessage> {
    try {
      const { type, payload } = message;

      const handler = this.eventHandlers.get(type);

      if (!handler) {
        this.logger.warn(`No handler found for event type: ${type}`);
        return {
          type: "error",
          payload: { message: `Unknown event type: ${type}` },
        };
      }

      const result = await handler(payload);

      return {
        type: `${type}_response`,
        payload: result,
      };
    } catch (error) {
      this.logger.error("Error handling event", error);
      return {
        type: "error",
        payload: { message: "Failed to handle event" },
      };
    }
  }

  /**
   * 获取已注册的事件类型
   */
  public getRegisteredEventTypes(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  /**
   * 移除事件处理器
   */
  public removeHandler(eventType: string): void {
    this.eventHandlers.delete(eventType);
    this.logger.info(`Removed handler for event type: ${eventType}`);
  }
}
