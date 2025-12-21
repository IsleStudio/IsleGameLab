'use client';

import React, { useState } from 'react';
import { useECS } from '../bindings';
import { useCurrentScene } from '../hooks';
import { UserUtil, UIUtil } from '../../../gameplay/utils';
import { logger } from '../../../lib/errors';

/**
 * LoginForm组件 - 登录表单界面
 * 提供用户名输入和登录功能
 */
export function LoginForm(): React.ReactElement | null {
  const ecs = useECS();
  const currentScene = useCurrentScene();

  // 本地状态：用户名输入和错误信息
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 仅在login场景显示
  if (currentScene !== 'login') {
    return null;
  }

  // 处理用户名输入变化
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
    // 清除之前的错误
    if (error) {
      setError(null);
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    // 使用带错误信息的验证
    const validationResult = UserUtil.validateUsernameWithError(username);
    if (!validationResult.valid) {
      const errorMessage = validationResult.error?.message || '用户名验证失败';
      setError(errorMessage);
      logger.warn('[LoginForm] 用户名验证失败', { username, error: errorMessage });
      return;
    }

    // 请求登录（生成LoginIntent）
    const success = UserUtil.requestLogin(ecs, username);
    if (!success) {
      setError('登录请求失败');
      logger.error('[LoginForm] 登录请求失败', undefined, { username });
    }
  };

  // 处理返回按钮点击
  const handleBackClick = (): void => {
    UIUtil.requestNavigate(ecs, 'main-menu');
  };

  // 处理键盘事件（Enter提交）
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-900 to-gray-800">
      {/* 标题 */}
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
        用户登录
      </h2>

      {/* 登录表单 */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-gray-800 rounded-lg p-6 md:p-8 shadow-xl"
      >
        {/* 用户名输入 */}
        <div className="mb-6">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            用户名
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={handleUsernameChange}
            onKeyDown={handleKeyDown}
            placeholder="请输入用户名"
            autoFocus
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="flex-1 px-6 py-3 text-lg font-semibold text-white bg-primary rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            登录
          </button>
          <button
            type="button"
            onClick={handleBackClick}
            className="flex-1 px-6 py-3 text-lg font-semibold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 active:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            返回
          </button>
        </div>
      </form>
    </div>
  );
}
