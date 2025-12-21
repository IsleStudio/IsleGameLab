import { Intent } from '../../core/ecs/Intent';

/**
 * UI导航Intent
 * 表达用户想要导航到特定视图的意图
 */
export class NavigateIntent extends Intent {
  constructor(
    /** 目标视图 */
    public targetView: 'main-menu' | 'login' | 'game'
  ) {
    super();
  }
}