import { Resource } from '../../core/ecs/Resource';
import type { ViewType } from '../../lib/types';

/**
 * 游戏状态Resource - 存储全局游戏状态
 * 管理当前场景、暂停状态等全局信息
 */
export class GameState extends Resource {
  public isPaused: boolean = false;
  public currentScene: ViewType = 'main-menu';

  /**
   * 切换到指定场景
   */
  public navigateTo(scene: ViewType): void {
    this.currentScene = scene;
  }

  /**
   * 暂停/恢复游戏
   */
  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  /**
   * 重置到初始状态
   */
  public reset(): void {
    this.isPaused = false;
    this.currentScene = 'main-menu';
  }
}