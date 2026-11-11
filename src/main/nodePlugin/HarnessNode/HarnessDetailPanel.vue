<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HarnessNode, type HarnessMessage } from './node'

const props = defineProps<{ id: string }>()

const nodeRef = shallowRef<HarnessNode | undefined>(undefined)
const trajectory = shallowRef<readonly HarnessMessage[]>([])
const iteration = shallowRef(0)
const status = shallowRef<'idle' | 'loading' | 'done' | 'error'>('idle')
const maxIterations = shallowRef(10)

let unsubscribe: (() => void) | undefined

function sync() {
  const n = nodeRef.value
  if (!n) return
  trajectory.value = n.displayTrajectory
  iteration.value = n.displayIteration
  status.value = n.status
  maxIterations.value = n.displayMaxIterations
}

onMounted(() => {
  const n = workspaceScene?.getNode(props.id)
  if (n instanceof HarnessNode) {
    nodeRef.value = n
    sync()
    unsubscribe = n.onChanged(sync)
  }
})

onUnmounted(() => { unsubscribe?.() })

/** 把原始 messages 分组为 UI 友好的三段：tool_call / tool_result / final */
const groups = computed(() => {
  const out: Array<{ kind: 'tool_call' | 'tool_result' | 'final'; content: string; meta?: string }> = []
  let i = 0
  const msgs = trajectory.value
  while (i < msgs.length) {
    const m = msgs[i]
    if (m.role === 'assistant') {
      if (m.tool_calls && m.tool_calls.length > 0) {
        for (const tc of m.tool_calls) {
          out.push({ kind: 'tool_call', content: tc.function.name, meta: tc.function.arguments })
        }
      } else if (m.content) {
        out.push({ kind: 'final', content: extractText(m.content) })
      }
      i++
    } else if (m.role === 'tool') {
      out.push({ kind: 'tool_result', content: extractText(m.content), meta: m.name })
      i++
    } else {
      i++
    }
  }
  return out
})

function extractText(content: string | Array<{ type: string; [k: string]: unknown }> | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map(p => p.text).join('\n')
}
</script>

<template>
  <div class="harness-detail">
    <div v-if="trajectory.length === 0" class="empty">
      执行轨迹将在此显示
    </div>
    <template v-else>
      <div class="harness-detail__header">
        <span>执行轨迹</span>
        <span class="harness-detail__iter">
          {{ status === 'loading' ? '运行中…' : status === 'error' ? '出错' : '完成' }}
          · {{ iteration }}/{{ maxIterations }}
        </span>
      </div>
      <div class="harness-detail__body">
        <div
          v-for="(g, idx) in groups"
          :key="idx"
          class="traj-row"
          :class="{
            'traj-row--tool-call': g.kind === 'tool_call',
            'traj-row--tool-result': g.kind === 'tool_result',
            'traj-row--final': g.kind === 'final'
          }"
        >
          <span class="traj-row__icon">
            {{ g.kind === 'tool_call' ? '🔧' : g.kind === 'tool_result' ? '📦' : '✅' }}
          </span>
          <span class="traj-row__name" v-if="g.meta">{{ g.meta }}</span>
          <span class="traj-row__content">{{ g.content }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
.harness-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.harness-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.harness-detail__iter {
  font-size: 11px;
  font-weight: 400;
  color: #64748b;
  font-family: ui-monospace, Menlo, monospace;
}
.harness-detail__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
}

/* ── trajectory row ── */
.traj-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;

  &--tool-call {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }
  &--tool-result {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }
  &--final {
    background: #fef3c7;
    border: 1px solid #fde68a;
  }
}
.traj-row__icon {
  flex-shrink: 0;
  font-size: 13px;
  margin-top: 1px;
}
.traj-row__name {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  color: #64748b;
  background: rgba(0,0,0,0.04);
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.traj-row__content {
  flex: 1;
  min-width: 0;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow: auto;
  font-family: inherit;
}
</style>
