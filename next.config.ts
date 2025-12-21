import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: true, // 类型安全的路由
  // 启用Turbopack（开发模式下使用 --turbo 标志）
};

export default nextConfig;
