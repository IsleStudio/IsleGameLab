import { System } from '../../core/ecs/System';
import type { ECS } from '../../core/ecs/World';
import { Snake, GameScore, SnakeGameActive } from '../components/snake';
import { SnakeGameResource } from '../resources/SnakeGameResource';

/**
 * GameSpeedSystem - 游戏速度控制系统
 * 根据游戏时间自动提升游戏速度和更新存活时间
 */
export class GameSpeedSystem extends System {
  public run(ecs: ECS): void {
    const snakeGameRes = ecs.getResource(SnakeGameResource);
    if (!snakeGameRes || !snakeGameRes.isGameRunning) {
      return;
    }

    const config = snakeGameRes.config;
    const now = Date.now();

    // 更新所有活跃游戏的速度和时间
    for (const entity of ecs.query(SnakeGameActive, Snake, GameScore)) {
      const snake = ecs.getComponent(entity, Snake);
      const score = ecs.getComponent(entity, GameScore);

      if (!snake || !score || !snake.isAlive) {
        continue;
      }

      // 更新存活时间
      const elapsedMs = now - score.startTime;
      score.survivalTime = Math.floor(elapsedMs / 1000);

      // 计算速度倍率（每20秒增加0.5倍）
      const intervals = Math.floor(score.survivalTime / config.speedIncreaseInterval);
      const newSpeedMultiplier = Math.min(
        1.0 + intervals * config.speedIncreaseMultiplier,
        config.maxSpeedMultiplier
      );

      // 更新速度倍率
      if (newSpeedMultiplier !== score.speedMultiplier) {
        console.log(`[GameSpeedSystem] 速度提升: ${score.speedMultiplier.toFixed(1)}x -> ${newSpeedMultiplier.toFixed(1)}x`);
        score.speedMultiplier = newSpeedMultiplier;
      }

      // 将速度倍率同步到Snake组件（用于移动系统）
      (snake as any).speedMultiplier = score.speedMultiplier;
    }
  }
}
