import type { ECS } from '../ecs/World';
import { Serializer } from './Serializer';
import type { StoredUserSession } from '../../lib/types';
import { StorageError, logger } from '../../lib/errors';

/**
 * 简化的存储管理器 - 仅用于MVP阶段
 * 提供localStorage的封装和错误处理
 * 
 * 特性：
 * - localStorage可用性检测
 * - 自动降级到内存模式
 * - 错误处理和日志记录
 * - 数据完整性验证
 * 
 * 未来扩展：
 * - 自定义存储策略
 * - 数据压缩和加密
 * - 网络同步支持
 * - 版本迁移机制
 */
export class StorageManager {
  private static readonly USER_SESSION_KEY = 'clean_game_user_session';
  private static readonly STORAGE_TEST_KEY = '__storage_test__';
  
  // 内存降级模式的数据存储
  private static memoryStorage = new Map<string, string>();
  private static isMemoryMode = false;

  /**
   * 检测localStorage是否可用
   */
  private static isLocalStorageAvailable(): boolean {
    try {
      const testValue = 'test';
      localStorage.setItem(this.STORAGE_TEST_KEY, testValue);
      const retrieved = localStorage.getItem(this.STORAGE_TEST_KEY);
      localStorage.removeItem(this.STORAGE_TEST_KEY);
      return retrieved === testValue;
    } catch (error) {
      const storageError = new StorageError(
        'localStorage不可用，将使用内存模式',
        'check',
        undefined,
        error instanceof Error ? error : undefined
      );
      logger.warn('[StorageManager] ' + storageError.message);
      return false;
    }
  }

  /**
   * 获取存储项
   */
  private static getItem(key: string): string | null {
    if (this.isMemoryMode || !this.isLocalStorageAvailable()) {
      this.isMemoryMode = true;
      return this.memoryStorage.get(key) || null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      const storageError = new StorageError(
        '读取失败，切换到内存模式',
        'read',
        key,
        error instanceof Error ? error : undefined
      );
      logger.error('[StorageManager] ' + storageError.message, storageError);
      this.isMemoryMode = true;
      return this.memoryStorage.get(key) || null;
    }
  }

  /**
   * 设置存储项
   */
  private static setItem(key: string, value: string): boolean {
    if (this.isMemoryMode || !this.isLocalStorageAvailable()) {
      this.isMemoryMode = true;
      this.memoryStorage.set(key, value);
      return true;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      const storageError = new StorageError(
        '写入失败，切换到内存模式',
        'write',
        key,
        error instanceof Error ? error : undefined
      );
      logger.error('[StorageManager] ' + storageError.message, storageError);
      this.isMemoryMode = true;
      this.memoryStorage.set(key, value);
      return false; // 返回false表示降级到内存模式
    }
  }

  /**
   * 移除存储项
   */
  private static removeItem(key: string): boolean {
    if (this.isMemoryMode || !this.isLocalStorageAvailable()) {
      this.isMemoryMode = true;
      this.memoryStorage.delete(key);
      return true;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      const storageError = new StorageError(
        '删除失败',
        'delete',
        key,
        error instanceof Error ? error : undefined
      );
      logger.error('[StorageManager] ' + storageError.message, storageError);
      return false;
    }
  }

  /**
   * 保存用户会话到存储
   */
  public static saveUserSession(ecs: ECS): boolean {
    try {
      const data = Serializer.serializeUserSession(ecs);
      if (!data) {
        logger.warn('[StorageManager] 无用户会话数据可保存');
        return false;
      }

      const serialized = JSON.stringify(data);
      const success = this.setItem(this.USER_SESSION_KEY, serialized);
      
      if (success && !this.isMemoryMode) {
        logger.info('[StorageManager] 用户会话已保存到localStorage');
      } else if (this.isMemoryMode) {
        logger.info('[StorageManager] 用户会话已保存到内存（localStorage不可用）');
      }
      
      return true; // 即使降级到内存模式也算成功
    } catch (error) {
      const storageError = new StorageError(
        '保存用户会话失败',
        'write',
        this.USER_SESSION_KEY,
        error instanceof Error ? error : undefined
      );
      logger.error('[StorageManager] ' + storageError.message, storageError);
      return false;
    }
  }

  /**
   * 从存储加载用户会话
   */
  public static loadUserSession(ecs: ECS): boolean {
    try {
      const serialized = this.getItem(this.USER_SESSION_KEY);
      if (!serialized) {
        logger.info('[StorageManager] 未找到保存的用户会话');
        return false;
      }

      let data: unknown;
      try {
        data = JSON.parse(serialized);
      } catch (parseError) {
        const storageError = new StorageError(
          '用户会话数据解析失败',
          'read',
          this.USER_SESSION_KEY,
          parseError instanceof Error ? parseError : undefined
        );
        logger.error('[StorageManager] ' + storageError.message, storageError);
        this.clearUserSession(); // 清除无效数据
        return false;
      }
      
      // 验证数据完整性
      if (!Serializer.validateUserSessionData(data)) {
        const storageError = new StorageError(
          '用户会话数据格式无效',
          'read',
          this.USER_SESSION_KEY
        );
        logger.error('[StorageManager] ' + storageError.message, storageError, { data });
        this.clearUserSession(); // 清除无效数据
        return false;
      }

      Serializer.deserializeUserSession(ecs, data as StoredUserSession);
      
      if (this.isMemoryMode) {
        logger.info('[StorageManager] 用户会话已从内存加载');
      } else {
        logger.info('[StorageManager] 用户会话已从localStorage加载');
      }
      
      return true;
    } catch (error) {
      const storageError = new StorageError(
        '加载用户会话失败',
        'read',
        this.USER_SESSION_KEY,
        error instanceof Error ? error : undefined
      );
      logger.error('[StorageManager] ' + storageError.message, storageError);
      // 尝试清除可能损坏的数据
      this.clearUserSession();
      return false;
    }
  }

  /**
   * 清除用户会话数据
   */
  public static clearUserSession(): boolean {
    try {
      const success = this.removeItem(this.USER_SESSION_KEY);
      
      if (success) {
        if (this.isMemoryMode) {
          logger.info('[StorageManager] 用户会话已从内存清除');
        } else {
          logger.info('[StorageManager] 用户会话已从localStorage清除');
        }
      }
      
      return success;
    } catch (error) {
      const storageError = new StorageError(
        '清除用户会话失败',
        'delete',
        this.USER_SESSION_KEY,
        error instanceof Error ? error : undefined
      );
      logger.error('[StorageManager] ' + storageError.message, storageError);
      return false;
    }
  }

  /**
   * 获取存储模式信息
   */
  public static getStorageInfo(): { mode: 'localStorage' | 'memory'; available: boolean } {
    return {
      mode: this.isMemoryMode ? 'memory' : 'localStorage',
      available: this.isLocalStorageAvailable()
    };
  }

  /**
   * 重置存储管理器状态（主要用于测试）
   */
  public static reset(): void {
    this.isMemoryMode = false;
    this.memoryStorage.clear();
  }
}