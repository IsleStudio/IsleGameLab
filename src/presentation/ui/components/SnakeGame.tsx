'use client';

import React, { useEffect, useCallback } from 'react';
import { useECS } from '../bindings';
import { useCurrentScene, useSnakeGame, useSnakeData } from '../hooks';
import { SnakeUtil } from '../../../gameplay/utils';
import { Direction } from '../../../gameplay/components/snake';
import { PlayerStatus } from './PlayerStatus';
import { SnakeCanvas } from './SnakeCanvas';
import { GameOver } from './GameOver';

/**
 * SnakeGame - 贪吃蛇游戏主组件
 * 16:9布局，左侧5/16显示玩家状态，右侧11/16显示游戏画布
 */
export function SnakeGame(): React.ReactElement | null {
  const ecs = useECS();
  const currentScene = useCurrentScene();
  const gameData = useSnakeGame();
  const snakeData = useSnakeData();

  // 仅在game场景显示
  if (currentScene !== 'game') {
    return null;
  }

  // 键盘控制
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!snakeData) return;

      let direction: Direction | null = null;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = Direction.Up;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = Direction.Down;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = Direction.Left;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = Direction.Right;
          break;
      }

      if (direction !== null) {
        event.preventDefault();
        SnakeUtil.changeDirection(ecs, snakeData.entityId, direction);
      }
    },
    [ecs, snakeData]
  );

  // 监听键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 自动开始游戏
  useEffect(() => {
    if (!gameData.isRunning && !gameData.showGameOver) {
      console.log('[SnakeGame] 自动开始游戏');
      SnakeUtil.startGame(ecs);
    }
  }, [ecs, gameData.isRunning, gameData.showGameOver]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      {/* 16:9 游戏容器 */}
      <div className="w-full max-w-7xl aspect-video bg-gray-950 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex h-full">
          {/* 左侧：玩家状态 (5/16) */}
          <div className="w-5/16 flex-shrink-0 p-6 bg-gray-900 border-r-2 border-gray-700">
            <PlayerStatus />
          </div>

          {/* 右侧：游戏画布 (11/16) */}
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <SnakeCanvas />
            
            {/* 控制提示 */}
            <div className="mt-4 text-center text-gray-400 text-sm">
              <div>使用方向键或 WASD 控制蛇的移动</div>
            </div>
          </div>
        </div>
      </div>

      {/* 游戏结束界面 */}
      {gameData.showGameOver && <GameOver />}
    </div>
  );
}
