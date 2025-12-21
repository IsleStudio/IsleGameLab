// 示例：如何在游戏中使用ECS框架定义业务组件
// 这些组件应该在具体的游戏代码中定义，而不是在框架核心中

import { Component } from '../Component';
import { TagComponent, Intent } from '../Intent';

// 示例：游戏数据组件
export class Position extends Component {
  constructor(public x: number = 0, public y: number = 0) {
    super();
  }
}

export class Velocity extends Component {
  constructor(public dx: number = 0, public dy: number = 0) {
    super();
  }
}

export class Health extends Component {
  constructor(public current: number = 100, public max: number = 100) {
    super();
  }
}

// 示例：Context Layer标签组件
export class InCombat extends TagComponent {}
export class Paused extends TagComponent {}
export class UIActive extends TagComponent {}
export class Loading extends TagComponent {}
export class DebugMode extends TagComponent {}

// 示例：Intent组件
export class MoveIntent extends Intent {
  constructor(public targetX: number, public targetY: number) {
    super();
  }
}

export class AttackIntent extends Intent {
  constructor(public targetId: number) {
    super();
  }
}