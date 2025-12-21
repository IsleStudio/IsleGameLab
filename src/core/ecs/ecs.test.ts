import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ECS, 
  Component, 
  System, 
  Resource, 
  Intent, 
  TagComponent, 
  Parent, 
  Children,
  Event,
  OnAdd,
  OnRemove,
  Trigger,
  Stage,
  Query,
  query,
  res
} from './ecs';

// 测试组件
class Position extends Component {
  constructor(public x: number = 0, public y: number = 0) {
    super();
  }
}

class Velocity extends Component {
  constructor(public dx: number = 0, public dy: number = 0) {
    super();
  }
}

class Health extends Component {
  constructor(public value: number = 100) {
    super();
  }
}

// 测试Intent
class MoveIntent extends Intent {
  constructor(public targetX: number, public targetY: number) {
    super();
  }
}

// 测试标签组件
class InCombat extends TagComponent {}
class Paused extends TagComponent {}

// 测试Resource
class GameTime extends Resource {
  constructor(public elapsed: number = 0) {
    super();
  }
}

// 测试Event
class PlayerDiedEvent extends Event {
  constructor(public playerId: number) {
    super();
  }
}

class GameStartEvent extends Event {}

// 测试生命周期钩子的组件
class LifecycleTestComponent extends Component {
  static addCallCount = 0;
  static removeCallCount = 0;
  static lastEntity: any = null;

  constructor(public value: string = 'test') {
    super();
  }

  static onAdd(entity: any): void {
    LifecycleTestComponent.addCallCount++;
    LifecycleTestComponent.lastEntity = entity;
  }

  static onRemove(entity: any): void {
    LifecycleTestComponent.removeCallCount++;
    LifecycleTestComponent.lastEntity = entity;
  }

  static reset(): void {
    LifecycleTestComponent.addCallCount = 0;
    LifecycleTestComponent.removeCallCount = 0;
    LifecycleTestComponent.lastEntity = null;
  }
}

describe('ECS框架核心功能', () => {
  let ecs: ECS;

  beforeEach(() => {
    ecs = new ECS();
    // 重置生命周期测试计数器
    LifecycleTestComponent.reset();
  });

  describe('Entity创建和组件操作', () => {
    it('应该能够创建实体和添加组件', () => {
      const entity = ecs.spawn()
        .insert(new Position(10, 20))
        .insert(new Velocity(1, 2))
        .done();

      expect(entity.has(Position)).toBe(true);
      expect(entity.has(Velocity)).toBe(true);
      
      const pos = entity.get(Position);
      expect(pos?.x).toBe(10);
      expect(pos?.y).toBe(20);
    });

    it('应该能够移除组件', () => {
      const entity = ecs.spawn()
        .insert(new Position(10, 20))
        .insert(new Velocity(1, 2))
        .done();

      expect(entity.has(Position)).toBe(true);
      entity.remove(Position);
      expect(entity.has(Position)).toBe(false);
      expect(entity.has(Velocity)).toBe(true);
    });

    it('应该能够获取和修改组件数据', () => {
      const entity = ecs.spawn()
        .insert(new Position(10, 20))
        .done();

      const pos = entity.get(Position);
      expect(pos?.x).toBe(10);
      expect(pos?.y).toBe(20);

      // 修改组件数据
      if (pos) {
        pos.x = 30;
        pos.y = 40;
      }

      const updatedPos = entity.get(Position);
      expect(updatedPos?.x).toBe(30);
      expect(updatedPos?.y).toBe(40);
    });

    it('应该支持组件克隆和比较', () => {
      const pos1 = new Position(10, 20);
      const pos2 = pos1.clone();
      const pos3 = new Position(10, 20);
      const pos4 = new Position(15, 25);

      expect(pos1.equals(pos2)).toBe(true);
      expect(pos1.equals(pos3)).toBe(true);
      expect(pos1.equals(pos4)).toBe(false);
    });

    it('应该支持兄弟组件查询', () => {
      const entity = ecs.spawn()
        .insert(new Position(10, 20))
        .insert(new Velocity(1, 2))
        .done();

      const pos = entity.get(Position);
      expect(pos?.hasSibling(Velocity)).toBe(true);
      expect(pos?.hasSibling(Health)).toBe(false);

      const vel = pos?.getSibling(Velocity);
      expect(vel?.dx).toBe(1);
      expect(vel?.dy).toBe(2);
    });
  });

  describe('System注册和执行', () => {
    it('应该能够添加和运行函数式系统', () => {
      // 创建实体
      const entity = ecs.spawn()
        .insert(new Position(0, 0))
        .insert(new Velocity(5, 3))
        .done();

      // 使用函数式API添加系统
      ecs.addSystem(Stage.Update, [query(Position, Velocity)], (movers: Query<[Position, Velocity]>) => {
        for (const [pos, vel] of movers) {
          pos.x += vel.dx;
          pos.y += vel.dy;
        }
      });

      // 运行一帧
      ecs.update();

      // 验证位置更新
      const pos = entity.get(Position);
      expect(pos?.x).toBe(5);
      expect(pos?.y).toBe(3);
    });

    it('应该能够添加传统类式系统', () => {
      // 传统类式系统
      class MovementSystem extends System<[Position, Velocity]> {
        public componentsRequired = [Position, Velocity];

        public update(components: Iterable<[Position, Velocity]>): void {
          for (const [pos, vel] of components) {
            pos.x += vel.dx;
            pos.y += vel.dy;
          }
        }
      }

      // 创建实体
      const entity = ecs.spawn()
        .insert(new Position(0, 0))
        .insert(new Velocity(2, 1))
        .done();

      // 添加系统
      ecs.addSystem(new MovementSystem());

      // 运行一帧
      ecs.update();

      // 验证位置更新
      const pos = entity.get(Position);
      expect(pos?.x).toBe(2);
      expect(pos?.y).toBe(1);
    });

    it('应该能够添加系统到特定阶段', () => {
      const entity = ecs.spawn()
        .insert(new Position(0, 0))
        .insert(new Velocity(2, 1))
        .done();

      // 添加函数式系统到Startup阶段
      ecs.addSystem(Stage.Startup, [query(Position, Velocity)], (movers: Query<[Position, Velocity]>) => {
        for (const [pos, vel] of movers) {
          pos.x += vel.dx;
          pos.y += vel.dy;
        }
      });

      // 运行startup阶段
      ecs.startup();

      // 验证位置更新
      const pos = entity.get(Position);
      expect(pos?.x).toBe(2);
      expect(pos?.y).toBe(1);
    });

    it('应该只对拥有所需组件的实体运行系统', () => {
      // 创建有Position和Velocity的实体
      const entity1 = ecs.spawn()
        .insert(new Position(0, 0))
        .insert(new Velocity(1, 1))
        .done();

      // 创建只有Position的实体
      const entity2 = ecs.spawn()
        .insert(new Position(10, 10))
        .done();

      ecs.addSystem(Stage.Update, [query(Position, Velocity)], (movers: Query<[Position, Velocity]>) => {
        for (const [pos, vel] of movers) {
          pos.x += vel.dx;
          pos.y += vel.dy;
        }
      });

      ecs.update();

      // 只有entity1应该被移动
      const pos1 = entity1.get(Position);
      const pos2 = entity2.get(Position);
      
      expect(pos1?.x).toBe(1);
      expect(pos1?.y).toBe(1);
      expect(pos2?.x).toBe(10); // 未改变
      expect(pos2?.y).toBe(10); // 未改变
    });

    it('应该支持系统参数注入', () => {
      // 插入资源
      ecs.insertResource(new GameTime(100));

      let lastGameTime = 0;

      // 使用函数式API注入资源
      ecs.addSystem(Stage.Update, [res(GameTime)], (gameTime) => {
        lastGameTime = gameTime.elapsed;
      });

      ecs.update();

      expect(lastGameTime).toBe(100);
    });

    it('应该支持混合参数注入', () => {
      // 插入资源
      ecs.insertResource(new GameTime(50));

      // 创建实体
      ecs.spawn()
        .insert(new Position(0, 0))
        .insert(new Velocity(1, 2))
        .done();

      let processedEntities = 0;
      let gameTimeValue = 0;

      // 混合Query和Resource参数
      ecs.addSystem(Stage.Update, [query(Position, Velocity), res(GameTime)], (movers, gameTime) => {
        gameTimeValue = gameTime.elapsed;
        for (const [pos, vel] of movers) {
          pos.x += vel.dx * gameTime.elapsed / 100;
          pos.y += vel.dy * gameTime.elapsed / 100;
          processedEntities++;
        }
      });

      ecs.update();

      expect(processedEntities).toBe(1);
      expect(gameTimeValue).toBe(50);
    });
  });

  describe('Query过滤和遍历', () => {
    it('应该支持基础组件查询', () => {
      // 创建多个实体
      ecs.spawn().insert(new Position(1, 1)).insert(new Velocity(1, 0)).done();
      ecs.spawn().insert(new Position(2, 2)).insert(new Velocity(0, 1)).done();
      ecs.spawn().insert(new Position(3, 3)).done(); // 没有Velocity

      // 查询拥有Position和Velocity的组件
      const positions = Array.from(ecs.query(Position));
      const velocities = Array.from(ecs.query(Velocity));

      expect(positions).toHaveLength(3);
      expect(velocities).toHaveLength(2);

      // 验证组件数据
      expect(positions[0].x).toBe(1);
      expect(positions[1].x).toBe(2);
      expect(positions[2].x).toBe(3);
    });

    it('应该支持高级Query对象', () => {
      // 创建测试实体
      const entity1 = ecs.spawn()
        .insert(new Position(1, 1))
        .insert(new Velocity(1, 0))
        .insert(new Health(100))
        .done();

      const entity2 = ecs.spawn()
        .insert(new Position(2, 2))
        .insert(new Health(50))
        .done();

      const entity3 = ecs.spawn()
        .insert(new Position(3, 3))
        .insert(new Velocity(0, 1))
        .done();

      // 创建Query对象查询Position和Velocity
      const posVelQuery = new (class extends System<[Position, Velocity]> {
        public componentsRequired = [Position, Velocity];
        public update() {} // 不需要实现
      })();
      
      ecs.addSystem(posVelQuery);

      // 获取符合条件的实体
      const entities = ecs.getSystemEntities(posVelQuery);
      expect(entities.size).toBe(2); // entity1 和 entity3

      // 验证实体包含正确的组件
      const entitiesArray = Array.from(entities);
      expect(entitiesArray).toContain(entity1);
      expect(entitiesArray).toContain(entity3);
      expect(entitiesArray).not.toContain(entity2);
    });

    it('应该支持组件数据访问', () => {
      // 创建实体
      ecs.spawn().insert(new Position(10, 20)).done();
      ecs.spawn().insert(new Position(30, 40)).done();

      // 查询所有Position组件
      const positions = Array.from(ecs.query(Position));
      expect(positions).toHaveLength(2);

      // 验证可以访问组件数据
      const firstPos = positions.find(p => p.x === 10);
      const secondPos = positions.find(p => p.x === 30);

      expect(firstPos?.y).toBe(20);
      expect(secondPos?.y).toBe(40);
    });

    it('应该支持通过组件访问实体', () => {
      // 创建实体
      const entity = ecs.spawn().insert(new Position(5, 5)).insert(new Velocity(1, 1)).done();

      // 查询Position组件
      const positions = Array.from(ecs.query(Position));
      expect(positions).toHaveLength(1);

      const position = positions[0];
      expect(position.entity).toBe(entity);

      // 通过组件访问兄弟组件
      expect(position.hasSibling(Velocity)).toBe(true);
      const velocity = position.getSibling(Velocity);
      expect(velocity?.dx).toBe(1);
      expect(velocity?.dy).toBe(1);
    });

    it('应该支持Query高级函数式操作', () => {
      // 创建测试数据
      ecs.spawn().insert(new Position(1, 1)).insert(new Health(100)).done();
      ecs.spawn().insert(new Position(2, 2)).insert(new Health(50)).done();
      ecs.spawn().insert(new Position(3, 3)).insert(new Health(0)).done();

      // 创建Query
      const healthQuery = query(Position, Health);
      ecs.addSystem(healthQuery); // 注册Query以跟踪实体

      // 测试some方法
      const hasLowHealth = healthQuery.some(([pos, health]) => health.value < 75);
      expect(hasLowHealth).toBe(true);

      // 测试every方法
      const allAlive = healthQuery.every(([pos, health]) => health.value >= 0);
      expect(allAlive).toBe(true);

      // 测试reduce方法
      const totalHealth = healthQuery.reduce((sum, [pos, health]) => sum + health.value, 0);
      expect(totalHealth).toBe(150);

      // 测试single方法（应该返回undefined因为有多个结果）
      const single = healthQuery.single();
      expect(single).toBeUndefined();

      // 测试批处理操作
      const lowHealthEntities = healthQuery.batch()
        .filter(([pos, health]) => health.value < 75)
        .collectComponents();
      
      expect(lowHealthEntities).toHaveLength(2);
    });

    it('应该支持兼容性API', () => {
      // 创建实体
      ecs.spawn().insert(new Position(1, 1)).done();
      ecs.spawn().insert(new Position(2, 2)).done();

      // 测试getComps别名
      const positions = Array.from(ecs.getComps(Position));
      expect(positions).toHaveLength(2);

      // 测试getSingleComp自动创建
      const gameTime = ecs.getSingleComp(GameTime);
      expect(gameTime).toBeInstanceOf(GameTime);
      expect(gameTime.elapsed).toBe(0);
    });
  });

  describe('Event系统（缓冲和立即）', () => {
    it('应该支持立即事件触发', () => {
      let eventReceived = false;
      let receivedEvent: PlayerDiedEvent | null = null;

      // 添加全局观察者
      ecs.addObserver(PlayerDiedEvent, (trigger: Trigger<PlayerDiedEvent>) => {
        eventReceived = true;
        receivedEvent = trigger.event;
      });

      // 立即触发事件
      const event = new PlayerDiedEvent(123);
      ecs.trigger(event);

      expect(eventReceived).toBe(true);
      expect(receivedEvent).not.toBeNull();
      expect((receivedEvent as unknown as PlayerDiedEvent).playerId).toBe(123);
    });

    it('应该支持实体特定的事件观察者', () => {
      const entity = ecs.spawn().done();
      let eventReceived = false;

      // 为特定实体添加观察者
      ecs.addEntityObserver(entity, GameStartEvent, () => {
        eventReceived = true;
      });

      // 触发事件到特定实体
      ecs.trigger(new GameStartEvent(), entity);
      expect(eventReceived).toBe(true);

      // 重置并触发到其他实体
      eventReceived = false;
      const otherEntity = ecs.spawn().done();
      ecs.trigger(new GameStartEvent(), otherEntity);
      expect(eventReceived).toBe(false); // 不应该触发
    });

    it('应该支持缓冲事件系统', () => {
      // 创建实体
      const entity = ecs.spawn().insert(new Health(0)).done();
      
      // 使用函数式系统处理Health
      ecs.addSystem(Stage.Update, [query(Health)], (healthComponents) => {
        for (const [health] of healthComponents) {
          if (health.value <= 0) {
            // 触发死亡事件
            ecs.pushEvent(new PlayerDiedEvent(health.entity.id));
          }
        }
      });

      // 运行系统，应该推送死亡事件
      ecs.update();

      // 再次运行update来交换事件队列
      ecs.update();

      // 读取事件
      const events = Array.from(ecs.readEvents(PlayerDiedEvent));
      expect(events).toHaveLength(1);
      expect(events[0].playerId).toBe(entity.id);
    });

    it('应该支持事件队列交换', () => {
      // 推送事件
      ecs.pushEvent(new GameStartEvent());
      
      // 第一帧：事件应该在下一帧可读
      let events = Array.from(ecs.readEvents(GameStartEvent));
      expect(events).toHaveLength(0);

      // 运行update交换队列
      ecs.update();

      // 现在事件应该可读
      events = Array.from(ecs.readEvents(GameStartEvent));
      expect(events).toHaveLength(1);

      // 再次update，事件应该被清空
      ecs.update();
      events = Array.from(ecs.readEvents(GameStartEvent));
      expect(events).toHaveLength(0);
    });
  });

  describe('层级系统（Parent/Children）', () => {
    it('应该支持实体层级关系', () => {
      // 创建父实体和子实体
      const parent = ecs.spawn().done();
      const child1 = ecs.spawn().done();
      const child2 = ecs.spawn().done();

      // 设置层级关系
      child1.setParent(parent);
      child2.setParent(parent);

      // 验证父子关系
      expect(child1.getParent()).toBe(parent);
      expect(child2.getParent()).toBe(parent);

      // 验证父实体的子节点列表
      const children = parent.getChildren();
      expect(children).toHaveLength(2);
      expect(children).toContain(child1);
      expect(children).toContain(child2);

      // 验证组件存在
      expect(child1.has(Parent)).toBe(true);
      expect(child2.has(Parent)).toBe(true);
      expect(parent.has(Children)).toBe(true);
    });

    it('应该支持移除父节点', () => {
      const parent = ecs.spawn().done();
      const child1 = ecs.spawn().done();
      const child2 = ecs.spawn().done();

      child1.setParent(parent);
      child2.setParent(parent);

      // 测试移除父节点
      child1.removeParent();
      expect(child1.getParent()).toBeUndefined();
      expect(parent.getChildren()).toHaveLength(1);
      expect(parent.getChildren()).toContain(child2);
      expect(parent.getChildren()).not.toContain(child1);
    });

    it('应该支持递归销毁', () => {
      const parent = ecs.spawn().done();
      const child = ecs.spawn().done();
      const grandchild = ecs.spawn().done();

      child.setParent(parent);
      grandchild.setParent(child);

      // 递归销毁父节点
      parent.despawnRecursive();

      // 运行update来实际销毁实体
      ecs.update();

      // 所有实体都应该被标记为已销毁
      expect(parent.isDestroyed()).toBe(true);
      expect(child.isDestroyed()).toBe(true);
      expect(grandchild.isDestroyed()).toBe(true);
    });

    it('应该支持addChild方法', () => {
      const parent = ecs.spawn().done();
      const child = ecs.spawn().done();

      parent.addChild(child);

      expect(child.getParent()).toBe(parent);
      expect(parent.getChildren()).toContain(child);
    });
  });

  describe('生命周期钩子', () => {
    it('应该在添加组件时调用onAdd钩子', () => {
      const entity = ecs.spawn().done();
      
      expect(LifecycleTestComponent.addCallCount).toBe(0);
      
      entity.add(new LifecycleTestComponent('test'));
      
      expect(LifecycleTestComponent.addCallCount).toBe(1);
      expect(LifecycleTestComponent.lastEntity).toBe(entity);
    });

    it('应该在移除组件时调用onRemove钩子', () => {
      const entity = ecs.spawn()
        .insert(new LifecycleTestComponent('test'))
        .done();
      
      expect(LifecycleTestComponent.removeCallCount).toBe(0);
      
      entity.remove(LifecycleTestComponent);
      
      expect(LifecycleTestComponent.removeCallCount).toBe(1);
      expect(LifecycleTestComponent.lastEntity).toBe(entity);
    });

    it('应该触发OnAdd和OnRemove事件', () => {
      let onAddTriggered = false;
      let onRemoveTriggered = false;
      let addedComponent: Component | null = null;
      let removedComponent: Component | null = null;

      // 添加事件观察者
      ecs.addObserver(OnAdd, (trigger) => {
        onAddTriggered = true;
        addedComponent = trigger.event.component;
      });

      ecs.addObserver(OnRemove, (trigger) => {
        onRemoveTriggered = true;
        removedComponent = trigger.event.component;
      });

      const entity = ecs.spawn().done();
      const testComponent = new Position(10, 20);
      
      // 添加组件
      entity.add(testComponent);
      expect(onAddTriggered).toBe(true);
      expect(addedComponent).toBe(testComponent);

      // 移除组件
      entity.remove(Position);
      expect(onRemoveTriggered).toBe(true);
      expect(removedComponent).toBe(testComponent);
    });

    it('应该支持初始化和销毁系统', () => {
      let initCallCount = 0;
      let destroyCallCount = 0;
      let lastInitEntity: any = null;
      let lastDestroyEntity: any = null;

      // 注册初始化和销毁系统
      ecs.addInitializeSystem(Position, (entity, component) => {
        initCallCount++;
        lastInitEntity = entity;
      });

      ecs.addDestroySystem(Position, (entity, component) => {
        destroyCallCount++;
        lastDestroyEntity = entity;
      });

      const entity = ecs.spawn().done();
      
      // 添加组件应该触发初始化系统
      entity.add(new Position(10, 20));
      expect(initCallCount).toBe(1);
      expect(lastInitEntity).toBe(entity);

      // 移除组件应该触发销毁系统
      entity.remove(Position);
      expect(destroyCallCount).toBe(1);
      expect(lastDestroyEntity).toBe(entity);
    });
  });

  describe('Resource管理', () => {
    it('应该能够管理全局资源', () => {
      // 插入资源
      ecs.insertResource(new GameTime(100));

      // 获取资源
      const time = ecs.getResource(GameTime);
      expect(time?.elapsed).toBe(100);

      // 修改资源
      if (time) {
        time.elapsed = 200;
      }

      // 验证修改
      const updatedTime = ecs.getResource(GameTime);
      expect(updatedTime?.elapsed).toBe(200);
    });

    it('应该能够移除资源', () => {
      ecs.insertResource(new GameTime(100));
      expect(ecs.getResource(GameTime)).toBeDefined();

      ecs.removeResource(GameTime);
      expect(ecs.getResource(GameTime)).toBeUndefined();
    });
  });

  describe('Intent机制', () => {
    it('应该支持Intent机制', () => {
      // 创建Intent
      const moveIntent = new MoveIntent(100, 200);
      
      expect(moveIntent.processed).toBe(false);
      expect(moveIntent.timestamp).toBeGreaterThan(0);
      expect(moveIntent.targetX).toBe(100);
      expect(moveIntent.targetY).toBe(200);

      // 添加Intent到实体
      const entity = ecs.spawn().insert(moveIntent).done();
      
      expect(entity.has(MoveIntent)).toBe(true);
    });

    it('应该支持Intent优先级', () => {
      const intent1 = new MoveIntent(10, 10);
      const intent2 = new MoveIntent(20, 20);
      
      intent1.priority = 1;
      intent2.priority = 0; // 更高优先级

      expect(intent2.priority).toBeLessThan(intent1.priority);
    });
  });

  describe('Context Layer标签组件', () => {
    it('应该支持Context Layer标签组件', () => {
      const entity = ecs.spawn()
        .insert(new InCombat())
        .insert(new Paused())
        .done();

      expect(entity.has(InCombat)).toBe(true);
      expect(entity.has(Paused)).toBe(true);
    });

    it('应该支持标签组件的添加和移除', () => {
      const entity = ecs.spawn().done();

      expect(entity.has(InCombat)).toBe(false);
      
      entity.add(new InCombat());
      expect(entity.has(InCombat)).toBe(true);

      entity.remove(InCombat);
      expect(entity.has(InCombat)).toBe(false);
    });
  });
});