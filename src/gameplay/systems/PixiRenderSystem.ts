import { System } from '../../core/ecs/System';
import { Snake, Food, SnakeSegment } from '../components/snake';
import { PixiResource } from '../../presentation/resources/PixiResource';
import { SnakeGameResource } from '../resources/SnakeGameResource';
import { logger } from '../../lib/errors';

/**
 * 插值动画状态
 */
interface AnimationState {
  /** 上一帧的蛇段位置 */
  previousSegments: SnakeSegment[];
  /** 当前帧的蛇段位置 */
  currentSegments: SnakeSegment[];
  /** 插值进度 (0-1) */
  interpolateProgress: number;
  /** 是否正在进行插值 */
  isInterpolating: boolean;
}

/**
 * PixiRenderSystem - Pixi.js 渲染系统
 * 将 ECS 渲染数据同步到 Pixi.js 场景图
 * 运行在 PostUpdate 阶段，每帧执行
 */
export class PixiRenderSystem extends System {
  public componentsRequired = [];
  public isGlobal = true;

  // Pixi Graphics 对象缓存
  private snakeGraphics = new Map<number, any>(); // Map<entityId, Graphics>
  private foodGraphics: any = null; // Graphics from pixi.js

  // 上次渲染状态
  private lastSnakeLength = 0;
  private lastFoodPosition = { x: -1, y: -1 };

  // 平滑动画状态
  private animationState: AnimationState = {
    previousSegments: [],
    currentSegments: [],
    interpolateProgress: 0,
    isInterpolating: false,
  };

  /**
   * 系统更新 - 每帧执行
   */
  public update(): void {
    const pixiRes = this.tryRes(PixiResource);
    if (!pixiRes || !pixiRes.renderer || !pixiRes.isInitialized) {
      return;
    }

    const snakeGameRes = this.tryRes(SnakeGameResource);
    if (!snakeGameRes || !snakeGameRes.isGameRunning) {
      return;
    }

    // 获取蛇和食物组件
    const snakes = Array.from(this.ecs.query(Snake));
    const foods = Array.from(this.ecs.query(Food));

    if (snakes.length === 0) return;

    const snake = snakes[0];
    const food = foods[0];

    // 渲染蛇（带平滑动画）
    this.renderSnake(snake, pixiRes);

    // 渲染食物
    if (food) {
      this.renderFood(food, pixiRes);
    }
  }

  /**
   * 渲染蛇（使用插值实现平滑动画）
   */
  private renderSnake(snake: Snake, pixiRes: PixiResource): void {
    const container = pixiRes.gameContainer;
    if (!container) return;

    // 检测蛇是否移动
    const hasMoved = this.checkSnakeMovement(snake);

    if (hasMoved) {
      // 蛇移动了，更新动画状态
      this.animationState.previousSegments = [...this.animationState.currentSegments];
      this.animationState.currentSegments = JSON.parse(JSON.stringify(snake.segments));
      this.animationState.interpolateProgress = 0;
      this.animationState.isInterpolating = true;

      logger.debug('[PixiRenderSystem] 蛇移动，开始动画', {
        direction: snake.direction,
        length: snake.segments.length,
      });
    } else {
      // 首次渲染或初始化
      if (this.animationState.currentSegments.length === 0) {
        this.animationState.currentSegments = JSON.parse(JSON.stringify(snake.segments));
        this.animationState.previousSegments = JSON.parse(JSON.stringify(snake.segments));
      }
    }

    // 更新插值进度
    if (this.animationState.isInterpolating) {
      this.animationState.interpolateProgress += pixiRes.animation.lerpSpeed;
      if (this.animationState.interpolateProgress >= 1) {
        this.animationState.interpolateProgress = 1;
        this.animationState.isInterpolating = false;
      }
    }

    // 计算插值后的位置
    const interpolatedSegments = pixiRes.animation.enableAnimation
      ? this.interpolateSegments(
          this.animationState.previousSegments,
          this.animationState.currentSegments,
          this.animationState.interpolateProgress
        )
      : this.animationState.currentSegments;

    // 获取或创建 Graphics 对象
    let graphics = this.snakeGraphics.get(snake.entity.id());
    if (!graphics) {
      graphics = new (this.getPixiClass() as any).Graphics();
      container.addChild(graphics);
      this.snakeGraphics.set(snake.entity.id(), graphics);
    }

    // 清除旧绘制
    graphics.clear();

    // 绘制蛇段
    const { cellWidth, cellHeight } = pixiRes.gridConfig;
    const padding = pixiRes.getSegmentPadding();
    const size = pixiRes.getSegmentSize();
    const radius = pixiRes.getSegmentRadius();

    interpolatedSegments.forEach((segment, index) => {
      // 头部颜色更亮
      const color = index === 0 ? pixiRes.colors.snakeHead : pixiRes.colors.snakeBody;
      graphics.beginFill(color);

      // 绘制圆角矩形
      const x = segment.x * cellWidth + padding;
      const y = segment.y * cellHeight + padding;
      graphics.drawRoundedRect(x, y, size, size, radius);

      graphics.endFill();
    });

    this.lastSnakeLength = snake.segments.length;
  }

  /**
   * 渲染食物
   */
  private renderFood(food: Food, pixiRes: PixiResource): void {
    const container = pixiRes.gameContainer;
    if (!container) return;

    // 检测食物是否移动
    const foodMoved = food.x !== this.lastFoodPosition.x || food.y !== this.lastFoodPosition.y;

    // 获取或创建 Graphics 对象
    if (!this.foodGraphics) {
      this.foodGraphics = new (this.getPixiClass() as any).Graphics();
      container.addChild(this.foodGraphics);
    }

    // 如果食物移动了或首次渲染，重新绘制
    if (foodMoved || this.lastFoodPosition.x === -1) {
      this.foodGraphics.clear();

      const { cellWidth, cellHeight } = pixiRes.gridConfig;
      const radius = pixiRes.getFoodRadius();
      const centerX = (food.x + 0.5) * cellWidth;
      const centerY = (food.y + 0.5) * cellHeight;

      this.foodGraphics.beginFill(pixiRes.colors.food);
      this.foodGraphics.drawCircle(centerX, centerY, radius);
      this.foodGraphics.endFill();

      this.lastFoodPosition = { x: food.x, y: food.y };
    }
  }

  /**
   * 检测蛇是否移动
   */
  private checkSnakeMovement(snake: Snake): boolean {
    // 长度变化
    if (this.lastSnakeLength !== snake.segments.length) {
      return true;
    }

    // 头部位置变化
    if (snake.segments.length > 0 && this.animationState.currentSegments.length > 0) {
      const head = snake.segments[0];
      const lastHead = this.animationState.currentSegments[0];
      return head.x !== lastHead.x || head.y !== lastHead.y;
    }

    return false;
  }

  /**
   * 线性插值计算蛇段位置
   * @param previous 上一帧位置
   * @param current 当前位置
   * @param t 插值进度 (0-1)
   */
  private interpolateSegments(
    previous: SnakeSegment[],
    current: SnakeSegment[],
    t: number
  ): SnakeSegment[] {
    // 如果没有前一个状态，直接返回当前状态
    if (previous.length === 0) {
      return current;
    }

    // 处理蛇变长的情况（头部移动，尾部保持不变）
    return current.map((seg, i) => {
      const prev = previous[i] || seg;
      return {
        x: prev.x + (seg.x - prev.x) * t,
        y: prev.y + (seg.y - prev.y) * t,
      };
    });
  }

  /**
   * 获取 Pixi 类（用于避免直接导入 pixi.js 导致的构建问题）
   */
  private getPixiClass(): any {
    // 返回一个占位对象，实际使用时通过 renderer 获取
    return {};
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.snakeGraphics.forEach((graphics) => {
      graphics.destroy({ children: true });
    });
    this.snakeGraphics.clear();

    if (this.foodGraphics) {
      this.foodGraphics.destroy({ children: true });
      this.foodGraphics = null;
    }

    logger.debug('[PixiRenderSystem] 资源已清理');
  }
}
