# 项目架构设计文档

## 架构理念：混合模式 - "该ECS的地方ECS，该OOP的地方OOP"

本项目采用**混合架构**，根据不同场景选择最合适的设计模式。

---

## 📊 架构决策矩阵

| 场景 | 使用模式 | 实现方式 | 示例 |
|------|---------|---------|------|
| **全局状态** | ECS Resource | 单例全局资源 | `GameState`, `UserSession`, `SnakeGameResource` |
| **UI状态** | ECS Component + Intent | 响应式事件驱动 | `NavigateIntent`, `LoginIntent` |
| **简单标记** | ECS Tag Component | 轻量级标识 | `SnakeGameActive` |
| **复杂游戏对象** | OOP类 + ECS包装 | 业务逻辑封装在类中，Component持有引用 | `Snake`（当前是胖组件） |
| **大量同类实体** | 纯ECS | Entity + 原子化Component | 粒子系统、子弹系统（未来） |
| **工具函数** | 静态工具类 | 无状态函数 | `SnakeUtil`, `UserUtil` |

---

## 🏗️ 当前架构分层

```
┌─────────────────────────────────────────┐
│        Presentation Layer (UI)          │
│  - React Components                     │
│  - Pixi.js Renderer                     │
│  - ECS Hooks (useECSResource, etc.)     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│          ECS Layer (调度层)              │
│  - Systems: 负责调度和协调               │
│  - Resources: 全局状态                   │
│  - Intents: 事件驱动                     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│       Business Logic Layer              │
│  - Components: 数据容器或OOP包装         │
│  - Entities (OOP): 复杂业务逻辑         │
│  - Utils: 工具函数                       │
└─────────────────────────────────────────┘
```

---

## 🎮 贪吃蛇游戏架构设计

### 当前架构（可用但不理想）

```typescript
// ❌ "胖组件" - 包含所有逻辑和数据
class Snake extends Component {
  segments: SnakeSegment[] = [];
  direction: Direction;
  // ... 复杂逻辑
}

// System直接操作组件数据
class SnakeMovementSystem {
  update() {
    snake.segments.unshift(newHead);
    // ...
  }
}
```

**问题：**
- Snake组件包含整个游戏对象
- 违背ECS的"组件=纯数据"理念
- 适合当前单人游戏，但难以扩展

---

### 推荐架构（混合模式）

```typescript
// ✅ OOP类封装业务逻辑
class SnakeEntity {
  private segments: SnakeSegment[];

  move(): void { /* 移动逻辑 */ }
  checkCollision(): boolean { /* 碰撞检测 */ }
  grow(): void { /* 生长逻辑 */ }
}

// ✅ ECS Component作为轻量包装
class SnakeComponent extends Component {
  entity: SnakeEntity; // 持有OOP对象引用
}

// ✅ System只负责调度
class SnakeMovementSystem {
  update(components) {
    for (const [snakeComp] of components) {
      snakeComp.entity.move(); // 委托给OOP对象
    }
  }
}
```

**优势：**
- 业务逻辑内聚在 `SnakeEntity` 中
- 易于测试（可单独测试OOP类）
- ECS负责调度和协调
- 符合单一职责原则

---

### 未来架构（纯ECS，仅在需要时）

```typescript
// ✅ 每个身体段一个Entity（仅在需要多人游戏时使用）
Entity(Head) = [Position, SnakeHead, Direction, PlayerInput]
Entity(Body1) = [Position, SnakeBody, FollowTarget(Head)]
Entity(Body2) = [Position, SnakeBody, FollowTarget(Body1)]
```

**适用场景：**
- 多人贪吃蛇（大量蛇实例）
- 蛇的身体段需要独立行为
- 性能优化需求

---

## 📂 目录结构设计

```
src/
├── core/                    # ECS核心框架
│   └── ecs/                 # ✅ 纯ECS框架，保持通用性
│       ├── Component.ts
│       ├── System.ts
│       ├── World.ts
│       ├── Resource.ts
│       ├── Intent.ts
│       └── Event.ts
│
├── gameplay/                # 游戏业务逻辑
│   ├── entities/            # 🆕 OOP游戏对象（建议新增）
│   │   ├── SnakeEntity.ts   # 贪吃蛇逻辑封装
│   │   └── index.ts
│   │
│   ├── components/          # ECS组件
│   │   ├── snake.ts         # 当前：胖组件 / 未来：轻量包装
│   │   ├── user.ts          # ✅ 简单数据组件
│   │   └── ui.ts            # ✅ UI状态组件
│   │
│   ├── systems/             # ✅ ECS系统（调度层）
│   │   ├── SnakeMovementSystem.ts
│   │   ├── SnakeCollisionSystem.ts
│   │   └── ...
│   │
│   ├── resources/           # ✅ 全局状态资源
│   │   ├── SnakeGameResource.ts
│   │   ├── UserSession.ts
│   │   └── GameState.ts
│   │
│   ├── intents/             # ✅ 事件/意图
│   │   ├── snake.ts
│   │   └── user.ts
│   │
│   └── utils/               # ❌ 工具函数（OOP静态方法）
│       ├── SnakeUtil.ts
│       └── UserUtil.ts
│
├── presentation/            # 表现层
│   ├── ui/                  # React UI
│   │   ├── hooks/           # ✅ ECS集成Hooks
│   │   └── components/
│   │
│   └── adapters/            # 适配器（Pixi.js等）
│       └── web/
│           └── PixiWebRenderer.ts
│
└── server/                  # 服务器/游戏世界
    ├── GameWorld.ts         # ✅ ECS World管理
    └── TickSystem.ts
```

---

## 🎯 具体实践指南

### 1. 何时使用ECS Resource？

```typescript
// ✅ 全局单例状态
export class SnakeGameResource extends Resource {
  config: SnakeGameConfig;
  isGameRunning: boolean;
  lastMoveTime: number;
}

// ✅ 用户会话
export class UserSession extends Resource {
  username: string;
  isLoggedIn: boolean;
}
```

**使用场景：**
- 全局配置
- 用户会话
- 游戏状态机
- 单例服务

---

### 2. 何时使用ECS Component？

```typescript
// ✅ 简单数据容器
export class Position extends Component {
  x: number;
  y: number;
}

// ✅ Tag Component（标记）
export class SnakeGameActive extends Component {}

// ⚠️ 胖组件（当前使用，未来优化）
export class Snake extends Component {
  segments: SnakeSegment[]; // 复杂数据结构
}

// ✅ 未来推荐：轻量包装
export class SnakeComponent extends Component {
  entity: SnakeEntity; // 引用OOP对象
}
```

---

### 3. 何时使用OOP类？

```typescript
// ✅ 复杂业务逻辑封装
export class SnakeEntity {
  private segments: SnakeSegment[];

  // 业务方法
  move(): void { /* ... */ }
  grow(): void { /* ... */ }
  checkCollision(): boolean { /* ... */ }

  // 数据访问
  getSegments(): SnakeSegment[] { return this.segments; }
}

// ✅ 工具类
export class SnakeUtil {
  static spawnFood(/*...*/): Food {
    // 无状态工具函数
  }
}
```

**使用场景：**
- 复杂的业务逻辑
- 需要封装的状态
- 工具函数

---

### 4. 何时使用Intent？

```typescript
// ✅ 用户操作/事件
export class LoginIntent extends Intent {
  username: string;
  password: string;
}

// ✅ 导航事件
export class NavigateIntent extends Intent {
  route: string;
}

// ✅ 游戏控制
export class SnakeDirectionIntent extends Intent {
  direction: Direction;
}
```

**使用场景：**
- 用户输入
- UI事件
- 跨系统通信

---

## 🔄 系统执行顺序管理

```typescript
// GameWorld.ts - 明确的系统注册顺序
private registerSystems(): void {
  // Update阶段 - 按依赖顺序注册
  this.ecs.addSystem(Stage.Update, new SnakeGameInitSystem());
  this.ecs.addSystem(Stage.Update, new SnakeMovementSystem());  // 先移动
  this.ecs.addSystem(Stage.Update, new SnakeCollisionSystem()); // 后检测
  this.ecs.addSystem(Stage.Update, new GameSpeedSystem());
  this.ecs.addSystem(Stage.Update, new GameOverSystem());
  this.ecs.addSystem(Stage.Update, new IntentCleanupSystem());  // 最后清理

  // PostUpdate阶段 - 渲染
  this.ecs.addSystem(Stage.PostUpdate, new PixiRenderSystem());
}
```

**关键原则：**
- 明确标注系统间的依赖关系
- 添加注释说明执行顺序原因
- 考虑引入系统优先级机制

---

## 📈 重构路线图

### 阶段1：现状优化（立即）
- [x] 修复移动和碰撞逻辑bug
- [ ] 添加架构文档注释
- [ ] 提取部分逻辑到Util类

### 阶段2：引入混合模式（短期）
- [ ] 创建 `SnakeEntity` OOP类
- [ ] 重构 `Snake` Component为轻量包装
- [ ] 更新System使用OOP对象的方法

### 阶段3：完善工具链（中期）
- [ ] 添加单元测试覆盖
- [ ] 性能分析工具
- [ ] 系统依赖图可视化

### 阶段4：纯ECS（长期，仅在需要时）
- [ ] 多人游戏支持
- [ ] 每个身体段独立Entity
- [ ] 批量处理优化

---

## 🧪 测试策略

```typescript
// ✅ OOP类易于单元测试
describe('SnakeEntity', () => {
  it('should move correctly', () => {
    const snake = new SnakeEntity([{x: 5, y: 5}]);
    snake.move();
    expect(snake.getHead()).toEqual({x: 6, y: 5}); // 假设向右
  });
});

// ✅ System集成测试
describe('SnakeMovementSystem', () => {
  it('should update snake position', () => {
    const ecs = createTestECS();
    const entity = ecs.createEntity();
    entity.add(SnakeComponent, { entity: new SnakeEntity([/*...*/]) });

    ecs.update();

    // 验证结果
  });
});
```

---

## 📚 参考资料

- [Bevy ECS设计哲学](https://bevyengine.org/learn/book/getting-started/ecs/)
- 当前项目的ECS框架借鉴了Bevy的设计
- 混合架构参考：Unity的GameObject（ECS + OOP）

---

## 🎓 关键takeaways

1. **没有银弹**：ECS不是万能的，OOP也不是过时的
2. **务实选择**：根据具体场景选择合适的模式
3. **逐步演进**：从简单开始，需要时才优化
4. **可测试性**：好的架构应该易于测试
5. **文档先行**：明确设计决策，方便未来维护

---

**最后更新：** 2025-12-26
**维护者：** 项目团队
