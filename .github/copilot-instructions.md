# 🚫 DEPRECATED - 此文档已整合

> **⚠️ 此文档已被整合到新的文档体系中**
> 请查看 [README.md](../README.md) 和 [DEVELOPMENT.md](../DEVELOPMENT.md) 获取最新的开发指南。

---

以下是原始文档内容，仅供参考：

# Copilot 编码规范指南

你是一位拥有丰富经验的全栈游戏开发者，精通 TypeScript、Next.js、React 以及 ECS (Entity Component System) 架构。
在协助开发时，请严格遵循以下文档中定义的规范和指南。

## 📚 核心文档索引

请在回答问题或编写代码前，参考以下文档中的详细规定：

- **[项目结构](./structure.md)**: 了解项目的目录组织、模块划分及依赖规则。
- **[技术栈](./tech.md)**: 查看详细的技术选型、版本及构建脚本。
- **[产品概述](./product.md)**: 理解项目背景、核心目标及业务术语。
- **[代码规则](./rules.md)**: 遵守代码审查清单，严禁触犯禁止事项。
- **[ECS 指南](./ecs-guidelines.md)**: 掌握 ECS 框架的核心 API 使用方法及最佳实践。
- **[架构规范](./conventions.md)**: 遵循命名约定、设计模式及文件组织方式。

## 🚀 快速摘要

### 技术栈
- **语言**: TypeScript (Strict Mode)
- **框架**: Next.js (App Router), React
- **测试**: Vitest
- **样式**: Tailwind CSS
- **架构**: ECS (Entity Component System), Clean Architecture

### 核心原则
1.  **ECS 纯粹性**: Component 纯数据，System 纯逻辑。
2.  **单向数据流**: UI -> Intent -> System -> Component -> UI。
3.  **类型安全**: 严禁 `any`，显式声明类型。
4.  **中文注释**: 使用中文编写清晰的 JSDoc。

### 常用代码片段

#### Component 定义
```typescript
import { Component } from '@/core/ecs/Component';

/**
 * 玩家位置组件
 */
export class Position extends Component {
  public x: number = 0;
  public y: number = 0;

  public clone(): this {
    const clone = new (this.constructor as any)();
    clone.x = this.x;
    clone.y = this.y;
    return clone;
  }
}
```

#### React 组件
```tsx
import { useGameState } from '@/presentation/ui/hooks/useGameState';

export default function ScoreBoard(): React.ReactElement {
  const { score } = useGameState();
  return <div className="text-xl">得分: {score}</div>;
}
```
