/**
 * 全局常量定义
 * 包含游戏配置、UI常量等
 */

// 游戏配置常量
export const GAME_CONFIG = {
  // 游戏标题
  TITLE: '游戏标题',
  // 版本号
  VERSION: '1.0.0',
  // 默认场景
  DEFAULT_SCENE: 'main-menu' as const,
} as const;

// UI常量
export const UI_CONSTANTS = {
  // 视图类型
  VIEWS: {
    MAIN_MENU: 'main-menu',
    LOGIN: 'login',
    GAME: 'game',
  } as const,
  // 动画持续时间
  ANIMATION_DURATION: 300,
} as const;

// 存储键名
export const STORAGE_KEYS = {
  USER_SESSION: 'user_session',
} as const;
