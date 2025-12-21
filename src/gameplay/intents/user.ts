import { Intent } from '../../core/ecs/Intent';

/**
 * 用户登录Intent
 * 表达用户想要登录的意图，包含用户名信息
 */
export class LoginIntent extends Intent {
  constructor(
    /** 用户输入的用户名 */
    public username: string
  ) {
    super();
  }
}