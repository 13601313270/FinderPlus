/**
 * Value 渲染器注册表：编译期类型门 + 运行时插件扩展。
 *
 * 双层契约：
 *   Layer 1（编译期）：builtinRenderers satisfies BuiltinRendererMap
 *       每个 BUILTIN_VALUE_KINDS 里的 kind 必须显式注册一个 renderer，
 *       否则 TS 会在这一行直接报错，报出"缺哪个 kind"。
 *
 *   Layer 2（运行时）：registry 是 Map<string, Component>
 *       三方插件通过 registerValueRenderer('custom-kind', comp) 注册，
 *       未注册时优雅回退到 UnknownValueRenderer。
 *
 * 为什么不在 Value 类上挂 render：
 *   Value 在 main/engine/ 下，会被 main 进程打包。
 *   挂 render 会把 Vue 依赖耦合进 main 进程，破坏 Electron 分层。
 *   所以 renderer 只能在 renderer 进程维护，Value 保持纯数据传输子职责。
 */
import type { Component } from 'vue'
import {
  BUILTIN_VALUE_KINDS,
  type ValueKind
} from '../../../../main/engine/data/Value'

// 派生 literal union：'bool' | 'number' | 'string' | 'json' | 'file' | 'txt-file' | 'img-file' | 'pdf-file'
type BuiltinKind = (typeof BUILTIN_VALUE_KINDS)[number]

// ── 兜底 renderer 先导入（Unknown 是运行时 fallback，Null 是 isNull=true fallback） ──
import NullValueRenderer from './NullValueRenderer.vue'
import UnknownValueRenderer from './UnknownValueRenderer.vue'

// ── 7 个内置 kind renderer ──
import BoolValueRenderer from './BoolValueRenderer.vue'
import NumberValueRenderer from './NumberValueRenderer.vue'
import StringValueRenderer from './StringValueRenderer.vue'
import JsonValueRenderer from './JsonValueRenderer.vue'
import FileValueRenderer from './FileValueRenderer.vue'
import TxtFileValueRenderer from './TxtFileValueRenderer.vue'
import ImgFileValueRenderer from './ImgFileValueRenderer.vue'
import PdfFileValueRenderer from './PdfFileValueRenderer.vue'

/**
 * 编译期类型门：强制每个内置 kind 都有 renderer。
 * 任何一个 kind 缺失都会在这里报错。
 */
export type BuiltinRendererMap = Record<BuiltinKind, Component>

const builtinRenderers = {
  'bool':     BoolValueRenderer,
  'number':   NumberValueRenderer,
  'string':   StringValueRenderer,
  'json':     JsonValueRenderer,
  'file':     FileValueRenderer,
  'txt-file': TxtFileValueRenderer,
  'img-file': ImgFileValueRenderer,
  'pdf-file': PdfFileValueRenderer
} satisfies BuiltinRendererMap

// ── 运行时注册表：从 builtinRenderers 批量初始化，支持插件扩展 ──
const registry = new Map<string, Component>()
for (const [k, comp] of Object.entries(builtinRenderers)) {
  registry.set(k, comp)
}

/**
 * 根据 VALUE_NAME 查找对应 renderer 组件。
 * - 已知内置 kind → 返回注册的组件
 * - 插件自定义 kind → 返回 registerValueRenderer() 注册的组件
 * - 完全未知 → 返回 UnknownValueRenderer（运行时兜底，展示 displayLabel + kind 标签）
 */
export function resolveRenderer(kind: string): Component {
  return registry.get(kind) ?? UnknownValueRenderer
}

/**
 * 三方插件运行时注册自定义 ValueKind 的 renderer。
 * ValueKind 是开放字符串，插件不需要回头改 BUILTIN_VALUE_KINDS。
 */
export function registerValueRenderer(kind: ValueKind, comp: Component): void {
  registry.set(kind, comp)
}

export { NullValueRenderer, UnknownValueRenderer }
