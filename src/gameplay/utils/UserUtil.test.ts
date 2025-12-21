/**
 * UserUtil 属性测试
 *
 * 测试用户名验证的正确性属性
 *
 * **Feature: isle-game-lab, Property 1: 用户名验证一致性**
 * **验证需求: 2.2, 2.5**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserUtil } from './UserUtil';

describe('用户名验证属性测试', () => {
  /**
   * **Feature: clean-game-project, Property 1: 用户名验证一致性**
   *
   * 属性1: 用户名验证一致性
   * 对于任何字符串输入，UserUtil.validateUsername()应该拒绝所有仅包含空白字符的字符串，
   * 并接受所有包含至少一个非空白字符的字符串
   *
   * **验证需求: 2.2, 2.5**
   */
  it('属性1: 仅包含空白字符的字符串应该被拒绝', () => {
    // 生成仅包含空白字符的字符串（使用array + join模式）
    const whitespaceChars = [' ', '\t', '\n', '\r', '\f', '\v'];
    const whitespaceArb = fc
      .array(fc.constantFrom(...whitespaceChars), { minLength: 0, maxLength: 50 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(whitespaceArb, (whitespaceStr) => {
        const result = UserUtil.validateUsername(whitespaceStr);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });

  it('属性1: 包含至少一个非空白字符的字符串应该被接受', () => {
    // 生成包含至少一个非空白字符的字符串
    // 使用string过滤确保至少有一个非空白字符
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, (validStr) => {
        const result = UserUtil.validateUsername(validStr);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  it('属性1: 空字符串应该被拒绝', () => {
    expect(UserUtil.validateUsername('')).toBe(false);
  });

  it('属性1: validateUsername结果与trim后长度一致', () => {
    // 对于任何字符串，validateUsername的结果应该等价于trim后长度大于0
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (str) => {
        const result = UserUtil.validateUsername(str);
        const expected = str.trim().length > 0;
        return result === expected;
      }),
      { numRuns: 100 }
    );
  });
});
