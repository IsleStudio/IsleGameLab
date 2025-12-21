import { describe, it, expect } from 'vitest';
import { GAME_CONFIG, UI_CONSTANTS, STORAGE_KEYS } from './constants';

describe('常量配置', () => {
  it('应该包含正确的游戏配置', () => {
    expect(GAME_CONFIG.TITLE).toBe('游戏标题');
    expect(GAME_CONFIG.VERSION).toBe('1.0.0');
    expect(GAME_CONFIG.DEFAULT_SCENE).toBe('main-menu');
  });

  it('应该包含正确的UI常量', () => {
    expect(UI_CONSTANTS.VIEWS.MAIN_MENU).toBe('main-menu');
    expect(UI_CONSTANTS.VIEWS.LOGIN).toBe('login');
    expect(UI_CONSTANTS.VIEWS.GAME).toBe('game');
    expect(UI_CONSTANTS.ANIMATION_DURATION).toBe(300);
  });

  it('应该包含正确的存储键名', () => {
    expect(STORAGE_KEYS.USER_SESSION).toBe('user_session');
  });
});
