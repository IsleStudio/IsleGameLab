import { Application } from 'pixi.js';
import type { IPixiRenderer } from '../interfaces/IPixiRenderer';

/**
 * Pixi.js Web 平台渲染器实现
 */
export class PixiWebRenderer implements IPixiRenderer {
  private app: Application | null = null;
  private gameContainer: any = null; // Container from pixi.js
  private renderCallbacks = new Set<(delta: number) => void>();
  private isInitialized = false;

  /**
   * 初始化 Pixi 应用
   */
  async initialize(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.isInitialized) {
      console.warn('[PixiWebRenderer] 已初始化，跳过');
      return;
    }

    try {
      // 创建 Pixi 应用
      this.app = new Application();

      // 初始化应用
      await this.app.init({
        width,
        height,
        background: '#1a1a1a',
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // 挂载到 DOM
      if (this.app.canvas) {
        container.appendChild(this.app.canvas);
      }

      // 创建游戏容器
      this.gameContainer = new (this.app as any).Container();
      if (this.app.stage) {
        this.app.stage.addChild(this.gameContainer);
      }

      // 启动渲染循环
      if (this.app.ticker) {
        this.app.ticker.add((ticker: any) => {
          const delta = ticker.deltaMS; // 使用 deltaMS 获取毫秒级时间增量
          this.onTick(delta);
        });
      }

      this.isInitialized = true;
      console.log('[PixiWebRenderer] 初始化完成', { width, height });
    } catch (error) {
      console.error('[PixiWebRenderer] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取 Pixi Application 实例
   */
  getApplication(): any | null {
    return this.app;
  }

  /**
   * 获取根容器
   */
  getStage(): any {
    return this.app?.stage;
  }

  /**
   * 创建并返回游戏容器
   */
  createGameContainer(): any {
    if (!this.gameContainer && this.app) {
      this.gameContainer = new (this.app as any).Container();
      if (this.app.stage) {
        this.app.stage.addChild(this.gameContainer);
      }
    }
    return this.gameContainer;
  }

  /**
   * 调整画布大小
   */
  resize(width: number, height: number): void {
    if (!this.app) return;

    try {
      this.app.renderer.resize(width, height);
      console.debug('[PixiWebRenderer] 调整大小', { width, height });
    } catch (error) {
      console.warn('[PixiWebRenderer] 调整大小失败:', error);
    }
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    if (!this.app) return;

    this.stop();

    if (this.gameContainer) {
      this.app.stage?.removeChild(this.gameContainer);
      this.gameContainer.destroy({ children: true });
      this.gameContainer = null;
    }

    // Pixi.js v8 destroy() 不再接受参数
    this.app.destroy();
    this.app = null;
    this.isInitialized = false;

    console.log('[PixiWebRenderer] 已销毁');
  }

  /**
   * 开始渲染循环
   */
  start(): void {
    if (this.app?.ticker) {
      this.app.ticker.start();
      console.debug('[PixiWebRenderer] 开始渲染循环');
    }
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    if (this.app?.ticker) {
      this.app.ticker.stop();
      console.debug('[PixiWebRenderer] 停止渲染循环');
    }
  }

  /**
   * 添加渲染更新回调
   */
  onRender(callback: (delta: number) => void): () => void {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  /**
   * 内部 Ticker 回调
   */
  private onTick = (delta: number): void => {
    this.renderCallbacks.forEach((cb) => {
      try {
        cb(delta);
      } catch (error) {
        console.error('[PixiWebRenderer] 渲染回调出错:', error);
      }
    });
  };
}
