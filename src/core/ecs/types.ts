// ECS类型定义
// 类型构造器
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClassType<T> = new (...args: any[]) => T;

// 前向声明基础类
export abstract class Component {
  public entity!: any; // 避免循环依赖，使用any
}

export abstract class Resource {}

export abstract class Event {}

// 组件、资源、事件类型
export type ComponentClass = ClassType<Component>;
export type ResourceClass = ClassType<Resource>;
export type EventClass = ClassType<Event>;
