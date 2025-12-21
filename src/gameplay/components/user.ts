import { Component } from '../../core/ecs/Component';

/**
 * 用户信息组件（纯数据）
 * 存储用户的基本信息
 */
export class UserInfo extends Component {
  constructor(
    public username: string = '',
    public loginTime: number = 0
  ) {
    super();
  }
}

/**
 * 登录状态标签组件（Context Layer）
 * 用于标记实体处于登录状态的上下文
 */
export class LoggedIn extends Component {}