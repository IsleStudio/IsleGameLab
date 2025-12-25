# 🛠️ 开发者指南

- [🎯 核心原则](#核心原则)
- [📚 学习路径](#学习路径)
- [🏗️ 项目结构](#项目结构)
- [📝 代码规范](#代码规范)
- [🚫 禁止事项](#禁止事项)
- [✅ 代码审查清单](#代码审查清单)
- [🔧 技术栈](#技术栈)

---

## 🎯 核心原则

1. **ECS 纯粹性** - Component 纯数据，System 纯逻辑
2. **单向数据流** - UI → Intent → System → Component → UI
3. **类型安全** - 严禁 `any`，显式声明类型
4. **中文注释** - 使用中文编写清晰的 JSDoc
5. **工具类分离** - 业务逻辑封装在 Util 中

---

## 📚 学习路径

### 🍼 新手 (5分钟入门)

1. **阅读本指南** - 了解基本规范和结构
2. **查看 ECS 指南** - [ECS_GUIDE.md](ECS_GUIDE.md)
3. **运行示例** - `npm run dev` 启动贪吃蛇游戏

### 🚀 中级开发者

1. 掌握 ECS API - 参考 [src/core/ecs/docs/API_GUIDE.md](src/core/ecs/docs/API_GUIDE.md)
2. 学习 Intent 驱动 - [ECS_GUIDE.md#intent-系统](ECS_GUIDE.md#intent-系统)
3. 扩展游戏功能

### 🎮 高级开发者

1. 研究框架架构 - [src/core/ecs/docs/ecs_framework.md](src/core/ecs/docs/ecs_framework.md)
2. 实现持久化 - [src/core/persistence/](src/core/persistence/)
3. 定制渲染引擎

---

## 🏗️ 项目结构

本项目采用 Clean Architecture 与 ECS 相结合的架构。

### 目录结构

```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx         # 游戏入口页面
│   └── layout.tsx       # 全局布局
├── core/                # 核心引擎层 (不依赖具体业务)
│   ├── ecs/             # ECS 框架核心
│   └── persistence/     # 持久化与序列化系统
├── gameplay/            # 游戏业务逻辑层
│   ├── components/      # 组件定义 (纯数据)
│   ├── systems/         # 系统逻辑 (纯逻辑)
│   ├── events/          # 事件定义
│   ├── intents/         # 用户意图定义
│   ├── resources/       # 全局资源
│   └── utils/           # 工具类
├── presentation/        # 展示层
│   ├── ui/              # React UI 组件
│   ├── adapters/        # 引擎适配器
│   └── hooks/           # ECS 与 React 交互 Hooks
├── server/              # 服务端逻辑
└── lib/                 # 通用工具库
```

### 模块依赖规则

1. **Core** 层不依赖任何其他层
2. **Gameplay** 层依赖 **Core** 层
3. **Presentation** 层依赖 **Gameplay** 和 **Core** 层
4. **Server** 层依赖 **Gameplay** 和 **Core** 层
5. **Lib** 层为通用工具，可被所有层依赖

---

## 📝 代码规范

### 命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 类 (Class) | PascalCase | `GameEngine`, `UserComponent` |
| 接口 (Interface) | PascalCase | `IStorage`, `GameState` |
| 变量 (Variable) | camelCase | `playerHealth`, `isReady` |
| 常量 (Constant) | UPPER_SNAKE_CASE | `MAX_PLAYERS`, `DEFAULT_TIMEOUT` |
| 文件名 (File) | PascalCase / camelCase | `GameApp.tsx`, `utils.ts` |
| 文件夹 (Folder) | camelCase | `components`, `ui` |

### 架构模式

#### 1. 纯数据组件

所有 Component 必须是 POJO 风格，不包含业务方法：

```typescript
// ✅ 正确
class Score extends Component { value: number = 0; }

// ❌ 错误
class Score extends Component {
  add(val: number) { this.value += val; }
}
```

#### 2. 工具类分离

业务逻辑应封装在 `Util` 静态类或纯函数中：

```typescript
// ✅ 正确
class ScoreUtil {
  static add(score: Score, val: number): void {
    score.value += val;
  }
}

// ❌ 错误
class Score extends Component {
  add(val: number) { this.value += val; }
}
```

#### 3. Intent 命令模式

用户输入不直接修改状态，而是生成 `Intent` 对象：

```
UI -> Intent -> IntentQueue -> System -> Component Update
```

#### 4. React 绑定

使用自定义 Hooks 连接 ECS 与 React 组件：

- `useECSQuery`: 订阅组件变化
- `useGameState`: 订阅全局资源变化

### 文件组织约定

- `*.test.ts`: 单元测试文件，与被测文件同级
- `index.ts`: 模块导出文件
- `types.ts`: 模块内共享的类型定义

---

## 🚫 禁止事项

### 1. 禁止在 Component 中包含业务逻辑

```typescript
// ❌ 错误
class Health {
  takeDamage(amount) { this.value -= amount; }
}

// ✅ 正确
// 使用 System 或 Util 类处理逻辑
```

### 2. 禁止直接修改 Component 状态

```typescript
// ❌ 错误
health.current -= 10;

// ✅ 正确
HealthUtil.takeDamage(health, 10);
```

### 3. 禁止使用 `any`

除非用于解决极其复杂的类型映射，且必须添加注释说明。

### 4. 禁止在 System 之外持有 Entity 引用过久

Entity 可能会被销毁，长期持有引用会导致内存泄漏。

### 5. 禁止在 UI 组件中直接操作 ECS 数据

必须通过 `Intent` 系统或封装好的 Hooks 进行交互。

---

## ✅ 代码审查清单

### ECS 规范

- [ ] Component 是否只包含数据字段？
- [ ] Component 是否实现了 `clone()` 和 `equals()` 方法？
- [ ] System 是否只关注逻辑处理？
- [ ] 是否使用了 `query()` 进行实体筛选？

### React / UI 规范

- [ ] 是否使用了 `useECSQuery` 或 `useGameState` 获取数据？
- [ ] 是否避免了在渲染循环中创建新的对象或函数？
- [ ] 组件命名是否符合 PascalCase？

### TypeScript 规范

- [ ] 是否显式声明了函数返回值类型？
- [ ] 是否处理了所有可能的 `null` 或 `undefined` 情况？
- [ ] 接口定义是否使用了 `interface`？

### 测试规范

- [ ] 核心逻辑是否有对应的单元测试？
- [ ] 测试描述是否清晰表达了业务意图？

---

## 🔧 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.0 | React 框架 (App Router) |
| React | 19.2.3 | UI 库 |
| TypeScript | 5.9.3 | 类型安全 |

### 游戏与图形

| 技术 | 版本 | 用途 |
|------|------|------|
| Pixi.js | 8.14.3 | 2D WebGL 渲染 |
| Custom ECS | - | 核心引擎架构 |

### 样式与 UI

| 技术 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | 4 | CSS 框架 |
| PostCSS | - | CSS 处理器 |

### 测试工具

| 技术 | 版本 | 用途 |
|------|------|------|
| Vitest | 4.0.16 | 测试运行器 |
| JSDOM | - | 浏览器环境模拟 |
| @testing-library/react | 16.3.1 | React 组件测试 |
| fast-check | 4.5.0 | 属性测试 |

### 代码质量

| 技术 | 版本 | 用途 |
|------|------|------|
| ESLint | 9 | 代码检查 |
| Prettier | 3.7.4 | 代码格式化 |

---

## 📚 相关文档

- [README.md](README.md) - 项目概述和快速开始
- [ECS_GUIDE.md](ECS_GUIDE.md) - ECS 架构详细指南
- [.github/product.md](.github/product.md) - 产品概述
- [.github/tech.md](.github/tech.md) - 技术栈详细说明
- [src/core/ecs/docs/API_GUIDE.md](src/core/ecs/docs/API_GUIDE.md) - ECS API 速查

---

*如有疑问，请查看项目 Issues 或联系维护者。*
