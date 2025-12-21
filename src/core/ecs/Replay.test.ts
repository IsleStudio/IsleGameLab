/**
 * Replay 模块单元测试
 * 
 * 这些测试只验证 IntentRecorder 类的核心功能：
 * - 记录开始/停止
 * - Intent 记录
 * - 会话导出/导入
 * - Intent 重放
 * 
 * 跨模块的集成测试（如 Replay + Persistence）请参见:
 * src/test/integration/replay-persistence.integration.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRecorder, globalIntentRecorder } from './Replay';
import { ECS, Intent, Component, System, Resource } from './ecs';
import * as fc from 'fast-check';

// 测试Intent
class TestIntent extends Intent {
  constructor(public value: string = '') {
    super();
  }
}

// 更多测试Intent类型用于属性测试
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

// 测试组件用于状态验证
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

// 测试Resource用于全局状态
class GameState extends Resource {
  constructor(public turn: number = 0, public score: number = 0) {
    super();
  }
}

// 测试System用于处理Intent
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

describe('Replay系统 - 单元测试', () => {
  let recorder: IntentRecorder;
  let ecs: ECS;

  beforeEach(() => {
    recorder = new IntentRecorder();
    ecs = new ECS();
    
    recorder.registerIntentType(TestIntent);
  });

  it('应该能够开始和停止记录', () => {
    expect(recorder.isCurrentlyRecording()).toBe(false);

    recorder.startRecording('test-session');
    expect(recorder.isCurrentlyRecording()).toBe(true);
    expect(recorder.getCurrentSessionId()).toBe('test-session');

    const session = recorder.stopRecording();
    expect(recorder.isCurrentlyRecording()).toBe(false);
    expect(session.sessionId).toBe('test-session');
    expect(session.records).toHaveLength(0);
  });

  it('应该能够记录Intent', () => {
    recorder.startRecording();

    const intent1 = new TestIntent('first');
    const intent2 = new TestIntent('second');

    recorder.record(intent1);
    recorder.record(intent2);

    expect(recorder.getRecordCount()).toBe(2);

    const session = recorder.stopRecording();
    expect(session.records).toHaveLength(2);
    expect(session.records[0].type).toBe('TestIntent');
    expect(session.records[0].data.value).toBe('first');
    expect(session.records[1].data.value).toBe('second');
  });

  it('应该能够导出和导入会话', () => {
    recorder.startRecording('export-test');
    
    const intent = new TestIntent('export-data');
    recorder.record(intent);
    
    const session = recorder.stopRecording();
    const json = recorder.exportSession(session);
    
    expect(json).toContain('export-test');
    expect(json).toContain('export-data');
    
    const importedSession = recorder.importSession(json);
    expect(importedSession.sessionId).toBe('export-test');
    expect(importedSession.records).toHaveLength(1);
    expect(importedSession.records[0].data.value).toBe('export-data');
  });

  it('应该提供全局记录器实例', () => {
    expect(globalIntentRecorder).toBeInstanceOf(IntentRecorder);
    expect(globalIntentRecorder.isCurrentlyRecording()).toBe(false);
  });

  it('应该正确处理Intent的时间戳和优先级', () => {
    const intent = new TestIntent('priority-test');
    intent.priority = 5;
    
    recorder.startRecording();
    recorder.record(intent);
    const session = recorder.stopRecording();
    
    expect(session.records[0].priority).toBe(5);
    expect(session.records[0].timestamp).toBeGreaterThan(0);
  });
});

describe('Intent可记录性和Replay属性测试', () => {
  let ecs1: ECS;
  let ecs2: ECS;
  let recorder: IntentRecorder;

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

  function setupECS(ecs: ECS): void {
    ecs.addSystem(new MoveSystem());
    ecs.addSystem(new AttackSystem());
    ecs.addSystem(new BuildSystem());
    ecs.insertResource(new GameState(0, 0));
  }

  function captureECSState(ecs: ECS): any {
    const state: any = {
      entities: [],
      resources: {}
    };

    const entityComponents: any[] = [];
    
    for (const pos of ecs.query(Position)) {
      entityComponents.push({ type: 'Position', data: { x: pos.x, y: pos.y } });
    }
    
    for (const health of ecs.query(Health)) {
      entityComponents.push({ type: 'Health', data: { value: health.value } });
    }
    
    for (const building of ecs.query(Building)) {
      entityComponents.push({ 
        type: 'Building', 
        data: { type: building.type, x: building.x, y: building.y } 
      });
    }

    entityComponents.sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type);
      if (typeCompare !== 0) return typeCompare;
      return JSON.stringify(a.data).localeCompare(JSON.stringify(b.data));
    });

    state.entities = entityComponents;

    const gameState = ecs.getResource(GameState);
    if (gameState) {
      state.resources.GameState = { turn: gameState.turn, score: gameState.score };
    }

    return state;
  }

  function compareECSStates(state1: any, state2: any): boolean {
    return JSON.stringify(state1) === JSON.stringify(state2);
  }

  /**
   * **Feature: isle-game-lab, Property 5: Intent可记录性和Replay**
   * 
   * 属性5: Intent可记录性和Replay
   * 对于任何Intent序列，如果记录所有Intent的类型和参数，然后在相同的初始状态下重放这些Intent，
   * 应该产生相同的最终ECS状态（所有Component和Resource的值相同）
   * 
   * 验证需求: 4.5, 4.9
   */
  it('属性5: Intent序列的记录和重放应该产生相同的ECS状态', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('move'),
              x: fc.integer({ min: -100, max: 100 }),
              y: fc.integer({ min: -100, max: 100 })
            }),
            fc.record({
              type: fc.constant('attack'),
              targetId: fc.integer({ min: 1, max: 10 }),
              damage: fc.integer({ min: 1, max: 50 })
            }),
            fc.record({
              type: fc.constant('build'),
              buildingType: fc.oneof(fc.constant('tower'), fc.constant('wall'), fc.constant('factory')),
              x: fc.integer({ min: 0, max: 50 }),
              y: fc.integer({ min: 0, max: 50 })
            })
          ),
          { minLength: 0, maxLength: 10 }
        ),
        (intentSpecs) => {
          ecs1 = new ECS();
          ecs2 = new ECS();
          recorder = new IntentRecorder();
          
          recorder.registerIntentType(MoveIntent);
          recorder.registerIntentType(AttackIntent);
          recorder.registerIntentType(BuildIntent);
          
          setupECS(ecs1);
          setupECS(ecs2);

          const intents: Intent[] = [];
          for (const spec of intentSpecs) {
            let intent: Intent;
            switch (spec.type) {
              case 'move':
                intent = new MoveIntent(spec.x, spec.y);
                break;
              case 'attack':
                intent = new AttackIntent(spec.targetId, spec.damage);
                break;
              case 'build':
                intent = new BuildIntent(spec.buildingType, spec.x, spec.y);
                break;
              default:
                continue;
            }
            intents.push(intent);
          }

          // 第一次执行：直接执行Intent序列
          for (const intent of intents) {
            ecs1.spawn().insert(intent).done();
            ecs1.update();
          }
          const finalState1 = captureECSState(ecs1);

          // 第二次执行：通过Replay系统
          recorder.startRecording('property-test');
          
          for (const intent of intents) {
            recorder.record(intent);
          }
          
          const session = recorder.stopRecording();
          recorder.replay(ecs2, session);
          const finalState2 = captureECSState(ecs2);

          const statesEqual = compareECSStates(finalState1, finalState2);
          
          if (!statesEqual) {
            console.log('Intent specs:', intentSpecs);
            console.log('State 1:', JSON.stringify(finalState1, null, 2));
            console.log('State 2:', JSON.stringify(finalState2, null, 2));
          }
          
          return statesEqual;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('属性5: 空Intent序列的重放应该保持初始状态不变', () => {
    const initialState1 = captureECSState(ecs1);
    const initialState2 = captureECSState(ecs2);

    recorder.startRecording('empty-test');
    const session = recorder.stopRecording();
    recorder.replay(ecs2, session);

    const finalState1 = captureECSState(ecs1);
    const finalState2 = captureECSState(ecs2);

    expect(compareECSStates(initialState1, finalState1)).toBe(true);
    expect(compareECSStates(initialState2, finalState2)).toBe(true);
    expect(compareECSStates(finalState1, finalState2)).toBe(true);
  });

  it('属性5: 单个Intent的重放应该产生相同结果', () => {
    fc.assert(
      fc.property(
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
        (intentSpec) => {
          ecs1 = new ECS();
          ecs2 = new ECS();
          setupECS(ecs1);
          setupECS(ecs2);

          let intent1: Intent, intent2: Intent;
          
          switch (intentSpec.type) {
            case 'move':
              intent1 = new MoveIntent(intentSpec.x, intentSpec.y);
              intent2 = new MoveIntent(intentSpec.x, intentSpec.y);
              break;
            case 'attack':
              intent1 = new AttackIntent(intentSpec.targetId, intentSpec.damage);
              intent2 = new AttackIntent(intentSpec.targetId, intentSpec.damage);
              break;
            default:
              return true;
          }

          ecs1.spawn().insert(intent1).done();
          ecs1.update();

          recorder.startRecording('single-test');
          recorder.record(intent2);
          const session = recorder.stopRecording();
          recorder.replay(ecs2, session);

          const state1 = captureECSState(ecs1);
          const state2 = captureECSState(ecs2);

          return compareECSStates(state1, state2);
        }
      ),
      { numRuns: 50 }
    );
  });
});
