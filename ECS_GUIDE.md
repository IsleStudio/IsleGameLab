# 🎮 ECS 架构使用指南

[![指南](https://img.shields.io/badge/状态-完成-green)](#)
[![ECS](https://img.shields.io/badge/ECS-Hybrid-orange)](https://github.com/bevyengine/bevy)

本文档提供了 Isle Game Lab ECS 框架的完整参考，涵盖核心概念、API 详解及最佳实践。

**📖 相关文档:**
- [API 速查手册](src/core/ecs/docs/API_GUIDE.md) - 快速参考
- [框架架构详解](src/core/ecs/docs/ecs_framework.md) - 深入理解
- [实战示例](src/core/ecs/docs/ecs_example.md) - 代码演示

---

## 📚 目录

- [核心概念](#核心概念)
- [快速开始](#快速开始)
- [核心 API 详解](#核心-api-详解)
- [Intent 系统](#intent-系统-replay-支持)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 核心概念

ECS (Entity Component System) 是一种遵循"组合优于继承"原则的架构模式，旨在解耦数据与逻辑。

| 概念 | 说明 | 示例 |
|------|------|------|
| **World (ECS)** | 容器，管理所有的 Entity、Component 和 System | `const ecs = new ECS()` |
| **Entity (实体)** | 游戏中的对象，本质上只是一个唯一的 ID | `player.id` |
| **Component (组件)** | 附加在实体上的纯数据容器，不包含逻辑 | `Position`, `Health` |
| **System (系统)** | 处理特定组件集合的逻辑单元 | `MovementSystem` |

---

## 快速开始

### 1. 创建实体 (Spawning)

推荐使用 `spawn()` 进行链式创建，代码更整洁：

```typescript
import { ECS } from '@/core/ecs';
import { Position, Health } from '@/gameplay/components';

const ecs = new ECS();

// 链式创建 (推荐)
const player = ecs.spawn()
  .insert(new Position(0, 0))
  .insert(new Health(100))
  .done();

// 分步创建 (传统)
const enemy = ecs.createEntity();
enemy.add(new Position(10, 10));
```

### 2. 定义系统 (Defining Systems)

推荐使用 **函数式系统**，它更轻量且易于测试：

```typescript
import { Stage, query } from '@/core/ecs';

ecs.addSystem(Stage.Update,
  [query(Position, Velocity)], // 声明依赖
  (entities) => {
    // entities 是一个迭代器，包含所有匹配的实体组件元组
    for (const [pos, vel] of entities) {
      pos.x += vel.x;
      pos.y += vel.y;
    }
  }
);
```

---

## 核心 API 详解

### ECS (World)

| 方法 | 说明 | 示例 |
|------|------|------|
| `spawn()` | 开始创建新实体，返回 `EntityCommands` | `ecs.spawn().insert(...).done()` |
| `createEntity()` | 创建空实体，返回 `Entity` | `const e = ecs.createEntity()` |
| `addSystem(stage, queries, fn)` | 添加系统到指定阶段 | `ecs.addSystem(Stage.Update, ...)` |
| `insertResource(resource)` | 注册全局资源 | `ecs.insertResource(new Time())` |
| `getResource(Class)` | 获取全局资源 | `const time = ecs.getResource(Time)` |
| `update()` | 执行一次完整的 Update 循环 | `ecs.update()` |

### Entity (实体操作)

| 方法 | 说明 | 示例 |
|------|------|------|
| `add(component)` | 添加组件 | `entity.add(new Health(100))` |
| `get(ComponentClass)` | 获取组件实例 | `const hp = entity.get(Health)` |
| `has(ComponentClass)` | 检查是否拥有组件 | `if (entity.has(Health)) ...` |
| `remove(ComponentClass)` | 移除组件 | `entity.remove(Health)` |
| `despawnRecursive()` | 销毁实体及其所有子实体 | `entity.despawnRecursive()` |
| `setParent(entity)` | 设置父实体 | `child.setParent(parent)` |

### EntityCommands (链式构建)

`ecs.spawn()` 返回的对象，用于流式构建实体：

| 方法 | 说明 | 示例 |
|------|------|------|
| `insert(component)` | 添加组件 | `.insert(new Position(0, 0))` |
| `remove(ComponentClass)` | 移除组件 | `.remove(OldComp)` |
| `setParent(entity)` | 设置父实体 | `.setParent(parent)` |
| `observe(Event, callback)` | 注册实体级事件观察者 | `.observe(ClickEvent, onClick)` |
| `done()` | 完成构建，返回 Entity | `const e = ... .done()` |

### Query (查询)

用于筛选拥有特定组件的实体：

- **基本查询**: `query(ComponentA, ComponentB)`
- **过滤**:
  - `with(Component)`: 必须包含某组件
  - `without(Component)`: 必须不包含某组件

```typescript
// 查询所有有 Position 和 Velocity，但没有 Static 标签的实体
const movableQuery = query(Position, Velocity).without(Static);

// 遍历结果
movableQuery.forEach(([pos, vel]) => {
    // 处理逻辑
});
```

### Event (事件系统)

ECS 内置了事件总线，支持立即触发和缓冲触发：

| 类型 | 方法 | 用途 |
|------|------|------|
| **Trigger (立即)** | `ecs.trigger(event, entity)` | 需要立即响应的逻辑 |
| **Push (缓冲)** | `ecs.pushEvent(event)` | 下一帧处理的事件 |
| **Observer** | `ecs.addObserver(Event, callback)` | 监听特定事件 |

```typescript
// 立即触发
ecs.trigger(new DamageEvent(10), targetEntity);

// 缓冲发送
ecs.pushEvent(new LogEvent('message'));

// 添加观察者
ecs.addObserver(DamageEvent, (trigger) => {
    console.log(`Damage: ${trigger.event.amount}`);
});
```

---

## Intent 系统 (Replay 支持)

### 核心概念

为了支持游戏逻辑的确定性回放，框架引入了 **Intent (意图)** 机制：

- **Intent**: 代表"想要执行某个操作"的请求，而不是操作本身
- **IntentRecorder**: 负责记录所有产生的 Intent
- **Replay**: 通过按时间戳顺序重新应用记录的 Intent 重现游戏状态

### 工作流程

```
用户输入 → 生成 Intent → 记录 Intent → 系统处理 → 状态更新
                                              ↓
                                    可重新应用实现回放
```

### 示例代码

```typescript
// 定义 Intent
class MoveIntent extends Intent {
    constructor(public x: number, public y: number) { super(); }
}

// 注册 Intent 类型 (必须)
const recorder = new IntentRecorder();
recorder.registerIntentType(MoveIntent);

// 开启录制
recorder.startRecording('session-1');

// 发送 Intent
entity.add(new MoveIntent(10, 20));

// 停止并导出
const session = recorder.stopRecording();
const json = recorder.exportSession(session);
```

---

## 最佳实践

### 1. 组件设计

```typescript
// ✅ 正确：纯数据组件
class Health extends Component {
  constructor(public current: number = 100, public max: number = 100) { super(); }
  clone() { return new Health(this.current, this.max); }
}

// ❌ 错误：包含业务逻辑
class Health extends Component {
  takeDamage(amount: number) { /* 业务逻辑 */ }
}
```

### 2. 逻辑封装

```typescript
// ✅ 推荐：使用工具类
HealthUtil.takeDamage(entity, 10);

// ❌ 避免：直接修改组件
const health = entity.get(Health);
health.current -= 10; // 容易导致状态不一致
```

### 3. 性能注意

- **避免频繁创建/销毁**: 尽量复用对象或组件
- **查询优化**: 尽量精确定义 Query，减少不必要的遍历
- **React 绑定**: 在 UI 中使用 `useECSQuery` 时，注意依赖项，避免不必要的重渲染

---

## 常见问题

### Q: 如何处理实体层级关系？

使用 `setParent()` 方法建立父子关系：

```typescript
const parent = ecs.spawn().insert(new TankBody()).done();
ecs.spawn().insert(new TankTurret()).setParent(parent).done();
```

### Q: 如何在不同阶段执行系统？

使用 `Stage` 枚举：

```typescript
ecs.addSystem(Stage.Startup, ...)  // 启动时执行一次
ecs.addSystem(Stage.Update, ...)   // 每帧执行
ecs.addSystem(Stage.FixedUpdate, ...) // 固定时间间隔执行
```

### Q: 如何实现组件生命周期钩子？

```typescript
class MyComponent extends Component {
    static onAdd(entity: Entity) {
        console.log('Component added to', entity.id);
    }
}
```

---

*想了解更多细节？请查看 [框架架构详解](src/core/ecs/docs/ecs_framework.md) 或 [实战示例](src/core/ecs/docs/ecs_example.md)*
