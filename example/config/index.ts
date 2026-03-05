// 配置系统使用示例
import {
  loadConfig,
  writeConfigFile,
  OpenClawConfig,
} from '../../src/config/index.js';

// 示例 1: 加载配置
async function exampleLoadConfig() {
  console.log('=== 示例 1: 加载配置 ===');

  // 加载配置（自动应用默认值）
  const config = loadConfig();

  console.log('加载的配置:', JSON.stringify(config, null, 2));
  console.log('日志级别:', config.logging?.level);
  console.log('默认模型:', config.models?.defaults?.primary);
  console.log('会话超时:', config.session?.idleMinutes);
}

// 示例 2: 修改并保存配置
async function exampleWriteConfig() {
  console.log('\n=== 示例 2: 修改并保存配置 ===');

  // 加载当前配置
  const config = loadConfig();

  // 修改配置
  const updatedConfig: OpenClawConfig = {
    ...config,
    logging: {
      ...config.logging,
      level: 'debug', // 更改日志级别
    },
    models: {
      ...config.models,
      defaults: {
        ...config.models?.defaults,
        primary: 'gpt-4o', // 更改默认模型
      },
    },
  };

  // 保存配置
  try {
    await writeConfigFile(updatedConfig);
    console.log('配置保存成功!');

    // 重新加载配置以验证
    const newConfig = loadConfig();
    console.log('更新后的日志级别:', newConfig.logging?.level);
    console.log('更新后的默认模型:', newConfig.models?.defaults?.primary);
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

// 示例 3: 环境变量替换
async function exampleEnvVars() {
  console.log('\n=== 示例 3: 环境变量替换 ===');

  // 模拟环境变量
  process.env.OPENAI_API_KEY = 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  process.env.ANTHROPIC_API_KEY = 'anthropic-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  // 加载配置（会自动替换环境变量）
  const config = loadConfig();

  console.log('配置加载完成，环境变量已自动替换');
  console.log('注意: 实际环境变量值不会在控制台中显示，以保护敏感信息');
}

// 运行示例
async function runExamples() {
  try {
    await exampleLoadConfig();
    await exampleWriteConfig();
    await exampleEnvVars();
  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 执行示例
runExamples();
