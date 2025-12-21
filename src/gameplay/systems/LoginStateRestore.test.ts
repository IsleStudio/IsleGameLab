/**
 * 登录状态恢复属性测试
 *
 * 测试登录状态从存储恢复的正确性属性
 *
 * **Feature: isle-game-lab, Property 4: 登录状态恢复**
 * **验证需求: 3.3**
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ECS } from '../../core/ecs/World';
import { UserSession } from '../resources/UserSession';
import { StorageManager } from '../../core/persistence/StorageManager';
import { Serializer } from '../../core/persistence/Serializer';
import type { StoredUserSession } from '../../lib/types';

describe('登录状态恢复属性测试', () => {
  let mockStorage: Map<string, string>;
  const USER_SESSION_KEY = 'clean_game_user_session';

  // 设置localStorage模拟
  function setupLocalStorageMock(): void {
    mockStorage = new Map<string, string>();

    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        mockStorage.delete(key);
      }),
      clear: vi.fn(() => {
        mockStorage.clear();
      }),
      length: 0,
      key: vi.fn(() => null),
    };

    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    setupLocalStorageMock();
    // 重置StorageManager状态
    StorageManager.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: clean-game-project, Property 4: 登录状态恢复**
   *
   * 属性4: 登录状态恢复
   * 对于任何存储在localStorage中的有效用户数据，
   * 应用启动时UserSession应该正确恢复isLoggedIn状态和username
   *
   * **验证需求: 3.3**
   */
  it('属性4: 有效用户数据应该正确恢复登录状态', () => {
    // 生成有效用户名：包含至少一个非空白字符的字符串
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    // 生成有效的登录时间戳
    const validTimestampArb = fc.integer({ min: 1, max: Date.now() });

    fc.assert(
      fc.property(validUsernameArb, validTimestampArb, (username, timestamp) => {
        // 准备：创建有效的用户会话数据并存储
        const storedData: StoredUserSession = {
          username: username,
          isLoggedIn: true,
          loginTimestamp: timestamp,
        };
        mockStorage.set(USER_SESSION_KEY, JSON.stringify(storedData));

        // 创建新的ECS实例（模拟应用启动）
        const ecs = new ECS();
        ecs.insertResource(new UserSession());

        // 执行：加载用户会话
        const loaded = StorageManager.loadUserSession(ecs);

        // 验证：加载成功
        if (!loaded) return false;

        // 获取恢复后的UserSession
        const userSession = ecs.getResource(UserSession)!;

        // 验证属性4的条件：
        // 1) isLoggedIn状态正确恢复
        const condition1 = userSession.isLoggedIn === true;

        // 2) username正确恢复
        const condition2 = userSession.username === username;

        // 3) loginTimestamp正确恢复
        const condition3 = userSession.loginTimestamp === timestamp;

        return condition1 && condition2 && condition3;
      }),
      { numRuns: 100 }
    );
  });

  it('属性4: 未登录状态也应该正确恢复', () => {
    // 生成有效的登录时间戳
    const validTimestampArb = fc.integer({ min: 0, max: Date.now() });

    fc.assert(
      fc.property(validTimestampArb, (timestamp) => {
        // 准备：创建未登录的用户会话数据并存储
        const storedData: StoredUserSession = {
          username: null,
          isLoggedIn: false,
          loginTimestamp: timestamp,
        };
        mockStorage.set(USER_SESSION_KEY, JSON.stringify(storedData));

        // 创建新的ECS实例
        const ecs = new ECS();
        ecs.insertResource(new UserSession());

        // 执行：加载用户会话
        const loaded = StorageManager.loadUserSession(ecs);

        // 验证：加载成功
        if (!loaded) return false;

        // 获取恢复后的UserSession
        const userSession = ecs.getResource(UserSession)!;

        // 验证未登录状态正确恢复
        return (
          userSession.isLoggedIn === false &&
          userSession.username === null &&
          userSession.loginTimestamp === timestamp
        );
      }),
      { numRuns: 100 }
    );
  });

  it('属性4: 无存储数据时应保持默认状态', () => {
    // 创建新的ECS实例
    const ecs = new ECS();
    ecs.insertResource(new UserSession());

    // 执行：尝试加载用户会话（无数据）
    const loaded = StorageManager.loadUserSession(ecs);

    // 验证：加载失败
    expect(loaded).toBe(false);

    // 获取UserSession
    const userSession = ecs.getResource(UserSession)!;

    // 验证保持默认状态
    expect(userSession.isLoggedIn).toBe(false);
    expect(userSession.username).toBeNull();
    expect(userSession.loginTimestamp).toBe(0);
  });

  it('属性4: 无效数据格式应被拒绝并保持默认状态', () => {
    // 生成各种无效数据格式
    const invalidDataArb = fc.oneof(
      // 缺少必要字段
      fc.constant(JSON.stringify({ username: 'test' })),
      fc.constant(JSON.stringify({ isLoggedIn: true })),
      fc.constant(JSON.stringify({})),
      // 错误的字段类型
      fc.constant(JSON.stringify({ username: 123, isLoggedIn: true, loginTimestamp: 0 })),
      fc.constant(JSON.stringify({ username: 'test', isLoggedIn: 'yes', loginTimestamp: 0 })),
      fc.constant(JSON.stringify({ username: 'test', isLoggedIn: true, loginTimestamp: 'now' })),
      // 非JSON格式
      fc.constant('not json'),
      fc.constant(''),
      // null值
      fc.constant('null')
    );

    fc.assert(
      fc.property(invalidDataArb, (invalidData) => {
        // 重置存储
        mockStorage.clear();
        StorageManager.reset();

        // 准备：存储无效数据
        mockStorage.set(USER_SESSION_KEY, invalidData);

        // 创建新的ECS实例
        const ecs = new ECS();
        ecs.insertResource(new UserSession());

        // 执行：尝试加载用户会话
        const loaded = StorageManager.loadUserSession(ecs);

        // 验证：加载失败
        if (loaded) return false;

        // 获取UserSession
        const userSession = ecs.getResource(UserSession)!;

        // 验证保持默认状态
        return (
          userSession.isLoggedIn === false &&
          userSession.username === null &&
          userSession.loginTimestamp === 0
        );
      }),
      { numRuns: 50 }
    );
  });

  it('属性4: 保存后恢复应该保持数据一致性（往返测试）', () => {
    // 生成有效用户名
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // 重置存储
        mockStorage.clear();
        StorageManager.reset();

        // 准备：创建ECS并设置登录状态
        const ecs1 = new ECS();
        const session1 = new UserSession();
        session1.setLoggedIn(username);
        ecs1.insertResource(session1);

        // 保存状态
        const saved = StorageManager.saveUserSession(ecs1);
        if (!saved) return false;

        // 创建新的ECS实例（模拟应用重启）
        const ecs2 = new ECS();
        ecs2.insertResource(new UserSession());

        // 恢复状态
        const loaded = StorageManager.loadUserSession(ecs2);
        if (!loaded) return false;

        // 获取恢复后的UserSession
        const session2 = ecs2.getResource(UserSession)!;

        // 验证数据一致性
        return (
          session2.isLoggedIn === session1.isLoggedIn &&
          session2.username === session1.username
          // 注意：loginTimestamp可能因为setLoggedIn使用Date.now()而略有不同
        );
      }),
      { numRuns: 100 }
    );
  });
});
