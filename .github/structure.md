# 项目结构 (Project Structure)

本项目采用 Clean Architecture 与 ECS (Entity Component System) 相结合的架构。

## 目录结构

```
src/
├── app/                 # Next.js App Router 页面与布局
│   ├── page.tsx         # 游戏入口页面
│   └── layout.tsx       # 全局布局
├── core/                # 核心引擎层 (不依赖具体业务)
│   ├── ecs/             # ECS 框架核心 (World, Entity, Component, System)
│   └── persistence/     # 持久化与序列化系统
├── gameplay/            # 游戏业务逻辑层
│   ├── components/      # 游戏组件定义 (纯数据)
│   ├── systems/         # 游戏系统逻辑 (纯逻辑)
│   ├── events/          # 游戏事件定义
│   ├── intents/         # 用户意图 (Intents) 定义
│   └── resources/       # 全局资源 (GameState, UserSession)
├── presentation/        # 展示层 (UI)
│   ├── ui/              # React UI 组件
│   ├── adapters/        # 接口适配器
│   └── hooks/           # UI 与 ECS 交互的 Hooks (useECSQuery, useGameState)
├── server/              # 服务端逻辑 (如 GameWorld, TickSystem)
├── lib/                 # 通用工具库与常量
└── test/                # 测试文件
    ├── integration/     # 集成测试
    └── setup.ts         # 测试配置
```

## 模块依赖规则

1.  **Core** 层不依赖任何其他层。
2.  **Gameplay** 层依赖 **Core** 层。
3.  **Presentation** 层依赖 **Gameplay** 和 **Core** 层。
4.  **Server** 层依赖 **Gameplay** 和 **Core** 层。
5.  **Lib** 层为通用工具，可被所有层依赖。

## 关键文件说明

- `src/app/GameApp.tsx`: 游戏客户端主入口组件。
- `src/core/ecs/World.ts`: ECS 世界容器，管理所有实体和系统。
- `src/gameplay/systems/index.ts`: 注册所有游戏系统。
- `src/presentation/ui/bindings/ECSProvider.tsx`: React Context Provider，用于向下传递 ECS 实例。
