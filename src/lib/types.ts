/**
 * 共享类型定义
 * 包含通用接口和类型别名
 */

// 视图类型
export type ViewType = 'main-menu' | 'login' | 'game';

// 用户会话数据类型
export interface StoredUserSession {
  username: string | null;
  isLoggedIn: boolean;
  loginTimestamp: number;
}

// 通用结果类型
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

// ECS相关类型（将在任务2中扩展）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentClass = new (...args: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SystemClass = new (...args: any[]) => any;
