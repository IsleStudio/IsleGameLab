// React Hooks导出

// ECS Resource Hook
export { useECSResource, useECSResourceRequired } from './useECSResource';

// ECS Query Hook
export {
  useECSQuery,
  useECSQueryFirst,
  useECSQueryCount,
  useECSQueryMultiple,
} from './useECSQuery';

// GameState Hook
export { useGameState, useCurrentScene, useIsPaused } from './useGameState';
export type { GameStateView } from './useGameState';

// UserSession Hook
export { useUserSession, useIsLoggedIn, useUsername } from './useUserSession';
export type { UserSessionView } from './useUserSession';

// Snake Game Hooks
export { 
  useSnakeGame, 
  useSnakeData, 
  useFoodData, 
  useGameScore, 
  useLeaderboard,
} from './useSnakeGame';
export type {
  SnakeGameData,
  SnakeData,
  FoodData,
  GameScoreData,
  LeaderboardEntryData,
} from './useSnakeGame';
