import { Component } from './Component';

/**
 * Intent基类 - 表达"想要做什么"的请求
 * 类似Command模式，支持可记录的操作请求
 * 所有用户输入都应转换为Intent，以支持Replay功能
 */
export abstract class Intent extends Component {
  /** 是否已被处理 */
  public processed: boolean = false;
  
  /** 时间戳（用于Replay） */
  public timestamp: number = Date.now();
  
  /**
   * Intent的唯一标识符（可选）
   * 用于去重或查找特定Intent
   */
  public id?: string;
  
  /**
   * Intent的优先级（可选）
   * 数值越小优先级越高，默认为0
   */
  public priority: number = 0;
}

/**
 * Context Layer支持 - 标签组件基类
 * 用于表示游戏上下文状态（如Combat、Paused、UI状态等）
 */
export abstract class TagComponent extends Component {
  // 标签组件通常不包含数据，仅用于标记状态
}

// 使用示例（在实际游戏代码中定义）：
// export class InCombat extends TagComponent {}
// export class Paused extends TagComponent {}
// export class UIActive extends TagComponent {}
// export class Loading extends TagComponent {}
// export class DebugMode extends TagComponent {}