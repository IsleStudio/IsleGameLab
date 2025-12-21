import { Resource } from '../../core/ecs/Resource';

/**
 * 用户会话Resource - 存储用户登录状态和信息
 * 全局单例，管理当前用户的会话数据
 */
export class UserSession extends Resource {
  public username: string | null = null;
  public isLoggedIn: boolean = false;
  public loginTimestamp: number = 0;

  /**
   * 重置会话到初始状态
   */
  public reset(): void {
    this.username = null;
    this.isLoggedIn = false;
    this.loginTimestamp = 0;
  }

  /**
   * 设置登录状态
   */
  public setLoggedIn(username: string): void {
    this.username = username;
    this.isLoggedIn = true;
    this.loginTimestamp = Date.now();
  }

  /**
   * 检查会话是否有效
   */
  public isValid(): boolean {
    return this.isLoggedIn && this.username !== null && this.username.trim().length > 0;
  }
}