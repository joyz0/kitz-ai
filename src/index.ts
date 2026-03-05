// 依赖注入配置
import { createFactory, createDefaults } from "./infra/simple-di.js";
import * as configModule from "./config/index.js";
import * as loggerModule from "./logger/index.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";

// 安装未处理拒绝处理器
installUnhandledRejectionHandler();

// 定义依赖类型
interface AppDeps {
  configModule: typeof configModule;
  loggerModule: typeof loggerModule;
}

// 创建依赖默认值
const appDefaults = createDefaults<AppDeps>({
  configModule,
  loggerModule,
});

// 创建应用服务工厂
const createAppServices = createFactory((deps: AppDeps) => {
  // 创建服务实例
  const loggerInstance = deps.loggerModule.getLogger();

  return {
    config: deps.configModule,
    logger: deps.loggerModule,
    loggerInstance,
  };
}, appDefaults);

export { createAppServices };
export type { AppDeps };
