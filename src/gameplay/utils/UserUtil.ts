import { ECS } from '../../core/ecs/World';
import { LoginIntent } from '../intents/user';
import { ValidationError, StorageError, logger } from '../../lib/errors';

// 用户会话存储键
const USER_SESSION_KEY = 'user_session';

/**
 * 用户工具类 - Intent发射器 + 数据处理
 * 提供两种API风格：
 * 1. 为System提供干净的数据处理函数
 * 2. 为外部系统提供人类友好的OOP风格API
 */
export class UserUtil {
  // ========== 外部系统友好API（包含查询和判断） ==========

  /**
   * 请求登录 - 生成LoginIntent
   * 验证用户名后生成Intent，由System决定是否执行
   */
  public static requestLogin(ecs: ECS, username: string): boolean {
    // 验证用户名
    const validationResult = this.validateUsernameWithError(username);
    if (!validationResult.valid) {
      logger.warn('[UserUtil] 登录请求被拒绝', { reason: validationResult.error?.message });
      return false;
    }

    // 生成LoginIntent
    ecs.spawn().insert(new LoginIntent(username.trim()));
    logger.debug('[UserUtil] 登录Intent已生成', { username: username.trim() });
    return true;
  }

  // ========== System数据处理函数（干净简单） ==========

  /**
   * 验证用户名 - 检查是否为有效用户名
   * 有效用户名：非空且包含至少一个非空白字符
   */
  public static validateUsername(username: string): boolean {
    if (username === null || username === undefined) {
      return false;
    }
    return username.trim().length > 0;
  }

  /**
   * 验证用户名并返回详细错误信息
   * 用于需要错误详情的场景
   */
  public static validateUsernameWithError(username: string): {
    valid: boolean;
    error?: ValidationError;
  } {
    // 检查null/undefined
    if (username === null || username === undefined) {
      return {
        valid: false,
        error: new ValidationError('用户名不能为空', 'username', username),
      };
    }

    // 检查空字符串
    if (username.length === 0) {
      return {
        valid: false,
        error: new ValidationError('用户名不能为空', 'username', username),
      };
    }

    // 检查仅包含空白字符
    if (username.trim().length === 0) {
      return {
        valid: false,
        error: new ValidationError('用户名不能仅包含空白字符', 'username', username),
      };
    }

    return { valid: true };
  }

  /**
   * 保存用户到本地存储
   * 将用户名持久化到localStorage
   */
  public static saveUserToStorage(username: string): boolean {
    try {
      if (!this.isStorageAvailable()) {
        const error = new StorageError('localStorage不可用', 'check');
        logger.warn('[UserUtil] ' + error.message, { operation: 'save' });
        return false;
      }

      const data = {
        username: username,
        timestamp: Date.now(),
      };
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
      logger.debug('[UserUtil] 用户数据已保存', { username });
      return true;
    } catch (error) {
      const storageError = new StorageError(
        '保存用户失败',
        'write',
        USER_SESSION_KEY,
        error instanceof Error ? error : undefined
      );
      logger.error('[UserUtil] ' + storageError.message, storageError);
      return false;
    }
  }

  /**
   * 从本地存储加载用户
   * 返回存储的用户名，如果不存在或无效则返回null
   */
  public static loadUserFromStorage(): string | null {
    try {
      if (!this.isStorageAvailable()) {
        const error = new StorageError('localStorage不可用', 'check');
        logger.warn('[UserUtil] ' + error.message, { operation: 'load' });
        return null;
      }

      const serialized = localStorage.getItem(USER_SESSION_KEY);
      if (!serialized) {
        logger.debug('[UserUtil] 未找到保存的用户数据');
        return null;
      }

      const data = JSON.parse(serialized);
      if (data && typeof data.username === 'string' && data.username.trim().length > 0) {
        logger.debug('[UserUtil] 用户数据已加载', { username: data.username });
        return data.username;
      }

      logger.warn('[UserUtil] 用户数据格式无效', { data });
      return null;
    } catch (error) {
      const storageError = new StorageError(
        '加载用户失败',
        'read',
        USER_SESSION_KEY,
        error instanceof Error ? error : undefined
      );
      logger.error('[UserUtil] ' + storageError.message, storageError);
      return null;
    }
  }

  /**
   * 清除本地存储的用户数据
   */
  public static clearUserFromStorage(): boolean {
    try {
      if (!this.isStorageAvailable()) {
        const error = new StorageError('localStorage不可用', 'check');
        logger.warn('[UserUtil] ' + error.message, { operation: 'clear' });
        return false;
      }
      localStorage.removeItem(USER_SESSION_KEY);
      logger.debug('[UserUtil] 用户数据已清除');
      return true;
    } catch (error) {
      const storageError = new StorageError(
        '清除用户失败',
        'delete',
        USER_SESSION_KEY,
        error instanceof Error ? error : undefined
      );
      logger.error('[UserUtil] ' + storageError.message, storageError);
      return false;
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 检查localStorage是否可用
   */
  private static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}
