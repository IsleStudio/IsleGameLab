import { ECS } from '../../core/ecs/World';
import { Entity } from '../../core/ecs/Entity';
import { NavigateIntent } from '../intents/ui';
import { UIError } from '../components/ui';
import type { ViewType } from '../../lib/types';

/**
 * UI工具类 - Intent发射器 + UI操作
 * 提供两种API风格：
 * 1. 为System提供干净的数据处理函数
 * 2. 为外部系统提供人类友好的OOP风格API
 */
export class UIUtil {
  // ========== 外部系统友好API（包含查询和判断） ==========

  /**
   * 请求导航 - 生成NavigateIntent
   * 由System决定是否执行导航
   */
  public static requestNavigate(ecs: ECS, targetView: ViewType): void {
    const entityCommands = ecs.spawn();
    const intent = new NavigateIntent(targetView);
    entityCommands.insert(intent);
  }

  // ========== System数据处理函数（干净简单） ==========

  /**
   * 显示错误 - 为实体添加UIError组件
   * 用于在UI上显示错误信息
   */
  public static showError(entity: Entity, message: string): void {
    entity.add(new UIError(message, Date.now()));
  }

  /**
   * 清除错误 - 移除实体的UIError组件
   */
  public static clearError(entity: Entity): void {
    if (entity.has(UIError)) {
      entity.remove(UIError);
    }
  }

  /**
   * 检查视图类型是否有效
   */
  public static isValidView(view: string): view is ViewType {
    return view === 'main-menu' || view === 'login' || view === 'game';
  }
}
