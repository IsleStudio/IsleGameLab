'use client';

import { useSyncExternalStore, useCallback, useRef } from 'react';
import { Resource } from '../../../core/ecs/Resource';
import type { ClassType } from '../../../core/ecs/types';
import { useECS, useECSSubscription } from '../bindings/ECSProvider';

/**
 * useECSResource - 订阅ECS Resource的Hook
 * 当Resource变化时自动触发重新渲染
 *
 * @param resourceClass - Resource类
 * @returns Resource实例，如果不存在则返回undefined
 */
export function useECSResource<T extends Resource>(resourceClass: ClassType<T>): T | undefined {
  const ecs = useECS();
  const { subscribe, getSnapshot } = useECSSubscription();

  // 缓存上一次的Resource值用于比较
  const cacheRef = useRef<{ snapshot: number; value: T | undefined }>({
    snapshot: -1,
    value: undefined,
  });

  // 获取当前Resource快照
  const getResourceSnapshot = useCallback((): T | undefined => {
    const currentSnapshot = getSnapshot();
    console.log(`[useECSResource] 获取${resourceClass.name}快照，版本:`, currentSnapshot);

    // 如果快照版本相同，返回缓存值
    if (cacheRef.current.snapshot === currentSnapshot) {
      console.log(`[useECSResource] ${resourceClass.name}使用缓存值`);
      return cacheRef.current.value;
    }

    // 获取新值并更新缓存
    const resource = ecs.getResource(resourceClass);
    console.log(`[useECSResource] ${resourceClass.name}获取新值:`, resource);
    cacheRef.current = { snapshot: currentSnapshot, value: resource };
    return resource;
  }, [ecs, resourceClass, getSnapshot]);

  // 使用useSyncExternalStore订阅外部状态
  return useSyncExternalStore(subscribe, getResourceSnapshot, getResourceSnapshot);
}

/**
 * useECSResourceRequired - 订阅必需的ECS Resource
 * 如果Resource不存在则抛出错误
 *
 * @param resourceClass - Resource类
 * @returns Resource实例
 * @throws 如果Resource不存在
 */
export function useECSResourceRequired<T extends Resource>(resourceClass: ClassType<T>): T {
  const resource = useECSResource(resourceClass);
  if (!resource) {
    throw new Error(`Required resource ${resourceClass.name} not found in ECS`);
  }
  return resource;
}
