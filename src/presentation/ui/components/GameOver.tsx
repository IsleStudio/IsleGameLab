'use client';

import React from 'react';
import { useECS } from '../bindings';
import { useGameScore, useLeaderboard, type LeaderboardEntryData } from '../hooks';
import { SnakeUtil } from '../../../gameplay/utils';

/**
 * GameOver - 游戏结束界面组件
 * 显示最终得分和榜单
 */
export function GameOver(): React.ReactElement {
  const ecs = useECS();
  const scoreData = useGameScore();
  const leaderboard = useLeaderboard();

  const handleRestart = (): void => {
    SnakeUtil.restartGame(ecs);
  };

  const handleBackToMenu = (): void => {
    SnakeUtil.backToMenu(ecs);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
        {/* 标题 */}
        <h2 className="text-4xl font-bold text-white text-center mb-6">
          游戏结束
        </h2>

        {/* 最终得分 */}
        {scoreData && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-400 mb-1">最终得分</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {scoreData.score}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">存活时间</div>
                <div className="text-3xl font-bold text-green-400">
                  {SnakeUtil.formatTime(scoreData.survivalTime)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 榜单 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">排行榜</h3>
          {leaderboard.length === 0 ? (
            <div className="text-center text-gray-400 py-4">暂无记录</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry: LeaderboardEntryData, index: number) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-3 rounded ${
                    index < 3 ? 'bg-gray-700' : 'bg-gray-800'
                  }`}
                >
                  <div
                    className={`text-xl font-bold w-8 text-center ${
                      index === 0
                        ? 'text-yellow-400'
                        : index === 1
                        ? 'text-gray-300'
                        : index === 2
                        ? 'text-orange-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      {entry.playerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">
                      {entry.score}分
                    </div>
                    <div className="text-sm text-gray-400">
                      {SnakeUtil.formatTime(entry.survivalTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleRestart}
            className="flex-1 px-6 py-3 text-lg font-semibold text-white bg-primary rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            重新开始
          </button>
          <button
            onClick={handleBackToMenu}
            className="flex-1 px-6 py-3 text-lg font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-500 active:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            返回主菜单
          </button>
        </div>
      </div>
    </div>
  );
}
