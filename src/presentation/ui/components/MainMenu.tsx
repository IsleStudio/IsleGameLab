'use client';

import React from 'react';
import { useECS } from '../bindings';
import { useUserSession, useCurrentScene } from '../hooks';
import { UIUtil } from '../../../gameplay/utils';

/**
 * MainMenu组件 - 主菜单界面
 * 显示游戏标题和操作按钮，根据登录状态显示不同内容
 */
export function MainMenu(): React.ReactElement | null {
  const ecs = useECS();
  const { isLoggedIn, username } = useUserSession();
  const currentScene = useCurrentScene();

  console.log('[MainMenu] 渲染，currentScene:', currentScene, 'isLoggedIn:', isLoggedIn);

  // 仅在main-menu场景显示
  if (currentScene !== 'main-menu') {
    console.log('[MainMenu] 不在main-menu场景，不渲染');
    return null;
  }

  // 处理登录按钮点击
  const handleLoginClick = (): void => {
    console.log('[MainMenu] 登录按钮被点击');
    UIUtil.requestNavigate(ecs, 'login');
  };

  // 处理开始游戏按钮点击
  const handleStartGameClick = (): void => {
    UIUtil.requestNavigate(ecs, 'game');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-900 to-gray-800">
      {/* 游戏标题 */}
      <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">
        游戏标题
      </h1>

      {/* 根据登录状态显示不同内容 */}
      {!isLoggedIn ? (
        // 未登录状态：显示登录按钮
        <button
          onClick={handleLoginClick}
          className="px-8 py-4 text-xl font-semibold text-white bg-primary rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          登录
        </button>
      ) : (
        // 已登录状态：显示用户名和开始游戏按钮
        <div className="flex flex-col items-center gap-6">
          <p className="text-xl md:text-2xl text-gray-300">
            欢迎, <span className="text-white font-semibold">{username}</span>
          </p>
          <button
            onClick={handleStartGameClick}
            className="px-8 py-4 text-xl font-semibold text-white bg-primary rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            开始游戏
          </button>
        </div>
      )}
    </div>
  );
}
