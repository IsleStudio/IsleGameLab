# 🚫 DEPRECATED - 此文档已整合

> **⚠️ 此文档已被整合到新的文档体系中**
> 请查看 [ECS_GUIDE.md](../ECS_GUIDE.md) 获取最新的 ECS 使用指南。

---

以下是原始文档内容，仅供参考：

# ECS 系统使用指南 (ECS Guidelines)

本文档提供了 ECS 框架的完整参考，涵盖核心概念、API 详解及最佳实践。

## 核心概念

ECS (Entity Component System) 是一种遵循“组合优于继承”原则的架构模式，旨在解耦数据与逻辑。

-   **World (ECS)**: 容器，管理所有的 Entity、Component 和 System。
-   **Entity (实体)**: 游戏中的对象，本质上只是一个唯一的 ID。
-   **Component (组件)**: 附加在实体上的纯数据容器，不包含逻辑。
-   **System (系统)**: 处理特定组件集合的逻辑单元。

## 快速开始

### 1. 创建实体 (Spawning Entities)

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

## 核心 API 详解

### ECS (World)

| 方法 | 说明 | 示例 |
|------|------|------|
| `spawn()` | 开始创建一个新实体，返回 `EntityCommands` | `ecs.spawn().insert(...).done()` |
| `createEntity()` | 创建一个空实体，返回 `Entity` 对象 | `const e = ecs.createEntity()` |
| `addSystem(stage, queries, fn)` | 添加系统到指定阶段 | `ecs.addSystem(Stage.Update, ...)` |
| `insertResource(resource)` | 注册全局资源 | `ecs.insertResource(new Time())` |
| `getResource(Class)` | 获取全局资源 | `const time = ecs.getResource(Time)` |
| `update()` | 执行一次完整的 Update 循环 | `ecs.update()` |

### Entity (实体操作)

直接操作实体对象的方法：

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

用于筛选拥有特定组件的实体。

-   **基本查询**: `query(ComponentA, ComponentB)`
-   **过滤**:
    -   `with(Component)`: 必须包含某组件。
    -   `without(Component)`: 必须不包含某组件。

```typescript
// 查询所有有 Position 和 Velocity，但没有 Static 标签的实体
const movableQuery = query(Position, Velocity).without(Static);

// 遍历结果
movableQuery.forEach(([pos, vel]) => {
    // ...
});
```

### Event (事件系统)

ECS 内置了事件总线，支持立即触发和缓冲触发。

-   **Trigger (立即)**: `ecs.trigger(new DamageEvent(10), targetEntity)`
-   **Push (缓冲)**: `ecs.pushEvent(new LogEvent('message'))` (在下一帧处理)
-   **Observer**: `ecs.addObserver(DamageEvent, (event) => { ... })`

## 最佳实践

### 1. 组件设计 (Component Design)
-   **纯数据**: 组件类 **严禁** 包含业务逻辑方法（如 `takeDamage`）。
-   **必须实现**: `clone()` 和 `equals()` 方法，用于状态回滚和比较。
-   **构造函数**: 提供默认值，便于实例化。

```typescript
// ✅ 正确
class Health extends Component {
  constructor(public current: number = 100, public max: number = 100) { super(); }
  clone() { return new Health(this.current, this.max); }
}
```

### 2. 逻辑封装 (Logic Encapsulation)
-   不要在 System 中直接编写复杂的组件操作逻辑。
-   使用 **Util** 静态类封装常用操作。

```typescript
// ✅ 推荐
HealthUtil.takeDamage(entity, 10);

// ❌ 避免
const health = entity.get(Health);
health.current -= 10; // 容易导致状态不一致或漏掉事件触发
```

### 3. 性能注意 (Performance)
-   **避免频繁创建/销毁**: 尽量复用对象或组件。
-   **查询优化**: 尽量精确定义 Query，减少不必要的遍历。
-   **React 绑定**: 在 UI 中使用 `useECSQuery` 时，注意依赖项，避免不必要的重渲染。
