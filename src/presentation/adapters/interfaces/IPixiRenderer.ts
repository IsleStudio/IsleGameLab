/**
 * Pixi 渲染器接口
 * 抽象 Pixi.js 具体实现，便于后续切换渲染引擎
 */

export interface IPixiRenderer {
  /**
   * 初始化 Pixi 应用
   * @param container DOM 容器元素
   * @param width 画布宽度
   * @param height 画布高度
   */
  initialize(container: HTMLElement, width: number, height: number): Promise<void>;

  /**
   * 获取 Pixi Application 实例
   */
  getApplication(): any | null;

  /**
   * 获取根容器
   */
  getStage(): any;

  /**
   * 创建并返回游戏容器
   */
  createGameContainer(): any;

  /**
   * 调整画布大小
   */
  resize(width: number, height: number): void;

  /**
   * 销毁渲染器
   */
  destroy(): void;

  /**
   * 开始渲染循环
   */
  start(): void;

  /**
   * 停止渲染循环
   */
  stop(): void;

  /**
   * 添加渲染更新回调
   * @param callback 每帧调用的回调函数，参数为 delta（时间增量）
   * @returns 取消订阅的函数
   */
  onRender(callback: (delta: number) => void): () => void;
}
