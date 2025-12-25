# ECS 框架开发路线图

## TODO - 待实现功能

### 🔧 Commands 系统增强

**背景：**
当前的 `EntityCommands` 是立即执行的（调用 `insert()`/`remove()` 时直接修改 ECS 状态），不符合 Bevy 的缓冲式设计。需要支持两种执行模式：

#### 设计方案

```typescript
// 方案 1: 立即执行（默认，保持向后兼容）
ecs.spawn()
  .insert(new Position(0, 0))
  .insert(new Velocity(1, 1))
  .do();  // 立即应用所有操作

// 方案 2: 延迟执行（帧尾批量应用）
ecs.spawn()
  .insert(new Position(0, 0))
  .insert(new Velocity(1, 1))
  .do()
  .delay();  // 缓冲到帧尾，批量应用

// 或者更简洁的链式 API
ecs.spawn()
  .insert(new Position(0, 0))
  .delay();  // 直接延迟整个命令链
```

#### API 设计细节

**立即执行模式（当前行为）：**
```typescript
class EntityCommands {
  // 立即执行所有操作
  public do(): Entity {
    // 当前实现已经是立即执行
    return this.entity;
  }
}

// 使用
const entity = ecs.spawn()
  .insert(new Health(100))
  .do();  // 立即创建实体和组件
```

**延迟执行模式（新增）：**
```typescript
class EntityCommands {
  // 延迟执行，返回一个 Promise 或命令句柄
  public delay(): DelayedCommand {
    // 将命令推入缓冲队列
    this.ecs.commandQueue.push({
      apply: () => {
        // 在帧尾统一应用
        this.entity.insert(...);
      }
    });
    return new DelayedCommand(this.entity);
  }
}

// 使用
ecs.spawn()
  .insert(new Health(100))
  .delay();  // 推入队列，帧尾执行

// 在 ECS.update() 中应用
class ECS {
  public update(): void {
    // 1. 执行所有系统
    this.runStage(Stage.Update);

    // 2. 应用延迟命令
    this.commandQueue.flush();

    // 3. 清理销毁的实体
    this.cleanupEntities();
  }
}
```

#### 实现要点

1. **命令队列 (CommandQueue)**
   ```typescript
   interface Command {
     apply(ecs: ECS): void;
   }

   class CommandQueue {
     private commands: Command[] = [];

     push(command: Command): void {
       this.commands.push(command);
     }

     flush(ecs: ECS): void {
       for (const cmd of this.commands) {
         cmd.apply(ecs);
       }
       this.commands = [];
     }
   }
   ```

2. **具体命令类型**
   ```typescript
   class InsertCommand implements Command {
     constructor(
       private entityId: number,
       private component: Component
     ) {}

     apply(ecs: ECS): void {
       const entity = ecs.getEntity(this.entityId);
       entity?.insert(this.component);
     }
   }

   class RemoveCommand implements Command {
     constructor(
       private entityId: number,
       private componentClass: ComponentClass
     ) {}

     apply(ecs: ECS): void {
       const entity = ecs.getEntity(this.entityId);
       entity?.remove(this.componentClass);
     }
   }
   ```

3. **修改 EntityCommands**
   ```typescript
   export class EntityCommands {
     private immediateMode = true;  // 默认立即执行

     public insert(component: Component): EntityCommands {
       if (this.immediateMode) {
         // 立即执行
         this.ecs.addComponent(this.entity, component);
       } else {
         // 推入命令队列
         this.ecs.commandQueue.push(
           new InsertCommand(this.entity.id, component)
         );
       }
       return this;
     }

     public do(): Entity {
       this.immediateMode = true;
       return this.entity;
     }

     public delay(): DelayedCommand {
       this.immediateMode = false;
       return new DelayedCommand(this.entity);
     }
   }
   ```

#### 优势

**立即执行模式：**
- ✅ 简单直接，适合简单场景
- ✅ 向后兼容，不破坏现有代码
- ✅ 调试友好，执行流程清晰

**延迟执行模式：**
- ✅ 避免迭代器失效（在遍历组件时修改）
- ✅ 批量操作性能更好
- ✅ 更符合 Bevy 的设计理念
- ✅ 支持并行系统（未来扩展）

#### 使用场景

**立即执行：**
```typescript
// 游戏初始化时创建实体
function initGame(ecs: ECS) {
  const player = ecs.spawn()
    .insert(new Player())
    .insert(new Position(0, 0))
    .do();  // 立即创建
}
```

**延迟执行：**
```typescript
// 在系统中批量创建/删除实体
class EnemySpawnSystem extends System {
  update() {
    for (const spawnPoint of this.query(SpawnPoint)) {
      // 不会立即修改 ECS，避免迭代器失效
      this.ecs.spawn()
        .insert(new Enemy())
        .insert(new Position(spawnPoint.x, spawnPoint.y))
        .delay();  // 帧尾统一创建
    }
  }
}
```

#### 参考资料

- [Bevy Commands 文档](https://docs.rs/bevy/latest/bevy/ecs/system/struct.Commands.html)
- [Unity DOTS EntityCommandBuffer](https://docs.unity3d.com/Packages/com.unity.entities@0.17/manual/entity_command_buffer.html)

---

### 优先级

- 🔴 **高优先级**：Commands 系统增强（影响游戏稳定性和性能）
- 🟡 **中优先级**：（待添加）
- 🟢 **低优先级**：（待添加）

---

### 贡献指南

如果你想实现上述功能：
1. 在实现前先在 GitHub Issues 中讨论设计方案
2. 确保添加完整的单元测试
3. 更新相关文档（API_GUIDE.md）
4. 保持向后兼容性

---

*最后更新：2025-12-26*
