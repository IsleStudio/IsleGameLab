import { Component } from '../../core/ecs/Component';

/**
 * UI状态组件（纯数据）
 * 存储当前UI的状态信息
 */
export class UIState extends Component {
  constructor(
    public currentView: 'main-menu' | 'login' | 'game' = 'main-menu',
    public isLoading: boolean = false
  ) {
    super();
  }
}

/**
 * UI错误组件
 * 存储UI错误信息和时间戳
 */
export class UIError extends Component {
  constructor(
    public message: string = '',
    public timestamp: number = Date.now()
  ) {
    super();
  }
}