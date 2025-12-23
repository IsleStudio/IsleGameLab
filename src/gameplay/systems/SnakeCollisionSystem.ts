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

      // 安全检查：确保蛇有身体段
      if (!snake.segments || snake.segments.length === 0) {
        console.warn('[SnakeCollisionSystem] 蛇没有身体段，跳过');
        continue;
      }

      const head = snake.segments[0];

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        this.handleFoodCollision(snake, food, score, config.gridWidth, config.gridHeight);
        continue; // 吃到食物后跳过死亡检测，给玩家一个frame
      }
      // #TODO 移除尾部（应该在碰撞检测系统中会处理是否吃到食物）目前逻辑被移动到了MovementSystem中
      // 移除尾部（正常移动）
      //if (snake.segments.length > 0) {
      //  snake.segments.pop();
      //}

      // 检查是否撞墙
      if (
        head.x < 0 ||
        head.x >= config.gridWidth ||
        head.y < 0 ||
        head.y >= config.gridHeight
      ) {
        this.handleDeath(snake, score, snakeGameRes);
        continue;
      }

      // 检查是否撞到自己（跳过头部）
      for (let i = 1; i < snake.segments.length; i++) {
        const segment = snake.segments[i];
        if (head.x === segment.x && head.y === segment.y) {
          this.handleDeath(snake, score, snakeGameRes);
          break;
        }
      }
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

    // 不移除尾部，蛇变长
    // （在SnakeMovementSystem中已经添加了新头部）

    // 生成新食物
    const newFood = this.spawnFood(gridWidth, gridHeight, snake.segments);
    food.x = newFood.x;
    food.y = newFood.y;

    console.log('[SnakeCollisionSystem] 吃到食物，得分:', score.score);
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
