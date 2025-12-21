import type { ECS } from '../ecs/World';
import { UserSession } from '../../gameplay/resources/UserSession';
import type { StoredUserSession } from '../../lib/types';

/**
 * ECS状态快照接口
 */
export interface ECSSnapshot {
  version: string;
  timestamp: number;
  entities: Array<{
    id: number;
    components: Array<{
      type: string;
      data: any;
    }>;
  }>;
  resources: Array<{
    type: string;
    data: any;
  }>;
}

/**
 * 简化的序列化器 - 仅用于MVP阶段
 * 当前仅支持UserSession的序列化/反序列化
 * 
 * 未来扩展：
 * - 完整的游戏状态序列化（自定义存储策略）
 * - Intent记录和Replay功能
 * - 版本迁移和数据校验
 * - 网络同步支持
 */
export class Serializer {
  private static readonly VERSION = '1.0.0';

  /**
   * 序列化用户会话（MVP功能）
   * 将ECS中的UserSession Resource转换为可存储的数据
   */
  public static serializeUserSession(ecs: ECS): StoredUserSession | null {
    const userSession = ecs.getResource(UserSession);
    if (!userSession) {
      return null;
    }

    return {
      username: userSession.username,
      isLoggedIn: userSession.isLoggedIn,
      loginTimestamp: userSession.loginTimestamp,
    };
  }

  /**
   * 反序列化用户会话
   * 将存储的数据恢复到ECS的UserSession Resource中
   */
  public static deserializeUserSession(ecs: ECS, data: StoredUserSession): void {
    if (!data) {
      return;
    }

    let session = ecs.getResource(UserSession);
    if (!session) {
      session = new UserSession();
      ecs.insertResource(session);
    }

    // 恢复会话数据
    session.username = data.username;
    session.isLoggedIn = data.isLoggedIn;
    session.loginTimestamp = data.loginTimestamp;
  }

  /**
   * 验证序列化数据的完整性
   */
  public static validateUserSessionData(data: any): data is StoredUserSession {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    return (
      (data.username === null || typeof data.username === 'string') &&
      typeof data.isLoggedIn === 'boolean' &&
      typeof data.loginTimestamp === 'number'
    );
  }

  /**
   * 序列化完整的ECS状态（用于测试和调试）
   * 注意：这是一个简化的实现，仅用于测试目的
   */
  public static serializeECSState(ecs: ECS, componentTypes: any[] = [], resourceTypes: any[] = []): ECSSnapshot {
    const snapshot: ECSSnapshot = {
      version: this.VERSION,
      timestamp: Date.now(),
      entities: [],
      resources: []
    };

    // 序列化指定类型的组件
    const entityComponentMap = new Map<number, Array<{ type: string; data: any }>>();
    
    for (const ComponentType of componentTypes) {
      const components = Array.from(ecs.query(ComponentType));
      for (const component of components) {
        const entityId = component.entity.id;
        if (!entityComponentMap.has(entityId)) {
          entityComponentMap.set(entityId, []);
        }
        
        entityComponentMap.get(entityId)!.push({
          type: ComponentType.name,
          data: this.serializeComponent(component)
        });
      }
    }

    // 转换为数组格式
    for (const [entityId, components] of entityComponentMap) {
      snapshot.entities.push({
        id: entityId,
        components: components
      });
    }

    // 序列化指定类型的资源
    for (const ResourceType of resourceTypes) {
      const resource = ecs.getResource(ResourceType);
      if (resource) {
        snapshot.resources.push({
          type: ResourceType.name,
          data: this.serializeResource(resource)
        });
      }
    }

    return snapshot;
  }

  /**
   * 从快照恢复ECS状态（用于测试和调试）
   */
  public static deserializeECSState(
    ecs: ECS, 
    snapshot: ECSSnapshot, 
    componentTypes: Map<string, any> = new Map(),
    resourceTypes: Map<string, any> = new Map()
  ): void {
    // 恢复资源
    for (const resourceData of snapshot.resources) {
      const ResourceType = resourceTypes.get(resourceData.type);
      if (ResourceType) {
        const resource = this.deserializeResource(ResourceType, resourceData.data);
        ecs.insertResource(resource);
      }
    }

    // 恢复实体和组件
    for (const entityData of snapshot.entities) {
      const entity = ecs.spawn().done();
      
      for (const componentData of entityData.components) {
        const ComponentType = componentTypes.get(componentData.type);
        if (ComponentType) {
          const component = this.deserializeComponent(ComponentType, componentData.data);
          entity.add(component);
        }
      }
    }
  }

  /**
   * 序列化组件（简化实现）
   */
  private static serializeComponent(component: any): any {
    const data: any = {};
    
    // 复制所有可枚举属性（排除entity引用）
    for (const key in component) {
      if (key !== 'entity' && component.hasOwnProperty(key)) {
        data[key] = (component as any)[key];
      }
    }
    
    return data;
  }

  /**
   * 反序列化组件（简化实现）
   */
  private static deserializeComponent(ComponentType: any, data: any): any {
    const component = new ComponentType();
    
    // 恢复属性
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        (component as any)[key] = data[key];
      }
    }
    
    return component;
  }

  /**
   * 序列化资源（简化实现）
   */
  private static serializeResource(resource: any): any {
    const data: any = {};
    
    // 复制所有可枚举属性
    for (const key in resource) {
      if (resource.hasOwnProperty(key)) {
        data[key] = (resource as any)[key];
      }
    }
    
    return data;
  }

  /**
   * 反序列化资源（简化实现）
   */
  private static deserializeResource(ResourceType: any, data: any): any {
    const resource = new ResourceType();
    
    // 恢复属性
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        (resource as any)[key] = data[key];
      }
    }
    
    return resource;
  }

  /**
   * 获取序列化版本号
   */
  public static getVersion(): string {
    return this.VERSION;
  }
}