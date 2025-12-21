'use client';

import React, { createContext, useContext, useRef, useCallback, useMemo } from 'react';
import type { ECS } from '../../../core/ecs';

// ECS上下文类型
interface ECSContextValue {
  ecs: ECS;
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => number;
  notify: () => void; // 添加notify方法
}

// 创建ECS上下文
const ECSContext = createContext<ECSContextValue | null>(null);

// 订阅管理器 - 用于通知React组件ECS状态变化
class ECSSubscriptionManager {
  private listeners = new Set<() => void>();
  private version = 0;

  // 订阅状态变化
  subscribe = (callback: () => void): (() => void) => {
    console.log('[ECSSubscriptionManager] 新订阅者注册，当前总数:', this.listeners.size, '注册后总数:', this.listeners.size + 1);
    this.listeners.add(callback);
    return () => {
      console.log('[ECSSubscriptionManager] 订阅者取消，当前总数:', this.listeners.size, '取消后总数:', this.listeners.size - 1);
      this.listeners.delete(callback);
    };
  };

  // 获取当前版本号
  getSnapshot = (): number => {
    return this.version;
  };

  // 通知所有订阅者状态已变化
  notify = (): void => {
    console.log('[ECSSubscriptionManager] notify被调用，当前版本:', this.version, '订阅者数量:', this.listeners.size);
    this.version++;
    console.log('[ECSSubscriptionManager] 版本更新为:', this.version);
    let index = 0;
    this.listeners.forEach((listener) => {
      index++;
      console.log(`[ECSSubscriptionManager] 通知订阅者 ${index}`);
      listener();
    });
    console.log('[ECSSubscriptionManager] 所有订阅者已通知完毕');
  };
}

// 创建订阅管理器的工厂函数
function createManager(): ECSSubscriptionManager {
  return new ECSSubscriptionManager();
}

// Provider属性类型
interface ECSProviderProps {
  ecs: ECS;
  children: React.ReactNode;
}

/**
 * ECSProvider - 提供ECS上下文给React组件树
 * 使用useSyncExternalStore实现高效的状态同步
 */
export function ECSProvider({ ecs, children }: ECSProviderProps): React.ReactElement {
  // 使用ref保持订阅管理器的稳定引用，使用惰性初始化
  const managerRef = useRef<ECSSubscriptionManager | null>(null);

  // 使用useMemo确保manager只创建一次
  const manager = useMemo(() => {
    if (managerRef.current == null) {
      managerRef.current = createManager();
    }
    return managerRef.current;
  }, []);

  // 创建稳定的上下文值
  const contextValue: ECSContextValue = useMemo(
    () => ({
      ecs,
      subscribe: manager.subscribe,
      getSnapshot: manager.getSnapshot,
      notify: manager.notify, // 暴露notify方法
    }),
    [ecs, manager]
  );

  return <ECSContext.Provider value={contextValue}>{children}</ECSContext.Provider>;
}

/**
 * useECS - 获取ECS实例的Hook
 */
export function useECS(): ECS {
  const context = useContext(ECSContext);
  if (!context) {
    throw new Error('useECS must be used within an ECSProvider');
  }
  return context.ecs;
}

/**
 * useECSSubscription - 内部Hook，用于订阅ECS状态变化
 */
export function useECSSubscription(): ECSContextValue {
  const context = useContext(ECSContext);
  if (!context) {
    throw new Error('useECSSubscription must be used within an ECSProvider');
  }
  return context;
}

/**
 * useECSUpdate - 获取触发ECS更新的函数
 * 用于在ECS状态变化后通知React重新渲染
 */
export function useECSUpdate(): () => void {
  const context = useContext(ECSContext);
  if (!context) {
    throw new Error('useECSUpdate must be used within an ECSProvider');
  }

  // 返回notify函数来触发重新渲染
  return context.notify;
}

// 导出上下文供高级用例使用
export { ECSContext };
export type { ECSContextValue, ECSProviderProps };
