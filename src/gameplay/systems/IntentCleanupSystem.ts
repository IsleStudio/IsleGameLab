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

  public update(): void {
    // 清理 LoginIntent
    const loginIntents = this.ecs.query(LoginIntent);
    for (const intent of loginIntents) {
      if ((intent as Intent).processed) {
        this.ecs.removeEntity(intent.entity);
      }
    }

    // 清理 NavigateIntent
    const navigateIntents = this.ecs.query(NavigateIntent);
    for (const intent of navigateIntents) {
      if ((intent as Intent).processed) {
        this.ecs.removeEntity(intent.entity);
      }
    }
  }
}
