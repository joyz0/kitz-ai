import { loadConfig, writeConfigFile } from '@kitz/core';

// 加载配置
const config = loadConfig();

// 获取配置
const loggingLevel = config.logging?.level || 'info';
const sessionScope = config.session?.scope || 'per-sender';
const primaryModel = config.models?.defaults?.primary || 'gpt-4o';

console.log(`Logging level: ${loggingLevel}`);
console.log(`Session scope: ${sessionScope}`);
console.log(`Primary model: ${primaryModel}`);

// 示例：修改配置并写入
async function updateConfig() {
  try {
    const updatedConfig = {
      ...config,
      logging: {
        ...config.logging,
        level: 'debug',
      },
    };

    await writeConfigFile(updatedConfig);
    console.log('Configuration updated successfully');
  } catch (error) {
    console.error('Failed to update configuration:', error);
  }
}

// 示例：使用环境变量
// 在配置文件中使用 ${VAR_NAME} 格式的环境变量
// 例如：{ "apiKey": "${API_KEY}" }

// 示例：使用 $include 指令合并多个配置文件
// {
//   "$include": ["common.json5", "development.json5"]
// }
