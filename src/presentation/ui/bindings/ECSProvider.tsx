'use client';

import React, { createContext, useContext, useRef, useCallback, useMemo } from 'react';
import type { ECS } from '../../../core/ecs';
import { createLogger } from '../../../lib/logger';

// ECS上下文类型
interface ECSContextValue {
  ecs: ECS;
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => number;
  notify: () => void; // 添加notify方法
}

// 创建ECS上下文
const ECSContext = createContext<ECSContextValue | null>(null);

// 创建日志记录器
const logger = createLogger('ECSSubscriptionManager');

// 订阅管理器 - 用于通知React组件ECS状态变化
class ECSSubscriptionManager {
  private listeners = new Set<() => void>();
  private version = 0;

  // 订阅状态变化
  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback);
    logger.debug(`订阅者注册 (总数: ${this.listeners.size})`);
    return () => {
      this.listeners.delete(callback);
      logger.debug(`订阅者取消 (总数: ${this.listeners.size})`);
    };
  };

  // 获取当前版本号
  getSnapshot = (): number => {
    return this.version;
  };

  // 通知所有订阅者状态已变化
  notify = (): void => {
    this.version++;
    logger.debug(`通知 ${this.listeners.size} 个订阅者 (版本: ${this.version})`);
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        logger.error('订阅者回调执行失败', error);
      }
    });
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
