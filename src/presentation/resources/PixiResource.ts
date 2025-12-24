import { Resource } from '../../core/ecs/Resource';
import type { IPixiRenderer } from '../adapters/interfaces/IPixiRenderer';

/**
 * 网格配置
 */
export interface GridConfig {
  cellWidth: number;
  cellHeight: number;
  gridWidth: number;
  gridHeight: number;
}

/**
 * 颜色配置
 */
export interface ColorConfig {
  snakeHead: number;
  snakeBody: number;
  food: number;
  background: number;
}

/**
 * 动画配置
 */
export interface AnimationConfig {
  /** 插值速度 (0-1)，每帧增加的进度 */
  lerpSpeed: number;
  /** 是否启用平滑动画 */
  enableAnimation: boolean;
}

/**
 * Pixi 渲染器资源
 * 存储渲染器实例和渲染相关配置
 */
export class PixiResource extends Resource {
  /** Pixi 渲染器实例 */
  public renderer: IPixiRenderer | null = null;

  /** 渲染器是否已初始化 */
  public isInitialized: boolean = false;

  /** 游戏容器 */
  public gameContainer: any = null; // Container from pixi.js

  /** 网格配置 */
  public gridConfig: GridConfig = {
    cellWidth: 22,  // 默认值，会根据实际画布尺寸更新
    cellHeight: 22,
    gridWidth: 30,
    gridHeight: 20,
  };

  /** 颜色配置 */
  public colors: ColorConfig = {
    snakeHead: 0x10b981,  // green-500
    snakeBody: 0x059669,  // green-600
    food: 0xef4444,        // red-500
    background: 0x1a1a1a,  // gray-900
  };

  /** 动画配置 */
  public animation: AnimationConfig = {
    lerpSpeed: 0.1,      // 插值速度
    enableAnimation: true,  // 启用平滑动画
  };

  /**
   * 设置渲染器
   */
  public setRenderer(renderer: IPixiRenderer): void {
    this.renderer = renderer;
    this.isInitialized = true;
  }

  /**
   * 更新网格配置
   */
  public updateGridSize(canvasWidth: number, canvasHeight: number, gridWidth: number, gridHeight: number): void {
    this.gridConfig = {
      cellWidth: canvasWidth / gridWidth,
      cellHeight: canvasHeight / gridHeight,
      gridWidth,
      gridHeight,
    };
  }

  /**
   * 设置动画配置
   */
  public setAnimationConfig(config: Partial<AnimationConfig>): void {
    this.animation = { ...this.animation, ...config };
  }

  /**
   * 蛇段填充比例（用于调整蛇段绘制大小）
   */
  public getSegmentPadding(): number {
    return Math.min(this.gridConfig.cellWidth, this.gridConfig.cellHeight) * 0.05;
  }

  public getSegmentSize(): number {
    return Math.min(this.gridConfig.cellWidth, this.gridConfig.cellHeight) * 0.9;
  }

  /**
   * 蛇段圆角半径
   */
  public getSegmentRadius(): number {
    return this.getSegmentSize() * 0.15;
  }

  /**
   * 食物半径
   */
  public getFoodRadius(): number {
    return Math.min(this.gridConfig.cellWidth, this.gridConfig.cellHeight) * 0.4;
  }
}
