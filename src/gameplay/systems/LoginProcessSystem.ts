import { System } from '../../core/ecs/System';
import { LoginIntent } from '../intents/user';
import { NavigateIntent } from '../intents/ui';
import { UserSession } from '../resources/UserSession';
import { UserLoggedInEvent } from '../events/user';
import { UIErrorEvent } from '../events/ui';
import { UserUtil } from '../utils/UserUtil';
import { logger } from '../../lib/errors';

/**
 * 登录处理系统 - 处理LoginIntent
 * System是唯一裁判，决定是否允许登录
 */
export class LoginProcessSystem extends System<[LoginIntent]> {
  public componentsRequired = [LoginIntent];

  public update(intents: Iterable<[LoginIntent]>): void {
    // 获取全局资源
    const userSession = this.res(UserSession);

    for (const [intent] of intents) {
      // 跳过已处理的Intent
      if (intent.processed) continue;

      // 获取并验证用户名
      const username = intent.username.trim();
      const validationResult = UserUtil.validateUsernameWithError(username);

      if (validationResult.valid) {
        // 更新用户会话
        userSession.setLoggedIn(username);

        // 持久化到本地存储
        const saved = UserUtil.saveUserToStorage(username);
        if (!saved) {
          logger.warn('[LoginProcessSystem] 用户数据持久化失败，但登录继续', { username });
        }

        // 添加导航Intent，让NavigationSystem处理导航逻辑
        this.ecs.spawn().insert(new NavigateIntent('main-menu'));

        // 触发登录成功事件
        this.ecs.trigger(new UserLoggedInEvent(username, userSession.loginTimestamp));
        logger.info('[LoginProcessSystem] 用户登录成功', { username });
      } else {
        // 登录失败，触发错误事件
        const errorMessage = validationResult.error?.message || '用户名验证失败';
        this.ecs.trigger(new UIErrorEvent(errorMessage, 'validation'));
        logger.warn('[LoginProcessSystem] 登录失败', {
          username: intent.username,
          error: errorMessage,
        });
      }

      // 标记Intent已处理
      intent.processed = true;
    }
  }
}
