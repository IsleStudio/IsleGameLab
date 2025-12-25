import type { ECS } from '../../core/ecs/World';
import { StartSnakeGameIntent, SnakeDirectionIntent, RestartSnakeGameIntent, BackToMenuIntent } from '../intents/snake';
import { Direction } from '../components/snake';

/**
 * SnakeUtil - 贪吃蛇游戏工具类
 * 提供用于与蛇游戏交互的便捷方法
 */
export class SnakeUtil {
  /**
   * 开始新游戏
   */
  public static startGame(ecs: ECS): void {
    ecs.spawn().insert(new StartSnakeGameIntent());
    console.log('[SnakeUtil] 发送开始游戏Intent');
  }

  /**
   * 改变蛇的移动方向
   */
  public static changeDirection(ecs: ECS, entityId: number, direction: Direction): void {
    ecs.spawn().insert(new SnakeDirectionIntent(entityId, direction));
  }

  /**
   * 重新开始游戏
   */
  public static restartGame(ecs: ECS): void {
    ecs.spawn().insert(new RestartSnakeGameIntent());
    console.log('[SnakeUtil] 发送重新开始游戏Intent');
  }

  /**
   * 返回主菜单
   */
  public static backToMenu(ecs: ECS): void {
    ecs.spawn().insert(new BackToMenuIntent());
    console.log('[SnakeUtil] 发送返回主菜单Intent');
  }

  /**
   * 将方向转换为显示文本
   */
  public static directionToText(direction: Direction): string {
    switch (direction) {
      case Direction.Up:
        return '上';
      case Direction.Down:
        return '下';
      case Direction.Left:
        return '左';
      case Direction.Right:
        return '右';
      default:
        return '未知';
    }
  }

  /**
   * 格式化时间（秒转换为 mm:ss）
   */
  public static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
