import { Component } from './Component';

/**
 * 事件 (Event) 用于系统之间的通信。
 */
export abstract class Event {
  constructor() {}
}

/**
 * OnAdd 事件类型 - 组件生命周期事件。
 * 当组件被添加到实体时自动触发。
 * 
 * @example
 * ecs.addObserver(OnAdd, (trigger) => {
 *   console.log('Component added:', trigger.event.component);
 *   console.log('To entity:', trigger.entity?.id);
 * });
 */
export class OnAdd extends Event {
  constructor(public component: Component) {
    super();
  }
}

/**
 * OnRemove 事件类型 - 组件生命周期事件。
 * 当组件从实体移除时自动触发。
 * 
 * @example
 * ecs.addObserver(OnRemove, (trigger) => {
 *   console.log('Component removed:', trigger.event.component);
 *   console.log('From entity:', trigger.entity?.id);
 * });
 */
export class OnRemove extends Event {
  constructor(public component: Component) {
    super();
  }
}

/**
 * 触发器 (Trigger)，用于包装立即执行的事件和目标实体。
 * 模仿 Bevy 的 `Trigger<E>`。
 */
export class Trigger<E extends Event> {
  constructor(
    public event: E,
    public entity?: any // 使用any避免循环依赖
  ) {}
}

/**
 * 事件缓冲区接口，用于缓冲模式的事件处理。
 * 包含 Push (写入) 和 Pop (读取) 操作。
 */
export interface EventBuffer<T extends Event> {
  push(event: T): void;
  pop(): Iterable<T>;
}

/**
 * 事件写入器 (EventWriter)，用于发送跨帧缓冲事件。
 * 对应 Bevy 的 `EventWriter<T>`。
 */
export class EventWriter<T extends Event> implements EventBuffer<T> {
  constructor(
    private ecs: any, // 使用any避免循环依赖
    private eventType: any
  ) {}

  public push(event: T): void {
    this.ecs.pushEvent(event);
  }

  public pushBatch(events: Iterable<T>): void {
    for (const event of events) {
      this.ecs.pushEvent(event);
    }
  }

  public send(event: T): void {
    this.push(event);
  }

  public sendBatch(events: Iterable<T>): void {
    this.pushBatch(events);
  }

  public pop(): Iterable<T> {
    return [];
  }
}

/**
 * 事件读取器 (EventReader)，用于读取上一帧的缓冲事件。
 * 对应 Bevy 的 `EventReader<T>`。
 */
export class EventReader<T extends Event> implements EventBuffer<T> {
  constructor(
    private ecs: any, // 使用any避免循环依赖
    private eventType: any
  ) {}

  public pop(): Iterable<T> {
    return this.ecs.readEvents(this.eventType);
  }

  public isEmpty(): boolean {
    return this.ecs.eventCount(this.eventType) === 0;
  }

  public read(): Iterable<T> {
    return this.pop();
  }

  public push(_event: T): void {}
}