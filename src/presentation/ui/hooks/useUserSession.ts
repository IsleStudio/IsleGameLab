'use client';

import { useECSResource } from './useECSResource';
import { UserSession } from '../../../gameplay/resources';

/**
 * UserSession数据的只读视图
 */
export interface UserSessionView {
  username: string | null;
  isLoggedIn: boolean;
  loginTimestamp: number;
}

/**
 * useUserSession - 获取用户会话的便捷Hook
 * 返回UserSession Resource的只读视图
 *
 * @returns UserSession视图，如果不存在则返回默认值
 */
export function useUserSession(): UserSessionView {
  const userSession = useECSResource(UserSession);

  // 返回只读视图，提供默认值
  return {
    username: userSession?.username ?? null,
    isLoggedIn: userSession?.isLoggedIn ?? false,
    loginTimestamp: userSession?.loginTimestamp ?? 0,
  };
}

/**
 * useIsLoggedIn - 获取登录状态的便捷Hook
 *
 * @returns 是否已登录
 */
export function useIsLoggedIn(): boolean {
  const { isLoggedIn } = useUserSession();
  return isLoggedIn;
}

/**
 * useUsername - 获取用户名的便捷Hook
 *
 * @returns 用户名，如果未登录则返回null
 */
export function useUsername(): string | null {
  const { username } = useUserSession();
  return username;
}
