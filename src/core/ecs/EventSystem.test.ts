import { describe, it, expect, beforeEach } from 'vitest';
import { ECS, Event, Trigger } from './ecs';
import * as fc from 'fast-check';

// 测试事件类型
class TestEvent extends Event {
  constructor(public value: number) {
    super();
  }
}

class MessageEvent extends Event {
  constructor(public message: string, public priority: number = 0) {
    super();
  }
}

class PlayerActionEvent extends Event {
  constructor(public playerId: number, public action: string) {
    super();
  }
}

class GameStateEvent extends Event {
  constructor(public state: string, public timestamp: number = Date.now()) {
    super();
  }
}

describe('事件系统属性测试', () => {
  let ecs: ECS;

  beforeEach(() => {
    ecs = new ECS();
  });

  /**
   * **Feature: isle-game-lab, Property 6: 事件系统可靠性**
   * 
   * 属性6: 事件系统可靠性
   * 对于任何事件类型和观察者回调，当使用ecs.trigger()触发事件时，
   * 所有注册的观察者应该被调用，且调用次数等于注册的观察者数量
   * 
   * 验证需求: 4.7
   */
  it('属性6: 事件触发应该调用所有注册的观察者且调用次数正确', () => {
    fc.assert(
      fc.property(
        // 生成观察者数量 (1-10个观察者)
        fc.integer({ min: 1, max: 10 }),
        // 生成事件数据
        fc.record({
          eventType: fc.oneof(
            fc.constant('test'),
            fc.constant('message'), 
            fc.constant('playerAction'),
            fc.constant('gameState')
          ),
          eventData: fc.oneof(
            fc.integer({ min: 0, max: 1000 }), // for TestEvent
            fc.record({ 
              message: fc.string({ minLength: 1, maxLength: 50 }),
              priority: fc.integer({ min: 0, max: 5 })
            }), // for MessageEvent
            fc.record({
              playerId: fc.integer({ min: 1, max: 100 }),
              action: fc.oneof(fc.constant('move'), fc.constant('attack'), fc.constant('defend'))
            }), // for PlayerActionEvent
            fc.record({
              state: fc.oneof(fc.constant('playing'), fc.constant('paused'), fc.constant('menu')),
              timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 })
            }) // for GameStateEvent
          )
        }),
        (observerCount, eventSpec) => {
          // 重置ECS
          ecs = new ECS();
          
          // 创建事件
          let event: Event;
          let EventClass: new (...args: any[]) => Event;
          
          switch (eventSpec.eventType) {
            case 'test':
              event = new TestEvent(eventSpec.eventData as number);
              EventClass = TestEvent;
              break;
            case 'message':
              const msgData = eventSpec.eventData as { message: string; priority: number };
              event = new MessageEvent(msgData.message, msgData.priority);
              EventClass = MessageEvent;
              break;
            case 'playerAction':
              const actionData = eventSpec.eventData as { playerId: number; action: string };
              event = new PlayerActionEvent(actionData.playerId, actionData.action);
              EventClass = PlayerActionEvent;
              break;
            case 'gameState':
              const stateData = eventSpec.eventData as { state: string; timestamp: number };
              event = new GameStateEvent(stateData.state, stateData.timestamp);
              EventClass = GameStateEvent;
              break;
            default:
              return true; // Skip invalid event types
          }

          // 记录观察者调用情况
          const observerCallCounts: number[] = [];
          const observerReceivedEvents: Event[] = [];
          
          // 注册指定数量的观察者
          for (let i = 0; i < observerCount; i++) {
            observerCallCounts.push(0);
            
            ecs.addObserver(EventClass as any, (trigger: Trigger<Event>) => {
              observerCallCounts[i]++;
              observerReceivedEvents.push(trigger.event);
            });
          }

          // 触发事件
          ecs.trigger(event);

          // 验证所有观察者都被调用了正确的次数
          const allObserversCalledOnce = observerCallCounts.every(count => count === 1);
          const totalCallCount = observerCallCounts.reduce((sum, count) => sum + count, 0);
          const expectedTotalCalls = observerCount;
          
          // 验证接收到的事件数量正确
          const receivedEventCount = observerReceivedEvents.length;
          
          // 验证接收到的事件是同一个事件实例
          const allReceivedSameEvent = observerReceivedEvents.every(receivedEvent => receivedEvent === event);

          const success = allObserversCalledOnce && 
                         totalCallCount === expectedTotalCalls && 
                         receivedEventCount === expectedTotalCalls &&
                         allReceivedSameEvent;

          if (!success) {
            console.log('Event system reliability test failed:');
            console.log('Observer count:', observerCount);
            console.log('Event type:', eventSpec.eventType);
            console.log('Observer call counts:', observerCallCounts);
            console.log('Total calls:', totalCallCount, 'Expected:', expectedTotalCalls);
            console.log('Received events count:', receivedEventCount);
            console.log('All received same event:', allReceivedSameEvent);
          }

          return success;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('属性6: 多次触发同一事件应该每次都调用所有观察者', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // 观察者数量
        fc.integer({ min: 1, max: 5 }), // 触发次数
        fc.integer({ min: 0, max: 100 }), // 事件值
        (observerCount, triggerCount, eventValue) => {
          ecs = new ECS();
          
          const observerCallCounts: number[] = [];
          
          // 注册观察者
          for (let i = 0; i < observerCount; i++) {
            observerCallCounts.push(0);
            
            ecs.addObserver(TestEvent, () => {
              observerCallCounts[i]++;
            });
          }

          // 多次触发事件
          for (let i = 0; i < triggerCount; i++) {
            ecs.trigger(new TestEvent(eventValue + i));
          }

          // 验证每个观察者都被调用了正确的次数
          const allObserversCalledCorrectly = observerCallCounts.every(count => count === triggerCount);
          const totalCalls = observerCallCounts.reduce((sum, count) => sum + count, 0);
          const expectedTotalCalls = observerCount * triggerCount;

          return allObserversCalledCorrectly && totalCalls === expectedTotalCalls;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('属性6: 不同事件类型的观察者应该独立工作', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }), // TestEvent观察者数量
        fc.integer({ min: 1, max: 3 }), // MessageEvent观察者数量
        fc.integer({ min: 0, max: 50 }), // TestEvent值
        fc.string({ minLength: 1, maxLength: 20 }), // MessageEvent消息
        (testObserverCount, messageObserverCount, testValue, message) => {
          ecs = new ECS();
          
          let testEventCalls = 0;
          let messageEventCalls = 0;
          
          // 注册TestEvent观察者
          for (let i = 0; i < testObserverCount; i++) {
            ecs.addObserver(TestEvent, () => {
              testEventCalls++;
            });
          }
          
          // 注册MessageEvent观察者
          for (let i = 0; i < messageObserverCount; i++) {
            ecs.addObserver(MessageEvent, () => {
              messageEventCalls++;
            });
          }

          // 触发TestEvent
          ecs.trigger(new TestEvent(testValue));
          
          // 验证只有TestEvent观察者被调用
          const testEventCorrect = testEventCalls === testObserverCount;
          const messageEventNotCalled = messageEventCalls === 0;
          
          // 重置计数器
          testEventCalls = 0;
          messageEventCalls = 0;
          
          // 触发MessageEvent
          ecs.trigger(new MessageEvent(message));
          
          // 验证只有MessageEvent观察者被调用
          const messageEventCorrect = messageEventCalls === messageObserverCount;
          const testEventNotCalled = testEventCalls === 0;

          return testEventCorrect && messageEventNotCalled && 
                 messageEventCorrect && testEventNotCalled;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('属性6: 实体特定的观察者应该只对目标实体的事件响应', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }), // 实体数量
        fc.integer({ min: 1, max: 3 }), // 每个实体的观察者数量
        fc.integer({ min: 0, max: 100 }), // 事件值
        (entityCount, observersPerEntity, eventValue) => {
          ecs = new ECS();
          
          const entities = [];
          const entityObserverCalls: number[][] = [];
          
          // 创建实体和观察者
          for (let i = 0; i < entityCount; i++) {
            const entity = ecs.spawn().done();
            entities.push(entity);
            entityObserverCalls.push([]);
            
            // 为每个实体添加观察者
            for (let j = 0; j < observersPerEntity; j++) {
              entityObserverCalls[i].push(0);
              
              ecs.addEntityObserver(entity, TestEvent, () => {
                entityObserverCalls[i][j]++;
              });
            }
          }

          // 为每个实体触发事件
          for (let i = 0; i < entityCount; i++) {
            ecs.trigger(new TestEvent(eventValue + i), entities[i]);
            
            // 验证只有目标实体的观察者被调用
            for (let j = 0; j < entityCount; j++) {
              const expectedCalls = (i === j) ? observersPerEntity : 0;
              const actualCalls = entityObserverCalls[j].reduce((sum, count) => sum + count, 0);
              
              if (actualCalls !== expectedCalls) {
                return false;
              }
            }
            
            // 重置计数器为下一次测试
            for (let j = 0; j < entityCount; j++) {
              for (let k = 0; k < observersPerEntity; k++) {
                entityObserverCalls[j][k] = 0;
              }
            }
          }

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  it('属性6: 零观察者时触发事件不应该产生错误', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 0, maxLength: 50 })
        ),
        (eventData) => {
          ecs = new ECS();
          
          // 没有注册任何观察者，直接触发事件
          try {
            if (typeof eventData === 'number') {
              ecs.trigger(new TestEvent(eventData));
            } else {
              ecs.trigger(new MessageEvent(eventData));
            }
            return true; // 没有抛出异常
          } catch (error) {
            console.log('Unexpected error when triggering event with no observers:', error);
            return false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});