import { Event } from '../../core/ecs/Event';

/**
 * 导航完成事件
 * 当UI导航到新视图完成时触发，通知其他系统视图状态已改变
 */
export class NavigationCompletedEvent extends Event {
  constructor(
    /** 当前视图 */
    public currentView: 'main-menu' | 'login' | 'game',
    /** 前一个视图 */
    public previousView: 'main-menu' | 'login' | 'game' | null = null,
    /** 导航时间戳 */
    public timestamp: number = Date.now()
  ) {
    super();
  }
}

/**
 * UI错误事件
 * 当UI层发生错误时触发，通知其他系统处理错误状态
 */
export class UIErrorEvent extends Event {
  constructor(
    /** 错误消息 */
    public message: string,
    /** 错误类型 */
    public errorType: 'validation' | 'network' | 'storage' | 'unknown' = 'unknown',
    /** 错误时间戳 */
    public timestamp: number = Date.now()
  ) {
    super();
  }
}

/**
 * UI状态变更事件
 * 当UI状态发生变化时触发，用于系统间通信
 */
export class UIStateChangedEvent extends Event {
  constructor(
    /** 状态变更类型 */
    public changeType: 'loading' | 'error' | 'success' | 'idle',
    /** 相关数据 */
    public data?: any,
    /** 变更时间戳 */
    public timestamp: number = Date.now()
  ) {
    super();
  }
}