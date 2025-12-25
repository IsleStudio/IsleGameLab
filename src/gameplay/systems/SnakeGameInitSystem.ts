import { System } from '../../core/ecs/System';
import type { Component } from '../../core/ecs/Component';
import { Snake, Food, GameScore, SnakeGameActive, Direction, type SnakeSegment } from '../components/snake';
import { SnakeGameResource } from '../resources/SnakeGameResource';
import { StartSnakeGameIntent, RestartSnakeGameIntent } from '../intents/snake';

/**
 * SnakeGameInitSystem - 蛇游戏初始化系统
 * 处理开始新游戏和重新开始游戏的Intent
 */
export class SnakeGameInitSystem extends System<Component[]> {
  public componentsRequired = [];
  public isGlobal = true;

  public update(components: Iterable<Component[]>): void {
    const snakeGameRes = this.res(SnakeGameResource);

    // 处理开始新游戏Intent
    const startIntents = Array.from(this.query(StartSnakeGameIntent));
    for (const intent of startIntents) {
      if (intent.processed) continue;

      console.log('[SnakeGameInitSystem] 处理StartSnakeGameIntent');

      // 如果有旧游戏，清理旧游戏实体
      if (snakeGameRes.currentGameEntity !== null) {
        const oldEntity = this.ecs.getEntityById(snakeGameRes.currentGameEntity);
        if (oldEntity) {
          this.ecs.despawnRecursive(oldEntity);
        }
      }

      // 创建新游戏实体
      const gameEntity = this.createNewGame(snakeGameRes);
      snakeGameRes.startGame(gameEntity.id());

      console.log('[SnakeGameInitSystem] 新游戏已创建，实体ID:', gameEntity.id());
      intent.processed = true;
    }

    // 处理重新开始游戏Intent
    const restartIntents = Array.from(this.query(RestartSnakeGameIntent));
    for (const intent of restartIntents) {
      if (intent.processed) continue;

      console.log('[SnakeGameInitSystem] 处理RestartSnakeGameIntent');

      // 清理旧游戏实体
      if (snakeGameRes.currentGameEntity !== null) {
        const oldEntity = this.ecs.getEntityById(snakeGameRes.currentGameEntity);
        if (oldEntity) {
          this.ecs.despawnRecursive(oldEntity);
        }
      }

      // 创建新游戏实体
      const gameEntity = this.createNewGame(snakeGameRes);
      snakeGameRes.startGame(gameEntity.id());

      console.log('[SnakeGameInitSystem] 游戏已重新开始，实体ID:', gameEntity.id());
      intent.processed = true;
    }
  }

  /**
   * 创建新游戏实体
   */
  private createNewGame(snakeGameRes: SnakeGameResource): any {
    const config = snakeGameRes.config;

    // 创建游戏实体
    const entity = this.ecs.spawn();

    // 添加SnakeGameActive标签
    entity.insert(new SnakeGameActive());

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

    entity.insert(snake);

    // 创建食物
    const food = this.spawnFood(config.gridWidth, config.gridHeight, snake.segments);
    entity.insert(food);

    // 创建游戏得分
    const score = new GameScore();
    score.score = 0;
    score.startTime = Date.now();
    score.survivalTime = 0;
    score.speedMultiplier = 1.0;
    score.lives = config.initialLives;
    entity.insert(score);

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
