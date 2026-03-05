import { getLogger, getChildLogger, redactSensitiveText, registerLogTransport } from '../../src/logger/index.js';

// 基本日志使用示例
function basicLoggingExample() {
  console.log('=== 基本日志使用示例 ===');
  const logger = getLogger();
  
  logger.trace('这是一条 trace 级别的日志');
  logger.debug('这是一条 debug 级别的日志');
  logger.info('这是一条 info 级别的日志');
  logger.warn('这是一条 warn 级别的日志');
  logger.error('这是一条 error 级别的日志');
  logger.fatal('这是一条 fatal 级别的日志');
}

// 子系统日志示例
function subsystemLoggingExample() {
  console.log('\n=== 子系统日志示例 ===');
  const authLogger = getChildLogger({ service: 'authentication' });
  const dbLogger = getChildLogger({ service: 'postgresql' });
  
  authLogger.info('用户登录', { userId: '12345', ip: '192.168.1.1' });
  dbLogger.debug('执行查询', { query: 'SELECT * FROM users WHERE id = ?', params: ['12345'] });
  authLogger.error('登录失败', { userId: '12345', error: '密码错误' });
}

// 敏感信息脱敏示例
function sensitiveDataRedactionExample() {
  console.log('\n=== 敏感信息脱敏示例 ===');
  const logger = getLogger();
  
  // 这些信息会被自动脱敏
  logger.info('API 请求', {
    url: 'https://api.example.com',
    headers: {
      Authorization: 'Bearer sk-1234567890abcdefghijklmnopqrstuvwxyz',
      'X-API-Key': 'api_key_1234567890'
    },
    body: {
      username: 'user123',
      password: 'secret_password'
    }
  });
  
  // 直接使用脱敏函数
  const sensitiveText = '我的 API Key 是 sk-1234567890abcdefghijklmnopqrstuvwxyz';
  const redactedText = redactSensitiveText(sensitiveText);
  console.log('原始文本:', sensitiveText);
  console.log('脱敏后文本:', redactedText);
}

// 自定义日志传输示例
function customTransportExample() {
  console.log('\n=== 自定义日志传输示例 ===');
  const logger = getLogger();
  
  // 注册自定义传输
  const unregister = registerLogTransport((logObj) => {
    // 这里可以将日志发送到远程服务、数据库等
    console.log('自定义传输:', JSON.stringify(logObj, null, 2));
  });
  
  logger.info('测试自定义传输', { test: 'data' });
  
  // 取消注册
  unregister();
  logger.info('这条日志不会通过自定义传输发送');
}

// 运行所有示例
async function runExamples() {
  console.log('Logger 系统使用示例\n');
  
  basicLoggingExample();
  subsystemLoggingExample();
  sensitiveDataRedactionExample();
  customTransportExample();
  
  console.log('\n所有示例运行完成!');
}

runExamples().catch(console.error);
