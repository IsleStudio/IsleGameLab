# ECS 框架文档 (Hybrid Architecture)

## 1. 概述 (Overview)

本项目的 ECS (Entity-Component-System) 框架采用了一种 **混合架构 (Hybrid Architecture)**。它结合了 **Rust Bevy Engine** 的现代化 API 设计风格与 **Lua ECS (DSE)** 的灵活立即响应机制。

**核心设计理念：**
*   **结构化数据流 (Bevy-like)**：使用 `World`, `System`, `Query`, `Resource` 等概念管理游戏状态，确保数据流向清晰，易于维护。
*   **立即响应能力 (Lua-style)**：保留了 `Observer` (观察者) 和 `Trigger` (触发器) 机制，允许在特定逻辑节点（如死亡结算、技能释放）立即同步执行代码，避免帧延迟。
*   **Intent 驱动 (Replay-ready)**：引入 `Intent` 层，将用户意图与具体逻辑分离，天然支持录制与回放 (Replay)。
*   **模块化设计**：核心功能拆分为独立模块，职责单一，类型安全。

---

## 2. 接口映射与对应关系 (API Mapping)

下表展示了本框架 API 与 Bevy Engine 及原 Lua ECS 的对应关系。

| 概念 | 本框架 API (TypeScript) | Bevy Engine (Rust) | Lua ECS (DSE) | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **世界** | `ecs` / `World` | `App` / `World` | `dse` (全局命名空间) | ECS 上下文容器 |
| **创建实体** | `ecs.spawn()` | `commands.spawn()` | `dse.createEntity()` | 返回 `EntityCommands` 用于链式构建 |
| **添加组件** | `.insert(new Comp())` | `.insert(Comp)` | `entity:addComp(Comp)` | |
| **移除组件** | `.remove(Comp)` | `.remove::<Comp>()` | `entity:removeComp(Comp)` | EntityCommands 链式移除 |
| **获取组件** | `entity.get(Comp)` | `Query.get(entity)` | `entity:getComp(Comp)` | 直接从实体获取组件 |
| **获取资源** | `ecs.getResource(Res)` | `Res<T>` | `dse.getSingleComp(Res)` | 全局单例组件 |
| **缓冲事件** | `ecs.pushEvent()` | `EventWriter.send()` | `dse.dispatchEvent()` | **跨帧**，下一帧处理 (解耦) |
| **立即事件** | `ecs.trigger(evt)` | `commands.trigger()` | `event:trigger()` | **同步**，当前栈执行 (强逻辑) |
| **监听事件** | `ecs.addObserver()` | `app.observe()` | `dse.createEventSystem()` | 监听立即事件 |
| **初始化Hook**| `ecs.addInitializeSystem`| `ComponentHooks` (OnAdd) | `dse.createCompInitializeSystem` | 组件添加时触发 |
| **销毁Hook** | `ecs.addDestroySystem` | `ComponentHooks` (OnRemove)| `dse.createCompDestroySystem` | 组件移除前触发 |

---

## 3. 详细使用指南 (Usage Guide)

### 3.1. 实体与组件 (Entities & Components)

使用 `spawn()` 开启链式调用，`insert()` 添加组件。
`Entity` 类现在提供了 Lua 风格的便捷方法。

```typescript
// 定义组件
class Position extends Component { constructor(public x: number, public y: number) { super(); } }
class Health extends Component { constructor(public value: number) { super(); } }

// 创建实体
const entity = ecs.spawn()
    .insert(new Position(0, 0))
    .insert(new Health(100))
    .done(); // 获取 Entity 对象

// Lua 风格访问
const pos = entity.get(Position); // 或 entity.getComp(Position)
entity.add(new Velocity(1, 0));   // 或 entity.addComp(...)

// 组件内部反向引用
class MyComp extends Component {
    update() {
        // 直接访问所属实体
        if (this.entity.isDestroyed()) return;
    }
}
```

### 3.2. 层级系统 (Hierarchy)

本框架支持实体间的父子关系，用于构建复杂的组合对象（如：坦克底座+炮塔、UI 树、骨骼层级）。

**核心 API:**
*   `entity.setParent(parent)`: 设置父节点。
*   `entity.addChild(child)`: 添加子节点。
*   `entity.removeParent()`: 断开父子关系。
*   `entity.despawnRecursive()`: 递归销毁自己及所有子节点。
*   `commands.setParent(parent)`: EntityCommands 链式设置父节点。
*   `commands.removeParent()`: EntityCommands 链式移除父节点。
*   `commands.done()`: 完成实体构建，返回实体对象。

**Flecs Builder 风格扩展:**
*   `commands.when(condition, callback)`: 条件性执行操作，如果条件为真则执行回调。

**组件:**
*   `Parent`: 指向父实体的组件。
*   `Children`: 包含子实体列表的组件（框架自动维护，请勿手动修改）。

```typescript
// 创建父子结构
const parent = ecs.spawn().insert(new TankBody()).done();

ecs.spawn()
    .insert(new TankTurret())
    .setParent(parent) // 设置父节点
    .done();
```

### 3.3. 系统与查询 (Systems & Queries)

系统是 ECS 的逻辑核心，负责每帧更新游戏状态。本框架支持 **函数式 (Functional)** 和 **面向对象 (Class-based)** 两种定义方式，并提供了灵活的调度阶段。

#### A. 调度阶段 (Scheduling Stages)
系统可以被添加到不同的执行阶段：
*   `Stage.Startup`: 游戏启动时运行一次 (用于初始化资源、生成实体)。
*   `Stage.Update`: 每帧运行 (用于核心逻辑、输入处理、渲染同步)。
*   `Stage.FixedUpdate`: 固定时间间隔运行 (用于物理模拟)。

#### B. 函数式系统 (Functional Systems) - **推荐**
类似 Bevy 的现代化写法，利用 `query` 和 `res` 辅助函数进行参数注入，代码简洁优雅。

```typescript
import { query, res, Stage } from './ecs';

ecs.addSystem(Stage.Update, 
    [
        // Query 1: 所有移动物体 (位置 + 速度)
        query(Position, Velocity), 
        // Query 2: 仅玩家 (位置)，必须有 Player 组件，排除 Enemy 组件
        query(Position).with(Player).without(Enemy),
        // Resource: 时间
        res(Time)
    ], 
    (movers, players, time) => {
        // movers 自动推导为 Iterable<[Position, Velocity]>
        for (const [pos, vel] of movers) {
            pos.x += vel.x * time.deltaTime;
        }
    }
);
```

#### C. 面向对象系统 (Class-based Systems)
传统的继承写法，适合需要维护复杂内部状态（如缓存、状态机）的系统。

```typescript
class MovementSystem extends System<[Position, Velocity]> {
    // 必须声明组件依赖
    componentsRequired = [Position, Velocity];

    // 可选：维护系统内部状态
    private tempVector = new Vector3(0, 0, 0);

    update(components: Iterable<[Position, Velocity]>) {
        for (const [pos, vel] of components) {
            // ... 逻辑 ...
        }
    }
}

// 添加到默认的 Update 阶段
ecs.addSystem(new MovementSystem());
```

### 3.4. 资源 (Resources)

资源是全局唯一的组件（单例），不属于任何实体。

```typescript
// 定义资源
class GameConfig extends Resource { public difficulty = 1.0; }

// 注册资源
ecs.insertResource(new GameConfig());

// 获取资源
const config = ecs.getResource(GameConfig); 
```

### 3.5. 事件系统 (Event System) - **核心差异点**

本框架区分了 **缓冲事件 (Buffered)** 和 **立即事件 (Immediate)**。

#### A. 缓冲事件 (EventBuffer)
*   **用途**：系统间解耦通信，不需要立即反馈。例如：播放音效、UI更新、成就统计。
*   **行为**：当前帧 `push`，下一帧 `pop` 处理。

```typescript
// 发送
ecs.pushEvent(new SoundEvent("boom.mp3"));

// 接收 (在 System 中)
// 需要手动从 ecs.eventQueues 获取，或者等待框架提供 EventReader 注入
```

#### B. 立即事件 / 观察者 (Observers / Triggers)
*   **用途**：强逻辑关联，需要立即改变控制流。例如：死亡结算、伤害计算、状态机跳转。
*   **行为**：调用 `trigger` 时，所有监听器立即同步执行。

```typescript
// 1. 注册全局观察者
ecs.addObserver(DeathEvent, (trigger) => {
    console.log(`Entity ${trigger.entity} died!`);
});

// 2. 注册实体级观察者 (仅监听特定实体)
ecs.spawn()
    .insert(new Player())
    .observe(DeathEvent, (trigger) => {
        console.log("Game Over!"); // 只有玩家死时触发
    })
    .done();

// 3. 触发事件
ecs.trigger(new DeathEvent(), targetEntity);
```

#### C. 事件冒泡 (Event Propagation)
当使用 `trigger` 触发立即事件，并指定了目标实体时，事件会沿着 **Parent 链** 向上冒泡。

*   **机制**：Target -> Parent -> GrandParent -> ... -> Root。
*   **用途**：UI 点击事件（按钮 -> 面板 -> 窗口）、伤害传递（炮塔受击 -> 坦克扣血）。

```typescript
// 父节点监听
parent.observe(ClickEvent, (trigger) => {
    console.log("Parent clicked via child:", trigger.entity.id);
});

// 在子节点触发
ecs.trigger(new ClickEvent(), child); // 父节点也会收到回调
```

### 3.6. 生命周期钩子 (Lifecycle Hooks)

用于在组件添加或移除时执行特定逻辑（如初始化数据、清理资源）。

**方式 A: 静态方法 (Bevy Style)**
直接在组件类中定义静态方法。

```typescript
class PhysicsBody extends Component {
    static onAdd(entity: Entity) {
        console.log("Body added to", entity.id);
    }
    
    static onRemove(entity: Entity) {
        console.log("Body removed from", entity.id);
    }
}
```

**方式 B: 注册系统 (Lua Style)**
在外部注册回调，针对特定组件类型。

```typescript
// 初始化系统 (OnAdd)
ecs.addInitializeSystem(PhysicsBody, (entity, body) => {
    body.initializePhysicsEngine();
});

// 销毁系统 (OnRemove)
ecs.addDestroySystem(PhysicsBody, (entity, body) => {
    // 注意：此时组件尚未被物理删除，仍可访问数据
    body.removeFromPhysicsWorld();
});
```

**方式 C: 事件观察者 (统一事件系统)**
`OnAdd` 和 `OnRemove` 是普通事件，组件添加/移除时自动触发。

```typescript
// 监听所有组件的添加
ecs.addObserver(OnAdd, (trigger) => {
    if (trigger.event.component instanceof Health) {
        console.log('Health component added!');
    }
});
```

---

## 4. 工具类与纯数据组件 (Utility Classes & Pure Data Components)

本框架遵循标准 ECS 设计原则：**组件是纯数据，业务逻辑在系统和工具类中处理**。

### 4.1. 纯数据组件设计

组件只包含数据字段和构造函数，不包含业务逻辑方法：

```typescript
// ✅ 正确：纯数据组件
export class Health extends Component {
  constructor(
    public current: number,
    public maximum: number = current
  ) {
    super();
  }
}

// ❌ 错误：包含业务逻辑的组件
export class Health extends Component {
  takeDamage(amount: number): void { /* 业务逻辑 */ }
  heal(amount: number): void { /* 业务逻辑 */ }
}
```

### 4.2. 工具类设计

工具类提供操作组件数据的静态方法，遵循不可变性原则：

```typescript
import { HealthUtil } from './utils';

// 组件级操作 - 返回新组件，不修改原组件
const health = new Health(100, 100);
const damaged = HealthUtil.takeDamage(health, 20);
// health.current === 100 (原组件不变)
// damaged.current === 80 (新组件)

// 实体级操作 - 直接更新实体上的组件
const result = HealthUtil.takeDamageEntity(entity, 20);
if (result.success) {
  console.log('新生命值:', result.value!.current);
}
```

---

## 5. Intent 与 Replay 系统 (Intent & Replay) - **新增特性**

为了支持游戏逻辑的确定性回放 (Deterministic Replay)，本框架引入了 **Intent (意图)** 机制。

### 5.1. 核心概念

*   **Intent**: 一种特殊的组件，继承自 `Intent` 基类。它代表了"想要执行某个操作"的请求，而不是操作本身。
*   **IntentRecorder**: 负责记录所有产生的 Intent。
*   **Replay**: 通过按时间戳顺序重新应用记录的 Intent，可以完全重现游戏状态。

### 5.2. 工作流程

1.  **用户输入**: 监听键盘/鼠标，但不直接修改游戏状态。
2.  **生成 Intent**: 将输入转换为 Intent 组件 (如 `MoveIntent`) 并添加到实体。
3.  **记录 Intent**: `IntentRecorder` 自动捕获这些 Intent。
4.  **系统处理**: 专门的 System 查询 Intent 组件，执行实际逻辑 (如修改 `Position`)，并标记 Intent 为 `processed`。

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

## 6. Context Layer (TagComponent) - **新增特性**

为了更好地管理游戏上下文状态 (Context)，框架引入了 `TagComponent`。

*   **TagComponent**: 不包含数据的组件，仅用于标记。
*   **用途**: 标记实体处于特定状态 (如 `InCombat`, `Paused`, `Dead`)。
*   **优势**: 结合 Query 的 `with/without` 过滤器，可以极其高效地筛选实体。

```typescript
// 定义标签
class InCombat extends TagComponent {}

// 标记实体
player.add(new InCombat());

// 查询特定状态的实体
const combatants = query(Player).with(InCombat);
```