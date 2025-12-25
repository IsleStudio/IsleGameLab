import { Intent } from './Intent';
import { ClassType } from './types';
import { createLogger } from '../../lib/logger';

// Forward declaration to avoid circular dependency
interface ECS {
  spawn(): any;
  update(): void;
}

/**
 * Intent记录项
 */
export interface IntentRecord {
  /** Intent类型名称 */
  type: string;
  /** 序列化的Intent数据 */
  data: any;
  /** 时间戳 */
  timestamp: number;
  /** Intent ID（如果有） */
  id?: string;
  /** 优先级 */
  priority: number;
}

/**
 * Replay会话数据
 */
export interface ReplaySession {
  /** 会话ID */
  sessionId: string;
  /** 开始时间戳 */
  startTime: number;
  /** 结束时间戳 */
  endTime?: number;
  /** Intent记录列表 */
  records: IntentRecord[];
  /** 初始状态快照（可选） */
  initialState?: any;
  /** 元数据 */
  metadata?: Record<string, any>;
}

// 创建日志记录器
const logger = createLogger('IntentRecorder');

/**
 * Intent记录器 - 实现Replay支持
 * 记录所有Intent操作，支持回放验证
 */
export class IntentRecorder {
  private records: IntentRecord[] = [];
  private isRecording: boolean = false;
  private sessionId: string = '';
  private startTime: number = 0;

  /** Intent类型注册表 - 用于反序列化 */
  private intentTypes = new Map<string, ClassType<Intent>>();

  /**
   * 开始记录Intent
   */
  public startRecording(sessionId?: string): void {
    this.sessionId = sessionId || `session_${Date.now()}`;
    this.startTime = Date.now();
    this.records = [];
    this.isRecording = true;
    logger.info(`开始记录会话: ${this.sessionId}`);
  }

  /**
   * 停止记录Intent
   */
  public stopRecording(): ReplaySession {
    this.isRecording = false;
    const session: ReplaySession = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      records: [...this.records],
      metadata: {
        totalIntents: this.records.length,
        duration: Date.now() - this.startTime
      }
    };
    logger.info(`停止记录会话: ${this.sessionId} (共记录 ${this.records.length} 个Intent)`);
    return session;
  }

  /**
   * 注册Intent类型（用于反序列化）
   */
  public registerIntentType<T extends Intent>(intentClass: ClassType<T>): void {
    this.intentTypes.set(intentClass.name, intentClass);
  }

  /**
   * 记录Intent
   */
  public record(intent: Intent): void {
    if (!this.isRecording) return;

    const record: IntentRecord = {
      type: intent.constructor.name,
      data: this.serializeIntent(intent),
      timestamp: intent.timestamp,
      id: intent.id,
      priority: intent.priority
    };

    this.records.push(record);
    logger.debug(`记录Intent: ${record.type} (时间戳: ${record.timestamp})`);
  }

  /**
   * 回放Intent序列
   */
  public replay(ecs: ECS, session: ReplaySession): void {
    logger.info(`开始回放会话: ${session.sessionId} (共 ${session.records.length} 个Intent)`);

    // 按时间戳排序
    const sortedRecords = [...session.records].sort((a, b) => a.timestamp - b.timestamp);

    let successCount = 0;
    let errorCount = 0;

    for (const record of sortedRecords) {
      try {
        const intent = this.deserializeIntent(record);
        if (intent) {
          // 创建实体并添加Intent
          ecs.spawn().insert(intent);
          // 立即处理这个Intent
          ecs.update();
          successCount++;
          logger.debug(`回放Intent: ${record.type} (时间戳: ${record.timestamp})`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`回放Intent失败: ${record.type}`, error);
      }
    }

    logger.info(`回放完成 (成功: ${successCount}, 失败: ${errorCount})`);
  }

  /**
   * 序列化Intent数据
   */
  private serializeIntent(intent: Intent): any {
    const data: any = {};
    
    // 复制所有属性（排除entity引用和processed标志）
    for (const key in intent) {
      if (key !== 'entity' && key !== 'processed' && intent.hasOwnProperty(key)) {
        data[key] = (intent as any)[key];
      }
    }
    
    return data;
  }

  /**
   * 反序列化Intent
   */
  private deserializeIntent(record: IntentRecord): Intent | null {
    const IntentClass = this.intentTypes.get(record.type);
    if (!IntentClass) {
      logger.warn(`未找到Intent类型: ${record.type}`);
      return null;
    }

    try {
      // 创建Intent实例
      const intent = new IntentClass();

      // 恢复属性
      Object.assign(intent, record.data);

      return intent;
    } catch (error) {
      logger.error(`反序列化Intent失败: ${record.type}`, error);
      return null;
    }
  }

  /**
   * 导出会话数据为JSON
   */
  public exportSession(session: ReplaySession): string {
    return JSON.stringify(session, null, 2);
  }

  /**
   * 从JSON导入会话数据
   */
  public importSession(json: string): ReplaySession {
    return JSON.parse(json);
  }

  /**
   * 获取当前记录状态
   */
  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 获取当前会话ID
   */
  public getCurrentSessionId(): string {
    return this.sessionId;
  }

  /**
   * 获取当前记录的Intent数量
   */
  public getRecordCount(): number {
    return this.records.length;
  }
}

/**
 * 全局Intent记录器实例
 */
export const globalIntentRecorder = new IntentRecorder();