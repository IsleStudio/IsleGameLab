'use client';

import { useSyncExternalStore, useCallback, useRef, useMemo } from 'react';
import type { Component } from '../../../core/ecs/Component';
import type { ClassType } from '../../../core/ecs/types';
import { useECS, useECSSubscription } from '../bindings/ECSProvider';

/**
 * useECSQuery - 查询ECS组件的Hook
 * 返回所有拥有指定组件类型的组件实例数组
 *
 * @param componentClass - Component类
 * @returns 组件实例数组
 */
export function useECSQuery<T extends Component>(componentClass: ClassType<T>): T[] {
  const ecs = useECS();
  const { subscribe, getSnapshot } = useECSSubscription();

  // 缓存上一次的查询结果
  const cacheRef = useRef<{ snapshot: number; value: T[] }>({
    snapshot: -1,
    value: [],
  });

  // 获取当前查询快照
  const getQuerySnapshot = useCallback((): T[] => {
    const currentSnapshot = getSnapshot();

    // 如果快照版本相同，返回缓存值
    if (cacheRef.current.snapshot === currentSnapshot) {
      return cacheRef.current.value;
    }

    // 执行查询并更新缓存
    const components = Array.from(ecs.query(componentClass));
    cacheRef.current = { snapshot: currentSnapshot, value: components };
    return components;
  }, [ecs, componentClass, getSnapshot]);

  // 使用useSyncExternalStore订阅外部状态
  return useSyncExternalStore(subscribe, getQuerySnapshot, getQuerySnapshot);
}

/**
 * useECSQueryFirst - 查询第一个匹配的组件
 *
 * @param componentClass - Component类
 * @returns 第一个组件实例，如果不存在则返回undefined
 */
export function useECSQueryFirst<T extends Component>(componentClass: ClassType<T>): T | undefined {
  const components = useECSQuery(componentClass);
  return components[0];
}

/**
 * useECSQueryCount - 获取匹配组件的数量
 *
 * @param componentClass - Component类
 * @returns 组件数量
 */
export function useECSQueryCount<T extends Component>(componentClass: ClassType<T>): number {
  const components = useECSQuery(componentClass);
  return components.length;
}

/**
 * useECSQueryMultiple - 查询多个组件类型
 * 返回同时拥有所有指定组件的实体的组件元组
 *
 * @param componentClasses - Component类数组
 * @returns 组件元组数组
 */
export function useECSQueryMultiple<T extends Component[]>(
  ...componentClasses: { [K in keyof T]: ClassType<T[K]> }
): T[] {
  const ecs = useECS();
  const { subscribe, getSnapshot } = useECSSubscription();

  // 创建稳定的组件类数组引用
  const classesKey = useMemo(() => componentClasses.map((c) => c.name).join(','), [componentClasses]);

  // 缓存上一次的查询结果
  const cacheRef = useRef<{ snapshot: number; key: string; value: T[] }>({
    snapshot: -1,
    key: '',
    value: [],
  });

  // 获取当前查询快照
  const getQuerySnapshot = useCallback((): T[] => {
    const currentSnapshot = getSnapshot();

    // 如果快照版本和key都相同，返回缓存值
    if (cacheRef.current.snapshot === currentSnapshot && cacheRef.current.key === classesKey) {
      return cacheRef.current.value;
    }

    // 如果没有组件类，返回空数组
    if (componentClasses.length === 0) {
      cacheRef.current = { snapshot: currentSnapshot, key: classesKey, value: [] };
      return [];
    }

    // 使用第一个组件类型作为基础查询
    const baseComponents = Array.from(ecs.query(componentClasses[0]));

    // 过滤出同时拥有所有组件的实体
    const results: T[] = [];
    for (const baseComp of baseComponents) {
      const entity = baseComp.entity;
      let hasAll = true;

      // 检查实体是否拥有所有其他组件
      for (let i = 1; i < componentClasses.length; i++) {
        if (!entity.has(componentClasses[i])) {
          hasAll = false;
          break;
        }
      }

      if (hasAll) {
        // 收集所有组件
        const tuple = componentClasses.map((cls) => entity.get(cls)!) as unknown as T;
        results.push(tuple);
      }
    }

    cacheRef.current = { snapshot: currentSnapshot, key: classesKey, value: results };
    return results;
  }, [ecs, componentClasses, classesKey, getSnapshot]);

  // 使用useSyncExternalStore订阅外部状态
  return useSyncExternalStore(subscribe, getQuerySnapshot, getQuerySnapshot);
}
