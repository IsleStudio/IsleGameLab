import type { Component } from './Component';
import type { Resource } from './Resource';
import type { ClassType } from './types';
import { ECSError, ErrorSeverity, logger } from '../../lib/errors';

/**
 * 系统 (System) 关注一组组件。它将对拥有该组件集合的每个实体运行。
 * T: 组件元组类型，例如 [Position, Velocity]
 */
export abstract class System<T extends Component[] = Component[]> {
  /**
   * 组件类的列表 (有序)，实体必须拥有所有这些组件，系统才能对其运行。
   * 这里的顺序决定了 update 方法中元组的顺序。
   */
  public abstract componentsRequired: ClassType<Component>[];

  /**
   * `update()` 方法在每一帧都会被系统调用。
   * @param components 符合条件的组件元组迭代器
   */
  public abstract update(components: Iterable<T>): void;

  /**
   * ECS (World) 实例被提供给所有系统。
   */
  public ecs!: any; // 使用any避免循环依赖

  /**
   * 是否为全局系统 (Global System)。
   * 如果为 true，ECS 不会为其自动维护实体集合 (checkES 将跳过)。
   * 这种系统通常用于只运行逻辑，或者通过 Query 参数手动获取实体。
   */
  public isGlobal = false;

  // --- 系统参数注入辅助方法 (System Parameter Injection Helpers) ---

  /**
   * 获取一个查询对象，用于遍历拥有特定组件的实体。
   * 模拟 Bevy 的 `Query<T>` 注入。
   */
  protected query<T extends Component>(componentClass: ClassType<T>): Iterable<T> {
    return this.ecs.query(componentClass);
  }

  /**
   * 高级查询：直接获取组件元组，模拟 Bevy 的 Query<(&A, &B)>
   * @param types 组件类列表
   */
  protected *queryTuple<T extends Component[]>(
    ...types: { [K in keyof T]: ClassType<T[K]> }
  ): IterableIterator<T> {
    // 获取当前系统缓存的实体集合
    const entities = this.ecs.getSystemEntities(this);

    for (const entity of entities) {
      // 检查是否所有组件都存在
      let match = true;
      const components: Component[] = [];

      for (const type of types) {
        const comp = entity.get(type);
        if (!comp) {
          match = false;
          break;
        }
        components.push(comp);
      }

      if (match) {
        yield components as T;
      }
    }
  }

  /**
   * 获取一个全局资源。
   * 模拟 Bevy 的 `Res<T>` 注入。
   */
  protected res<T extends Resource>(resourceClass: ClassType<T>): T {
    const resource = this.ecs.getResource(resourceClass);
    if (!resource) {
      const error = new ECSError(
        `Resource ${resourceClass.name} not found!`,
        ErrorSeverity.ERROR,
        { resource: resourceClass.name }
      );
      logger.error(`[ECS] ${error.message}`, error);
      throw error;
    }
    return resource;
  }

  /**
   * 安全获取全局资源（不抛出异常）
   * 如果资源不存在，返回undefined并记录警告
   */
  protected tryRes<T extends Resource>(resourceClass: ClassType<T>): T | undefined {
    const resource = this.ecs.getResource(resourceClass);
    if (!resource) {
      logger.warn(`[ECS] Resource ${resourceClass.name} not found`, { resource: resourceClass.name });
    }
    return resource;
  }
}

/**
 * 系统调度阶段。
 */
export enum Stage {
  Startup,
  Update,
  FixedUpdate,
}