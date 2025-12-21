import { ECS } from '../core/ecs/World';
import { Stage } from '../core/ecs/System';
import { GameState, UserSession, SnakeGameResource, LeaderboardResource } from '../gameplay/resources';
import {
  LoginProcessSystem,
  NavigationSystem,
  IntentCleanupSystem,
  SnakeGameInitSystem,
  SnakeMovementSystem,
  SnakeCollisionSystem,
  GameSpeedSystem,
  GameOverSystem,
} from '../gameplay/systems';
import { NavigateIntent } from '../gameplay/intents/ui';
import { StorageManager } from '../core/persistence';
import { logger, ECSError, ErrorSeverity } from '../lib/errors';

/**
 * 游戏世界管理器 - 管理ECS World的生命周期
 * 负责初始化、系统注册、状态恢复和更新循环
 */
export class GameWorld {
  private ecs: ECS;
  private isInitialized: boolean = false;

  constructor() {
    // 创建ECS World实例
    this.ecs = new ECS();
  }

  /**
   * 初始化游戏世界
   * 注册所有系统和资源，恢复持久化状态
   */
  public initialize(): void {
    if (this.isInitialized) {
      logger.warn('[GameWorld] 已经初始化，跳过重复初始化');
      return;
    }

    try {
      // 1. 注册全局资源
      this.registerResources();

      // 2. 注册系统到对应Stage
      this.registerSystems();

      // 3. 恢复持久化状态
      this.restoreState();

      // 4. 运行启动阶段系统
      this.ecs.startup();

      this.isInitialized = true;
      logger.info('[GameWorld] 初始化完成');
    } catch (error) {
      const ecsError = new ECSError(
        '游戏世界初始化失败',
        ErrorSeverity.FATAL,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
      logger.error('[GameWorld] ' + ecsError.message, ecsError);
      throw ecsError;
    }
  }

  /**
   * 注册全局资源
   */
  private registerResources(): void {
    try {
      // 注册游戏状态资源
      this.ecs.insertResource(new GameState());

      // 注册用户会话资源
      this.ecs.insertResource(new UserSession());

      // 注册蛇游戏资源
      this.ecs.insertResource(new SnakeGameResource());

      // 注册榜单资源
      this.ecs.insertResource(new LeaderboardResource());

      logger.debug('[GameWorld] 资源注册完成');
    } catch (error) {
      const ecsError = new ECSError(
        '资源注册失败',
        ErrorSeverity.ERROR,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
      logger.error('[GameWorld] ' + ecsError.message, ecsError);
      throw ecsError;
    }
  }

  /**
   * 注册系统到对应Stage
   */
  private registerSystems(): void {
    try {
      // Update阶段 - 主要游戏逻辑
      // 登录处理系统 - 处理LoginIntent
      this.ecs.addSystem(Stage.Update, new LoginProcessSystem());

      // 导航系统 - 处理NavigateIntent
      this.ecs.addSystem(Stage.Update, new NavigationSystem());

      // 蛇游戏初始化系统 - 处理StartSnakeGameIntent和RestartSnakeGameIntent
      this.ecs.addSystem(Stage.Update, new SnakeGameInitSystem());

      // 蛇移动系统 - 处理蛇的移动
      this.ecs.addSystem(Stage.Update, new SnakeMovementSystem());

      // 蛇碰撞检测系统 - 处理碰撞
      this.ecs.addSystem(Stage.Update, new SnakeCollisionSystem());

      // 游戏速度系统 - 更新速度和时间
      this.ecs.addSystem(Stage.Update, new GameSpeedSystem());

      // 游戏结束系统 - 处理游戏结束
      this.ecs.addSystem(Stage.Update, new GameOverSystem());

      // Intent清理系统 - 在所有业务系统之后清理已处理的Intent
      this.ecs.addSystem(Stage.Update, new IntentCleanupSystem());

      logger.debug('[GameWorld] 系统注册完成');
    } catch (error) {
      const ecsError = new ECSError(
        '系统注册失败',
        ErrorSeverity.ERROR,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
      logger.error('[GameWorld] ' + ecsError.message, ecsError);
      throw ecsError;
    }
  }

  /**
   * 恢复持久化状态
   * 从本地存储加载用户会话
   */
  private restoreState(): void {
    try {
      // 尝试从存储加载用户会话
      const loaded = StorageManager.loadUserSession(this.ecs);

      if (loaded) {
        const userSession = this.ecs.getResource(UserSession);
        if (userSession && userSession.isValid()) {
          logger.info(`[GameWorld] 用户状态已恢复: ${userSession.username}`);
        }
      } else {
        logger.info('[GameWorld] 无保存的用户状态，使用默认状态');
      }
    } catch (error) {
      // 状态恢复失败不应阻止游戏启动
      logger.warn('[GameWorld] 状态恢复失败，使用默认状态', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取ECS World实例
   */
  public getECS(): ECS {
    return this.ecs;
  }

  /**
   * 运行一帧更新
   */
  public update(): void {
    if (!this.isInitialized) {
      logger.warn('[GameWorld] 未初始化，无法更新');
      return;
    }

    try {
      // 添加调试信息
      const intentCount = Array.from(this.ecs.query(NavigateIntent)).length;
      if (intentCount > 0) {
        console.log(`[GameWorld] 发现 ${intentCount} 个NavigateIntent`);
      }
      
      this.ecs.update();
    } catch (error) {
      logger.error('[GameWorld] 更新循环出错', error instanceof Error ? error : undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 运行固定时间步进更新
   */
  public fixedUpdate(): void {
    if (!this.isInitialized) {
      logger.warn('[GameWorld] 未初始化，无法执行固定更新');
      return;
    }

    try {
      this.ecs.fixedUpdate();
    } catch (error) {
      logger.error('[GameWorld] 固定更新循环出错', error instanceof Error ? error : undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 保存当前状态
   */
  public saveState(): boolean {
    try {
      return StorageManager.saveUserSession(this.ecs);
    } catch (error) {
      logger.error('[GameWorld] 保存状态失败', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 重置游戏世界（主要用于测试）
   */
  public reset(): void {
    this.isInitialized = false;
    this.ecs = new ECS();
    logger.info('[GameWorld] 已重置');
  }
}
