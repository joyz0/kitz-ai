// 日志系统示例
// 注意：实际代码中可能没有 Logger 类，此示例展示了日志系统的基本概念

// 日志级别
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

// 简单的日志系统实现
class SimpleLogger {
  private level: string;
  private context: Record<string, any> = {};

  constructor(options: { level?: string } = {}) {
    this.level = options.level || 'info';
  }

  // 检查日志级别
  private shouldLog(level: string): boolean {
    return LOG_LEVELS[level as keyof typeof LOG_LEVELS] >= LOG_LEVELS[this.level as keyof typeof LOG_LEVELS];
  }

  // 记录日志
  private log(level: string, message: string, context: any = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context }
    };

    console.log(JSON.stringify(logEntry));
  }

  // 调试日志
  debug(message: string, context?: any) {
    this.log('debug', message, context);
  }

  // 信息日志
  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  // 警告日志
  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  // 错误日志
  error(message: string, context?: any) {
    this.log('error', message, context);
  }

  // 致命错误日志
  fatal(message: string, context?: any) {
    this.log('fatal', message, context);
  }

  // 创建子日志器
  child(context: Record<string, any>) {
    const childLogger = new SimpleLogger({ level: this.level });
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  // 设置全局上下文
  setContext(context: Record<string, any>) {
    this.context = { ...this.context, ...context };
  }
}

// 初始化日志系统
const logger = new SimpleLogger({
  level: 'info'
});

// 记录不同级别的日志
logger.debug('调试信息：应用启动中');
logger.info('普通信息：应用启动成功');
logger.warn('警告信息：配置文件未找到，使用默认配置');
logger.error('错误信息：数据库连接失败');

// 记录带上下文的日志
logger.info('用户登录', {
  userId: '12345',
  ip: '192.168.1.1',
  timestamp: new Date().toISOString()
});

// 记录带错误对象的日志
try {
  // 模拟错误
  throw new Error('模拟错误');
} catch (error: any) {
  logger.error('操作失败', { 
    error: error.message,
    stack: error.stack,
    operation: 'test'
  });
}

// 创建子日志器
const userLogger = logger.child({ module: 'user' });
const orderLogger = logger.child({ module: 'order' });

// 使用子日志器
userLogger.info('用户注册', { userId: '12345' });
orderLogger.info('订单创建', { orderId: '67890' });

// 设置全局上下文
logger.setContext({
  appVersion: '1.0.0',
  environment: 'production',
  serverId: 'server-01'
});

// 记录带标记的日志
logger.info('API请求', {
  endpoint: '/api/users',
  method: 'GET',
  status: 200,
  responseTime: 150,
  tags: ['api', 'http', 'success']
});

// 日志系统的核心概念：
// 1. 日志级别：控制日志的详细程度
// 2. 结构化日志：使用 JSON 格式记录日志，便于分析
// 3. 上下文信息：添加额外的上下文信息，便于调试
// 4. 子日志器：创建带有特定上下文的子日志器
// 5. 全局上下文：设置全局共享的上下文信息
