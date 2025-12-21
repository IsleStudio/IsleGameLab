import { Entity } from './Entity';
import { Component } from './Component';
import { Resource } from './Resource';
import { Event, OnAdd, OnRemove, Trigger } from './Event';
import { System, Stage } from './System';
import { EntityCommands } from './EntityCommands';
import { Parent, Children } from './HierarchyComponents';
import { Query, Res, SystemParam, ExtractParamTypes } from './Query';
import type { ComponentClass, ResourceClass, EventClass, ClassType } from './types';

/**
 * ECS (Entity Component System) 类，充当 World 的角色。
 * 管理所有实体、组件、系统、资源和事件。
 */
export class ECS {
  // 主要状态
  private entities = new Map<number, Entity>();
  private systems = new Map<System, Set<Entity>>();
  private systemsByStage = new Map<Stage, Set<System>>();

  // 组件索引 - 优化查询性能
  private componentsByType = new Map<ComponentClass, Set<Component>>();

  // 资源管理
  private resources = new Map<ResourceClass, Resource>();

  // 事件系统 - 双缓冲队列
  private eventQueues = new Map<EventClass, Event[]>();
  private nextFrameEvents = new Map<EventClass, Event[]>();

  // 实体管理
  private nextEntityID = 0;
  private entitiesToDestroy = new Array<Entity>();

  // 生命周期系统
  private initializeSystems = new Map<ComponentClass, Set<(entity: Entity, component: Component) => void>>();
  private destroySystems = new Map<ComponentClass, Set<(entity: Entity, component: Component) => void>>();

  // 事件观察者
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private globalObservers = new Map<EventClass, Set<(trigger: Trigger<any>) => void>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private entityObservers = new Map<Entity, Map<EventClass, Set<(trigger: Trigger<any>) => void>>>();

  constructor() {
    this.systemsByStage.set(Stage.Startup, new Set());
    this.systemsByStage.set(Stage.Update, new Set());
    this.systemsByStage.set(Stage.FixedUpdate, new Set());
  }

  // --- 核心API ---

  /**
   * 创建一个新的实体，并返回 EntityCommands 以便链式添加组件。
   */
  public spawn(): EntityCommands {
    const entity = this.createEntity();
    return new EntityCommands(this, entity);
  }

  /**
   * 插入一个全局资源。
   */
  public insertResource(resource: Resource): void {
    this.resources.set(resource.constructor as ResourceClass, resource);
  }

  /**
   * 获取一个全局资源。
   */
  public getResource<T extends Resource>(resourceClass: ClassType<T>): T | undefined {
    return this.resources.get(resourceClass) as T;
  }

  /**
   * 移除一个全局资源。
   */
  public removeResource(resourceClass: ResourceClass): void {
    this.resources.delete(resourceClass);
  }
  /**
   * 发送一个跨帧缓冲事件。
   */
  public pushEvent(event: Event): void {
    const type = event.constructor as EventClass;
    if (!this.nextFrameEvents.has(type)) {
      this.nextFrameEvents.set(type, []);
    }
    this.nextFrameEvents.get(type)!.push(event);
  }

  /**
   * 立即触发一个事件。
   */
  public trigger(event: Event, target?: Entity): void {
    const type = event.constructor;
    const triggerObj = new Trigger(event, target);

    // 触发实体观察者
    if (target !== undefined) {
      const entityObsMap = this.entityObservers.get(target);
      if (entityObsMap) {
        const callbacks = entityObsMap.get(type as EventClass);
        if (callbacks) {
          for (const callback of callbacks) {
            callback(triggerObj);
          }
        }
      }
    }

    // 触发全局观察者
    const globalCallbacks = this.globalObservers.get(type as EventClass);
    if (globalCallbacks) {
      for (const callback of globalCallbacks) {
        callback(triggerObj);
      }
    }
  }

  /**
   * 递归销毁实体及其所有子节点。
   */
  public despawnRecursive(entity: Entity): void {
    const children = entity.getChildren();
    if (children) {
      for (const child of [...children]) {
        this.despawnRecursive(child);
      }
    }
    this.removeEntity(entity);
  }

  /**
   * 读取上一帧发送的事件。
   */
  public readEvents<T extends Event>(eventClass: ClassType<T>): Iterable<T> {
    return (this.eventQueues.get(eventClass) as T[]) || [];
  }

  /**
   * 获取特定类型事件的数量。
   */
  public eventCount(eventClass: EventClass): number {
    return this.eventQueues.get(eventClass)?.length || 0;
  }

  /**
   * 查询拥有特定组件的所有实体。
   */
  public query<T extends Component>(componentClass: ClassType<T>): Iterable<T> {
    return (this.componentsByType.get(componentClass) as Set<T>) || [];
  }

  /**
   * 添加观察者。
   */
  public addObserver<T extends Event>(
    eventClass: ClassType<T>,
    callback: (trigger: Trigger<T>) => void
  ): void {
    if (!this.globalObservers.has(eventClass)) {
      this.globalObservers.set(eventClass, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.globalObservers.get(eventClass)!.add(callback as any);
  }

  /**
   * 添加一个组件初始化系统 (Hook)。
   * 当指定类型的组件被添加到实体时调用。
   * 对应 Lua 的 `dse.createCompInitializeSystem` 或 Bevy 的 `Observer` (OnAdd)。
   */
  public addInitializeSystem<T extends Component>(
    componentClass: ClassType<T>,
    callback: (entity: Entity, component: T) => void
  ): void {
    if (!this.initializeSystems.has(componentClass)) {
      this.initializeSystems.set(componentClass, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.initializeSystems.get(componentClass)!.add(callback as any);
  }

  /**
   * 添加一个组件销毁系统 (Hook)。
   * 当指定类型的组件从实体移除时调用。
   * 对应 Lua 的 `dse.createCompDestroySystem` 或 Bevy 的 `Observer` (OnRemove)。
   */
  public addDestroySystem<T extends Component>(
    componentClass: ClassType<T>,
    callback: (entity: Entity, component: T) => void
  ): void {
    if (!this.destroySystems.has(componentClass)) {
      this.destroySystems.set(componentClass, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.destroySystems.get(componentClass)!.add(callback as any);
  }

  /**
   * 为特定实体注册观察者。
   */
  public addEntityObserver<T extends Event>(
    entity: Entity,
    eventClass: ClassType<T>,
    callback: (trigger: Trigger<T>) => void
  ): void {
    if (!this.entityObservers.has(entity)) {
      this.entityObservers.set(entity, new Map());
    }
    const entityMap = this.entityObservers.get(entity)!;

    if (!entityMap.has(eventClass)) {
      entityMap.set(eventClass, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entityMap.get(eventClass)!.add(callback as any);
  }

  /**
   * 添加一个支持 Bevy 风格参数注入的系统。
   * 类型会自动推断，无需手动标注。
   *
   * @example
   * ecs.addSystem(Stage.Update,
   *   [query(Position, Velocity), res(Time)],
   *   (movers, time) => { ... }  // movers: Query<[Position, Velocity]>, time: Time
   * );
   */
  public addSystem<P extends SystemParam[]>(
    stage: Stage,
    params: [...P],
    systemFn: (...args: ExtractParamTypes<P>) => void
  ): void;
  /**
   * 添加一个传统系统 (Class-based)。
   * 默认添加到 Update 阶段。
   */
  public addSystem(system: System): void;
  /**
   * 添加一个传统系统到指定阶段。
   */
  public addSystem(stage: Stage, system: System): void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addSystem(arg1: any, arg2?: any, arg3?: any): void {
    let stage = Stage.Update;
    let system: System | null = null;

    // 重载解析
    if (typeof arg1 === 'number' && arg2 instanceof System) {
      // addSystem(Stage, System)
      stage = arg1;
      system = arg2;
    } else if (arg1 instanceof System) {
      // addSystem(System) -> Default Update
      stage = Stage.Update;
      system = arg1;
    } else if (typeof arg1 === 'number' && Array.isArray(arg2) && typeof arg3 === 'function') {
      // addSystem(Stage, Params, Fn)
      stage = arg1;
      const params = arg2 as SystemParam[];
      const callback = arg3;

      // 1. 注册所有的 Query 参数作为子系统 (用于跟踪实体)
      for (const param of params) {
        if (param instanceof Query) {
          // Query 只需要被 ECS 跟踪，不需要加入执行列表
          this.registerSystem(param);
        }
      }

      // 2. 创建一个全局系统来执行回调
      system = new (class extends System<[]> {
        public componentsRequired = [];
        public isGlobal = true;

        public update(): void {
          const args = params.map((p) => {
            if (p instanceof Query) {
              return p;
            } else if (p instanceof Res) {
              const res = this.ecs.getResource(p.type);
              if (!res) throw new Error(`Resource ${p.type.name} not found`);
              return res;
            }
            return p; // 返回原始参数以防万一
          });
          callback(...args);
        }
      })();
    } else if (Array.isArray(arg1) && typeof arg2 === 'function') {
      // 兼容旧的 addSystem(Params, Fn) -> Default Update
      // 递归调用自己
      this.addSystem(Stage.Update, arg1, arg2);
      return;
    }

    if (system) {
      this.registerSystem(system);
      this.systemsByStage.get(stage)?.add(system);
    }
  }

  /**
   * 获取系统缓存的实体集合。
   */
  public getSystemEntities(system: System): Set<Entity> {
    return this.systems.get(system) || new Set();
  }

  /**
   * 运行游戏循环。
   */
  public update(): void {
    // 交换事件队列
    this.eventQueues = this.nextFrameEvents;
    this.nextFrameEvents = new Map();

    // 运行系统
    this.runStage(Stage.Update);

    // 清理销毁的实体
    while (this.entitiesToDestroy.length > 0) {
      this.destroyEntity(this.entitiesToDestroy.pop() as Entity);
    }
  }

  public startup(): void {
    this.runStage(Stage.Startup);
  }

  public fixedUpdate(): void {
    this.runStage(Stage.FixedUpdate);
  }
  // --- 内部方法 ---

  public createEntity(): Entity {
    const id = this.nextEntityID;
    this.nextEntityID++;
    const entity = new Entity(id, this);
    this.entities.set(id, entity);
    return entity;
  }

  public removeEntity(entity: Entity): void {
    this.entitiesToDestroy.push(entity);
  }

  public addComponent(entity: Entity, component: Component): void {
    component.entity = entity;
    entity._addComponentDirectly(component);

    // 更新组件索引
    const type = component.constructor as ComponentClass;
    if (!this.componentsByType.has(type)) {
      this.componentsByType.set(type, new Set());
    }
    this.componentsByType.get(type)!.add(component);

    this.checkE(entity);

    // 1. 触发初始化系统 (Lua Style)
    const callbacks = this.initializeSystems.get(component.constructor as ComponentClass);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(entity, component);
      }
    }

    // 2. 触发生命周期事件
    const compClass = component.constructor as unknown as typeof Component;
    if (compClass.onAdd) {
      compClass.onAdd(entity);
    }

    this.trigger(new OnAdd(component), entity);
  }

  public removeComponent(entity: Entity, componentClass: ComponentClass): void {
    if (entity.has(componentClass)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = entity.get(componentClass as any)!;

      // 1. 触发销毁系统 (Lua Style)
      const callbacks = this.destroySystems.get(componentClass);
      if (callbacks) {
        for (const callback of callbacks) {
          callback(entity, component);
        }
      }

      // 2. 触发生命周期事件
      const compClass = componentClass as unknown as typeof Component;
      if (compClass.onRemove) {
        compClass.onRemove(entity);
      }

      this.trigger(new OnRemove(component), entity);

      entity._removeComponentDirectly(componentClass);

      // 更新组件索引
      const typeSet = this.componentsByType.get(componentClass);
      if (typeSet) {
        typeSet.delete(component);
      }

      this.checkE(entity);
    }
  }

  private registerSystem(system: System): void {
    if (this.systems.has(system)) return;

    system.ecs = this;
    this.systems.set(system, new Set());
    for (const entity of this.entities.values()) {
      this.checkES(entity, system);
    }
  }

  private runStage(stage: Stage): void {
    const systems = this.systemsByStage.get(stage);
    if (!systems) return;

    for (const system of systems) {
      const componentIterator = {
        *[Symbol.iterator]() {
          const reqs = system.componentsRequired;
          const entities = system.ecs.getSystemEntities(system);

          for (const entity of entities) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tuple = reqs.map((cls) => entity.get(cls as any)!);
            yield tuple;
          }
        },
      };

      system.update(componentIterator);
    }
  }

  private destroyEntity(entity: Entity): void {
    entity.destroyed = true;
    this.entityObservers.delete(entity);
    this.entities.delete(entity.id);
    for (const entities of this.systems.values()) {
      entities.delete(entity);
    }
  }

  private checkE(entity: Entity): void {
    for (const system of this.systems.keys()) {
      this.checkES(entity, system);
    }
  }

  private checkES(entity: Entity, system: System): void {
    if (system.isGlobal) return;
    const need = system.componentsRequired;
    if (entity._hasAll(need)) {
      this.systems.get(system)!.add(entity);
    } else {
      this.systems.get(system)!.delete(entity);
    }
  }

  // --- 层级树 (Hierarchy) 方法 ---

  /**
   * 设置实体的父节点。
   */
  public setParent(child: Entity, parent: Entity): void {
    child.add(new Parent(parent));
  }

  /**
   * 移除实体的父节点。
   */
  public removeParent(entity: Entity): void {
    entity.remove(Parent);
  }

  /**
   * 获取实体的父节点。
   */
  public getParent(entity: Entity): Entity | undefined {
    const parent = entity.get(Parent);
    return parent ? (parent.value as Entity) : undefined;
  }

  /**
   * 获取实体的所有子节点。
   */
  public getChildren(entity: Entity): Entity[] {
    const children = entity.get(Children);
    return children ? (children.value as Entity[]) || [] : [];
  }

  // --- 兼容性方法 ---

  /**
   * 获取特定类型的所有组件。
   * 对应 Lua ECS 的 `dse.getComps(compType)`。
   * 别名: `query`
   */
  public getComps<T extends Component>(componentClass: ClassType<T>): Iterable<T> {
    return this.query(componentClass);
  }

  /**
   * 获取单例组件 (Resource 的别名)。
   * 对应 Lua dse.getSingleComp。
   * 如果资源不存在，会自动创建并注册。
   */
  public getSingleComp<T extends Resource>(resourceClass: ClassType<T>): T {
    let res = this.getResource(resourceClass);
    if (!res) {
      res = new resourceClass();
      this.insertResource(res);
    }
    return res;
  }

  // --- 兼容旧接口 ---

  public writeEvent(event: Event): void {
    this.pushEvent(event);
  }

  public triggerEvent(event: Event): void {
    this.trigger(event);
  }

  public addEventSystem<T extends Event>(
    eventClass: ClassType<T>,
    callback: (event: T) => void
  ): void {
    // 适配旧回调签名: (event) -> void  适配为 (trigger) -> void
    this.addObserver(eventClass, (trigger) => callback(trigger.event));
  }
}

// 导出别名
export { ECS as World };