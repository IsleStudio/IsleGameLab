/**
 * 集成测试: 登录流程、状态恢复和错误处理
 *
 * 这些测试验证完整的用户登录流程：
 * - 完整登录流程（从UI交互到状态更新）
 * - 状态恢复流程（从存储加载用户会话）
 * - 错误处理流程（验证错误、存储错误）
 *
 * 验证需求: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ECS } from '../../core/ecs/World';
import { Stage } from '../../core/ecs/System';
import { GameState, UserSession } from '../../gameplay/resources';
import {
  LoginProcessSystem,
  NavigationSystem,
  IntentCleanupSystem,
} from '../../gameplay/systems';
import { LoginIntent } from '../../gameplay/intents/user';
import { NavigateIntent } from '../../gameplay/intents/ui';
import { UserLoggedInEvent } from '../../gameplay/events/user';
import { UIErrorEvent } from '../../gameplay/events/ui';
import { UserUtil } from '../../gameplay/utils/UserUtil';
import { StorageManager } from '../../core/persistence/StorageManager';
import { ErrorLogger, LogLevel } from '../../lib/errors';

// UserUtil使用的存储键
const USER_SESSION_KEY = 'user_session';

describe('登录流程集成测试', () => {
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
    StorageManager.reset();
    ErrorLogger.reset();
    ErrorLogger.getInstance().setLogLevel(LogLevel.NONE); // 禁用日志输出
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('完整登录流程测试 (需求 2.1, 2.2, 2.3, 2.4)', () => {
    it('应该完成有效用户名的完整登录流程', () => {
      // 验证初始状态
      const userSession = ecs.getResource(UserSession)!;
      const gameState = ecs.getResource(GameState)!;

      expect(userSession.isLoggedIn).toBe(false);
      expect(userSession.username).toBeNull();
      expect(gameState.currentScene).toBe('main-menu');

      // 模拟用户点击登录按钮，导航到登录页面
      ecs.spawn().insert(new NavigateIntent('login'));
      ecs.update();

      expect(gameState.currentScene).toBe('login');

      // 模拟用户输入用户名并提交
      const testUsername = 'TestPlayer';
      ecs.spawn().insert(new LoginIntent(testUsername));
      ecs.update();

      // 验证登录成功后的状态
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe(testUsername);
      expect(userSession.loginTimestamp).toBeGreaterThan(0);

      // 验证导航回主菜单
      expect(gameState.currentScene).toBe('main-menu');

      // 验证数据已持久化到存储（UserUtil使用user_session键）
      const storedData = mockStorage.get(USER_SESSION_KEY);
      expect(storedData).toBeDefined();

      const parsedData = JSON.parse(storedData!);
      expect(parsedData.username).toBe(testUsername);
    });

    it('应该触发UserLoggedInEvent事件', () => {
      const eventCallback = vi.fn();
      ecs.addObserver(UserLoggedInEvent, (trigger) => {
        eventCallback(trigger.event);
      });

      const testUsername = 'EventTestUser';
      ecs.spawn().insert(new LoginIntent(testUsername));
      ecs.update();

      expect(eventCallback).toHaveBeenCalledTimes(1);
      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          username: testUsername,
        })
      );
    });

    it('应该通过UserUtil.requestLogin生成LoginIntent', () => {
      const testUsername = 'UtilTestUser';

      // 使用UserUtil请求登录
      const result = UserUtil.requestLogin(ecs, testUsername);
      expect(result).toBe(true);

      // 运行ECS更新
      ecs.update();

      // 验证登录成功
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe(testUsername);
    });
  });

  describe('用户名验证测试 (需求 2.2, 2.5)', () => {
    it('应该拒绝空用户名', () => {
      const errorCallback = vi.fn();
      ecs.addObserver(UIErrorEvent, (trigger) => {
        errorCallback(trigger.event);
      });

      ecs.spawn().insert(new LoginIntent(''));
      ecs.update();

      // 验证登录失败
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(false);

      // 验证触发了错误事件
      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'validation',
        })
      );
    });

    it('应该拒绝仅包含空白字符的用户名', () => {
      const errorCallback = vi.fn();
      ecs.addObserver(UIErrorEvent, (trigger) => {
        errorCallback(trigger.event);
      });

      ecs.spawn().insert(new LoginIntent('   \t\n  '));
      ecs.update();

      // 验证登录失败
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(false);

      // 验证触发了错误事件
      expect(errorCallback).toHaveBeenCalledTimes(1);
    });

    it('应该接受包含空白字符但有有效内容的用户名', () => {
      const testUsername = '  ValidUser  ';
      ecs.spawn().insert(new LoginIntent(testUsername));
      ecs.update();

      // 验证登录成功，用户名被trim
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe('ValidUser');
    });

    it('UserUtil.requestLogin应该拒绝无效用户名', () => {
      const result1 = UserUtil.requestLogin(ecs, '');
      expect(result1).toBe(false);

      const result2 = UserUtil.requestLogin(ecs, '   ');
      expect(result2).toBe(false);

      // 验证没有生成Intent
      ecs.update();
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(false);
    });
  });

  describe('状态恢复流程测试 (需求 3.2, 3.3, 3.4)', () => {
    it('应该从存储恢复用户会话', () => {
      // 预先存储用户数据
      const storedSession = {
        username: 'RestoredUser',
        isLoggedIn: true,
        loginTimestamp: Date.now() - 10000,
      };
      mockStorage.set('clean_game_user_session', JSON.stringify(storedSession));

      // 加载用户会话
      const loaded = StorageManager.loadUserSession(ecs);
      expect(loaded).toBe(true);

      // 验证会话已恢复
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe('RestoredUser');
      expect(userSession.loginTimestamp).toBe(storedSession.loginTimestamp);
    });

    it('应该在存储为空时返回false', () => {
      // 确保存储为空
      mockStorage.clear();

      const loaded = StorageManager.loadUserSession(ecs);
      expect(loaded).toBe(false);

      // 验证会话保持默认状态
      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(false);
      expect(userSession.username).toBeNull();
    });

    it('应该在数据无效时清除存储并返回false', () => {
      // 存储无效数据
      mockStorage.set('clean_game_user_session', 'invalid json data');

      const loaded = StorageManager.loadUserSession(ecs);
      expect(loaded).toBe(false);

      // 验证无效数据已被清除
      expect(mockStorage.has('clean_game_user_session')).toBe(false);
    });

    it('应该在数据格式不正确时清除存储', () => {
      // 存储格式不正确的数据（缺少必要字段）
      mockStorage.set('clean_game_user_session', JSON.stringify({ foo: 'bar' }));

      const loaded = StorageManager.loadUserSession(ecs);
      expect(loaded).toBe(false);

      // 验证无效数据已被清除
      expect(mockStorage.has('clean_game_user_session')).toBe(false);
    });

    it('应该正确保存用户会话到存储', () => {
      // 先登录
      ecs.spawn().insert(new LoginIntent('SaveTestUser'));
      ecs.update();

      // 保存会话
      const saved = StorageManager.saveUserSession(ecs);
      expect(saved).toBe(true);

      // 验证存储内容
      const storedData = mockStorage.get('clean_game_user_session');
      expect(storedData).toBeDefined();

      const parsedData = JSON.parse(storedData!);
      expect(parsedData.username).toBe('SaveTestUser');
      expect(parsedData.isLoggedIn).toBe(true);
    });
  });

  describe('错误处理流程测试 (需求 2.5, 3.4)', () => {
    it('应该在验证失败时触发UIErrorEvent', () => {
      const errors: UIErrorEvent[] = [];
      ecs.addObserver(UIErrorEvent, (trigger) => {
        errors.push(trigger.event);
      });

      // 尝试使用无效用户名登录
      ecs.spawn().insert(new LoginIntent(''));
      ecs.update();

      expect(errors.length).toBe(1);
      expect(errors[0].errorType).toBe('validation');
      expect(errors[0].message).toContain('用户名');
    });

    it('应该在localStorage不可用时降级到内存模式', () => {
      // 重置StorageManager状态
      StorageManager.reset();

      // 模拟localStorage抛出异常
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(() => {
            throw new Error('localStorage not available');
          }),
          setItem: vi.fn(() => {
            throw new Error('localStorage not available');
          }),
          removeItem: vi.fn(() => {
            throw new Error('localStorage not available');
          }),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(() => null),
        },
        writable: true,
        configurable: true,
      });

      // 尝试保存会话，应该降级到内存模式
      ecs.spawn().insert(new LoginIntent('MemoryModeUser'));
      ecs.update();

      const userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe('MemoryModeUser');

      // 恢复localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('应该正确处理多次登录尝试', () => {
      // 第一次登录失败
      ecs.spawn().insert(new LoginIntent(''));
      ecs.update();

      let userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(false);

      // 第二次登录成功
      ecs.spawn().insert(new LoginIntent('ValidUser'));
      ecs.update();

      userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe('ValidUser');
    });
  });

  describe('Intent清理测试', () => {
    it('应该在处理后标记LoginIntent为已处理', () => {
      ecs.spawn().insert(new LoginIntent('CleanupTestUser'));
      ecs.update();

      // 验证Intent已被标记为已处理
      const intents = Array.from(ecs.query(LoginIntent));
      // 所有Intent应该被标记为processed
      for (const intent of intents) {
        expect(intent.processed).toBe(true);
      }
    });

    it('应该在处理后标记NavigateIntent为已处理', () => {
      ecs.spawn().insert(new NavigateIntent('login'));
      ecs.update();

      // 验证Intent已被标记为已处理
      const intents = Array.from(ecs.query(NavigateIntent));
      // 所有Intent应该被标记为processed
      for (const intent of intents) {
        expect(intent.processed).toBe(true);
      }
    });

    it('IntentCleanupSystem应该调用removeEntity', () => {
      // 创建一个新的ECS实例来测试
      const testEcs = new ECS();
      testEcs.insertResource(new GameState());
      testEcs.insertResource(new UserSession());
      testEcs.addSystem(Stage.Update, new LoginProcessSystem());
      testEcs.addSystem(Stage.Update, new NavigationSystem());
      testEcs.addSystem(Stage.Update, new IntentCleanupSystem());

      // 添加Intent
      testEcs.spawn().insert(new LoginIntent('TestUser'));
      
      // 第一次更新：处理Intent并标记为已处理，然后IntentCleanupSystem调用removeEntity
      testEcs.update();

      // 验证Intent被标记为已处理
      const intents = Array.from(testEcs.query(LoginIntent));
      expect(intents.length).toBeGreaterThan(0);
      expect(intents[0].processed).toBe(true);
      
      // 验证实体被标记为销毁（entity.destroyed应该为true）
      expect(intents[0].entity.destroyed).toBe(true);
    });
  });

  describe('完整用户流程模拟', () => {
    it('应该模拟完整的用户登录-退出-恢复流程', () => {
      // 1. 用户首次访问，未登录状态
      let userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(false);

      // 2. 用户导航到登录页面
      ecs.spawn().insert(new NavigateIntent('login'));
      ecs.update();

      const gameState = ecs.getResource(GameState)!;
      expect(gameState.currentScene).toBe('login');

      // 3. 用户输入用户名并登录
      ecs.spawn().insert(new LoginIntent('PersistentUser'));
      ecs.update();

      userSession = ecs.getResource(UserSession)!;
      expect(userSession.isLoggedIn).toBe(true);
      expect(userSession.username).toBe('PersistentUser');

      // 4. 保存状态
      StorageManager.saveUserSession(ecs);

      // 5. 模拟页面刷新（创建新的ECS实例）
      const newEcs = new ECS();
      newEcs.insertResource(new GameState());
      newEcs.insertResource(new UserSession());
      newEcs.addSystem(Stage.Update, new LoginProcessSystem());
      newEcs.addSystem(Stage.Update, new NavigationSystem());
      newEcs.addSystem(Stage.Update, new IntentCleanupSystem());

      // 6. 恢复状态
      const loaded = StorageManager.loadUserSession(newEcs);
      expect(loaded).toBe(true);

      // 7. 验证状态已恢复
      const restoredSession = newEcs.getResource(UserSession)!;
      expect(restoredSession.isLoggedIn).toBe(true);
      expect(restoredSession.username).toBe('PersistentUser');
    });
  });
});
