import { System } from '../../core/ecs/System';
import { Snake, Food, GameScore, SnakeGameActive, type SnakeSegment } from '../components/snake';
import { SnakeGameResource } from '../resources/SnakeGameResource';

/**
 * SnakeCollisionSystem - 蛇碰撞检测系统
 * 处理蛇与食物、墙壁、自身的碰撞检测
 */
export class SnakeCollisionSystem extends System<[Snake, Food, GameScore]> {
  public componentsRequired = [Snake, Food, GameScore];

  public update(components: Iterable<[Snake, Food, GameScore]>): void {
    const snakeGameRes = this.res(SnakeGameResource);
    if (!snakeGameRes.isGameRunning) {
      return;
    }

    const config = snakeGameRes.config;

    // 检查所有活跃的游戏实体
    for (const [snake, food, score] of components) {
      if (!snake.isAlive) {
        continue;
      }

      // 只在蛇移动的帧处理碰撞检测
      // 这样确保移动和碰撞检测的频率一致
      if (!snake.movedThisFrame) {
        continue;
      }

      // 安全检查：确保蛇有身体段
      if (!snake.segments || snake.segments.length === 0) {
        console.warn('[SnakeCollisionSystem] 蛇没有身体段，跳过');
        snake.movedThisFrame = false;
        continue;
      }

      const head = snake.segments[0];
      let shouldRemoveTail = true; // 默认移除尾部

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        this.handleFoodCollision(snake, food, score, config.gridWidth, config.gridHeight);
        shouldRemoveTail = false; // 吃到食物，不移除尾部，蛇会变长
      }

      // 检查是否撞墙
      if (
        head.x < 0 ||
        head.x >= config.gridWidth ||
        head.y < 0 ||
        head.y >= config.gridHeight
      ) {
        this.handleDeath(snake, score, snakeGameRes);
        snake.movedThisFrame = false; // 清除移动标记
        continue; // 死亡后不处理尾部
      }

      // 检查是否撞到自己（跳过头部）
      let hitSelf = false;
      for (let i = 1; i < snake.segments.length; i++) {
        const segment = snake.segments[i];
        if (head.x === segment.x && head.y === segment.y) {
          this.handleDeath(snake, score, snakeGameRes);
          hitSelf = true;
          break;
        }
      }

      // 如果撞到自己，清除标记并跳过尾部处理
      if (hitSelf) {
        snake.movedThisFrame = false;
        continue;
      }

      // 移除尾部（如果需要）
      if (shouldRemoveTail && snake.segments.length > 0) {
        snake.segments.pop();
      }

      // 清除移动标记，等待下次移动
      snake.movedThisFrame = false;
    }
  }

  /**
   * 处理食物碰撞
   */
  private handleFoodCollision(
    snake: Snake,
    food: Food,
    score: GameScore,
    gridWidth: number,
    gridHeight: number
  ): void {
    // 增加得分
    score.score += 10;

    // 生成新食物
    const newFood = this.spawnFood(gridWidth, gridHeight, snake.segments);
    food.x = newFood.x;
    food.y = newFood.y;
  }

  /**
   * 处理死亡
   */
  private handleDeath(snake: Snake, score: GameScore, snakeGameRes: SnakeGameResource): void {
    console.log('[SnakeCollisionSystem] 蛇死亡，剩余生命:', score.lives - 1);

    score.lives -= 1;

    if (score.lives > 0) {
      // 还有生命，重置蛇的位置
      this.resetSnake(snake, snakeGameRes.config.gridWidth, snakeGameRes.config.gridHeight, snakeGameRes.config.initialSnakeLength);
    } else {
      // 生命用尽，游戏结束
      snake.isAlive = false;
      snakeGameRes.endGame();
      console.log('[SnakeCollisionSystem] 游戏结束');
    }
  }

  /**
   * 重置蛇的位置
   */
  private resetSnake(snake: Snake, gridWidth: number, gridHeight: number, length: number): void {
    const startX = Math.floor(gridWidth / 2);
    const startY = Math.floor(gridHeight / 2);
    snake.segments = [];
    for (let i = 0; i < length; i++) {
      snake.segments.push({
        x: startX - i,
        y: startY,
      });
    }
    snake.direction = snake.nextDirection; // 保持当前方向
  }

  /**
   * 生成食物（避免与蛇身体重叠）
   */
  private spawnFood(gridWidth: number, gridHeight: number, snakeSegments: SnakeSegment[]): Food {
    let x: number;
    let y: number;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      x = Math.floor(Math.random() * gridWidth);
      y = Math.floor(Math.random() * gridHeight);
      attempts++;

      if (attempts > maxAttempts) {
        break;
      }
    } while (this.isPositionOccupied(x, y, snakeSegments));

    return new Food(x, y);
  }

  /**
   * 检查位置是否被蛇占据
   */
  private isPositionOccupied(x: number, y: number, segments: SnakeSegment[]): boolean {
    return segments.some((seg) => seg.x === x && seg.y === y);
  }
}
