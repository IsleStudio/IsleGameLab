import type { ComponentClass, ClassType } from './types';

/**
 * 组件 (Component) 是状态数据的集合。每个组件实例都与一个实体 (Entity) 关联。
 * 支持定义静态生命周期钩子 (Bevy Hooks)。
 */
export abstract class Component {
  public entity!: any; // 使用any避免循环依赖

  /**
   * 克隆组件。
   * 创建一个新实例并复制属性。
   * 默认实现使用浅拷贝，对于包含引用类型的组件需要重写此方法。
   */
  public clone(): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone = new (this.constructor as any)();
    Object.assign(clone, this);
    return clone;
  }

  /**
   * 比较两个组件是否相等。
   * 默认实现比较所有自有属性（排除entity引用）。
   * 对于包含复杂类型的组件可能需要重写此方法。
   */
  public equals(other: this): boolean {
    if (!other || this.constructor !== other.constructor) return false;
    
    const keys = Object.keys(this).filter(k => k !== 'entity');
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = (this as any)[key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = (other as any)[key];
      
      // 处理 Map 类型
      if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) return false;
        for (const [k, v] of a) {
          if (b.get(k) !== v) return false;
        }
        continue;
      }
      
      // 处理普通对象（浅比较）
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const k of aKeys) {
          if (a[k] !== b[k]) return false;
        }
        continue;
      }
      
      if (a !== b) return false;
    }
    return true;
  }

  /**
   * 检查是否拥有兄弟组件。
   */
  public hasSibling(componentClass: ComponentClass): boolean {
    return this.entity.has(componentClass);
  }

  /**
   * 获取兄弟组件。
   */
  public getSibling<T extends Component>(componentClass: ClassType<T>): T | undefined {
    return this.entity.get(componentClass);
  }

  /**
   * 检查所属实体是否已被销毁。
   * 语法糖: `Comp.Entity.isDestroyed`
   */
  public isDestroyed(): boolean {
    return this.entity.isDestroyed();
  }

  /**
   * (可选) 当组件被添加到实体时调用。
   * 对应 Bevy 的 Component Hooks (OnAdd)。
   */
  static onAdd?(entity: any): void;

  /**
   * (可选) 当组件从实体移除前调用。
   * 对应 Bevy 的 Component Hooks (OnRemove)。
   */
  static onRemove?(entity: any): void;
}