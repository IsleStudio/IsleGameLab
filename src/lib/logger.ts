/**
 * 专业的日志管理系统
 *
 * 功能:
 * 1. 支持多级别日志 (DEBUG, INFO, WARN, ERROR)
 * 2. 环境感知 (开发环境显示所有，生产环境只显示警告和错误)
 * 3. 模块化标签，便于过滤和定位
 * 4. 可配置的全局日志级别
 */

/** 日志级别枚举 */
export enum LogLevel {
  DEBUG = 0,  // 调试信息，最详细
  INFO = 1,   // 一般信息
  WARN = 2,   // 警告信息
  ERROR = 3,  // 错误信息
  NONE = 4,   // 关闭所有日志
}

/** 日志级别名称映射 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.NONE]: 'NONE',
};

/** 日志级别颜色 (用于浏览器控制台) */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'color: #888',      // 灰色
  [LogLevel.INFO]: 'color: #0ea5e9',    // 蓝色
  [LogLevel.WARN]: 'color: #f59e0b',    // 橙色
  [LogLevel.ERROR]: 'color: #ef4444',   // 红色
  [LogLevel.NONE]: '',
};

/** 日志配置接口 */
interface LoggerConfig {
  /** 最小日志级别，低于此级别的日志不会输出 */
  minLevel: LogLevel;
  /** 是否启用时间戳 */
  enableTimestamp: boolean;
  /** 是否启用颜色 */
  enableColor: boolean;
  /** 模块白名单，如果设置则只输出这些模块的日志 */
  moduleWhitelist?: string[];
  /** 模块黑名单，这些模块的日志不会输出 */
  moduleBlacklist?: string[];
}

/** 全局日志配置 */
class LoggerManager {
  private config: LoggerConfig;

  constructor() {
    // 根据环境自动配置
    const isDevelopment = process.env.NODE_ENV !== 'production';

    this.config = {
      minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
      enableTimestamp: isDevelopment,
      enableColor: isDevelopment,
      moduleWhitelist: undefined,
      moduleBlacklist: undefined,
    };
  }

  /** 更新配置 */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** 获取配置 */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /** 检查是否应该输出日志 */
  public shouldLog(level: LogLevel, module: string): boolean {
    // 检查日志级别
    if (level < this.config.minLevel) {
      return false;
    }

    // 检查模块白名单
    if (this.config.moduleWhitelist && this.config.moduleWhitelist.length > 0) {
      return this.config.moduleWhitelist.includes(module);
    }

    // 检查模块黑名单
    if (this.config.moduleBlacklist && this.config.moduleBlacklist.length > 0) {
      return !this.config.moduleBlacklist.includes(module);
    }

    return true;
  }
}

/** 全局日志管理器实例 */
const loggerManager = new LoggerManager();

/**
 * Logger 类 - 模块化日志记录器
 *
 * 使用示例:
 * ```typescript
 * const logger = new Logger('MyModule');
 * logger.debug('这是调试信息');
 * logger.info('这是一般信息');
 * logger.warn('这是警告信息');
 * logger.error('这是错误信息', error);
 * ```
 */
export class Logger {
  constructor(private module: string) {}

  /** DEBUG 级别日志 */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /** INFO 级别日志 */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /** WARN 级别日志 */
  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /** ERROR 级别日志 */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /** 内部日志方法 */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // 检查是否应该输出
    if (!loggerManager.shouldLog(level, this.module)) {
      return;
    }

    const config = loggerManager.getConfig();
    const levelName = LOG_LEVEL_NAMES[level];

    // 构建日志前缀
    let prefix = '';

    if (config.enableTimestamp) {
      const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
      prefix += `[${timestamp}]`;
    }

    prefix += `[${levelName}]`;
    prefix += `[${this.module}]`;

    // 输出日志
    if (config.enableColor && typeof window !== 'undefined') {
      // 浏览器环境，使用彩色输出
      const color = LOG_LEVEL_COLORS[level];
      console.log(`%c${prefix}%c ${message}`, color, 'color: inherit', ...args);
    } else {
      // Node.js 环境或不支持颜色
      console.log(prefix, message, ...args);
    }

    // ERROR 级别使用 console.error 以获得更好的堆栈追踪
    if (level === LogLevel.ERROR && args.length > 0) {
      args.forEach((arg) => {
        if (arg instanceof Error) {
          console.error(arg);
        }
      });
    }
  }
}

/**
 * 全局日志配置函数
 *
 * 使用示例:
 * ```typescript
 * // 设置最小日志级别为 INFO
 * configureLogger({ minLevel: LogLevel.INFO });
 *
 * // 只显示特定模块的日志
 * configureLogger({ moduleWhitelist: ['ECS', 'Renderer'] });
 *
 * // 屏蔽特定模块的日志
 * configureLogger({ moduleBlacklist: ['SubscriptionManager'] });
 * ```
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  loggerManager.configure(config);
}

/**
 * 创建模块化日志记录器的便捷函数
 *
 * 使用示例:
 * ```typescript
 * const logger = createLogger('MyModule');
 * logger.info('Hello World');
 * ```
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}

/** 导出日志级别，供外部使用 */
export { LogLevel as Level };
