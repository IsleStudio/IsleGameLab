import { System } from '../../core/ecs/System';
import type { ECS } from '../../core/ecs/World';
import { Snake, Food, GameScore, SnakeGameActive, Direction, type SnakeSegment } from '../components/snake';
import { SnakeGameResource } from '../resources/SnakeGameResource';
import { StartSnakeGameIntent, RestartSnakeGameIntent } from '../intents/snake';

/**
 * SnakeGameInitSystem - 蛇游戏初始化系统
 * 处理开始新游戏和重新开始游戏的Intent
 */
export class SnakeGameInitSystem extends System {
  public run(ecs: ECS): void {
    const snakeGameRes = ecs.getResource(SnakeGameResource);
    if (!snakeGameRes) {
      console.error('[SnakeGameInitSystem] SnakeGameResource不存在');
      return;
    }

    // 处理开始新游戏Intent
    for (const entity of ecs.query(StartSnakeGameIntent)) {
      console.log('[SnakeGameInitSystem] 处理StartSnakeGameIntent');

      // 如果有旧游戏，清理旧游戏实体
      if (snakeGameRes.currentGameEntity !== null) {
        const oldEntity = snakeGameRes.currentGameEntity;
        if (ecs.hasEntity(oldEntity)) {
          ecs.despawnEntity(oldEntity);
        }
      }

      // 创建新游戏实体
      const gameEntity = this.createNewGame(ecs, snakeGameRes);
      snakeGameRes.startGame(gameEntity);

      console.log('[SnakeGameInitSystem] 新游戏已创建，实体ID:', gameEntity);
    }

    // 处理重新开始游戏Intent
    for (const entity of ecs.query(RestartSnakeGameIntent)) {
      console.log('[SnakeGameInitSystem] 处理RestartSnakeGameIntent');

      // 清理旧游戏实体
      if (snakeGameRes.currentGameEntity !== null) {
        const oldEntity = snakeGameRes.currentGameEntity;
        if (ecs.hasEntity(oldEntity)) {
          ecs.despawnEntity(oldEntity);
        }
      }

      // 创建新游戏实体
      const gameEntity = this.createNewGame(ecs, snakeGameRes);
      snakeGameRes.startGame(gameEntity);

      console.log('[SnakeGameInitSystem] 游戏已重新开始，实体ID:', gameEntity);
    }
  }

  /**
   * 创建新游戏实体
   */
  private createNewGame(ecs: ECS, snakeGameRes: SnakeGameResource): number {
    const config = snakeGameRes.config;

    // 创建游戏实体
    const entity = ecs.spawnEntity();

    // 添加SnakeGameActive标签
    ecs.addComponent(entity, new SnakeGameActive());

    // 创建蛇
    const snake = new Snake();
    snake.isAlive = true;
    snake.direction = Direction.Right;
    snake.nextDirection = Direction.Right;

    // 初始化蛇身体（在网格中央）
    const startX = Math.floor(config.gridWidth / 2);
    const startY = Math.floor(config.gridHeight / 2);
    snake.segments = [];
    for (let i = 0; i < config.initialSnakeLength; i++) {
      snake.segments.push({
        x: startX - i,
        y: startY,
      });
    }

    ecs.addComponent(entity, snake);

    // 创建食物
    const food = this.spawnFood(config.gridWidth, config.gridHeight, snake.segments);
    ecs.addComponent(entity, food);

    // 创建游戏得分
    const score = new GameScore();
    score.score = 0;
    score.startTime = Date.now();
    score.survivalTime = 0;
    score.speedMultiplier = 1.0;
    score.lives = config.initialLives;
    ecs.addComponent(entity, score);

    return entity;
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

      // 避免死循环
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
