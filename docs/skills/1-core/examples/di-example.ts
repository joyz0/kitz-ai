// 依赖注入示例
// 注意：实际代码中可能没有 Container 类，此示例展示了依赖注入的基本概念

// 简单的依赖注入容器实现
class SimpleContainer {
  private services: Map<
    string,
    { factory: Function; singleton: boolean; instance?: any }
  > = new Map();

  // 注册服务
  register(
    name: string,
    factory: Function,
    options: { singleton?: boolean } = {},
  ) {
    this.services.set(name, {
      factory,
      singleton: options.singleton ?? false,
    });
  }

  // 解析服务
  resolve(name: string) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    if (service.singleton && service.instance) {
      return service.instance;
    }

    const instance = service.factory(this);
    if (service.singleton) {
      service.instance = instance;
    }
    return instance;
  }
}

// 创建依赖容器
const container = new SimpleContainer();

// 注册配置依赖
container.register(
  'config',
  () => {
    return {
      port: 3000,
      host: 'localhost',
      database: {
        url: 'mongodb://localhost:27017/app',
      },
    };
  },
  { singleton: true },
);

// 注册日志依赖
container.register(
  'logger',
  (container) => {
    const config = container.resolve('config');
    return {
      info: (message: string, context: any = {}) => {
        console.log(`[INFO] ${message}`, context);
      },
      error: (message: string, context: any = {}) => {
        console.error(`[ERROR] ${message}`, context);
      },
    };
  },
  { singleton: true },
);

// 注册数据库依赖
container.register(
  'database',
  (container) => {
    const config = container.resolve('config');
    const logger = container.resolve('logger');

    logger.info('连接数据库', { url: config.database.url });

    // 模拟数据库连接
    return {
      connect: () => {
        logger.info('数据库连接成功');
        return true;
      },
      disconnect: () => {
        logger.info('数据库连接断开');
        return true;
      },
      query: (sql: string) => {
        logger.info('执行查询', { sql });
        return [{ id: 1, name: 'John Doe' }];
      },
    };
  },
  { singleton: true },
);

// 注册用户服务依赖
container.register(
  'userService',
  (container) => {
    const database = container.resolve('database');
    const logger = container.resolve('logger');

    return {
      getUser: (id: number) => {
        logger.info('获取用户', { id });
        return database.query(`SELECT * FROM users WHERE id = ${id}`);
      },
      createUser: (user: { name: string; email: string }) => {
        logger.info('创建用户', { user });
        return { id: 2, ...user };
      },
    };
  },
  { singleton: false },
);

// 解析依赖
const config = container.resolve('config');
const logger = container.resolve('logger');
const database = container.resolve('database');
const userService1 = container.resolve('userService');
const userService2 = container.resolve('userService');

// 使用依赖
console.log('配置:', config);

// 连接数据库
database.connect();

// 获取用户
const users = userService1.getUser(1);
console.log('用户:', users);

// 创建用户
const newUser = userService2.createUser({
  name: 'Jane Smith',
  email: 'jane@example.com',
});
console.log('新用户:', newUser);

// 检查依赖生命周期
console.log('userService1 === userService2:', userService1 === userService2); // false，因为不是单例

// 断开数据库连接
database.disconnect();

// 依赖注入的核心概念：
// 1. 控制反转：将对象的创建和管理交给容器
// 2. 依赖注入：通过容器注入依赖，而不是硬编码
// 3. 生命周期管理：支持单例和原型模式
// 4. 解耦：模块间通过接口依赖，而不是具体实现
