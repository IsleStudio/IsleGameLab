import type { Component } from './Component';
import type { ComponentClass, ClassType } from './types';

// 前向声明，避免循环依赖
export interface IEntity {
  id: number;
  destroyed: boolean;
  add(component: Component): IEntity;
  get<T extends Component>(componentClass: ClassType<T>): T | undefined;
  has(componentClass: ComponentClass): boolean;
  remove(componentClass: ComponentClass): void;
  isDestroyed(): boolean;
}

/**
 * 实体 (Entity) 类。
 * 既是唯一标识符 (ID)，也是组件的容器。
 * 对应 Lua ECS 中的 Entity 对象。
 */
export class Entity implements IEntity {
  private components = new Map<ComponentClass, Component>();
  public destroyed = false;

  constructor(
    public id: number,
    private ecs: any // 使用any避免循环依赖
  ) {}

  /**
   * 添加组件。
   * 别名: `addComp`
   */
  public add(component: Component): Entity {
    this.ecs.addComponent(this, component);
    return this;
  }

  /**
   * 获取组件。
   * 别名: `getComp`
   */
  public get<T extends Component>(componentClass: ClassType<T>): T | undefined {
    return this.components.get(componentClass) as T;
  }

  /**
   * 检查是否拥有组件。
   */
  public has(componentClass: ComponentClass): boolean {
    return this.components.has(componentClass);
  }

  /**
   * 移除组件。
   */
  public remove(componentClass: ComponentClass): void {
    this.ecs.removeComponent(this, componentClass);
  }

  /**
   * 检查实体是否已被销毁。
   */
  public isDestroyed(): boolean {
    return this.destroyed;
  }

  // --- Lua ECS 风格别名 ---
  public addComp(component: Component): Entity {
    return this.add(component);
  }
  public getComp<T extends Component>(componentClass: ClassType<T>): T | undefined {
    return this.get(componentClass);
  }

  // --- 内部方法 ---
  public _addComponentDirectly(component: Component) {
    this.components.set(component.constructor as ComponentClass, component);
  }
  public _removeComponentDirectly(componentClass: ComponentClass) {
    this.components.delete(componentClass);
  }
  public _hasAll(componentClasses: Iterable<ComponentClass>): boolean {
    for (const cls of componentClasses) {
      if (!this.components.has(cls)) {
        return false;
      }
    }
    return true;
  }

  // --- 层级树 (Hierarchy) ---
  // 注意：层级方法已移至ECS类中以避免循环依赖
  // 使用 ecs.setParent(child, parent) 等方法

  /**
   * 设置父节点。
   * 对应 Bevy 的 `set_parent`。
   */
  public setParent(parent: Entity): this {
    this.ecs.setParent(this, parent);
    return this;
  }

  /**
   * 添加子节点。
   * 对应 Bevy 的 `add_child`。
   */
  public addChild(child: Entity): this {
    this.ecs.setParent(child, this);
    return this;
  }

  /**
   * 移除父节点 (变为孤儿)。
   * 对应 Bevy 的 `remove_parent`。
   */
  public removeParent(): this {
    this.ecs.removeParent(this);
    return this;
  }

  /**
   * 获取父节点。
   */
  public getParent(): Entity | undefined {
    return this.ecs.getParent(this);
  }

  /**
   * 获取所有子节点。
   */
  public getChildren(): Entity[] {
    return this.ecs.getChildren(this);
  }

  /**
   * 递归销毁实体及其所有子节点。
   * 对应 Bevy 的 `despawn_recursive`。
   */
  public despawnRecursive(): void {
    this.ecs.despawnRecursive(this);
  }
}