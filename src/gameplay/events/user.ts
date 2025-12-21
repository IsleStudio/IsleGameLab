import { Event } from '../../core/ecs/Event';

/**
 * 用户登录成功事件
 * 当用户成功登录时触发，通知其他系统用户状态已改变
 */
export class UserLoggedInEvent extends Event {
  constructor(
    /** 登录的用户名 */
    public username: string,
    /** 登录时间戳 */
    public loginTimestamp: number = Date.now()
  ) {
    super();
  }
}

/**
 * 用户登出事件
 * 当用户登出时触发，通知其他系统用户状态已改变
 */
export class UserLoggedOutEvent extends Event {
  constructor(
    /** 登出的用户名 */
    public username: string,
    /** 登出时间戳 */
    public logoutTimestamp: number = Date.now()
  ) {
    super();
  }
}