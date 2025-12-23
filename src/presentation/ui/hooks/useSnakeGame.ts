'use client';

import { useECSResource } from './useECSResource';
import { useECSQueryMultiple, useECSQuery } from './useECSQuery';
import { SnakeGameResource, LeaderboardResource } from '../../../gameplay/resources/SnakeGameResource';
import { Snake, Food, GameScore, SnakeGameActive, type SnakeSegment } from '../../../gameplay/components/snake';

/**
 * SnakeGameData - 蛇游戏数据视图
 */
export interface SnakeGameData {
  isRunning: boolean;
  showGameOver: boolean;
  config: {
    gridWidth: number;
    gridHeight: number;
  };
}

/**
 * SnakeData - 蛇数据视图
 */
export interface SnakeData {
  segments: SnakeSegment[];
  isAlive: boolean;
  entityId: any; // Entity对象类型，避免循环依赖使用any
}

/**
 * FoodData - 食物数据视图
 */
export interface FoodData {
  x: number;
  y: number;
}

/**
 * GameScoreData - 游戏得分数据视图
 */
export interface GameScoreData {
  score: number;
  survivalTime: number;
  speedMultiplier: number;
  lives: number;
}

/**
 * LeaderboardEntryData - 榜单记录视图
 */
export interface LeaderboardEntryData {
  playerName: string;
  score: number;
  survivalTime: number;
  timestamp: number;
}

/**
 * useSnakeGame - 获取蛇游戏状态
 */
export function useSnakeGame(): SnakeGameData {
  const snakeGameRes = useECSResource(SnakeGameResource);

  return {
    isRunning: snakeGameRes?.isGameRunning ?? false,
    showGameOver: snakeGameRes?.showGameOver ?? false,
    config: {
      gridWidth: snakeGameRes?.config.gridWidth ?? 30,
      gridHeight: snakeGameRes?.config.gridHeight ?? 20,
    },
  };
}

/**
 * useSnakeData - 获取当前蛇的数据
 * 每次都返回新对象，确保每帧都触发 useEffect
 */
export function useSnakeData(): SnakeData | null {
  const snakes = useECSQuery(Snake);

  if (snakes.length === 0) {
    return null;
  }

  const snake = snakes[0];

  return {
    segments: snake.segments,
    isAlive: snake.isAlive,
    entityId: (snake as any).entity, // Entity对象
  };
}

/**
 * useFoodData - 获取当前食物的数据
 * 每次都返回新对象，确保每帧都触发 useEffect
 */
export function useFoodData(): FoodData | null {
  const foods = useECSQuery(Food);

  if (foods.length === 0) {
    return null;
  }

  const food = foods[0];

  return {
    x: food.x,
    y: food.y,
  };
}

/**
 * useGameScore - 获取游戏得分数据
 * 每次都返回新对象，确保每帧都触发 useEffect
 */
export function useGameScore(): GameScoreData | null {
  const scores = useECSQuery(GameScore);

  if (scores.length === 0) {
    return null;
  }

  const score = scores[0];

  return {
    score: score.score,
    survivalTime: score.survivalTime,
    speedMultiplier: score.speedMultiplier,
    lives: score.lives,
  };
}

/**
 * useLeaderboard - 获取榜单数据
 * 每次都返回新数组，确保每帧都触发 useEffect
 */
export function useLeaderboard(): LeaderboardEntryData[] {
  const leaderboardRes = useECSResource(LeaderboardResource);

  if (!leaderboardRes) {
    return [];
  }

  return leaderboardRes.entries.map((entry) => ({
    playerName: entry.playerName,
    score: entry.score,
    survivalTime: entry.survivalTime,
    timestamp: entry.timestamp,
  }));
}
