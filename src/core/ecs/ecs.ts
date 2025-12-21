// ECS框架核心 - 重新导出所有模块
// 这个文件作为统一的入口点，保持向后兼容性

export * from './Component';
export * from './Entity';
export * from './Resource';
export * from './Event';
export * from './System';
export * from './Query';
export * from './EntityCommands';
export * from './World';
export * from './HierarchyComponents';

// 为了向后兼容，重新导出Intent相关类型
export { Intent, TagComponent } from './Intent';

// 导出类型定义
export type { ClassType, ComponentClass, ResourceClass, EventClass } from './types';

// 导出函数式API
export { query, res } from './Query';