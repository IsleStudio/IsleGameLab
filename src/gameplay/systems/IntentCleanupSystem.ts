import { System } from '../../core/ecs/System';
import { Intent } from '../../core/ecs/Intent';
import { LoginIntent } from '../intents/user';
import { NavigateIntent } from '../intents/ui';

/**
 * Intent清理系统 - 清理已处理的Intent
 * 在每帧结束时移除所有已处理的Intent实体
 * 
 * 注意：由于Intent是抽象类，此系统使用isGlobal模式
 * 并显式查询所有已知的Intent子类
 */
export class IntentCleanupSystem extends System<[]> {
  public componentsRequired: never[] = [];
  public isGlobal = true;

  // 注册所有Intent类型，便于统一清理
  private static readonly INTENT_TYPES = [LoginIntent, NavigateIntent];

  public update(): void {
    // 遍历所有已知的Intent类型
    for (const IntentType of IntentCleanupSystem.INTENT_TYPES) {
      const intents = this.ecs.query(IntentType);
      
      for (const intent of intents) {
        // 移除已处理的Intent实体
        if ((intent as Intent).processed) {
          this.ecs.removeEntity(intent.entity);
        }
      }
    }
  }
}
