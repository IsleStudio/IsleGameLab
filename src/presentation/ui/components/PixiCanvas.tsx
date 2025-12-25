'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useECS } from '../bindings/ECSProvider';
import { PixiResource } from '../../resources/PixiResource';
import { SnakeGameResource } from '../../../gameplay/resources/SnakeGameResource';
import { PixiWebRenderer } from '../../adapters/web/PixiWebRenderer';
import { logger } from '../../../lib/errors';

/**
 * PixiCanvas - Pixi.js 渲染画布组件
 * 替代原有的 Canvas 2D 渲染
 */
export function PixiCanvas(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiWebRenderer | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false);
  const ecs = useECS();

  // 初始化 Pixi 渲染器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 防止重复初始化
    if (isInitializingRef.current || rendererRef.current) {
      logger.debug('[PixiCanvas] 已初始化或正在初始化，跳过');
      return;
    }

    isInitializingRef.current = true;
    logger.debug('[PixiCanvas] 开始初始化渲染器');

    // 创建渲染器实例
    const renderer = new PixiWebRenderer();
    rendererRef.current = renderer;

    // 画布尺寸
    const width = 660;
    const height = 440;

    // 用于标记组件是否已卸载
    let isMounted = true;

    // 初始化渲染器
    renderer
      .initialize(container, width, height)
      .then(() => {
        // 检查组件是否已卸载
        if (!isMounted) {
          logger.debug('[PixiCanvas] 组件已卸载，清理渲染器');
          renderer.destroy();
          return;
        }

        logger.info('[PixiCanvas] 渲染器初始化成功', { width, height });

        // 设置到 ECS Resource
        const pixiRes = ecs.getResource(PixiResource);
        if (pixiRes) {
          pixiRes.setRenderer(renderer);
          pixiRes.gameContainer = renderer.createGameContainer();
          logger.debug('[PixiCanvas] PixiResource 已设置');
        }

        isInitializingRef.current = false;
      })
      .catch((error) => {
        logger.error('[PixiCanvas] 渲染器初始化失败', error instanceof Error ? error : undefined, {
          error: error instanceof Error ? error.message : String(error),
        });
        isInitializingRef.current = false;
        rendererRef.current = null;
      });

    return () => {
      logger.debug('[PixiCanvas] 清理函数被调用');
      isMounted = false;

      // 清理渲染器
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (rendererRef.current) {
        logger.debug('[PixiCanvas] 准备销毁渲染器');
        rendererRef.current.destroy();
        rendererRef.current = null;
      }

      isInitializingRef.current = false;
      logger.debug('[PixiCanvas] 清理完成');
    };
  }, [ecs]);

  // 更新网格配置
  const updateGridConfig = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const snakeGameRes = ecs.getResource(SnakeGameResource);
    if (!snakeGameRes) return;

    const pixiRes = ecs.getResource(PixiResource);
    if (!pixiRes) return;

    // 更新网格配置
    pixiRes.updateGridSize(
      660,
      440,
      snakeGameRes.config.gridWidth,
      snakeGameRes.config.gridHeight
    );

    logger.debug('[PixiCanvas] 网格配置已更新', {
      gridWidth: snakeGameRes.config.gridWidth,
      gridHeight: snakeGameRes.config.gridHeight,
    });
  }, [ecs]);

  useEffect(() => {
    updateGridConfig();
  }, [updateGridConfig]);

  return (
    <div className="flex items-center justify-center bg-gray-900 rounded-lg p-4">
      <div ref={containerRef} className="w-full h-full" style={{ width: '660px', height: '440px' }} />
    </div>
  );
}
