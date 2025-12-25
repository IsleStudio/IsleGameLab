'use client';

import React from 'react';
import { useGameScore } from '../hooks';
import { SnakeUtil } from '../../../gameplay/utils';

/**
 * PlayerStatus - 玩家状态显示组件
 * 显示命数、得分、存活时间、游戏速度
 */
export function PlayerStatus(): React.ReactElement {
  const scoreData = useGameScore();

  if (!scoreData) {
    return (
      <div className="flex flex-col gap-4 p-6 bg-gray-800 rounded-lg">
        <div className="text-xl font-bold text-white">玩家状态</div>
        <div className="text-gray-400">等待游戏开始...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-gray-800 rounded-lg">
      <div className="text-xl font-bold text-white mb-2">玩家状态</div>

      {/* 命数 */}
      <div className="flex flex-col gap-1">
        <div className="text-sm text-gray-400">剩余生命</div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full ${
                i < scoreData.lives ? 'bg-red-500' : 'bg-gray-600'
              }`}
              title={i < scoreData.lives ? '生命' : '已失去'}
            />
          ))}
        </div>
      </div>

      {/* 得分 */}
      <div className="flex flex-col gap-1">
        <div className="text-sm text-gray-400">得分</div>
        <div className="text-3xl font-bold text-yellow-400">
          {scoreData.score}
        </div>
      </div>

      {/* 存活时间 */}
      <div className="flex flex-col gap-1">
        <div className="text-sm text-gray-400">存活时间</div>
        <div className="text-2xl font-mono text-green-400">
          {SnakeUtil.formatTime(scoreData.survivalTime)}
        </div>
      </div>

      {/* 游戏速度 */}
      <div className="flex flex-col gap-1">
        <div className="text-sm text-gray-400">游戏速度</div>
        <div className="text-2xl font-bold text-blue-400">
          {scoreData.speedMultiplier.toFixed(1)}x
        </div>
        {scoreData.speedMultiplier < 5.0 && (
          <div className="text-xs text-gray-500">
            {20 - (scoreData.survivalTime % 20)}秒后提升速度
          </div>
        )}
      </div>
    </div>
  );
}
