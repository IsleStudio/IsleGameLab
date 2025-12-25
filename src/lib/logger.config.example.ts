/**
 * 日志配置示例文件
 *
 * 你可以在应用入口或需要调试的地方引入此配置
 */

import { configureLogger, Level } from './logger';

/**
 * 开发环境配置
 * 显示所有日志，便于调试
 */
export function setupDevelopmentLogging(): void {
  configureLogger({
    minLevel: Level.DEBUG,
    enableTimestamp: true,
    enableColor: true,
  });
}

/**
 * 生产环境配置
 * 只显示警告和错误
 */
export function setupProductionLogging(): void {
  configureLogger({
    minLevel: Level.WARN,
    enableTimestamp: false,
    enableColor: false,
  });
}

/**
 * 调试特定功能 - 渲染系统
 */
export function debugRendering(): void {
  configureLogger({
    minLevel: Level.DEBUG,
    moduleWhitelist: [
      'PixiWebRenderer',
      'SnakeRenderer',
      'FoodRenderer',
    ],
  });
}

/**
 * 调试特定功能 - ECS系统
 */
export function debugECS(): void {
  configureLogger({
    minLevel: Level.DEBUG,
    moduleWhitelist: [
      'ECS',
      'EntityManager',
      'SystemScheduler',
      'useECSResource',
    ],
  });
}

/**
 * 调试特定功能 - 游戏逻辑
 */
export function debugGameplay(): void {
  configureLogger({
    minLevel: Level.DEBUG,
    moduleWhitelist: [
      'SnakeMovementSystem',
      'SnakeCollisionSystem',
      'GameOverSystem',
      'SnakeGameInitSystem',
    ],
  });
}

/**
 * 安静模式 - 屏蔽常见的噪音日志
 */
export function setupQuietMode(): void {
  configureLogger({
    minLevel: Level.INFO,
    moduleBlacklist: [
      'ECSSubscriptionManager',
      'useECSResource',
      'IntentRecorder',
    ],
  });
}

/**
 * 自动根据环境配置
 */
export function setupAutoLogging(): void {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    setupDevelopmentLogging();
  } else {
    setupProductionLogging();
  }
}

/**
 * URL参数调试模式
 * 在浏览器URL添加 ?debug=rendering 或 ?debug=ecs 等
 */
export function setupURLDebugMode(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const debugMode = params.get('debug');

  switch (debugMode) {
    case 'rendering':
      debugRendering();
      break;
    case 'ecs':
      debugECS();
      break;
    case 'gameplay':
      debugGameplay();
      break;
    case 'all':
      setupDevelopmentLogging();
      break;
    default:
      setupAutoLogging();
  }
}
