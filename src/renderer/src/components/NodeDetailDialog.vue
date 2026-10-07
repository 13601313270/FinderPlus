<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest'
import { getNodeManifest } from '../../../main/nodePlugin'
import { useLanguageSettings } from '@renderer/composables/useLanguageSettings'
import JsonTreeNode from './JsonTreeNode.vue'
import type { Value } from '../../../main/engine/data/Value'

/**
 * 节点详情弹窗：左 INPUT / 中 detailPanel / 右 OUTPUT 三栏布局。
 *
 * - 左/右栏是系统通用部分，统一展示端口名、类型、当前值
 * - 中间栏由节点自己的 detailPanel 组件填充（从 manifest.detailPanel 异步加载）
 * - 弹窗壳只负责布局和状态订阅，不耦合任何具体节点逻辑
 *
 * 关闭方式：Esc / 点遮罩 / 点右上角 ×
 *
 * 响应式：Node 是普通 JS 对象，Vue 追踪不到它的属性变化。
 * 所以用 nodeTick ref 手动触发 computed 重算——跟 App.vue 的 sceneTick 同模式。
 * onMounted 时订阅 node.onChanged → tick++，computed 里读一下 nodeTick.value 完成依赖登记。
 */
const { visible, loading, currentNodeId, currentComp, closeNodeDetail } = useNodeDetail()
const { language } = useLanguageSettings()

// —— 响应式桥 ——
const nodeTick = ref(0)
let offNodeChanged: (() => void) | undefined

/** 切换到某个节点时：先退订旧的，再订阅新的 */
function subscribeToNode(nodeId: string): void {
  offNodeChanged?.()
  offNodeChanged = undefined
  const node = workspaceScene.getNode(nodeId)
  if (node) {
    nodeTick.value++
    offNodeChanged = node.onChanged(() => {
      nodeTick.value++
    })
  }
}

function unsubscribeNode(): void {
  offNodeChanged?.()
  offNodeChanged = undefined
}

// 弹窗打开/切换节点时订阅；关闭时退订
watch(visible, (v) => {
  if (v && currentNodeId.value) {
    subscribeToNode(currentNodeId.value)
  } else if (!v) {
    unsubscribeNode()
  }
})
watch(currentNodeId, (id) => {
  if (visible.value && id) {
    subscribeToNode(id)
  }
})

const node = computed(() => {
  nodeTick.value // 依赖登记
  if (!currentNodeId.value) return undefined
  return workspaceScene.getNode(currentNodeId.value)
})

// 节点被删除时自动关闭弹窗
watch(() => node.value, (n) => {
  if (visible.value && !n) closeNodeDetail()
})

const title = computed(() => {
  const n = node.value
  if (!n) return ''
  const manifest = getNodeManifest(n.type)
  if (!manifest) return n.type
  return resolveNodeTitle(manifest, language.value)
})

/**
 * 解析端口多语言标签到当前 UI 语言。
 * 兜底顺序：目标语言 → 英语 → 中文 → 表里第一个配了的语言 → 端口 id
 * （跟 resolveNodeTitle 的兜底逻辑一致）
 */
function resolvePortLabel(label: { [k: string]: string } | undefined, fallback: string): string {
  if (!label) return fallback
  const l = language.value
  if (label[l]) return label[l]
  if (label.en) return label.en
  if (label.zh) return label.zh
  const firstKey = Object.keys(label)[0]
  if (firstKey) return label[firstKey]
  return fallback
}

// —— 端口列表（系统部分）——
const inputPorts = computed(() => {
  nodeTick.value // 依赖登记：端口增删/值变化都来自 node.notifyChanged → tick++
  return node.value?.inputPorts ?? []
})
const outputPorts = computed(() => {
  nodeTick.value // 同上
  return node.value?.outputPorts ?? []
})

/** InputPort 的展示数据（带解析好的 label + 值快照） */
const inputPortDisplays = computed(() => {
  nodeTick.value // 直接依赖 tick——跳过中间 inputPorts computed 的引用比较优化
  return inputPorts.value.map((p) => ({
    id: p.id,
    name: resolvePortLabel(p.label, p.id),
    typeNames: p.acceptValueNames.join('/'),
    values: portInputValues(p)
  }))
})

/** OutputPort 的展示数据 */
const outputPortDisplays = computed(() => {
  nodeTick.value // 同上——OutputPort.currentValue 改了但 outputPorts 数组引用不变
  return outputPorts.value.map((p) => ({
    id: p.id,
    name: resolvePortLabel(p.label, p.id),
    typeName: p.outputValueName,
    value: portOutputValue(p)
  }))
})

/**
 * 把 Value 实例转成可 JSON 展示的 plain value。
 * JsonTreeNode 只吃 JS 原始类型（object / array / string / number / boolean / null），
 * 所以这里做一次提取。isNull 的值统一映射成 null（不是字符串）。
 */
function valueToPlain(v: Value): unknown {
  if (v.isNull) return null

  // 从实例的 constructor 上取 VALUE_NAME（静态属性）。
  // constructor 类型是 Function，先转 unknown 再读属性。
  const ctor = v.constructor as unknown as { VALUE_NAME: string }
  const kind = ctor.VALUE_NAME

  // FileValue / ImgFileValue / TxtFileValue：展示摘要
  if (kind.includes('file')) {
    const f = (v as { file?: File | undefined }).file
    if (f) {
      return {
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
        type: f.type || '(unknown)'
      }
    }
  }
  // 通用：直接取 value 字段（StringValue/NumberValue/BoolValue/JsonValue 都有）
  const maybeValue = (v as { value?: unknown }).value
  return maybeValue
}

/** 从 Value 实例读静态 VALUE_NAME 的类型安全封装 */
function valueKind(v: Value): string {
  return (v.constructor as unknown as { VALUE_NAME: string }).VALUE_NAME
}

/** 多值端口：可能有多条连线连入，每条有各自的值 */
function portInputValues(port: { value: readonly Value[]; incomingEdgeCount: number }): { label: string; plain: unknown; isNull: boolean }[] {
  if (port.incomingEdgeCount === 0) return []
  return port.value.map((v) => ({
    label: valueKind(v),
    plain: valueToPlain(v),
    isNull: v.isNull
  }))
}

/** OutputPort 的当前值 */
function portOutputValue(port: { value?: Value }): { label: string; plain: unknown; isNull: boolean } | null {
  if (!port.value) return null
  return {
    label: valueKind(port.value),
    plain: valueToPlain(port.value),
    isNull: port.value.isNull
  }
}

// —— 关闭逻辑 ——
function onMaskClick(): void {
  closeNodeDetail()
}
function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}
function onKeyDown(e: KeyboardEvent): void {
  if (visible.value && e.key === 'Escape') closeNodeDetail()
}
onMounted(() => { document.addEventListener('keydown', onKeyDown) })
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  unsubscribeNode()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="detail-mask" @click="onMaskClick">
      <div class="detail-dialog" @click="onDialogClick">
        <!-- loading：中间栏还没加载好时整屏遮一下 -->
        <div v-if="loading" class="detail-loading">
          <div class="detail-loading__spinner" />
          <span>加载中…</span>
        </div>

        <!-- 三栏主体 -->
        <template v-else>
          <div class="detail-body">
            <!-- 左栏 INPUT -->
            <aside class="detail-col detail-col--input">
              <div class="detail-col__label">INPUT</div>
              <div class="detail-port-list">
                <div
                  v-for="p in inputPortDisplays"
                  :key="p.id"
                  class="detail-port"
                >
                  <div class="detail-port__header">
                    <span class="detail-port__name">{{ p.name }}</span>
                    <span class="detail-port__type">{{ p.typeNames }}</span>
                  </div>
                  <div class="detail-port__values">
                    <template v-if="p.values.length > 0">
                      <JsonTreeNode
                        v-for="(v, idx) in p.values"
                        :key="idx"
                        :value="v.plain"
                        :default-expanded="false"
                      />
                    </template>
                    <div v-else class="detail-port__empty">(未连接)</div>
                  </div>
                </div>
                <div v-if="inputPortDisplays.length === 0" class="detail-col__empty">
                  无输入端口
                </div>
              </div>
            </aside>

            <!-- 中间栏：顶部 title+close，下面 detailPanel -->
            <main class="detail-col detail-col--center">
              <div class="detail-header">
                <h3 class="detail-title">{{ title }}</h3>
                <button class="detail-close" type="button" @click="closeNodeDetail">×</button>
              </div>
              <div class="detail-center__panel">
                <component
                  v-if="currentComp && currentNodeId"
                  :is="currentComp"
                  :node-id="currentNodeId"
                />
              </div>
            </main>

            <!-- 右栏 OUTPUT -->
            <aside class="detail-col detail-col--output">
              <div class="detail-col__label">OUTPUT</div>
              <div class="detail-port-list">
                <div
                  v-for="p in outputPortDisplays"
                  :key="p.id"
                  class="detail-port"
                >
                  <div class="detail-port__header">
                    <span class="detail-port__name">{{ p.name }}</span>
                    <span class="detail-port__type">{{ p.typeName }}</span>
                  </div>
                  <div class="detail-port__values">
                    <template v-if="p.value">
                      <JsonTreeNode
                        :value="p.value.plain"
                        :default-expanded="false"
                      />
                    </template>
                    <div v-else class="detail-port__empty">(无产出)</div>
                  </div>
                </div>
                <div v-if="outputPortDisplays.length === 0" class="detail-col__empty">
                  无输出端口
                </div>
              </div>
            </aside>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.detail-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: detailFadeIn 0.15s ease;
}

.detail-dialog {
  width: 900px;
  height: 68vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: detailPopIn 0.18s ease;
  user-select: text;
  -webkit-user-select: text;

  // —— loading ——
  .detail-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #6b7280;
    font-size: 13px;

    &__spinner {
      width: 28px;
      height: 28px;
      border: 2.5px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: detailSpin 0.7s linear infinite;
    }
  }

  // —— body：三栏水平 flex 容器 ——
  .detail-body {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    min-height: 0; // 关键：flex 子项 overflow 能滚的前提
    overflow: hidden;
    gap: 16px;
  }
}

// —— 中间栏顶部标题栏（已从弹窗根移到 center column 内）——
.detail-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.detail-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.detail-close {
  all: unset;
  cursor: pointer;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 20px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
}

// —— 中间栏的 detailPanel 面板区：header 下面，占满剩余空间 ——
.detail-center__panel {
  flex: 1;
  min-height: 0; // flex overflow 前提
  overflow-y: auto;
}

// —— 三栏 ——
.detail-col {
  display: flex;
  flex-direction: column;
  min-height: 0; // flex 子项 overflow:hidden 需要它才能正确滚动

  &--input,
  &--output {
    width: 220px;
    flex-shrink: 0;
    background: #f7f8fa;
    border-right: 1px solid #e5e7eb;
    overflow: hidden;
  }

  &--output {
    border-right: none;
    border-left: 1px solid #e5e7eb;
  }

  &--center {
    flex: 1;
    background: #fff;
    overflow: hidden;
  }

  &__label {
    flex-shrink: 0;
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #6b7280;
    background: #eef1f5;
    border-bottom: 1px solid #e5e7eb;
  }

  &__empty {
    padding: 12px 14px;
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
  }
}

// —— 端口列表 ——
.detail-port-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-port {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__type {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #e5e7eb;
    color: #6b7280;
  }

  &__values {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 6px 8px;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
    max-height: 160px;
    overflow-y: auto;
  }

  &__empty {
    color: #9ca3af;
    font-size: 12px;
    font-style: italic;
  }
}

@keyframes detailFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes detailPopIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes detailSpin {
  to { transform: rotate(360deg); }
}
</style>
