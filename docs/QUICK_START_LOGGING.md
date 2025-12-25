# 日志系统快速入门 🚀

5分钟学会使用项目的新日志系统！

## 最简单的使用

### 1. 在你的文件中创建 logger

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('你的模块名');
```

### 2. 使用不同级别的日志

```typescript
// 调试信息（开发环境显示，生产环境隐藏）
logger.debug('这是调试信息', someVariable);

// 一般信息（重要的流程节点）
logger.info('用户登录成功');

// 警告信息（需要注意但不影响运行）
logger.warn('配置缺失，使用默认值');

// 错误信息（必须处理的问题）
logger.error('初始化失败', error);
```

## 常见场景示例

### 场景1: React 组件

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('MyComponent');

export function MyComponent() {
  // 只在关键状态变化时打印
  const handleClick = () => {
    logger.info('按钮被点击');
    // ... 处理逻辑
  };

  // 避免在每次渲染时打印
  logger.debug('组件渲染'); // ❌ 不推荐

  return <button onClick={handleClick}>点击</button>;
}
```

### 场景2: 系统/服务类

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('GameWorld');

export class GameWorld {
  constructor() {
    logger.info('GameWorld 初始化');
  }

  public update() {
    // 避免在循环中打印
    // logger.debug('更新中'); // ❌ 会刷屏
  }

  public async loadAssets() {
    try {
      logger.info('开始加载资源');
      // ... 加载逻辑
      logger.info('资源加载完成');
    } catch (error) {
      logger.error('资源加载失败', error);
    }
  }
}
```

### 场景3: 错误处理

```typescript
try {
  await someAsyncOperation();
} catch (error) {
  // ✅ 好的错误日志：包含上下文
  logger.error('操作失败', {
    operation: 'someAsyncOperation',
    params: { id: 123 },
    error
  });
}
```

## 调试技巧

### 技巧1: 只看某个模块的日志

在开发时，如果你只想看特定模块的日志:

```typescript
// 在 src/app/GameApp.tsx 或入口文件中
import { configureLogger, Level } from '@/lib/logger';

configureLogger({
  minLevel: Level.DEBUG,
  moduleWhitelist: ['你的模块名'],
});
```

### 技巧2: 屏蔽噪音日志

如果某些模块日志太多:

```typescript
configureLogger({
  moduleBlacklist: ['ECSSubscriptionManager', 'useECSResource'],
});
```

### 技巧3: 临时开启全部日志

```typescript
configureLogger({
  minLevel: Level.DEBUG,
});
```

## 日志级别速查

| 使用时机 | 级别 | 生产环境 |
|---------|------|----------|
| 循环变量、详细调试 | DEBUG | ❌ 不显示 |
| 重要流程节点 | INFO | ❌ 不显示 |
| 配置缺失、性能警告 | WARN | ✅ 显示 |
| 错误、异常 | ERROR | ✅ 显示 |

## ❌ 常见错误

### 错误1: 在循环中打印

```typescript
// ❌ 不要这样做
gameLoop(() => {
  logger.debug('游戏循环'); // 每帧都会打印！
});

// ✅ 应该这样
let count = 0;
gameLoop(() => {
  if (count++ % 60 === 0) {
    logger.debug(`游戏运行 ${count} 帧`);
  }
});
```

### 错误2: 在渲染时打印

```typescript
// ❌ 不要这样做
export function MyComponent() {
  logger.debug('渲染中'); // 每次渲染都会打印！
  return <div>...</div>;
}

// ✅ 应该这样
export function MyComponent() {
  useEffect(() => {
    logger.info('组件挂载'); // 只在挂载时打印一次
  }, []);

  return <div>...</div>;
}
```

### 错误3: 仍使用 console

```typescript
// ❌ 不要再使用
console.log('[MyModule] 消息');

// ✅ 应该使用
const logger = createLogger('MyModule');
logger.info('消息');
```

## 💡 专业技巧

### 技巧1: 条件日志

```typescript
// 只在特定条件下打印详细日志
if (process.env.NODE_ENV !== 'production') {
  logger.debug('详细的调试信息', expensiveData);
}
```

### 技巧2: URL参数调试

在浏览器地址栏添加 `?debug=true` 来临时开启调试:

```typescript
// 在入口文件中
if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
  configureLogger({ minLevel: Level.DEBUG });
}
```

### 技巧3: 模块化命名

```typescript
// ✅ 好的命名
createLogger('UserAuthService');
createLogger('SnakeMovementSystem');
createLogger('PixiWebRenderer');

// ❌ 避免的命名
createLogger('utils');
createLogger('helpers');
createLogger('index');
```

## 下一步

- 📖 详细文档: `docs/LOGGING.md`
- 🔧 配置示例: `src/lib/logger.config.example.ts`
- 🏥 项目健康检查: `docs/PROJECT_HEALTH_CHECK.md`

## 总结

1. 使用 `createLogger('模块名')` 创建日志记录器
2. 根据重要性选择级别: debug < info < warn < error
3. 避免在循环、渲染中打印日志
4. 生产环境自动关闭 debug/info 日志
5. 遇到问题用 `configureLogger` 调试

就这么简单！🎉
