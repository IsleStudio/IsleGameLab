'use client';

import { useECSResource } from './useECSResource';
import { useECSQuery } from './useECSQuery';
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
  entityId: number;
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
 */
export function useSnakeData(): SnakeData | null {
  const entities = useECSQuery([SnakeGameActive, Snake]);

  if (entities.length === 0) {
    return null;
  }

  const entity = entities[0];
  const snake = entity.components.get(Snake);

  if (!snake) {
    return null;
  }

  return {
    segments: snake.segments,
    isAlive: snake.isAlive,
    entityId: entity.id,
  };
}

/**
 * useFoodData - 获取当前食物的数据
 */
export function useFoodData(): FoodData | null {
  const entities = useECSQuery([SnakeGameActive, Food]);

  if (entities.length === 0) {
    return null;
  }

  const entity = entities[0];
  const food = entity.components.get(Food);

  if (!food) {
    return null;
  }

  return {
    x: food.x,
    y: food.y,
  };
}

/**
 * useGameScore - 获取游戏得分数据
 */
export function useGameScore(): GameScoreData | null {
  const entities = useECSQuery([SnakeGameActive, GameScore]);

  if (entities.length === 0) {
    return null;
  }

  const entity = entities[0];
  const score = entity.components.get(GameScore);

  if (!score) {
    return null;
  }

  return {
    score: score.score,
    survivalTime: score.survivalTime,
    speedMultiplier: score.speedMultiplier,
    lives: score.lives,
  };
}

/**
 * useLeaderboard - 获取榜单数据
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
