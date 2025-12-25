import { Component } from '../../core/ecs/Component';

/**
 * 蛇身体段位置
 */
export interface SnakeSegment {
  x: number;
  y: number;
}

/**
 * 蛇移动方向
 */
export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

/**
 * Snake Component - 蛇的数据
 * 存储蛇的身体段、方向、下一个方向等信息
 */
export class Snake extends Component {
  /** 蛇的身体段，索引0是头部 */
  public segments: SnakeSegment[] = [];
  /** 当前移动方向 */
  public direction: Direction = Direction.Right;
  /** 下一个方向（用于缓冲输入） */
  public nextDirection: Direction = Direction.Right;
  /** 是否存活 */
  public isAlive: boolean = true;
  /** 当前帧是否移动过（用于同步移动和碰撞检测） */
  public movedThisFrame: boolean = false;

  public clone(): this {
    const clone = new (this.constructor as new () => this)();
    clone.segments = this.segments.map((seg) => ({ ...seg }));
    clone.direction = this.direction;
    clone.nextDirection = this.nextDirection;
    clone.isAlive = this.isAlive;
    clone.movedThisFrame = this.movedThisFrame;
    return clone;
  }
}

/**
 * Food Component - 食物位置
 */
export class Food extends Component {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {
    super();
  }

  public clone(): this {
    const clone = new (this.constructor as new () => this)();
    clone.x = this.x;
    clone.y = this.y;
    return clone;
  }
}

/**
 * GameScore Component - 游戏得分数据
 */
export class GameScore extends Component {
  /** 当前得分 */
  public score: number = 0;
  /** 游戏开始时间戳 */
  public startTime: number = 0;
  /** 存活时间（秒） */
  public survivalTime: number = 0;
  /** 当前游戏速度倍率 */
  public speedMultiplier: number = 1.0;
  /** 剩余生命数 */
  public lives: number = 5;

  public clone(): this {
    const clone = new (this.constructor as new () => this)();
    clone.score = this.score;
    clone.startTime = this.startTime;
    clone.survivalTime = this.survivalTime;
    clone.speedMultiplier = this.speedMultiplier;
    clone.lives = this.lives;
    return clone;
  }
}

/**
 * SnakeGameState Component - 蛇游戏状态标签
 * 标记实体是一个活跃的蛇游戏
 */
export class SnakeGameActive extends Component {}

/**
 * LeaderboardEntry Component - 榜单记录
 */
export class LeaderboardEntry extends Component {
  constructor(
    public playerName: string = '',
    public score: number = 0,
    public survivalTime: number = 0,
    public timestamp: number = 0
  ) {
    super();
  }

  public clone(): this {
    const clone = new (this.constructor as new () => this)();
    clone.playerName = this.playerName;
    clone.score = this.score;
    clone.survivalTime = this.survivalTime;
    clone.timestamp = this.timestamp;
    return clone;
  }
}
