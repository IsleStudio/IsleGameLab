# 代码审查与规则 (Rules & Checklist)

## 🚫 禁止事项 (Prohibitions)

1.  **禁止在 Component 中包含业务逻辑**
    *   ❌ 错误: `class Health { takeDamage(amount) { this.value -= amount; } }`
    *   ✅ 正确: 使用 System 或 Util 类处理逻辑。
2.  **禁止直接修改 Component 状态**
    *   ❌ 错误: `health.current -= 10;`
    *   ✅ 正确: `HealthUtil.takeDamage(health, 10);`
3.  **禁止使用 `any`**
    *   除非用于解决极其复杂的类型映射或循环依赖，且必须添加 `// eslint-disable-next-line` 和解释注释。
4.  **禁止在 System 之外持有 Entity 引用过久**
    *   Entity 可能会被销毁，长期持有引用会导致内存泄漏或逻辑错误。
5.  **禁止在 UI 组件中直接操作 ECS 数据**
    *   必须通过 `Intent` 系统或封装好的 Hooks 进行交互。

## ✅ 代码审查清单 (Checklist)

### ECS 规范
- [ ] Component 是否只包含数据字段？
- [ ] Component 是否实现了 `clone()` 和 `equals()` 方法？
- [ ] System 是否只关注逻辑处理？
- [ ] 是否使用了 `query()` 进行实体筛选？

### React / UI 规范
- [ ] 是否使用了 `useECSQuery` 或 `useGameState` 获取数据？
- [ ] 是否避免了在渲染循环中创建新的对象或函数（使用 `useMemo`, `useCallback`）？
- [ ] 组件命名是否符合 PascalCase？

### TypeScript 规范
- [ ] 是否显式声明了函数返回值类型？
- [ ] 是否处理了所有可能的 `null` 或 `undefined` 情况？
- [ ] 接口定义是否使用了 `interface`？

### 测试规范
- [ ] 核心逻辑是否有对应的单元测试？
- [ ] 测试描述是否清晰表达了业务意图？
