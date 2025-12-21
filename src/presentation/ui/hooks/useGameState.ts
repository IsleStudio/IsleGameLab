'use client';

import { useECSResource } from './useECSResource';
import { GameState } from '../../../gameplay/resources';
import type { ViewType } from '../../../lib/types';

/**
 * GameState数据的只读视图
 */
export interface GameStateView {
  isPaused: boolean;
  currentScene: ViewType;
}

/**
 * useGameState - 获取游戏状态的便捷Hook
 * 返回GameState Resource的只读视图
 *
 * @returns GameState视图，如果不存在则返回默认值
 */
export function useGameState(): GameStateView {
  const gameState = useECSResource(GameState);

  // 返回只读视图，提供默认值
  return {
    isPaused: gameState?.isPaused ?? false,
    currentScene: gameState?.currentScene ?? 'main-menu',
  };
}

/**
 * useCurrentScene - 获取当前场景的便捷Hook
 *
 * @returns 当前场景名称
 */
export function useCurrentScene(): ViewType {
  const { currentScene } = useGameState();
  return currentScene;
}

/**
 * useIsPaused - 获取暂停状态的便捷Hook
 *
 * @returns 是否暂停
 */
export function useIsPaused(): boolean {
  const { isPaused } = useGameState();
  return isPaused;
}
