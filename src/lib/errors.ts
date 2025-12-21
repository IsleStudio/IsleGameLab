/**
 * 错误处理模块
 * 提供统一的错误类型、错误处理和日志记录
 */

// ========== 错误类型定义 ==========

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 验证错误
  VALIDATION = 'validation',
  // 存储错误
  STORAGE = 'storage',
  // ECS错误
  ECS = 'ecs',
  // 网络错误
  NETWORK = 'network',
  // 未知错误
  UNKNOWN = 'unknown',
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  // 信息级别 - 不影响功能
  INFO = 'info',
  // 警告级别 - 可能影响功能
  WARNING = 'warning',
  // 错误级别 - 功能受损
  ERROR = 'error',
  // 致命级别 - 系统无法继续
  FATAL = 'fatal',
}

/**
 * 游戏错误基类
 */
export class GameError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameError';
    this.type = type;
    this.severity = severity;
    this.timestamp = Date.now();
    this.context = context;
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends GameError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.WARNING, { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * 存储错误类
 */
export class StorageError extends GameError {
  public readonly operation: 'read' | 'write' | 'delete' | 'check';
  public readonly key?: string;

  constructor(
    message: string,
    operation: 'read' | 'write' | 'delete' | 'check',
    key?: string,
    originalError?: Error
  ) {
    super(message, ErrorType.STORAGE, ErrorSeverity.WARNING, {
      operation,
      key,
      originalError: originalError?.message,
    });
    this.name = 'StorageError';
    this.operation = operation;
    this.key = key;
  }
}

/**
 * ECS错误类
 */
export class ECSError extends GameError {
  public readonly component?: string;
  public readonly resource?: string;
  public readonly entityId?: number;

  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context?: { component?: string; resource?: string; entityId?: number; originalError?: string }
  ) {
    super(message, ErrorType.ECS, severity, context);
    this.name = 'ECSError';
    this.component = context?.component;
    this.resource = context?.resource;
    this.entityId = context?.entityId;
  }
}


// ========== 错误日志系统 ==========

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: GameError | Error;
}

/**
 * 错误日志管理器
 * 提供统一的日志记录和错误追踪
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * 设置日志级别
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * 添加日志监听器
   */
  public addListener(listener: (entry: LogEntry) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 移除日志监听器
   */
  public removeListener(listener: (entry: LogEntry) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 记录调试信息
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 记录信息
   */
  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 记录警告
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 记录错误
   */
  public error(message: string, error?: GameError | Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * 记录游戏错误
   */
  public logGameError(error: GameError): void {
    const level = this.severityToLogLevel(error.severity);
    this.log(level, error.message, error.context, error);
  }

  /**
   * 内部日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: GameError | Error
  ): void {
    // 检查日志级别
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      error,
    };

    // 存储日志
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    this.outputToConsole(entry);

    // 通知监听器
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (e) {
        console.error('[ErrorLogger] 监听器执行失败:', e);
      }
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = this.getLogPrefix(entry.level);
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${entry.message}${contextStr}`);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${entry.message}${contextStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${entry.message}${contextStr}`);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${entry.message}${contextStr}`);
        if (entry.error) {
          console.error(entry.error);
        }
        break;
    }
  }

  /**
   * 获取日志前缀
   */
  private getLogPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '[DEBUG]';
      case LogLevel.INFO:
        return '[INFO]';
      case LogLevel.WARN:
        return '[WARN]';
      case LogLevel.ERROR:
        return '[ERROR]';
      default:
        return '[LOG]';
    }
  }

  /**
   * 将错误严重级别转换为日志级别
   */
  private severityToLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.INFO:
        return LogLevel.INFO;
      case ErrorSeverity.WARNING:
        return LogLevel.WARN;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.FATAL:
        return LogLevel.ERROR;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * 获取所有日志
   */
  public getLogs(): ReadonlyArray<LogEntry> {
    return [...this.logs];
  }

  /**
   * 获取错误日志
   */
  public getErrorLogs(): ReadonlyArray<LogEntry> {
    return this.logs.filter((log) => log.level === LogLevel.ERROR);
  }

  /**
   * 清除日志
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * 重置实例（主要用于测试）
   */
  public static reset(): void {
    if (ErrorLogger.instance) {
      ErrorLogger.instance.clearLogs();
      ErrorLogger.instance.listeners.clear();
      ErrorLogger.instance.logLevel = LogLevel.DEBUG;
    }
  }
}

// 导出便捷的日志函数
export const logger = ErrorLogger.getInstance();
