import { Application, Container, Graphics } from 'pixi.js';
import type { IPixiRenderer } from '../interfaces/IPixiRenderer';
import { createLogger } from '../../../lib/logger';

// 创建日志记录器
const logger = createLogger('PixiWebRenderer');

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
      logger.warn('已初始化，跳过');
      return;
    }

    try {
      logger.info(`初始化渲染器 (${width}x${height})`);

      // 创建并初始化 Pixi 应用 (Pixi.js v8 方式)
      const app = new Application();

      await app.init({
        width,
        height,
        background: '#1a1a1a',
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // 设置 this.app
      this.app = app;

      // 挂载到 DOM
      const canvas = app.canvas;
      if (canvas instanceof HTMLCanvasElement) {
        container.appendChild(canvas);
      } else {
        throw new Error('无法获取有效的 canvas 元素');
      }

      // 创建游戏容器
      this.gameContainer = new Container();
      if (app.stage) {
        app.stage.addChild(this.gameContainer);
      }

      // 启动渲染循环
      if (app.ticker) {
        app.ticker.add((ticker: any) => {
          const delta = ticker.deltaMS;
          this.onTick(delta);
        });
      }

      this.isInitialized = true;
      logger.info('渲染器初始化成功');
    } catch (error) {
      logger.error('初始化失败', error);
      this.app = null;
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
   * 获取 Graphics 类
   */
  getGraphicsClass(): typeof Graphics {
    return Graphics;
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
      this.gameContainer = new Container();
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
      logger.debug(`调整大小 (${width}x${height})`);
    } catch (error) {
      logger.warn('调整大小失败', error);
    }
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    if (!this.app) {
      return;
    }

    logger.info('销毁渲染器');

    // 立即保存引用并清空，防止重复调用
    const app = this.app;
    const gameContainer = this.gameContainer;

    this.app = null;
    this.gameContainer = null;
    this.isInitialized = false;

    // 停止渲染循环
    try {
      if (app?.ticker) {
        app.ticker.stop();
      }
    } catch (error) {
      logger.warn('停止渲染循环失败', error);
    }

    // 清理游戏容器
    if (gameContainer) {
      try {
        app?.stage?.removeChild(gameContainer);
        gameContainer.destroy({ children: true });
      } catch (error) {
        logger.warn('销毁游戏容器失败', error);
      }
    }

    // 销毁 Pixi 应用
    try {
      if (app && typeof app.destroy === 'function') {
        app.destroy(true);
      }
    } catch (error) {
      logger.error('销毁应用失败', error);
    }
  }

  /**
   * 开始渲染循环
   */
  start(): void {
    if (this.app?.ticker) {
      this.app.ticker.start();
      logger.debug('开始渲染循环');
    }
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    if (this.app?.ticker) {
      this.app.ticker.stop();
      logger.debug('停止渲染循环');
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
        logger.error('渲染回调出错', error);
      }
    });
  };
}
