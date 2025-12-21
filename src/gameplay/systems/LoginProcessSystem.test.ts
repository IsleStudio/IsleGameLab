/**
 * LoginProcessSystem 属性测试
 *
 * 测试登录流程的正确性属性
 *
 * **Feature: isle-game-lab, Property 2: 登录流程完整性**
 * **验证需求: 2.3, 2.4**
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ECS } from '../../core/ecs/World';
import { Stage } from '../../core/ecs/System';
import { GameState } from '../resources/GameState';
import { UserSession } from '../resources/UserSession';
import { LoginProcessSystem } from './LoginProcessSystem';
import { NavigationSystem } from './NavigationSystem';
import { IntentCleanupSystem } from './IntentCleanupSystem';
import { LoginIntent } from '../intents/user';

describe('登录流程属性测试', () => {
  let ecs: ECS;
  let mockStorage: Map<string, string>;

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

  // 初始化ECS和系统
  function setupECS(): void {
    ecs = new ECS();

    // 注册资源
    ecs.insertResource(new GameState());
    ecs.insertResource(new UserSession());

    // 注册系统
    ecs.addSystem(Stage.Update, new LoginProcessSystem());
    ecs.addSystem(Stage.Update, new NavigationSystem());
    ecs.addSystem(Stage.Update, new IntentCleanupSystem());
  }

  beforeEach(() => {
    setupLocalStorageMock();
    setupECS();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: clean-game-project, Property 2: 登录流程完整性**
   *
   * 属性2: 登录流程完整性
   * 对于任何有效用户名，当LoginIntent被LoginProcessSystem处理后，应该满足：
   * 1) UserSession.isLoggedIn为true
   * 2) UserSession.username等于输入的用户名（trim后）
   * 3) GameState.currentScene为'main-menu'
   *
   * **验证需求: 2.3, 2.4**
   */
  it('属性2: 有效用户名登录后应满足完整性条件', () => {
    // 生成有效用户名：包含至少一个非空白字符的字符串
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // 重新初始化ECS以确保干净的状态
        setupECS();

        // 验证初始状态
        const userSessionBefore = ecs.getResource(UserSession)!;
        const gameStateBefore = ecs.getResource(GameState)!;
        expect(userSessionBefore.isLoggedIn).toBe(false);
        expect(userSessionBefore.username).toBeNull();

        // 创建LoginIntent并处理
        ecs.spawn().insert(new LoginIntent(username));
        ecs.update();

        // 获取处理后的状态
        const userSessionAfter = ecs.getResource(UserSession)!;
        const gameStateAfter = ecs.getResource(GameState)!;

        // 验证属性2的三个条件
        // 1) UserSession.isLoggedIn为true
        const condition1 = userSessionAfter.isLoggedIn === true;

        // 2) UserSession.username等于输入的用户名（trim后）
        const condition2 = userSessionAfter.username === username.trim();

        // 3) GameState.currentScene为'main-menu'
        const condition3 = gameStateAfter.currentScene === 'main-menu';

        return condition1 && condition2 && condition3;
      }),
      { numRuns: 100 }
    );
  });

  it('属性2: 登录后loginTimestamp应该被设置', () => {
    // 生成有效用户名
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // 重新初始化ECS
        setupECS();

        const beforeTime = Date.now();

        // 创建LoginIntent并处理
        ecs.spawn().insert(new LoginIntent(username));
        ecs.update();

        const afterTime = Date.now();

        // 获取处理后的状态
        const userSession = ecs.getResource(UserSession)!;

        // 验证loginTimestamp在合理范围内
        return (
          userSession.loginTimestamp >= beforeTime &&
          userSession.loginTimestamp <= afterTime
        );
      }),
      { numRuns: 100 }
    );
  });

  it('属性2: 无效用户名不应改变登录状态', () => {
    // 生成无效用户名：空字符串或仅包含空白字符
    const whitespaceChars = [' ', '\t', '\n', '\r', '\f', '\v'];
    const invalidUsernameArb = fc.oneof(
      fc.constant(''),
      fc
        .array(fc.constantFrom(...whitespaceChars), { minLength: 1, maxLength: 20 })
        .map((chars) => chars.join(''))
    );

    fc.assert(
      fc.property(invalidUsernameArb, (username) => {
        // 重新初始化ECS
        setupECS();

        // 验证初始状态
        const userSessionBefore = ecs.getResource(UserSession)!;
        expect(userSessionBefore.isLoggedIn).toBe(false);

        // 创建LoginIntent并处理
        ecs.spawn().insert(new LoginIntent(username));
        ecs.update();

        // 获取处理后的状态
        const userSessionAfter = ecs.getResource(UserSession)!;

        // 验证登录状态未改变
        return userSessionAfter.isLoggedIn === false && userSessionAfter.username === null;
      }),
      { numRuns: 100 }
    );
  });
});
