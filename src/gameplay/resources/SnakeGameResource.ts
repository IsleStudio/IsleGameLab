import { Resource } from '../../core/ecs/Resource';

/**
 * SnakeGameConfig - 蛇游戏配置
 */
export interface SnakeGameConfig {
  /** 游戏区域宽度（格子数） */
  gridWidth: number;
  /** 游戏区域高度（格子数） */
  gridHeight: number;
  /** 初始蛇移动速度（毫秒/格） */
  initialSpeed: number;
  /** 速度提升间隔（秒） */
  speedIncreaseInterval: number;
  /** 每次速度提升倍率 */
  speedIncreaseMultiplier: number;
  /** 最大速度倍率 */
  maxSpeedMultiplier: number;
  /** 初始生命数 */
  initialLives: number;
  /** 初始蛇长度 */
  initialSnakeLength: number;
}

/**
 * SnakeGameResource - 蛇游戏全局资源
 * 管理蛇游戏的全局状态和配置
 */
export class SnakeGameResource extends Resource {
  /** 游戏配置 */
  public config: SnakeGameConfig = {
    gridWidth: 30,
    gridHeight: 20,
    initialSpeed: 150,
    speedIncreaseInterval: 20,
    speedIncreaseMultiplier: 0.5,
    maxSpeedMultiplier: 5.0,
    initialLives: 5,
    initialSnakeLength: 3,
  };

  /** 当前游戏实体ID（如果有活跃游戏） */
  public currentGameEntity: number | null = null;

  /** 游戏是否正在运行 */
  public isGameRunning: boolean = false;

  /** 上次移动时间戳 */
  public lastMoveTime: number = 0;

  /** 游戏开始时间戳 */
  public gameStartTime: number = 0;

  /** 是否显示游戏结束界面 */
  public showGameOver: boolean = false;

  /**
   * 开始新游戏
   */
  public startGame(entityId: number): void {
    this.currentGameEntity = entityId;
    this.isGameRunning = true;
    this.lastMoveTime = Date.now();
    this.gameStartTime = Date.now();
    this.showGameOver = false;
  }

  /**
   * 结束游戏
   */
  public endGame(): void {
    this.isGameRunning = false;
    this.showGameOver = true;
  }

  /**
   * 重置游戏资源
   */
  public reset(): void {
    this.currentGameEntity = null;
    this.isGameRunning = false;
    this.lastMoveTime = 0;
    this.gameStartTime = 0;
    this.showGameOver = false;
  }
}

/**
 * LeaderboardResource - 榜单资源
 * 管理游戏榜单数据
 */
export class LeaderboardResource extends Resource {
  /** 榜单记录（按得分排序） */
  public entries: Array<{
    playerName: string;
    score: number;
    survivalTime: number;
    timestamp: number;
  }> = [];

  /** 最大榜单条目数 */
  public maxEntries: number = 10;

  /**
   * 添加新记录
   */
  public addEntry(
    playerName: string,
    score: number,
    survivalTime: number
  ): void {
    const newEntry = {
      playerName,
      score,
      survivalTime,
      timestamp: Date.now(),
    };

    this.entries.push(newEntry);

    // 按得分降序排序
    this.entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 得分相同时按存活时间降序
      return b.survivalTime - a.survivalTime;
    });

    // 保持最大条目数限制
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }

  /**
   * 获取排名（1-based）
   * @returns 排名，如果不在榜单中返回-1
   */
  public getRank(playerName: string, score: number): number {
    const index = this.entries.findIndex(
      (entry) => entry.playerName === playerName && entry.score === score
    );
    return index >= 0 ? index + 1 : -1;
  }

  /**
   * 清空榜单
   */
  public clear(): void {
    this.entries = [];
  }
}
