import { System } from '../../core/ecs/System';
import type { ECS } from '../../core/ecs/World';
import { Snake, Direction, SnakeGameActive } from '../components/snake';
import { SnakeGameResource } from '../resources/SnakeGameResource';
import { SnakeDirectionIntent } from '../intents/snake';

/**
 * SnakeMovementSystem - 蛇移动系统
 * 处理蛇的移动逻辑和方向改变
 */
export class SnakeMovementSystem extends System {
  public run(ecs: ECS): void {
    const snakeGameRes = ecs.getResource(SnakeGameResource);
    if (!snakeGameRes || !snakeGameRes.isGameRunning) {
      return;
    }

    // 处理方向改变Intent
    this.handleDirectionChange(ecs);

    // 检查是否应该移动蛇
    const now = Date.now();
    const config = snakeGameRes.config;
    
    // 查找活跃的游戏实体
    for (const entity of ecs.query(SnakeGameActive, Snake)) {
      const snake = ecs.getComponent(entity, Snake);
      if (!snake || !snake.isAlive) {
        continue;
      }

      // 计算当前移动间隔（考虑速度倍率）
      const moveInterval = config.initialSpeed / (1 + (snake.speedMultiplier ?? 1.0) - 1);
      
      if (now - snakeGameRes.lastMoveTime >= moveInterval) {
        this.moveSnake(snake);
        snakeGameRes.lastMoveTime = now;
      }
    }
  }

  /**
   * 处理方向改变Intent
   */
  private handleDirectionChange(ecs: ECS): void {
    for (const intentEntity of ecs.query(SnakeDirectionIntent)) {
      const intent = ecs.getComponent(intentEntity, SnakeDirectionIntent);
      if (!intent) continue;

      // 获取蛇组件
      const snake = ecs.getComponent(intent.entityId, Snake);
      if (!snake || !snake.isAlive) {
        continue;
      }

      // 验证方向改变是否合法（不能反向移动）
      if (this.isValidDirectionChange(snake.direction, intent.direction)) {
        snake.nextDirection = intent.direction;
      }
    }
  }

  /**
   * 移动蛇
   */
  private moveSnake(snake: Snake): void {
    // 应用下一个方向
    snake.direction = snake.nextDirection;

    // 计算新的头部位置
    const head = snake.segments[0];
    const newHead = { ...head };

    switch (snake.direction) {
      case Direction.Up:
        newHead.y -= 1;
        break;
      case Direction.Down:
        newHead.y += 1;
        break;
      case Direction.Left:
        newHead.x -= 1;
        break;
      case Direction.Right:
        newHead.x += 1;
        break;
    }

    // 在头部添加新段
    snake.segments.unshift(newHead);

    // 移除尾部（在碰撞检测系统中会处理是否吃到食物）
    // 默认移除尾部，如果吃到食物会在碰撞系统中处理
  }

  /**
   * 验证方向改变是否合法
   */
  private isValidDirectionChange(current: Direction, next: Direction): boolean {
    // 不能反向移动
    if (
      (current === Direction.Up && next === Direction.Down) ||
      (current === Direction.Down && next === Direction.Up) ||
      (current === Direction.Left && next === Direction.Right) ||
      (current === Direction.Right && next === Direction.Left)
    ) {
      return false;
    }
    return true;
  }
}
