# 日志系统使用指南

本项目使用专业的分级日志系统，支持环境感知、模块化管理和灵活配置。

## 快速开始

### 1. 基本使用

```typescript
import { createLogger } from '@/lib/logger';

// 创建模块日志记录器
const logger = createLogger('MyModule');

// 使用不同级别的日志
logger.debug('调试信息：变量值为', someVariable);
logger.info('用户登录成功', { userId: 123 });
logger.warn('警告：缓存即将过期');
logger.error('错误：无法连接到服务器', error);
```

### 2. 日志级别说明

| 级别 | 用途 | 开发环境 | 生产环境 |
|------|------|----------|----------|
| DEBUG | 详细调试信息 | ✅ 显示 | ❌ 隐藏 |
| INFO | 正常运行信息 | ✅ 显示 | ❌ 隐藏 |
| WARN | 警告信息 | ✅ 显示 | ✅ 显示 |
| ERROR | 错误信息 | ✅ 显示 | ✅ 显示 |

## 高级配置

### 全局配置

在应用入口文件（如 `src/app/GameApp.tsx`）中配置：

```typescript
import { configureLogger, Level } from '@/lib/logger';

// 设置最小日志级别
configureLogger({
  minLevel: Level.INFO, // 只显示 INFO 及以上级别的日志
});

// 只显示特定模块的日志
configureLogger({
  moduleWhitelist: ['ECS', 'Renderer', 'GameWorld'],
});

// 屏蔽特定模块的日志
configureLogger({
  moduleBlacklist: ['SubscriptionManager', 'IntentRecorder'],
});

// 关闭所有日志
configureLogger({
  minLevel: Level.NONE,
});
```

### 调试特定功能

当你需要调试某个特定功能时：

```typescript
// 临时开启调试模式，只显示相关模块
configureLogger({
  minLevel: Level.DEBUG,
  moduleWhitelist: ['PixiWebRenderer', 'SnakeMovementSystem'],
});
```

## 最佳实践

### 1. 日志命名规范

模块名应清晰表达功能：

```typescript
// ✅ 好的命名
const logger = createLogger('SnakeMovementSystem');
const logger = createLogger('PixiWebRenderer');
const logger = createLogger('UserAuthService');

// ❌ 避免的命名
const logger = createLogger('utils');
const logger = createLogger('index');
const logger = createLogger('helpers');
```

### 2. 选择合适的日志级别

```typescript
// DEBUG - 开发时的详细信息
logger.debug(`计算路径点: ${points.length} 个点`, points);

// INFO - 重要的流程节点
logger.info('游戏初始化完成');
logger.info(`玩家加入游戏 (ID: ${playerId})`);

// WARN - 不影响运行但需要注意
logger.warn('配置文件缺失，使用默认配置');
logger.warn(`帧率偏低: ${fps} FPS`);

// ERROR - 必须处理的错误
logger.error('初始化失败', error);
logger.error('无法加载资源', { resourceId, error });
```

### 3. 错误日志携带上下文

```typescript
try {
  await loadGameAssets();
} catch (error) {
  // ✅ 提供详细的错误上下文
  logger.error('加载游戏资源失败', {
    assetCount: assets.length,
    failedAsset: currentAsset,
    error,
  });
}
```

### 4. 避免日志污染

```typescript
// ❌ 避免在循环中打印日志
gameLoop(() => {
  logger.debug('游戏循环tick'); // 这会每帧都打印！
});

// ✅ 使用计数器减少日志频率
let tickCount = 0;
gameLoop(() => {
  if (tickCount++ % 60 === 0) {
    logger.debug(`游戏运行中 (${tickCount} ticks)`);
  }
});

// ❌ 避免在高频事件中打印
onMouseMove((e) => {
  logger.debug('鼠标移动', e); // 这会频繁触发！
});
```

## 调试技巧

### 场景1：调试性能问题

```typescript
import { configureLogger, Level } from '@/lib/logger';

// 开启性能相关模块的调试日志
configureLogger({
  minLevel: Level.DEBUG,
  moduleWhitelist: [
    'PixiWebRenderer',
    'SnakeMovementSystem',
    'GameSpeedSystem',
  ],
});
```

### 场景2：调试特定Bug

```typescript
// 只显示出问题的模块
configureLogger({
  minLevel: Level.DEBUG,
  moduleWhitelist: ['SnakeCollisionSystem'],
});
```

### 场景3：生产环境调试

```typescript
// 临时开启生产环境的日志（需要谨慎）
if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
  configureLogger({
    minLevel: Level.INFO,
  });
}
```

## 常见问题

### Q: 为什么我的日志没有显示？

A: 检查以下几点：
1. 确认当前环境（开发/生产）
2. 检查日志级别配置
3. 确认模块名没有被黑名单屏蔽

### Q: 如何临时查看所有DEBUG日志？

A: 在浏览器控制台执行：

```javascript
// 注意：需要在应用中暴露 configureLogger
window.configureLogger({ minLevel: 0 });
```

### Q: 生产环境能看到日志吗？

A: 默认情况下，生产环境只显示 WARN 和 ERROR 级别的日志。如需调整，使用 `configureLogger`。

## 迁移指南

### 从 console.log 迁移

```typescript
// 旧代码
console.log('[MyModule] 初始化完成');
console.warn('[MyModule] 配置缺失');
console.error('[MyModule] 初始化失败:', error);

// 新代码
const logger = createLogger('MyModule');
logger.info('初始化完成');
logger.warn('配置缺失');
logger.error('初始化失败', error);
```

## 性能考虑

- 日志系统在生产环境会自动屏蔽低级别日志，性能开销极小
- DEBUG 和 INFO 日志在生产环境不会执行，包括参数计算
- 建议避免在日志参数中进行复杂计算

```typescript
// ❌ 避免
logger.debug('数据分析', expensiveAnalysis(data));

// ✅ 推荐
if (process.env.NODE_ENV !== 'production') {
  logger.debug('数据分析', expensiveAnalysis(data));
}
```

## 总结

- 使用 `createLogger(moduleName)` 创建模块化日志记录器
- 根据场景选择合适的日志级别（DEBUG/INFO/WARN/ERROR）
- 使用 `configureLogger` 进行全局配置和调试
- 避免在高频代码路径中打印日志
- 生产环境自动屏蔽调试日志，无需手动清理
