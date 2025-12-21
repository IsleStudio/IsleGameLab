# ECS 框架实战示例 (Examples)

本文档提供了基于本 ECS 框架的多种常见游戏场景实现示例，涵盖了基础用法、层级结构、事件系统及新增的 Intent 驱动模式。

---

## 1. 基础场景：移动与输入 (Movement & Input)
**场景描述**：一个简单的 RPG 角色，根据键盘输入移动。
**风格选择**：**函数式 (Functional)** - 逻辑简单，无内部状态，适合函数式写法。

```typescript
import { query, res, Stage } from '../ecs';

// --- Components ---
class Position extends Component { constructor(public x: number, public y: number) { super(); } }
class Velocity extends Component { constructor(public x: number, public y: number) { super(); } }
class InputState extends Resource { public x: number = 0; public y: number = 0; }

// --- Setup ---
ecs.insertResource(new InputState());

// System 1: 输入处理 (Update 阶段)
ecs.addSystem(Stage.Update, 
    [res(InputState)], 
    (input) => {
        // 模拟读取键盘
        input.x = 0; 
        // if (keyboard.isDown('ArrowRight')) input.x += 1;
    }
);

// System 2: 移动逻辑 (Update 阶段)
ecs.addSystem(Stage.Update,
    [query(Position, Velocity), res(InputState)],
    (movers, input) => {
        const dt = 0.016; 
        for (const [pos, vel] of movers) {
            vel.x = input.x * 100;
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;
        }
    }
);

// Spawn Player
ecs.spawn()
    .insert(new Position(0, 0))
    .insert(new Velocity(0, 0))
    .done();
```

---

## 2. 层级结构：坦克与炮塔 (Hierarchy & Composition)
**场景描述**：坦克由底座和炮塔组成。移动底座时，炮塔跟随。
**风格选择**：**面向对象 (Class-based)** - 逻辑稍复杂，且需要访问组件所属的 Entity (通过 `comp.entity`)。

```typescript
// --- Components ---
class TankBody extends Component {}
class TankTurret extends Component {}
class Transform extends Component { constructor(public x=0, public y=0, public rotation=0) { super(); } }
class GlobalTransform extends Component { constructor(public x=0, public y=0, public rotation=0) { super(); } }

// --- Systems ---
class TransformPropagateSystem extends System<[Transform, GlobalTransform]> {
    // 声明依赖 (数组)
    componentsRequired = [Transform, GlobalTransform];
    
    update(components: Iterable<[Transform, GlobalTransform]>) {
        for (const [local, global] of components) {
            // 通过组件反向获取 Entity，再获取父节点
            const parent = local.entity.getParent();

            if (parent && parent.has(GlobalTransform)) {
                const parentGlobal = parent.get(GlobalTransform)!;
                global.x = parentGlobal.x + local.x; 
                global.y = parentGlobal.y + local.y;
                global.rotation = parentGlobal.rotation + local.rotation;
            } else {
                global.x = local.x;
                global.y = local.y;
                global.rotation = local.rotation;
            }
        }
    }
}

// --- Setup ---
ecs.addSystem(Stage.Update, new TransformPropagateSystem());

// 创建坦克
// 1. 创建底座 (父节点)
const tankBody = ecs.spawn()
    .insert(new TankBody())
    .insert(new Transform(100, 100, 0))
    .insert(new GlobalTransform())
    .done();

// 2. 创建炮塔 (子节点) 并设置父节点
ecs.spawn()
    .insert(new TankTurret())
    .insert(new Transform(0, 10, 0)) // 相对坐标
    .insert(new GlobalTransform())
    .setParent(tankBody) // 关键：设置父节点
    .done();
```

---

## 3. 事件冒泡：UI 点击系统 (Event Bubbling)
**场景描述**：一个 UI 面板包含一个按钮。点击按钮时，按钮响应点击，同时面板也需要知道自己被点击了（例如用于把面板置顶）。

```typescript
// --- Events ---
class ClickEvent extends Event { constructor(public x: number, public y: number) { super(); } }

// --- Components ---
class UIPanel extends Component { name: string; constructor(name: string) { super(); this.name = name; } }
class UIButton extends Component { label: string; constructor(label: string) { super(); this.label = label; } }

// --- Setup ---

// 1. 创建 UI 结构
const panel = ecs.spawn()
    .insert(new UIPanel("MainPanel"))
    .done();

const button = ecs.spawn()
    .insert(new UIButton("Close"))
    .setParent(panel) // 按钮挂在面板下
    .done();

// 2. 注册观察者 (Observers)

// 按钮逻辑：处理具体的点击行为
button.observe(ClickEvent, (trigger) => {
    const btn = trigger.entity!.get(UIButton)!;
    console.log(`Button '${btn.label}' clicked at ${trigger.event.x}, ${trigger.event.y}`);
});

// 面板逻辑：处理通用的容器行为
panel.observe(ClickEvent, (trigger) => {
    const pnl = trigger.entity!.get(UIPanel)!;
    console.log(`Panel '${pnl.name}' received click event from child.`);
});

// 3. 模拟点击
// 假设鼠标点击了按钮
ecs.trigger(new ClickEvent(500, 300), button);
```

---

## 4. 缓冲事件：碰撞与音效 (Buffered Events)
**场景描述**：物理系统检测到碰撞，发送 `CollisionEvent`。音效系统在下一帧处理这些事件。
**风格选择**：**面向对象 (Class-based)** - 需要访问 `this.ecs` 来创建 EventWriter/Reader (目前函数式参数暂不支持 EventBuffer)。

```typescript
// --- Events ---
class CollisionEvent extends Event { 
    constructor(public entityA: Entity, public entityB: Entity) { super(); } 
}

// --- Systems ---
class PhysicsSystem extends System<[Collider]> {
    componentsRequired = [Collider];
    
    update(colliders: Iterable<[Collider]>) {
        // ... 物理检测逻辑 ...
        if (checkCollision(a, b)) {
            // 发送缓冲事件
            this.ecs.pushEvent(new CollisionEvent(a, b));
        }
    }
}

class AudioSystem extends System<[]> {
    componentsRequired = []; // 不需要遍历实体
    
    update() {
        // 读取上一帧发生的所有碰撞
        // 注意：实际代码中可能需要从 ecs.eventQueues 获取，或等待框架提供更便捷的 Reader
        // 这里假设有一个 helper 方法
        const events = this.ecs.getEvents(CollisionEvent); 
        for (const event of events) {
            console.log("Play Sound: BOOM!");
        }
    }
}

// --- Setup ---
ecs.addSystem(Stage.FixedUpdate, new PhysicsSystem());
ecs.addSystem(Stage.Update, new AudioSystem());
```

---

## 5. 综合应用：技能系统 (Skills & Hooks)
**场景描述**：释放一个火球技能。
1.  **Spawn**: 创建火球实体。
2.  **Hook**: 火球创建时自动播放“发射”音效。
3.  **System**: 火球飞行。
4.  **Trigger**: 火球命中敌人，触发 `DamageEvent`。
5.  **Observer**: 敌人扣血，如果死亡触发 `DeathEvent`。

```typescript
// --- Components ---
class Fireball extends Component {
    // 生命周期 Hook：创建时自动播放音效
    static onAdd(entity: Entity) {
        console.log("SFX: Fireball Launch Whoosh!");
    }
}
class Health extends Component { constructor(public val: number) { super(); } }

// --- Events ---
class DamageEvent extends Event { constructor(public amount: number) { super(); } }

// --- Setup ---

// 敌人实体
const enemy = ecs.spawn()
    .insert(new Health(50))
    .observe(DamageEvent, (trigger) => {
        const hp = trigger.entity!.get(Health)!;
        hp.val -= trigger.event.amount;
        console.log(`Enemy took ${trigger.event.amount} dmg. HP: ${hp.val}`);
        
        if (hp.val <= 0) {
            trigger.entity!.despawnRecursive(); // 死亡销毁
            console.log("Enemy died.");
        }
    })
    .done();

// 模拟火球系统逻辑
function castFireball(target: Entity) {
    // 1. 创建火球 (触发 onAdd)
    const fireball = ecs.spawn().insert(new Fireball()).done();
    
    // ... 几秒后火球击中 ...
    
    // 2. 触发伤害 (立即执行 Observer)
    ecs.trigger(new DamageEvent(20), target);
    
    // 3. 销毁火球
    fireball.despawnRecursive();
}
```

---

## 6. 工具类使用示例 (Utility Classes Usage)

**场景描述**：展示如何使用工具类处理组件操作，遵循纯数据组件原则。

### A. 基础工具类操作

```typescript
import { HealthUtil, EnergyUtil, InventoryUtil } from './utils';
import { Health, Energy } from './components/basic';
import { Inventory } from './components/gameobject';

// --- 组件级操作（不可变） ---

// 生命值操作
const health = new Health(100, 100);
const damaged = HealthUtil.takeDamage(health, 30);
console.log(health.current);   // 100 (原组件不变)
console.log(damaged!.current); // 70  (新组件)

// 能量操作
const energy = new Energy(50, 100, 5);
const consumeResult = EnergyUtil.consume(energy, 20);
if (consumeResult?.success) {
  console.log('消耗成功，剩余:', consumeResult.energy.current); // 30
}
```

### B. 实体级操作

```typescript
// --- 实体级操作（直接更新实体） ---

// 创建带组件的实体
const entity = ecs.spawn()
  .insert(new Health(100, 100))
  .insert(new Energy(50, 100))
  .done();

// 对实体造成伤害
const damageResult = HealthUtil.takeDamageEntity(entity, 25);
if (damageResult.success) {
  console.log('新生命值:', damageResult.value!.current);
}
```

---

## 7. Intent 驱动：命令模式 (Intent Driven) - **新增特性**
**场景描述**：使用 Intent 来请求移动，而不是直接修改速度。这支持了 Replay 功能。

```typescript
// --- Intent ---
class MoveIntent extends Intent {
    constructor(public dx: number, public dy: number) { super(); }
}

// --- System ---
ecs.addSystem(Stage.Update,
    [query(Position, MoveIntent)],
    (movers) => {
        for (const [pos, intent] of movers) {
            if (intent.processed) continue;

            // 处理移动意图
            pos.x += intent.dx;
            pos.y += intent.dy;

            intent.processed = true;
            
            // 可选：处理完后移除 Intent 组件
            // pos.entity.remove(MoveIntent);
        }
    }
);

// --- Usage ---
// 发出移动请求
playerEntity.add(new MoveIntent(10, 0));
```

---

## 8. Context Layer：战斗状态 (Tag Components) - **新增特性**
**场景描述**：使用 TagComponent 标记实体处于“战斗中”状态，并仅在战斗中执行特定逻辑。

```typescript
// --- Tags ---
class InCombat extends TagComponent {}

// --- System ---
// 仅处理处于战斗状态的实体
ecs.addSystem(Stage.Update,
    [query(Health).with(InCombat)], 
    (fighters) => {
        for (const [health] of fighters) {
            // 战斗中的生命值再生逻辑（例如减慢再生）
            if (health.value < 100) {
                health.value += 0.1; 
            }
        }
    }
);

// --- Usage ---
// 进入战斗
playerEntity.add(new InCombat());

// 离开战斗
playerEntity.remove(InCombat);
```
