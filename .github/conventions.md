# 代码规范与架构模式 (Conventions & Patterns)

## 命名规范 (Naming Conventions)

| 类型 | 格式 | 示例 | 说明 |
|------|------|------|------|
| 类 (Class) | PascalCase | `GameEngine`, `UserComponent` | |
| 接口 (Interface) | PascalCase | `IStorage`, `GameState` | 尽量避免 `I` 前缀，除非必要 |
| 变量 (Variable) | camelCase | `playerHealth`, `isReady` | |
| 常量 (Constant) | UPPER_SNAKE_CASE | `MAX_PLAYERS`, `DEFAULT_TIMEOUT` | 全局常量 |
| 文件名 (File) | PascalCase / camelCase | `GameApp.tsx`, `utils.ts` | 组件/类文件用 Pascal，工具用 camel |
| 文件夹 (Folder) | camelCase | `components`, `ui` | |

## 架构模式 (Architectural Patterns)

### 1. 纯数据组件 (Pure Data Components)
所有 Component 必须是 POJO (Plain Old Java Object) 风格，不包含业务方法。
```typescript
// ✅ Good
class Score extends Component { value: number = 0; }

// ❌ Bad
class Score extends Component { 
  add(val: number) { this.value += val; } 
}
```
### 2. 工具类分离 (Utility Separation)
业务逻辑应封装在 `Util` 静态类或纯函数中，供 System 调用。
```typescript
// ✅ Good
class ScoreUtil {
  static add(score: Score, val: number): void {
    score.value += val;
  }
}

// ❌ Bad
class Score extends Component {
  add(val: number) { this.value += val; }
}

### 3. Intent 命令模式 (Intent Command Pattern)
用户输入不直接修改状态，而是生成 `Intent` 对象。
UI -> Intent -> IntentQueue -> System -> Component Update

### 4. React 绑定 (React Bindings)
使用自定义 Hooks 连接 ECS 与 React 组件，实现关注点分离。
- `useECSQuery`: 订阅组件变化。
- `useGameState`: 订阅全局资源变化。

## 文件组织约定
- `*.test.ts`: 单元测试文件，与被测文件同级。
- `index.ts`: 模块导出文件，用于简化导入路径。
- `types.ts`: 模块内共享的类型定义。
