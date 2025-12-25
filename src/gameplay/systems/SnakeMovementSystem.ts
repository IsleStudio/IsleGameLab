import { System } from '../../core/ecs/System';
import type { Component } from '../../core/ecs/Component';
import { Snake, Direction, SnakeGameActive, GameScore } from '../components/snake';
import { SnakeGameResource } from '../resources/SnakeGameResource';
import { SnakeDirectionIntent } from '../intents/snake';

/**
 * SnakeMovementSystem - 蛇移动系统
 * 处理蛇的移动逻辑和方向改变
 */
export class SnakeMovementSystem extends System<[Snake]> {
  public componentsRequired = [Snake];

  public update(components: Iterable<[Snake]>): void {
    const snakeGameRes = this.res(SnakeGameResource);
    if (!snakeGameRes.isGameRunning) {
      return;
    }

    // 处理方向改变Intent
    this.handleDirectionChange();

    // 检查是否应该移动蛇
    const now = Date.now();
    const config = snakeGameRes.config;

    // 遍历所有蛇
    for (const [snake] of components) {
      if (!snake.isAlive) {
        continue;
      }

      // 获取速度倍率（从GameScore同步过来）
      const speedMultiplier = (snake as any).speedMultiplier ?? 1.0;

      // 计算当前移动间隔（考虑速度倍率）
      const moveInterval = config.initialSpeed / speedMultiplier;

      if (now - snakeGameRes.lastMoveTime >= moveInterval) {
        this.moveSnake(snake);
        snakeGameRes.lastMoveTime = now;
      }
    }
  }

  /**
   * 处理方向改变Intent
   */
  private handleDirectionChange(): void {
    const intents = Array.from(this.query(SnakeDirectionIntent));
    
    for (const intent of intents) {
      if (intent.processed) continue;

      // 通过queryTuple获取蛇组件
      const snakes = Array.from(this.queryTuple(SnakeGameActive, Snake));
      
      for (const [_, snake] of snakes) {
        if (!snake.isAlive) continue;

        // 验证方向改变是否合法（不能反向移动）
        if (this.isValidDirectionChange(snake.direction, intent.direction)) {
          snake.nextDirection = intent.direction;
        }
      }

      intent.processed = true;
    }
  }

  /**
   * 移动蛇
   */
  private moveSnake(snake: Snake): void {
    // 安全检查：确保蛇有身体段
    if (!snake.segments || snake.segments.length === 0) {
      console.warn('[SnakeMovementSystem] 蛇没有身体段，无法移动');
      return;
    }

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

    // 标记本帧已移动，让碰撞系统知道需要处理碰撞和尾部移除
    snake.movedThisFrame = true;

    // 注意：尾部的移除由碰撞系统负责
    // SnakeCollisionSystem 会检查 movedThisFrame 并在同一帧处理碰撞和尾部移除
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
