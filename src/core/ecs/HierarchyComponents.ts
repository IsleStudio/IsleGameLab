import { Component } from './Component';

// 使用any来避免循环依赖，在运行时这些都是Entity实例
export type EntityLike = any;

/**
 * 父节点组件。
 * 拥有此组件的实体是另一个实体的子节点。
 * 对应 Bevy 的 `Parent`。
 */
export class Parent extends Component {
  constructor(public value: EntityLike) {
    super();
  }

  static onAdd(entity: EntityLike): void {
    const parentComp = entity.get(Parent);
    if (!parentComp) return;

    const parentEntity = parentComp.value;
    let childrenComp = parentEntity.get(Children);
    if (!childrenComp) {
      childrenComp = new Children();
      parentEntity.add(childrenComp);
    }
    if (!childrenComp.value.includes(entity)) {
      childrenComp.value.push(entity);
    }
  }

  static onRemove(entity: EntityLike): void {
    const parentComp = entity.get(Parent);
    if (!parentComp) return;

    const parentEntity = parentComp.value;
    if (parentEntity.isDestroyed()) return;

    const childrenComp = parentEntity.get(Children);
    if (childrenComp) {
      const index = childrenComp.value.indexOf(entity);
      if (index !== -1) {
        childrenComp.value.splice(index, 1);
      }
    }
  }
}

/**
 * 子节点列表组件。
 * 自动维护，不要手动修改。
 * 对应 Bevy 的 `Children`。
 */
export class Children extends Component {
  public value: EntityLike[] = [];
}