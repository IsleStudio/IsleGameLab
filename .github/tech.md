# 技术栈与构建系统 (Tech Stack & Build System)

本文档详细说明了项目的技术选型、版本信息及构建工具链。

## 核心框架 (Core Frameworks)

-   **Runtime**: [Node.js](https://nodejs.org/) (LTS recommended)
-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **UI Library**: [React 19](https://react.dev/)
-   **Language**: [TypeScript 5](https://www.typescriptlang.org/)

## 游戏与图形 (Game & Graphics)

-   **Rendering**: [Pixi.js 8](https://pixijs.com/) - 用于高性能 2D 渲染（如需）。
-   **Architecture**: Custom ECS (Entity Component System) - 自研核心引擎。

## 样式与 UI (Styling & UI)

-   **CSS Framework**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Processor**: PostCSS

## 测试工具链 (Testing Toolchain)

-   **Test Runner**: [Vitest](https://vitest.dev/) - 极速单元测试框架。
-   **Environment**: JSDOM - 模拟浏览器环境。
-   **Utilities**:
    -   `@testing-library/react`: React 组件测试。
    -   `fast-check`: 基于属性的测试 (Property-based testing)。

## 代码质量与规范 (Code Quality)

-   **Linter**: [ESLint 9](https://eslint.org/)
    -   Config: `eslint-config-next`
-   **Formatter**: [Prettier 3](https://prettier.io/)

## 构建脚本 (Build Scripts)

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (Next.js) |
| `npm run build` | 构建生产版本 |
| `npm run start` | 运行生产版本 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run format` | 运行 Prettier 格式化 |
| `npm test` | 运行 Vitest 单元测试 |
| `npm run type-check` | 运行 TypeScript 类型检查 |

## 配置文件说明

-   `next.config.ts`: Next.js 配置文件。
-   `tsconfig.json`: TypeScript 编译选项。
-   `vitest.config.ts`: 测试环境配置，包含路径别名映射。
-   `eslint.config.mjs`: ESLint 扁平化配置。
-   `postcss.config.mjs`: Tailwind CSS 插件配置。
