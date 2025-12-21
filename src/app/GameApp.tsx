'use client';

import React, { useEffect, useState } from 'react';
import { GameWorld } from '../server/GameWorld';
import { TickSystem } from '../server/TickSystem';
import { ECSProvider, useECSUpdate } from '../presentation/ui/bindings';
import { MainMenu, LoginForm } from '../presentation/ui/components';
import type { ECS } from '../core/ecs';

// 全局单例，避免在React渲染周期中创建
let globalGameWorld: GameWorld | null = null;
let globalTickSystem: TickSystem | null = null;
let globalEcs: ECS | null = null;
let globalNotifyFunction: (() => void) | null = null;

/**
 * 初始化游戏系统（仅执行一次）
 */
function initializeGameSystems(): ECS {
  if (!globalGameWorld) {
    globalGameWorld = new GameWorld();
  }
  if (!globalTickSystem) {
    globalTickSystem = new TickSystem(globalGameWorld, {
      targetFPS: 60,
      enableFixedUpdate: false,
    });
  }
  if (!globalEcs) {
    globalEcs = globalGameWorld.getECS();
  }
  
  // 确保GameWorld已初始化
  if (!globalGameWorld.isReady()) {
    globalGameWorld.initialize();
  }
  
  return globalEcs;
}

/**
 * GameApp - 游戏应用主组件
 * 负责初始化GameWorld和TickSystem，提供ECS上下文
 */
export function GameApp(): React.ReactElement {
  // 同步初始化ECS（在渲染前完成）
  const [ecs] = useState<ECS>(() => initializeGameSystems());
  
  return (
    <ECSProvider ecs={ecs}>
      <GameAppInner />
    </ECSProvider>
  );
}

/**
 * GameAppInner - 内部组件，可以使用ECS hooks
 */
function GameAppInner(): React.ReactElement {
  const notifyECSUpdate = useECSUpdate();
  
  // 用于触发重新渲染的状态
  const [, forceUpdate] = useState(0);

  // 启动游戏循环和UI更新
  useEffect(() => {
    console.log('[GameApp] useEffect启动，获取notify函数');
    
    // 保存notify函数到全局变量
    globalNotifyFunction = notifyECSUpdate;
    console.log('[GameApp] notify函数已保存到全局变量');
    
    // 启动游戏循环
    if (globalTickSystem && !globalTickSystem.isActive()) {
      console.log('[GameApp] 启动TickSystem');
      globalTickSystem.start();
    }

    // 设置定时器触发UI更新（60fps）
    let frameCount = 0;
    const updateInterval = setInterval(() => {
      frameCount++;
      
      // 每60帧（约1秒）打印一次日志
      if (frameCount % 60 === 0) {
        console.log(`[GameApp] 更新循环运行中，帧数: ${frameCount}`);
      }
      
      // 调用notify来通知React组件ECS状态可能已变化
      if (globalNotifyFunction) {
        globalNotifyFunction();
      }
      forceUpdate((n) => n + 1);
    }, 16);

    console.log('[GameApp] 更新循环已启动');

    // 清理函数
    return () => {
      console.log('[GameApp] 清理资源');
      clearInterval(updateInterval);
      globalNotifyFunction = null;
      if (globalTickSystem) {
        globalTickSystem.stop();
      }
    };
  }, [notifyECSUpdate]);

  return (
    <div className="game-container">
      <MainMenu />
      <LoginForm />
    </div>
  );
}
