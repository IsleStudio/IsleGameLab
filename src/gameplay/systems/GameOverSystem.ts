import { System } from '../../core/ecs/System';
import type { ECS } from '../../core/ecs/World';
import { Snake, GameScore, SnakeGameActive } from '../components/snake';
import { SnakeGameResource, LeaderboardResource } from '../resources/SnakeGameResource';
import { UserSession } from '../resources/UserSession';
import { BackToMenuIntent } from '../intents/snake';
import { NavigateIntent } from '../intents/ui';

/**
 * GameOverSystem - 游戏结束处理系统
 * 处理游戏结束时的榜单记录和界面导航
 */
export class GameOverSystem extends System {
  public run(ecs: ECS): void {
    const snakeGameRes = ecs.getResource(SnakeGameResource);
    const leaderboardRes = ecs.getResource(LeaderboardResource);
    const userSession = ecs.getResource(UserSession);

    if (!snakeGameRes || !leaderboardRes || !userSession) {
      return;
    }

    // 检查是否有游戏刚刚结束
    for (const entity of ecs.query(SnakeGameActive, Snake, GameScore)) {
      const snake = ecs.getComponent(entity, Snake);
      const score = ecs.getComponent(entity, GameScore);

      if (!snake || !score) {
        continue;
      }

      // 如果蛇死亡且生命为0，记录到榜单
      if (!snake.isAlive && score.lives === 0 && snakeGameRes.showGameOver) {
        // 只记录一次
        if (!snakeGameRes.isGameRunning) {
          const playerName = userSession.username || 'Anonymous';
          leaderboardRes.addEntry(playerName, score.score, score.survivalTime);
          console.log(`[GameOverSystem] 记录成绩: ${playerName} - 得分:${score.score} 时间:${score.survivalTime}s`);
          
          // 标记已处理，避免重复记录
          snakeGameRes.isGameRunning = false;
        }
      }
    }

    // 处理返回主菜单Intent
    for (const intentEntity of ecs.query(BackToMenuIntent)) {
      console.log('[GameOverSystem] 返回主菜单');

      // 清理游戏状态
      if (snakeGameRes.currentGameEntity !== null) {
        const gameEntity = snakeGameRes.currentGameEntity;
        if (ecs.hasEntity(gameEntity)) {
          ecs.despawnEntity(gameEntity);
        }
      }
      snakeGameRes.reset();

      // 导航到主菜单
      const navEntity = ecs.spawnEntity();
      ecs.addComponent(navEntity, new NavigateIntent('main-menu'));
    }
  }
}
