import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ECS } from '../ecs/World';
import { UserSession } from '../../gameplay/resources/UserSession';
import { Serializer } from './Serializer';
import { StorageManager } from './StorageManager';
import type { StoredUserSession } from '../../lib/types';

describe('持久化层', () => {
  let ecs: ECS;

  beforeEach(() => {
    ecs = new ECS();
    StorageManager.reset();
    // 清除localStorage中的测试数据
    localStorage.clear();
  });

  afterEach(() => {
    StorageManager.reset();
    localStorage.clear();
  });

  describe('UserSession Resource', () => {
    it('应该使用默认值初始化', () => {
      const session = new UserSession();
      
      expect(session.username).toBe(null);
      expect(session.isLoggedIn).toBe(false);
      expect(session.loginTimestamp).toBe(0);
      expect(session.isValid()).toBe(false);
    });

    it('应该正确设置登录状态', () => {
      const session = new UserSession();
      const testUsername = 'testuser';
      
      session.setLoggedIn(testUsername);
      
      expect(session.username).toBe(testUsername);
      expect(session.isLoggedIn).toBe(true);
      expect(session.loginTimestamp).toBeGreaterThan(0);
      expect(session.isValid()).toBe(true);
    });

    it('应该重置到初始状态', () => {
      const session = new UserSession();
      session.setLoggedIn('testuser');
      
      session.reset();
      
      expect(session.username).toBe(null);
      expect(session.isLoggedIn).toBe(false);
      expect(session.loginTimestamp).toBe(0);
      expect(session.isValid()).toBe(false);
    });
  });

  describe('序列化器', () => {
    it('应该正确序列化UserSession', () => {
      const session = new UserSession();
      session.setLoggedIn('testuser');
      ecs.insertResource(session);

      const serialized = Serializer.serializeUserSession(ecs);

      expect(serialized).toEqual({
        username: 'testuser',
        isLoggedIn: true,
        loginTimestamp: session.loginTimestamp,
      });
    });

    it('应该在没有UserSession时返回null', () => {
      const serialized = Serializer.serializeUserSession(ecs);
      expect(serialized).toBe(null);
    });

    it('应该正确反序列化UserSession', () => {
      const data: StoredUserSession = {
        username: 'testuser',
        isLoggedIn: true,
        loginTimestamp: 1234567890,
      };

      Serializer.deserializeUserSession(ecs, data);

      const session = ecs.getResource(UserSession);
      expect(session).toBeDefined();
      expect(session!.username).toBe('testuser');
      expect(session!.isLoggedIn).toBe(true);
      expect(session!.loginTimestamp).toBe(1234567890);
    });

    it('应该在反序列化时创建新的UserSession如果不存在', () => {
      const data: StoredUserSession = {
        username: 'newuser',
        isLoggedIn: true,
        loginTimestamp: 9876543210,
      };

      expect(ecs.getResource(UserSession)).toBeUndefined();

      Serializer.deserializeUserSession(ecs, data);

      const session = ecs.getResource(UserSession);
      expect(session).toBeDefined();
      expect(session!.username).toBe('newuser');
    });

    it('应该正确验证UserSession数据', () => {
      const validData = {
        username: 'testuser',
        isLoggedIn: true,
        loginTimestamp: 1234567890,
      };

      const invalidData1 = {
        username: 'testuser',
        isLoggedIn: 'true', // 应该是boolean
        loginTimestamp: 1234567890,
      };

      const invalidData2 = {
        username: 'testuser',
        isLoggedIn: true,
        // 缺少loginTimestamp
      };

      expect(Serializer.validateUserSessionData(validData)).toBe(true);
      expect(Serializer.validateUserSessionData(invalidData1)).toBe(false);
      expect(Serializer.validateUserSessionData(invalidData2)).toBe(false);
      expect(Serializer.validateUserSessionData(null)).toBe(false);
      expect(Serializer.validateUserSessionData(undefined)).toBe(false);
    });
  });

  describe('存储管理器', () => {
    it('应该成功保存和加载UserSession', () => {
      const session = new UserSession();
      session.setLoggedIn('testuser');
      ecs.insertResource(session);

      // 保存
      const saveResult = StorageManager.saveUserSession(ecs);
      expect(saveResult).toBe(true);

      // 创建新的ECS实例来测试加载
      const newEcs = new ECS();
      const loadResult = StorageManager.loadUserSession(newEcs);
      expect(loadResult).toBe(true);

      const loadedSession = newEcs.getResource(UserSession);
      expect(loadedSession).toBeDefined();
      expect(loadedSession!.username).toBe('testuser');
      expect(loadedSession!.isLoggedIn).toBe(true);
    });

    it('应该在加载不存在的会话时返回false', () => {
      const loadResult = StorageManager.loadUserSession(ecs);
      expect(loadResult).toBe(false);
    });

    it('应该成功清除UserSession', () => {
      const session = new UserSession();
      session.setLoggedIn('testuser');
      ecs.insertResource(session);

      // 保存然后清除
      StorageManager.saveUserSession(ecs);
      const clearResult = StorageManager.clearUserSession();
      expect(clearResult).toBe(true);

      // 尝试加载应该失败
      const newEcs = new ECS();
      const loadResult = StorageManager.loadUserSession(newEcs);
      expect(loadResult).toBe(false);
    });

    it('应该优雅处理无效的JSON数据', () => {
      // 手动设置无效的JSON数据
      localStorage.setItem('clean_game_user_session', 'invalid json');

      const loadResult = StorageManager.loadUserSession(ecs);
      expect(loadResult).toBe(false);

      // 验证没有创建UserSession Resource
      const session = ecs.getResource(UserSession);
      expect(session).toBeUndefined();
    });

    it('应该优雅处理无效的数据格式', () => {
      // 手动设置格式无效的数据
      const invalidData = { username: 123, isLoggedIn: 'yes' };
      localStorage.setItem('clean_game_user_session', JSON.stringify(invalidData));

      const loadResult = StorageManager.loadUserSession(ecs);
      expect(loadResult).toBe(false);

      // 验证没有创建UserSession Resource
      const session = ecs.getResource(UserSession);
      expect(session).toBeUndefined();
    });

    it('应该提供存储信息', () => {
      const info = StorageManager.getStorageInfo();
      expect(info).toHaveProperty('mode');
      expect(info).toHaveProperty('available');
      expect(['localStorage', 'memory']).toContain(info.mode);
      expect(typeof info.available).toBe('boolean');
    });
  });

  describe('往返一致性', () => {
    it('应该通过保存/加载循环保持数据完整性', () => {
      const originalSession = new UserSession();
      originalSession.setLoggedIn('roundtripuser');
      const originalTimestamp = originalSession.loginTimestamp;
      ecs.insertResource(originalSession);

      // 保存
      StorageManager.saveUserSession(ecs);

      // 加载到新的ECS实例
      const newEcs = new ECS();
      StorageManager.loadUserSession(newEcs);

      const loadedSession = newEcs.getResource(UserSession);
      expect(loadedSession).toBeDefined();
      expect(loadedSession!.username).toBe('roundtripuser');
      expect(loadedSession!.isLoggedIn).toBe(true);
      expect(loadedSession!.loginTimestamp).toBe(originalTimestamp);
      expect(loadedSession!.isValid()).toBe(true);
    });
  });
});