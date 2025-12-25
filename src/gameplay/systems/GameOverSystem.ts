import { System } from '../../core/ecs/System';
import type { Component } from '../../core/ecs/Component';
import { Snake, GameScore } from '../components/snake';
import { SnakeGameResource, LeaderboardResource } from '../resources/SnakeGameResource';
import { UserSession } from '../resources/UserSession';
import { BackToMenuIntent } from '../intents/snake';
import { NavigateIntent } from '../intents/ui';

/**
 * GameOverSystem - 游戏结束处理系统
 * 处理游戏结束时的榜单记录和界面导航
 */
export class GameOverSystem extends System<[Snake, GameScore]> {
  public componentsRequired = [Snake, GameScore];

  public update(components: Iterable<[Snake, GameScore]>): void {
    const snakeGameRes = this.res(SnakeGameResource);
    const leaderboardRes = this.res(LeaderboardResource);
    const userSession = this.res(UserSession);

    // 检查是否有游戏刚刚结束且需要记录成绩
    for (const [snake, score] of components) {
      // 如果蛇死亡、生命为0、显示游戏结束界面且未记录成绩
      if (!snake.isAlive && score.lives === 0 && snakeGameRes.showGameOver && !snakeGameRes.hasRecordedScore) {
        const playerName = userSession.username || 'Anonymous';
        leaderboardRes.addEntry(playerName, score.score, score.survivalTime);
        snakeGameRes.hasRecordedScore = true; // 标记已记录，避免重复
        console.log(`[GameOverSystem] 记录成绩: ${playerName} - 得分:${score.score} 时间:${score.survivalTime}s`);
      }
    }

    // 处理返回主菜单Intent
    const backIntents = Array.from(this.query(BackToMenuIntent));
    for (const intent of backIntents) {
      if (intent.processed) continue;

      console.log('[GameOverSystem] 返回主菜单');

      // 清理游戏状态
      if (snakeGameRes.currentGameEntity !== null) {
        const gameEntity = this.ecs.getEntityById(snakeGameRes.currentGameEntity);
        if (gameEntity) {
          this.ecs.despawnRecursive(gameEntity);
        }
      }
      snakeGameRes.reset();

      // 导航到主菜单
      this.ecs.spawn().insert(new NavigateIntent('main-menu'));

      intent.processed = true;
    }
  }
}
