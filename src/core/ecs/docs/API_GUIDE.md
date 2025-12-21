# ECS 框架 API 快速指南 (Quick API Guide)

本文档提供 ECS 框架的快速参考，包括核心 API、工具类使用和最佳实践。

---

## 快速开始

### 创建实体

```typescript
import { ECS, query, res, Stage } from './core/ecs';

const ecs = new ECS();

// Bevy 风格：链式创建
const entity = ecs.spawn()
  .insert(new Position(0, 0))
  .insert(new Health(100))
  .done();

// Lua 风格：分步创建
const entity2 = ecs.createEntity();
entity2.add(new Position(10, 20));
entity2.add(new Health(50));
```

### 定义系统

```typescript
// 函数式系统（推荐）
ecs.addSystem(Stage.Update,
  [query(Position, Health)],
  (entities) => {
    for (const [pos, health] of entities) {
      // 处理逻辑
    }
  }
);

// 类式系统
class MovementSystem extends System<[Position, Velocity]> {
  componentsRequired = [Position, Velocity];
  
  update(components: Iterable<[Position, Velocity]>) {
    for (const [pos, vel] of components) {
      pos.x += vel.x;
      pos.y += vel.y;
    }
  }
}
ecs.addSystem(new MovementSystem());
```

---

## 核心 API 速查

### ECS (World)

| 方法 | 说明 | 示例 |
|------|------|------|
| `spawn()` | 创建实体，返回 EntityCommands | `ecs.spawn().insert(comp).done()` |
| `createEntity()` | 创建空实体 | `const e = ecs.createEntity()` |
| `addSystem()` | 添加系统 | `ecs.addSystem(Stage.Update, system)` |
| `insertResource()` | 注册资源 | `ecs.insertResource(new Time())` |
| `getResource()` | 获取资源 | `ecs.getResource(Time)` |
| `trigger()` | 触发立即事件 | `ecs.trigger(event, entity)` |
| `pushEvent()` | 发送缓冲事件 (下一帧) | `ecs.pushEvent(event)` |
| `addObserver()` | 注册事件观察者 | `ecs.addObserver(Event, callback)` |
| `update()` | 运行 Update 阶段 | `ecs.update()` |

### Entity

| 方法 | 说明 | 示例 |
|------|------|------|
| `add(comp)` | 添加组件 | `entity.add(new Health(100))` |
| `get(Comp)` | 获取组件 | `entity.get(Health)` |
| `has(Comp)` | 检查组件 | `entity.has(Health)` |
| `remove(Comp)` | 移除组件 | `entity.remove(Health)` |
| `setParent(e)` | 设置父实体 | `child.setParent(parent)` |
| `getParent()` | 获取父实体 | `entity.getParent()` |
| `despawnRecursive()` | 递归销毁 | `entity.despawnRecursive()` |

### EntityCommands (链式构建)

| 方法 | 说明 | 示例 |
|------|------|------|
| `insert(comp)` | 添加组件 | `.insert(new Position(0, 0))` |
| `remove(Comp)` | 移除组件 | `.remove(OldComponent)` |
| `observe(Event, cb)` | 注册实体观察者 | `.observe(ClickEvent, cb)` |
| `when(cond, cb)` | 条件执行 | `.when(isPlayer, cmd => ...)` |
| `setParent(e)` | 设置父实体 | `.setParent(parent)` |
| `done()` | 完成构建 | `.done()` |

### Query (查询)

| 方法 | 说明 | 示例 |
|------|------|------|
| `with(Comp)` | 必须有组件 | `query(A).with(B)` |
| `without(Comp)` | 必须无组件 | `query(A).without(C)` |
| `forEach(cb)` | 遍历 | `query.forEach(([a]) => ...)` |
| `map(cb)` | 映射 | `query.map(([a]) => a.value)` |
| `filter(cb)` | 过滤 | `query.filter(([a]) => a.x > 0)` |
| `first()` | 获取第一个 | `query.first()` |
| `count()` | 计数 | `query.count()` |

---

## Intent 与 Replay API

### Intent (意图)

| 属性/方法 | 说明 |
|-----------|------|
| `timestamp` | 创建时间戳 (自动生成) |
| `priority` | 优先级 (越小越高) |
| `processed` | 处理状态标记 |
| `id` | 唯一标识符 (可选) |

### IntentRecorder (录制器)

| 方法 | 说明 | 示例 |
|------|------|------|
| `registerIntentType()` | 注册 Intent 类型 (必须) | `recorder.registerIntentType(MoveIntent)` |
| `startRecording()` | 开始录制会话 | `recorder.startRecording('session-1')` |
| `record()` | 记录一个 Intent | `recorder.record(intent)` |
| `stopRecording()` | 停止录制 | `const session = recorder.stopRecording()` |
| `exportSession()` | 导出为 JSON | `const json = recorder.exportSession(session)` |
| `importSession()` | 从 JSON 导入 | `const session = recorder.importSession(json)` |

---

## 工具类速查

### HealthUtil

```typescript
import { HealthUtil } from './utils';

// 组件级操作
const damaged = HealthUtil.takeDamage(health, 20);
const healed = HealthUtil.heal(health, 10);
const alive = HealthUtil.isAlive(health);
const percent = HealthUtil.getPercentage(health);

// 实体级操作
const result = HealthUtil.takeDamageEntity(entity, 20);
HealthUtil.healEntity(entity, 10);
HealthUtil.isEntityAlive(entity);
```

### EnergyUtil

```typescript
import { EnergyUtil } from './utils';

// 组件级操作
const result = EnergyUtil.consume(energy, 10);
const recharged = EnergyUtil.recharge(energy, 20);
const hasEnough = EnergyUtil.hasEnough(energy, 5);
const depleted = EnergyUtil.isDepleted(energy);

// 实体级操作
const consumeResult = EnergyUtil.consumeEntity(entity, 10);
if (consumeResult.consumed) { /* 消耗成功 */ }
```

---

## 最佳实践

### 1. 组件设计

```typescript
// ✅ 正确：纯数据组件
class Health extends Component {
  constructor(public current: number, public maximum: number = current) {
    super();
  }
}

// ❌ 错误：包含业务逻辑
class Health extends Component {
  takeDamage(amount: number) { /* ... */ }
}
```

### 2. 使用工具类

```typescript
// ✅ 正确：使用工具类
const newHealth = HealthUtil.takeDamage(health, 20);

// ❌ 错误：直接修改组件
health.current -= 20;
```

### 3. 检查返回值

```typescript
// ✅ 正确：检查操作结果
const result = HealthUtil.takeDamageEntity(entity, 20);
if (result.success) {
  // 操作成功
}

// ❌ 错误：忽略返回值
HealthUtil.takeDamageEntity(entity, 20);
```
