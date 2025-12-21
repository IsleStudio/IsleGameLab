'use client';

import React, { useEffect, useRef } from 'react';
import { useSnakeData, useFoodData, useSnakeGame } from '../hooks';

/**
 * SnakeCanvas - 蛇游戏画布组件
 * 使用Canvas绘制蛇和食物
 */
export function SnakeCanvas(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeData = useSnakeData();
  const foodData = useFoodData();
  const gameData = useSnakeGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 计算单元格大小
    const cellWidth = canvas.width / gameData.config.gridWidth;
    const cellHeight = canvas.height / gameData.config.gridHeight;

    // 绘制网格（可选，仅调试时使用）
    // ctx.strokeStyle = '#333';
    // ctx.lineWidth = 0.5;
    // for (let x = 0; x <= gameData.config.gridWidth; x++) {
    //   ctx.beginPath();
    //   ctx.moveTo(x * cellWidth, 0);
    //   ctx.lineTo(x * cellWidth, canvas.height);
    //   ctx.stroke();
    // }
    // for (let y = 0; y <= gameData.config.gridHeight; y++) {
    //   ctx.beginPath();
    //   ctx.moveTo(0, y * cellHeight);
    //   ctx.lineTo(canvas.width, y * cellHeight);
    //   ctx.stroke();
    // }

    // 绘制食物
    if (foodData) {
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.beginPath();
      ctx.arc(
        (foodData.x + 0.5) * cellWidth,
        (foodData.y + 0.5) * cellHeight,
        Math.min(cellWidth, cellHeight) * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 绘制蛇
    if (snakeData && snakeData.segments.length > 0) {
      snakeData.segments.forEach((segment, index) => {
        // 头部更亮
        if (index === 0) {
          ctx.fillStyle = '#10b981'; // green-500
        } else {
          ctx.fillStyle = '#059669'; // green-600
        }

        const x = segment.x * cellWidth;
        const y = segment.y * cellHeight;

        // 绘制圆角矩形
        const radius = Math.min(cellWidth, cellHeight) * 0.15;
        ctx.beginPath();
        ctx.roundRect(
          x + cellWidth * 0.05,
          y + cellHeight * 0.05,
          cellWidth * 0.9,
          cellHeight * 0.9,
          radius
        );
        ctx.fill();
      });
    }
  }, [snakeData, foodData, gameData.config]);

  return (
    <div className="flex items-center justify-center bg-gray-900 rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={660}
        height={440}
        className="border-2 border-gray-700 rounded"
      />
    </div>
  );
}
