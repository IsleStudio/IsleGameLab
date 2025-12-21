# 通用游戏开发骨架 (isle ecs game lab)

这是一个基于Next.js 16、TypeScript、PixiJS 8、ECS架构和Tailwind CSS 4的通用游戏开发框架。

## 技术栈

- **Next.js 16** - React 19框架，支持Turbopack
- **TypeScript** - 类型安全的JavaScript
- **PixiJS 8** - 2D WebGL渲染引擎
- **Tailwind CSS 4** - 实用优先的CSS框架
- **Vitest** - 快速的单元测试框架
- **fast-check** - 属性测试库
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

## 项目结构

```
src/
├── core/                    # 核心框架层
│   ├── ecs/                 # ECS框架核心
│   └── persistence/         # 持久化层
├── gameplay/                # 游戏逻辑层
│   ├── components/          # 组件定义（纯数据）
│   ├── systems/             # 系统定义（业务逻辑）
│   ├── resources/           # 全局资源
│   ├── intents/             # Intent定义（Command模式）
│   ├── events/              # 事件定义
│   └── utils/               # 工具类
├── server/                  # 服务器逻辑层
├── presentation/            # 表现层
│   ├── ui/                  # UI层（MVVM架构）
│   └── adapters/            # 引擎适配器层
├── app/                     # Next.js App Router
└── lib/                     # 共享工具库
```

## 开发命令

```bash
# 开发服务器
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
npm run lint:fix

# 代码格式化
npm run format
npm run format:check

# 测试
npm run test          # 监视模式
npm run test:run      # 单次运行
npm run test:ui       # UI界面

# 类型检查
npm run type-check
```

## 架构特点

### 四层架构设计

1. **Intent Layer** - Util提供的人类友好API，生成Intent/Command
2. **Context Layer** - 游戏上下文状态，使用TagComponent + GlobalResource
3. **ECS Core** - 核心游戏逻辑，System是唯一裁判
4. **Data Backends** - 数据存储和索引

### 核心设计理念

- **确定性系统** - 通过Intent/Command模式实现可预测的游戏逻辑
- **Replay支持** - 所有用户输入转换为可记录的Intent
- **引擎无关** - 核心Gameplay层纯ECS实现，可迁移到其他引擎
- **设计师友好** - Util层提供OOP风格API，可对接蓝图系统

## 开发指南

### 组件设计原则

- 组件必须是纯数据，不包含业务逻辑
- 仅允许简单的Get方法
- 使用TypeScript确保类型安全

### 系统设计原则

- System是唯一的业务逻辑裁判
- 使用函数式链式调用处理实体逻辑
- 通过Intent机制保持系统的可预测性

### 工具类设计原则

- 提供两种API风格：
  1. 为System提供干净的数据处理函数
  2. 为外部系统提供友好的OOP风格API
- 外部请求最终通过Intent保持ECS的可预测性

## 下一步

1. 执行任务2：ECS框架核心优化
2. 执行任务3：持久化层实现
3. 继续按照tasks.md中的计划实现功能

## 许可证

MIT
