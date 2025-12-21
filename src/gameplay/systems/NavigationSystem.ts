import { System } from '../../core/ecs/System';
import { NavigateIntent } from '../intents/ui';
import { GameState } from '../resources/GameState';
import { NavigationCompletedEvent } from '../events/ui';

/**
 * 导航系统 - 处理NavigateIntent
 * System是唯一裁判，决定是否允许导航
 */
export class NavigationSystem extends System<[NavigateIntent]> {
  public componentsRequired = [NavigateIntent];
  public isGlobal = true; // 设置为全局系统，使用手动查询

  public update(intents: Iterable<[NavigateIntent]>): void {
    // 获取全局资源
    const gameState = this.res(GameState);

    // 使用直接查询而不是依赖系统缓存
    const intentComponents = Array.from(this.query(NavigateIntent));
    
    if (intentComponents.length > 0) {
      console.log(`[NavigationSystem] 发现 ${intentComponents.length} 个NavigateIntent`);
    }
    
    let processedCount = 0;

    for (const intent of intentComponents) {
      // 跳过已处理的Intent
      if (intent.processed) {
        continue;
      }

      // 记录前一个视图
      const previousView = gameState.currentScene;
      console.log(`[NavigationSystem] 导航: ${previousView} -> ${intent.targetView}`);

      // 更新场景
      gameState.navigateTo(intent.targetView);
      console.log(`[NavigationSystem] GameState.navigateTo已调用`);

      // 触发导航完成事件
      this.ecs.trigger(new NavigationCompletedEvent(intent.targetView, previousView));

      // 标记Intent已处理
      intent.processed = true;
      
      processedCount++;
    }
    
    if (processedCount > 0) {
      console.log(`[NavigationSystem] 处理了 ${processedCount} 个Intent`);
    }
  }
}
