/**
 * 存储往返属性测试
 *
 * **Feature: isle-game-lab, Property 3: 用户数据往返一致性**
 * **验证需求: 2.3, 3.1**
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { UserUtil } from '../../gameplay/utils/UserUtil';

describe('存储往返属性测试', () => {
  // 创建一个真实的localStorage模拟
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map<string, string>();

    // 模拟localStorage的完整实现
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
      removeItem: vi.fn((key: string) => mockStorage.delete(key)),
      clear: vi.fn(() => mockStorage.clear()),
      get length() {
        return mockStorage.size;
      },
      key: vi.fn((index: number) => {
        const keys = Array.from(mockStorage.keys());
        return keys[index] ?? null;
      }),
    });
  });

  afterEach(() => {
    mockStorage.clear();
    vi.unstubAllGlobals();
  });

  /**
   * **Feature: clean-game-project, Property 3: 用户数据往返一致性**
   *
   * 属性3: 用户数据往返一致性
   * 对于任何有效用户名，执行UserUtil.saveUserToStorage()后立即执行
   * UserUtil.loadUserFromStorage()应该返回相同的用户名
   *
   * **验证需求: 2.3, 3.1**
   */
  it('属性3: 有效用户名的保存和加载应该返回相同的用户名', () => {
    // 生成有效用户名：包含至少一个非空白字符的字符串
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // 清除之前的数据
        mockStorage.clear();

        // 保存用户名
        const saveResult = UserUtil.saveUserToStorage(username);
        expect(saveResult).toBe(true);

        // 加载用户名
        const loadedUsername = UserUtil.loadUserFromStorage();

        // 验证往返一致性
        return loadedUsername === username;
      }),
      { numRuns: 100 }
    );
  });

  it('属性3: 包含特殊字符的用户名应该正确往返', () => {
    // 生成包含特殊字符的有效用户名
    const specialCharsArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(specialCharsArb, (username) => {
        mockStorage.clear();
        UserUtil.saveUserToStorage(username);
        const loadedUsername = UserUtil.loadUserFromStorage();
        return loadedUsername === username;
      }),
      { numRuns: 100 }
    );
  });

  it('属性3: 包含Unicode字符的用户名应该正确往返', () => {
    // 生成包含Unicode字符的有效用户名
    // 使用常见的Unicode字符进行测试
    const unicodeChars = ['中', '文', '日', '本', '한', '국', 'ñ', 'ü', 'é', 'ß', '🎮', '🎯', 'a', 'b', '1', '2'];
    const unicodeUsernameArb = fc
      .array(fc.constantFrom(...unicodeChars), { minLength: 1, maxLength: 50 })
      .map((chars) => chars.join(''))
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(unicodeUsernameArb, (username) => {
        mockStorage.clear();
        UserUtil.saveUserToStorage(username);
        const loadedUsername = UserUtil.loadUserFromStorage();
        return loadedUsername === username;
      }),
      { numRuns: 100 }
    );
  });

  it('属性3: 连续保存不同用户名应该只保留最后一个', () => {
    // 生成两个不同的有效用户名
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, validUsernameArb, (username1, username2) => {
        mockStorage.clear();

        // 保存第一个用户名
        UserUtil.saveUserToStorage(username1);
        // 保存第二个用户名
        UserUtil.saveUserToStorage(username2);

        // 加载应该返回第二个用户名
        const loadedUsername = UserUtil.loadUserFromStorage();
        return loadedUsername === username2;
      }),
      { numRuns: 100 }
    );
  });
});
