/**
 * UI交互Intent生成属性测试
 *
 * **Feature: isle-game-lab, Property 7: UI交互Intent生成**
 * **验证需求: 1.4**
 *
 * 属性7: UI交互Intent生成
 * 对于任何UI交互（如点击按钮），应该生成对应的Intent实体，
 * 且该Intent包含正确的类型和参数
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ECS } from '../../core/ecs/World';
import { UserUtil } from '../../gameplay/utils/UserUtil';
import { UIUtil } from '../../gameplay/utils/UIUtil';
import { LoginIntent } from '../../gameplay/intents/user';
import { NavigateIntent } from '../../gameplay/intents/ui';
import type { ViewType } from '../../lib/types';

describe('UI交互Intent生成属性测试', () => {
  let ecs: ECS;

  beforeEach(() => {
    ecs = new ECS();
  });

  /**
   * **Feature: clean-game-project, Property 7: UI交互Intent生成**
   *
   * 属性7a: 登录请求应生成正确的LoginIntent
   * 对于任何有效用户名，调用UserUtil.requestLogin()应该生成一个LoginIntent，
   * 且该Intent的username字段等于输入的用户名（trim后）
   *
   * **验证需求: 1.4**
   */
  it('属性7a: 登录请求应生成包含正确用户名的LoginIntent', () => {
    // 生成有效用户名（非空且包含至少一个非空白字符）
    const validUsernameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // 每次测试前重置ECS
        ecs = new ECS();

        // 调用requestLogin
        const success = UserUtil.requestLogin(ecs, username);

        // 应该成功
        if (!success) return false;

        // 查询生成的LoginIntent
        const intents = Array.from(ecs.query(LoginIntent));

        // 应该恰好生成一个Intent
        if (intents.length !== 1) return false;

        // Intent的username应该等于输入的用户名（trim后）
        const intent = intents[0];
        return intent.username === username.trim();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: clean-game-project, Property 7: UI交互Intent生成**
   *
   * 属性7b: 导航请求应生成正确的NavigateIntent
   * 对于任何有效视图类型，调用UIUtil.requestNavigate()应该生成一个NavigateIntent，
   * 且该Intent的targetView字段等于输入的视图类型
   *
   * **验证需求: 1.4**
   */
  it('属性7b: 导航请求应生成包含正确目标视图的NavigateIntent', () => {
    // 生成有效视图类型
    const viewTypeArb = fc.constantFrom<ViewType>('main-menu', 'login', 'game');

    fc.assert(
      fc.property(viewTypeArb, (targetView) => {
        // 每次测试前重置ECS
        ecs = new ECS();

        // 调用requestNavigate
        UIUtil.requestNavigate(ecs, targetView);

        // 查询生成的NavigateIntent
        const intents = Array.from(ecs.query(NavigateIntent));

        // 应该恰好生成一个Intent
        if (intents.length !== 1) return false;

        // Intent的targetView应该等于输入的视图类型
        const intent = intents[0];
        return intent.targetView === targetView;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: clean-game-project, Property 7: UI交互Intent生成**
   *
   * 属性7c: 无效用户名不应生成LoginIntent
   * 对于任何仅包含空白字符的字符串，调用UserUtil.requestLogin()不应生成任何Intent
   *
   * **验证需求: 1.4**
   */
  it('属性7c: 无效用户名不应生成LoginIntent', () => {
    // 生成仅包含空白字符的字符串
    const whitespaceChars = [' ', '\t', '\n', '\r', '\f', '\v'];
    const whitespaceArb = fc
      .array(fc.constantFrom(...whitespaceChars), { minLength: 0, maxLength: 20 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(whitespaceArb, (invalidUsername) => {
        // 每次测试前重置ECS
        ecs = new ECS();

        // 调用requestLogin
        const success = UserUtil.requestLogin(ecs, invalidUsername);

        // 应该失败
        if (success) return false;

        // 不应该生成任何LoginIntent
        const intents = Array.from(ecs.query(LoginIntent));
        return intents.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: clean-game-project, Property 7: UI交互Intent生成**
   *
   * 属性7d: 多次UI交互应生成多个独立的Intent
   * 对于任何UI交互序列，每次交互都应生成一个独立的Intent
   *
   * **验证需求: 1.4**
   */
  it('属性7d: 多次导航请求应生成多个独立的NavigateIntent', () => {
    // 生成视图类型序列
    const viewSequenceArb = fc.array(
      fc.constantFrom<ViewType>('main-menu', 'login', 'game'),
      { minLength: 1, maxLength: 10 }
    );

    fc.assert(
      fc.property(viewSequenceArb, (viewSequence) => {
        // 每次测试前重置ECS
        ecs = new ECS();

        // 依次调用requestNavigate
        for (const view of viewSequence) {
          UIUtil.requestNavigate(ecs, view);
        }

        // 查询生成的NavigateIntent
        const intents = Array.from(ecs.query(NavigateIntent));

        // 应该生成与序列长度相同数量的Intent
        if (intents.length !== viewSequence.length) return false;

        // 每个Intent的targetView应该与对应的输入匹配
        // 注意：由于ECS不保证顺序，我们只验证数量和内容集合
        const intentViews = intents.map((i) => i.targetView).sort();
        const expectedViews = [...viewSequence].sort();

        return JSON.stringify(intentViews) === JSON.stringify(expectedViews);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: clean-game-project, Property 7: UI交互Intent生成**
   *
   * 属性7e: Intent应包含有效的时间戳
   * 对于任何UI交互，生成的Intent应包含一个有效的时间戳（大于0）
   *
   * **验证需求: 1.4**
   */
  it('属性7e: 生成的Intent应包含有效的时间戳', () => {
    const viewTypeArb = fc.constantFrom<ViewType>('main-menu', 'login', 'game');

    fc.assert(
      fc.property(viewTypeArb, (targetView) => {
        ecs = new ECS();
        const beforeTime = Date.now();

        UIUtil.requestNavigate(ecs, targetView);

        const afterTime = Date.now();
        const intents = Array.from(ecs.query(NavigateIntent));

        if (intents.length !== 1) return false;

        const intent = intents[0];
        // 时间戳应该在调用前后的时间范围内
        return intent.timestamp >= beforeTime && intent.timestamp <= afterTime;
      }),
      { numRuns: 100 }
    );
  });
});
