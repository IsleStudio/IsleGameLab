import { GameWorld } from './GameWorld';
import { logger } from '../lib/errors';

/**
 * Tick配置接口
 */
export interface TickConfig {
  // 目标帧率（每秒帧数）
  targetFPS: number;
  // 固定更新频率（每秒次数）
  fixedUpdateRate: number;
  // 是否启用固定更新
  enableFixedUpdate: boolean;
}

/**
 * 默认Tick配置
 */
const DEFAULT_CONFIG: TickConfig = {
  targetFPS: 60,
  fixedUpdateRate: 50,
  enableFixedUpdate: false,
};

/**
 * Tick系统 - 管理游戏循环
 * 提供帧更新和固定时间步进更新
 */
export class TickSystem {
  private gameWorld: GameWorld;
  private config: TickConfig;

  // 循环控制
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private fixedUpdateIntervalId: ReturnType<typeof setInterval> | null = null;

  // 时间追踪
  private lastFrameTime: number = 0;
  private deltaTime: number = 0;
  private frameCount: number = 0;

  // 固定更新累加器
  private fixedTimeAccumulator: number = 0;
  private fixedDeltaTime: number = 0;

  constructor(gameWorld: GameWorld, config: Partial<TickConfig> = {}) {
    this.gameWorld = gameWorld;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fixedDeltaTime = 1000 / this.config.fixedUpdateRate;
  }

  /**
   * 启动游戏循环
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('[TickSystem] 游戏循环已在运行');
      return;
    }

    // 确保GameWorld已初始化
    if (!this.gameWorld.isReady()) {
      try {
        this.gameWorld.initialize();
      } catch (error) {
        logger.error('[TickSystem] GameWorld初始化失败，无法启动游戏循环', error instanceof Error ? error : undefined);
        return;
      }
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    // 启动主循环
    this.tick();

    // 启动固定更新（如果启用）
    if (this.config.enableFixedUpdate) {
      this.startFixedUpdate();
    }

    logger.info('[TickSystem] 游戏循环已启动');
  }

  /**
   * 停止游戏循环
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn('[TickSystem] 游戏循环未在运行');
      return;
    }

    this.isRunning = false;

    // 取消动画帧
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 停止固定更新
    this.stopFixedUpdate();

    logger.info('[TickSystem] 游戏循环已停止');
  }

  /**
   * 主循环tick
   */
  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // 累加固定更新时间
    if (this.config.enableFixedUpdate) {
      this.fixedTimeAccumulator += this.deltaTime;
    }

    // 执行帧更新
    try {
      this.gameWorld.update();
    } catch (error) {
      logger.error('[TickSystem] 帧更新出错', error instanceof Error ? error : undefined);
    }
    this.frameCount++;

    // 请求下一帧
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * 启动固定更新循环
   */
  private startFixedUpdate(): void {
    if (this.fixedUpdateIntervalId !== null) return;

    this.fixedUpdateIntervalId = setInterval(() => {
      if (!this.isRunning) return;

      // 消耗累加的时间
      while (this.fixedTimeAccumulator >= this.fixedDeltaTime) {
        try {
          this.gameWorld.fixedUpdate();
        } catch (error) {
          logger.error('[TickSystem] 固定更新出错', error instanceof Error ? error : undefined);
        }
        this.fixedTimeAccumulator -= this.fixedDeltaTime;
      }
    }, this.fixedDeltaTime);
  }

  /**
   * 停止固定更新循环
   */
  private stopFixedUpdate(): void {
    if (this.fixedUpdateIntervalId !== null) {
      clearInterval(this.fixedUpdateIntervalId);
      this.fixedUpdateIntervalId = null;
    }
  }

  /**
   * 手动执行单帧更新（用于测试或暂停时的步进）
   */
  public stepFrame(): void {
    if (this.isRunning) {
      logger.warn('[TickSystem] 游戏循环运行中，无法手动步进');
      return;
    }

    try {
      this.gameWorld.update();
      this.frameCount++;
    } catch (error) {
      logger.error('[TickSystem] 手动步进出错', error instanceof Error ? error : undefined);
    }
  }

  /**
   * 获取当前帧的deltaTime（毫秒）
   */
  public getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * 获取当前帧的deltaTime（秒）
   */
  public getDeltaTimeSeconds(): number {
    return this.deltaTime / 1000;
  }

  /**
   * 获取已执行的帧数
   */
  public getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * 检查游戏循环是否正在运行
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 获取GameWorld实例
   */
  public getGameWorld(): GameWorld {
    return this.gameWorld;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<TickConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };
    this.fixedDeltaTime = 1000 / this.config.fixedUpdateRate;

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): Readonly<TickConfig> {
    return { ...this.config };
  }
}
