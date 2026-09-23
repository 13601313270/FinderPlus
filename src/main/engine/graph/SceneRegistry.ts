import { Scene } from './Scene'

/**
 * 工作区级 Scene 单例：整个（渲染）进程共享同一个画布实例。
 *
 * 引擎是纯逻辑、不碰 electron，所以渲染进程可以直接持有它——
 * 节点编排方（App 里建图）把实例 add 进来，render.vue 依 id 从这里 getNode 拿引用。
 * 两条路握紧的是同一个实例，改值立刻互相可见。
 */
export const workspaceScene = new Scene()