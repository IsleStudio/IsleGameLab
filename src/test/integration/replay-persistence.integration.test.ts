/**
 * 集成测试: Replay + Persistence 模块协作
 * 
 * 这些测试验证 Replay 系统和 Persistence 系统的协作功能：
 * - 从中间状态恢复后继续 Replay
 * - 状态快照与 Intent 重放的一致性
 * 
 * 这类测试不属于单元测试范畴，因为它们测试的是多个模块的集成行为。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRecorder } from '../../core/ecs/Replay';
import { ECS, Intent, Component, System, Resource } from '../../core/ecs/ecs';
import { Serializer } from '../../core/persistence/Serializer';
import * as fc from 'fast-check';

// 测试Intent类型
class MoveIntent extends Intent {
  constructor(public x: number = 0, public y: number = 0) {
    super();
  }
}

class AttackIntent extends Intent {
  constructor(public targetId: number = 0, public damage: number = 0) {
    super();
  }
}

class BuildIntent extends Intent {
  constructor(public buildingType: string = '', public x: number = 0, public y: number = 0) {
    super();
  }
}

// 测试组件
class Position extends Component {
  constructor(public x: number = 0, public y: number = 0) {
    super();
  }
}

class Health extends Component {
  constructor(public value: number = 100) {
    super();
  }
}

class Building extends Component {
  constructor(public type: string = '', public x: number = 0, public y: number = 0) {
    super();
  }
}

// 测试Resource
class GameState extends Resource {
  constructor(public turn: number = 0, public score: number = 0) {
    super();
  }
}

// 测试System
class MoveSystem extends System<[MoveIntent]> {
  public componentsRequired = [MoveIntent];

  public update(intents: Iterable<[MoveIntent]>): void {
    for (const [intent] of intents) {
      if (intent.processed) continue;

      let position = intent.entity.get(Position);
      if (!position) {
        position = new Position();
        intent.entity.add(position);
      }

      position.x = intent.x;
      position.y = intent.y;
      intent.processed = true;
      
      if (intent.entity) {
        this.ecs.removeEntity(intent.entity);
      }
    }
  }
}

class AttackSystem extends System<[AttackIntent]> {
  public componentsRequired = [AttackIntent];

  public update(intents: Iterable<[AttackIntent]>): void {
    for (const [intent] of intents) {
      if (intent.processed) continue;

      const gameState = this.ecs.getResource(GameState);
      if (gameState) {
        gameState.score += intent.damage;
      }

      intent.processed = true;
      
      if (intent.entity) {
        this.ecs.removeEntity(intent.entity);
      }
    }
  }
}

class BuildSystem extends System<[BuildIntent]> {
  public componentsRequired = [BuildIntent];

  public update(intents: Iterable<[BuildIntent]>): void {
    for (const [intent] of intents) {
      if (intent.processed) continue;

      this.ecs.spawn()
        .insert(new Building(intent.buildingType, intent.x, intent.y))
        .done();

      intent.processed = true;
      
      if (intent.entity) {
        this.ecs.removeEntity(intent.entity);
      }
    }
  }
}

describe('Replay + Persistence 集成测试', () => {
  let ecs1: ECS;
  let ecs2: ECS;
  let recorder: IntentRecorder;

  function setupECS(ecs: ECS): void {
    ecs.addSystem(new MoveSystem());
    ecs.addSystem(new AttackSystem());
    ecs.addSystem(new BuildSystem());
    ecs.insertResource(new GameState(0, 0));
  }

  function createComponentTypeMap(): Map<string, any> {
    const map = new Map();
    map.set('Position', Position);
    map.set('Health', Health);
    map.set('Building', Building);
    return map;
  }

  function createResourceTypeMap(): Map<string, any> {
    const map = new Map();
    map.set('GameState', GameState);
    return map;
  }

  beforeEach(() => {
    ecs1 = new ECS();
    ecs2 = new ECS();
    recorder = new IntentRecorder();
    
    recorder.registerIntentType(MoveIntent);
    recorder.registerIntentType(AttackIntent);
    recorder.registerIntentType(BuildIntent);
    
    setupECS(ecs1);
    setupECS(ecs2);
  });

  it('应该能够从中间状态开始Replay后续Intent', () => {
    // === 完整执行路径（参考） ===
    const ecsReference = new ECS();
    setupECS(ecsReference);

    // 执行第一阶段
    ecsReference.spawn().insert(new BuildIntent('tower', 5, 5)).done();
    ecsReference.update();

    const phase1Buildings = Array.from(ecsReference.query(Building));
    expect(phase1Buildings.length).toBe(1);

    // 执行第二阶段
    ecsReference.spawn().insert(new BuildIntent('wall', 15, 15)).done();
    ecsReference.update();

    const referenceState = Serializer.serializeECSState(
      ecsReference,
      [Position, Health, Building],
      [GameState]
    );

    // === 中间状态保存和恢复路径 ===
    
    // 在ecs1中执行第一阶段
    ecs1.spawn().insert(new BuildIntent('tower', 5, 5)).done();
    ecs1.update();

    const ecs1Phase1Buildings = Array.from(ecs1.query(Building));
    expect(ecs1Phase1Buildings.length).toBe(1);

    // 保存中间状态
    const midSnapshot = Serializer.serializeECSState(
      ecs1,
      [Position, Health, Building],
      [GameState]
    );

    expect(midSnapshot.entities.length).toBe(1);
    expect(midSnapshot.entities[0].components[0].type).toBe('Building');

    // 在ecs2中恢复中间状态
    Serializer.deserializeECSState(
      ecs2,
      midSnapshot,
      createComponentTypeMap(),
      createResourceTypeMap()
    );

    const restoredBuildings = Array.from(ecs2.query(Building));
    expect(restoredBuildings.length).toBe(1);

    // 记录并重放第二阶段
    const phase2Intent = new BuildIntent('wall', 15, 15);
    recorder.startRecording('phase2-test');
    recorder.record(phase2Intent);
    const phase2Session = recorder.stopRecording();

    recorder.replay(ecs2, phase2Session);

    // 获取最终状态
    const finalState = Serializer.serializeECSState(
      ecs2,
      [Position, Health, Building],
      [GameState]
    );

    // 验证最终状态与完整执行路径相同
    expect(finalState.entities.length).toBe(referenceState.entities.length);
    expect(finalState.resources.length).toBe(referenceState.resources.length);

    const finalBuildings = finalState.entities.flatMap(e => 
      e.components.filter(c => c.type === 'Building')
    );
    const referenceBuildings = referenceState.entities.flatMap(e => 
      e.components.filter(c => c.type === 'Building')
    );
    expect(finalBuildings.length).toBe(referenceBuildings.length);
  });

  it('属性测试: 任意中间状态保存和恢复应该产生一致的结果', () => {
    function createIntent(spec: any): Intent {
      switch (spec.type) {
        case 'move':
          return new MoveIntent(spec.x, spec.y);
        case 'attack':
          return new AttackIntent(spec.targetId, spec.damage);
        case 'build':
          return new BuildIntent(spec.buildingType, spec.x, spec.y);
        default:
          throw new Error(`Unknown intent type: ${spec.type}`);
      }
    }

    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(
            fc.oneof(
              fc.record({
                type: fc.constant('move'),
                x: fc.integer({ min: -50, max: 50 }),
                y: fc.integer({ min: -50, max: 50 })
              }),
              fc.record({
                type: fc.constant('attack'),
                targetId: fc.integer({ min: 1, max: 5 }),
                damage: fc.integer({ min: 1, max: 20 })
              }),
              fc.record({
                type: fc.constant('build'),
                buildingType: fc.oneof(fc.constant('tower'), fc.constant('wall')),
                x: fc.integer({ min: 0, max: 20 }),
                y: fc.integer({ min: 0, max: 20 })
              })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          fc.array(
            fc.oneof(
              fc.record({
                type: fc.constant('move'),
                x: fc.integer({ min: -50, max: 50 }),
                y: fc.integer({ min: -50, max: 50 })
              }),
              fc.record({
                type: fc.constant('attack'),
                targetId: fc.integer({ min: 1, max: 5 }),
                damage: fc.integer({ min: 1, max: 20 })
              })
            ),
            { minLength: 1, maxLength: 5 }
          )
        ),
        ([phase1Specs, phase2Specs]) => {
          // 重置ECS状态
          ecs1 = new ECS();
          ecs2 = new ECS();
          const ecsReference = new ECS();
          
          setupECS(ecs1);
          setupECS(ecs2);
          setupECS(ecsReference);

          // 参考路径：完整执行
          for (const spec of phase1Specs) {
            ecsReference.spawn().insert(createIntent(spec)).done();
            ecsReference.update();
          }
          for (const spec of phase2Specs) {
            ecsReference.spawn().insert(createIntent(spec)).done();
            ecsReference.update();
          }

          // 测试路径：中间状态保存恢复
          for (const spec of phase1Specs) {
            ecs1.spawn().insert(createIntent(spec)).done();
            ecs1.update();
          }

          const midSnapshot = Serializer.serializeECSState(
            ecs1,
            [Position, Health, Building],
            [GameState]
          );

          Serializer.deserializeECSState(
            ecs2,
            midSnapshot,
            createComponentTypeMap(),
            createResourceTypeMap()
          );

          recorder.startRecording('test-session');
          for (const spec of phase2Specs) {
            recorder.record(createIntent(spec));
          }
          const session = recorder.stopRecording();
          recorder.replay(ecs2, session);

          const referenceSnapshot = Serializer.serializeECSState(
            ecsReference,
            [Position, Health, Building],
            [GameState]
          );
          const testSnapshot = Serializer.serializeECSState(
            ecs2,
            [Position, Health, Building],
            [GameState]
          );

          const refGameState = referenceSnapshot.resources.find(r => r.type === 'GameState');
          const testGameState = testSnapshot.resources.find(r => r.type === 'GameState');
          
          if (refGameState && testGameState) {
            if (refGameState.data.score !== testGameState.data.score) {
              return false;
            }
          }

          return referenceSnapshot.entities.length === testSnapshot.entities.length;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('应该能够验证中间状态的完整性', () => {
    const initialIntents = [
      new MoveIntent(100, 200),
      new AttackIntent(5, 30),
      new BuildIntent('tower', 10, 10),
      new BuildIntent('wall', 20, 20),
      new AttackIntent(3, 15)
    ];

    for (const intent of initialIntents) {
      ecs1.spawn().insert(intent).done();
      ecs1.update();
    }

    const snapshot = Serializer.serializeECSState(
      ecs1,
      [Position, Health, Building],
      [GameState]
    );

    expect(snapshot.version).toBe('1.0.0');
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.entities.length).toBeGreaterThan(0);
    expect(snapshot.resources.length).toBeGreaterThan(0);

    const gameStateResource = snapshot.resources.find(r => r.type === 'GameState');
    expect(gameStateResource).toBeDefined();
    expect(gameStateResource!.data.score).toBe(45);

    const buildingComponents = snapshot.entities.flatMap(e => 
      e.components.filter(c => c.type === 'Building')
    );
    expect(buildingComponents.length).toBe(2);

    Serializer.deserializeECSState(
      ecs2,
      snapshot,
      createComponentTypeMap(),
      createResourceTypeMap()
    );

    const restoredGameState = ecs2.getResource(GameState);
    expect(restoredGameState?.score).toBe(45);

    const restoredBuildings = Array.from(ecs2.query(Building));
    expect(restoredBuildings.length).toBe(2);
  });
});
