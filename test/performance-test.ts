#!/usr/bin/env tsx

// 性能测试脚本

import { getLogger } from '../src/logger/logger.js';
import { loadConfig } from '../src/config/io.js';

console.log('开始性能测试...');

// 测试日志系统性能
async function testLoggerPerformance() {
  console.log('\n=== 测试日志系统性能 ===');

  const logger = getLogger();
  const startTime = Date.now();
  const logCount = 10000;

  console.log(`写入 ${logCount} 条日志...`);

  for (let i = 0; i < logCount; i++) {
    logger.info(`测试日志 ${i}`, { test: 'performance', index: i });
  }

  // 等待日志缓冲刷新
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`完成时间: ${duration}ms`);
  console.log(`每秒日志数: ${Math.round(logCount / (duration / 1000))}`);
}

// 测试配置系统性能
function testConfigPerformance() {
  console.log('\n=== 测试配置系统性能 ===');

  const startTime = Date.now();
  const loadCount = 1000;

  console.log(`加载配置 ${loadCount} 次...`);

  for (let i = 0; i < loadCount; i++) {
    loadConfig();
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`完成时间: ${duration}ms`);
  console.log(`每秒加载次数: ${Math.round(loadCount / (duration / 1000))}`);
}

// 运行测试
async function runTests() {
  await testLoggerPerformance();
  testConfigPerformance();
  console.log('\n性能测试完成！');
}

runTests().catch(console.error);
