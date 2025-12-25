import { Intent } from '../../core/ecs/Intent';
import { Direction } from '../components/snake';

/**
 * StartSnakeGameIntent - 开始蛇游戏
 * 表达用户想要开始一局新的贪吃蛇游戏的意图
 */
export class StartSnakeGameIntent extends Intent {
  constructor() {
    super();
  }
}

/**
 * SnakeDirectionIntent - 改变蛇移动方向
 * 表达用户想要改变蛇移动方向的意图
 */
export class SnakeDirectionIntent extends Intent {
  constructor(
    /** 目标实体ID */
    public entityId: number,
    /** 新方向 */
    public direction: Direction
  ) {
    super();
  }
}

/**
 * RestartSnakeGameIntent - 重新开始游戏
 * 表达用户想要重新开始游戏的意图
 */
export class RestartSnakeGameIntent extends Intent {
  constructor() {
    super();
  }
}

/**
 * BackToMenuIntent - 返回主菜单
 * 表达用户想要从游戏返回主菜单的意图
 */
export class BackToMenuIntent extends Intent {
  constructor() {
    super();
  }
}
