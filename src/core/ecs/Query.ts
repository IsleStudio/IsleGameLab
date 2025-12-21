import { System } from './System';
import type { Component } from './Component';
import type { Resource } from './Resource';
import type { Entity } from './Entity';
import type { ComponentClass, ClassType } from './types';

/**
 * 过滤器: 必须拥有某组件 (With)。
 */
export class With<T extends Component> {
  constructor(public type: ClassType<T>) {}
}

/**
 * 过滤器: 必须不拥有某组件 (Without)。
 */
export class Without<T extends Component> {
  constructor(public type: ClassType<T>) {}
}

/**
 * 资源参数描述符 (Res)。
 */
export class Res<T extends Resource> {
  constructor(public type: ClassType<T>) {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Filter = With<any> | Without<any>;

/**
 * 系统参数类型联合。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SystemParam = Query<any> | Res<any>;

/**
 * 从 SystemParam 提取实际的参数类型。
 * - Query<T> -> Query<T> (保持 Query 类型以便使用其方法)
 * - Res<T> -> T (直接返回资源类型)
 */
export type ExtractParamType<P> = P extends Query<infer T>
  ? Query<T>
  : P extends Res<infer R>
    ? R
    : never;

/**
 * 将 SystemParam 数组映射为实际参数类型的元组。
 */
export type ExtractParamTypes<P extends SystemParam[]> = {
  [K in keyof P]: ExtractParamType<P[K]>;
};

/**
 * 查询结果项，包含组件元组和对应的实体引用。
 */
export interface QueryItem<T extends Component[]> {
  components: T;
  entity: Entity;
}

/**
 * 查询 (Query) 对象。
 * 支持 Bevy/flecs 风格的函数式操作。
 */
export class Query<T extends Component[]> extends System<T> {
  public componentsRequired: ClassType<Component>[];
  private accessTypes: ClassType<Component>[];
  private withoutTypes: Set<ComponentClass> = new Set();

  constructor(access: { [K in keyof T]: ClassType<T[K]> }, filters: Filter[] = []) {
    super();
    this.accessTypes = access as unknown as ClassType<Component>[];

    // 计算 componentsRequired: Access + With
    const reqs = new Set<ClassType<Component>>(this.accessTypes);

    for (const f of filters) {
      if (f instanceof With) {
        reqs.add(f.type);
      } else if (f instanceof Without) {
        this.withoutTypes.add(f.type);
      }
    }
    this.componentsRequired = Array.from(reqs);
  }

  public with(...types: ClassType<Component>[]): this {
    for (const type of types) {
      if (!this.componentsRequired.includes(type)) {
        this.componentsRequired.push(type);
      }
    }
    return this;
  }

  public without(...types: ClassType<Component>[]): this {
    for (const type of types) {
      this.withoutTypes.add(type);
    }
    return this;
  }

  public update(_components: Iterable<T>): void {
    // Query 本身不执行 update 逻辑，它只是数据的提供者
  }
  /**
   * 迭代符合条件的实体组件元组。
   */
  public *[Symbol.iterator](): Iterator<T> {
    const entities = this.ecs.getSystemEntities(this);
    for (const entity of entities) {
      // 检查 Without 过滤器
      let pass = true;
      for (const without of this.withoutTypes) {
        if (entity.has(without)) {
          pass = false;
          break;
        }
      }
      if (!pass) continue;

      // 提取组件
      const tuple = this.accessTypes.map((type) => entity.get(type)!);
      yield tuple as unknown as T;
    }
  }

  /**
   * 迭代查询结果并包含实体引用。
   */
  public *iter(): IterableIterator<QueryItem<T>> {
    const entities = this.ecs.getSystemEntities(this);
    for (const entity of entities) {
      // 检查 Without 过滤器
      let pass = true;
      for (const without of this.withoutTypes) {
        if (entity.has(without)) {
          pass = false;
          break;
        }
      }
      if (!pass) continue;

      // 提取组件
      const tuple = this.accessTypes.map((type) => entity.get(type)!);
      yield { components: tuple as unknown as T, entity };
    }
  }

  // 函数式操作方法
  public forEach(callback: (components: T, index: number, entity: Entity) => void): void {
    let index = 0;
    for (const { components, entity } of this.iter()) {
      callback(components, index, entity);
      index++;
    }
  }

  public map<U>(callback: (components: T, index: number, entity: Entity) => U): U[] {
    const result: U[] = [];
    let index = 0;
    for (const { components, entity } of this.iter()) {
      result.push(callback(components, index, entity));
      index++;
    }
    return result;
  }

  public filter(predicate: (components: T, index: number, entity: Entity) => boolean): T[] {
    const result: T[] = [];
    let index = 0;
    for (const { components, entity } of this.iter()) {
      if (predicate(components, index, entity)) {
        result.push(components);
      }
      index++;
    }
    return result;
  }

  public find(predicate: (components: T, index: number, entity: Entity) => boolean): T | undefined {
    let index = 0;
    for (const { components, entity } of this.iter()) {
      if (predicate(components, index, entity)) {
        return components;
      }
      index++;
    }
    return undefined;
  }

  public first(): T | undefined {
    for (const components of this) {
      return components;
    }
    return undefined;
  }

  public isEmpty(): boolean {
    for (const _ of this) {
      return false;
    }
    return true;
  }

  public count(): number {
    let count = 0;
    for (const _ of this) {
      count++;
    }
    return count;
  }

  public collect(): T[] {
    return [...this];
  }

  // --- 高级函数式操作方法 (Advanced Functional Operations) ---

  /**
   * 检查是否存在满足条件的结果。
   * 对应 JavaScript Array.some
   */
  public some(predicate: (components: T, index: number, entity: Entity) => boolean): boolean {
    let index = 0;
    for (const { components, entity } of this.iter()) {
      if (predicate(components, index, entity)) {
        return true;
      }
      index++;
    }
    return false;
  }

  /**
   * 检查是否所有结果都满足条件。
   * 对应 JavaScript Array.every
   */
  public every(predicate: (components: T, index: number, entity: Entity) => boolean): boolean {
    let index = 0;
    for (const { components, entity } of this.iter()) {
      if (!predicate(components, index, entity)) {
        return false;
      }
      index++;
    }
    return true;
  }

  /**
   * 将查询结果归约为单个值。
   * 对应 JavaScript Array.reduce
   */
  public reduce<U>(callback: (accumulator: U, components: T, index: number, entity: Entity) => U, initialValue: U): U {
    let accumulator = initialValue;
    let index = 0;
    for (const { components, entity } of this.iter()) {
      accumulator = callback(accumulator, components, index, entity);
      index++;
    }
    return accumulator;
  }

  // --- 可选值处理方法 (Optional Value Handling) ---

  /**
   * 获取第一个查询结果，如果没有则返回默认值。
   */
  public getOrDefault(defaultValue: T): T {
    for (const components of this) {
      return components;
    }
    return defaultValue;
  }

  /**
   * 如果存在查询结果，则执行回调。
   */
  public ifPresent(callback: (components: T, entity: Entity) => void): boolean {
    for (const { components, entity } of this.iter()) {
      callback(components, entity);
      return true;
    }
    return false;
  }

  /**
   * 获取第一个查询结果及其实体。
   */
  public firstWithEntity(): QueryItem<T> | undefined {
    for (const item of this.iter()) {
      return item;
    }
    return undefined;
  }

  /**
   * 获取唯一的查询结果。
   * 如果没有结果或有多个结果，返回 undefined。
   */
  public single(): T | undefined {
    let result: T | undefined;
    let count = 0;
    for (const components of this) {
      result = components;
      count++;
      if (count > 1) {
        return undefined;
      }
    }
    return count === 1 ? result : undefined;
  }

  /**
   * 获取唯一的查询结果及其实体。
   */
  public singleWithEntity(): QueryItem<T> | undefined {
    let result: QueryItem<T> | undefined;
    let count = 0;
    for (const item of this.iter()) {
      result = item;
      count++;
      if (count > 1) {
        return undefined;
      }
    }
    return count === 1 ? result : undefined;
  }

  // --- 批处理操作 (Batch Operations) ---

  /**
   * 将查询结果收集为包含实体的数组。
   */
  public collectWithEntities(): QueryItem<T>[] {
    return [...this.iter()];
  }

  /**
   * 批量执行操作，支持链式调用。
   */
  public batch(): BatchOperation<T> {
    return new BatchOperation(this.collectWithEntities());
  }
}

/**
 * 批处理操作类，支持链式调用的批量操作。
 */
export class BatchOperation<T extends Component[]> {
  private items: QueryItem<T>[];

  constructor(items: QueryItem<T>[]) {
    this.items = items;
  }

  /**
   * 过滤批处理项。
   */
  public filter(predicate: (components: T, entity: Entity) => boolean): BatchOperation<T> {
    this.items = this.items.filter(({ components, entity }) => predicate(components, entity));
    return this;
  }

  /**
   * 对每个批处理项执行操作。
   */
  public forEach(callback: (components: T, entity: Entity, index: number) => void): BatchOperation<T> {
    this.items.forEach(({ components, entity }, index) => callback(components, entity, index));
    return this;
  }

  /**
   * 映射批处理项为新值。
   */
  public map<U>(callback: (components: T, entity: Entity, index: number) => U): U[] {
    return this.items.map(({ components, entity }, index) => callback(components, entity, index));
  }

  /**
   * 归约批处理项。
   */
  public reduce<U>(callback: (accumulator: U, components: T, entity: Entity, index: number) => U, initialValue: U): U {
    return this.items.reduce((acc, { components, entity }, index) => callback(acc, components, entity, index), initialValue);
  }

  /**
   * 获取批处理项数量。
   */
  public count(): number {
    return this.items.length;
  }

  /**
   * 收集批处理结果。
   */
  public collect(): QueryItem<T>[] {
    return this.items;
  }

  /**
   * 只收集组件元组。
   */
  public collectComponents(): T[] {
    return this.items.map(({ components }) => components);
  }

  /**
   * 获取第一个批处理项。
   */
  public first(): QueryItem<T> | undefined {
    return this.items[0];
  }

  /**
   * 检查是否为空。
   */
  public isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * 创建 Query 的辅助函数 (函数式 API)。
 */
export function query<T extends Component[]>(
  ...access: { [K in keyof T]: ClassType<T[K]> }
): Query<T> {
  return new Query(access);
}

/**
 * 创建 Res 的辅助函数 (函数式 API)。
 * @example res(Time)
 */
export function res<T extends Resource>(type: ClassType<T>): Res<T> {
  return new Res(type);
}