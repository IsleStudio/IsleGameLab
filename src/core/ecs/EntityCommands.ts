import type { Component } from './Component';
import type { Event, Trigger } from './Event';
import type { ComponentClass, ClassType } from './types';

/**
 * EntityCommands 提供了一种链式调用来构建实体的方法 (类似 Bevy)。
 * 支持流畅的链式API设计，用于构建和配置实体。
 */
export class EntityCommands {
  constructor(
    private ecs: any, // 使用any避免循环依赖
    private entity: any // 使用any避免循环依赖
  ) {}

  /**
   * 向实体添加组件。
   * 对应 Bevy 的 `commands.insert()`。
   */
  public insert(component: Component): EntityCommands {
    this.ecs.addComponent(this.entity, component);
    return this;
  }

  /**
   * 移除指定类型的组件。
   * 对应 Bevy 的 `commands.remove()`。
   */
  public remove(componentClass: ComponentClass): EntityCommands {
    this.entity.remove(componentClass);
    return this;
  }

  /**
   * 为该实体添加一个观察者 (Observer)。
   */
  public observe<T extends Event>(
    eventClass: ClassType<T>,
    callback: (trigger: Trigger<T>) => void
  ): EntityCommands {
    this.ecs.addEntityObserver(this.entity, eventClass, callback);
    return this;
  }

  /**
   * 立即触发一个事件到该实体。
   */
  public trigger(event: Event): EntityCommands {
    this.ecs.trigger(event, this.entity);
    return this;
  }

  /**
   * 获取实体 ID。
   * 对应 Bevy 的 `commands.id()`。
   */
  public id(): any {
    return this.entity;
  }

  /**
   * 设置父实体。
   */
  public setParent(parent: any): EntityCommands {
    this.entity.setParent(parent);
    return this;
  }

  /**
   * 移除父实体关系。
   */
  public removeParent(): EntityCommands {
    this.entity.removeParent();
    return this;
  }

  /**
   * 条件性地执行操作。
   */
  public when(condition: boolean, callback: (commands: EntityCommands) => void): EntityCommands {
    if (condition) {
      callback(this);
    }
    return this;
  }

  /**
   * 完成实体构建，返回实体对象。
   */
  public done(): any {
    return this.entity;
  }

  public finish(): any {
    return this.entity;
  }

  public build(): any {
    return this.entity;
  }
}