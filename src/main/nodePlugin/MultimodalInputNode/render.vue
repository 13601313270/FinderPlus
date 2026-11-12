<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { MultimodalInputNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { viewport } from '@renderer/canvas/viewport'
import NodeHeader from '@renderer/components/NodeHeader.vue'

const props = defineProps<{ id: string }>()

const nodeRef = shallowRef<MultimodalInputNode | undefined>(undefined)
const nodeTitle = useNodeTitle(() => nodeRef.value, '🎨')
const text = ref('')
const imageFiles = ref<File[]>([])
const box = ref<[number, number]>([320, 240])

let unsubscribe: (() => void) | undefined

function syncFromNode() {
  const n = nodeRef.value
  if (!n) return
  text.value = n.text
  imageFiles.value = [...n.imageFiles]
  box.value = [n.box[0], n.box[1]]
}

onMounted(() => {
  const scene = workspaceScene
  const n = scene?.getNode(props.id)
  if (n instanceof MultimodalInputNode) {
    nodeRef.value = n
    syncFromNode()
    unsubscribe = n.onChanged(syncFromNode)
  }
})

onUnmounted(() => { unsubscribe?.() })

function onTextInput(e: Event) {
  const t = (e.target as HTMLTextAreaElement).value
  text.value = t
  nodeRef.value?.setText(t)
  if (nodeRef.value?.isAutoSend) nodeRef.value.commitMm()
}

function onPickImages(files: FileList | null) {
  if (!files || !nodeRef.value) return
  let added = false
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      nodeRef.value.addImage(f)
      added = true
    }
  }
  if (added && nodeRef.value.isAutoSend) nodeRef.value.commitMm()
}

function removeImage(i: number) {
  nodeRef.value?.removeImage(i)
  if (nodeRef.value?.isAutoSend) nodeRef.value.commitMm()
}

function onSendClick() { nodeRef.value?.commitMm(true) }

function onResizeStart(e: PointerEvent) {
  e.stopPropagation()
  const n = nodeRef.value
  if (!n) return
  const startX = e.clientX, startY = e.clientY
  const startW = box.value[0], startH = box.value[1]
  const onMove = (ev: PointerEvent) => {
    const nw = startW + (ev.clientX - startX) / viewport.scale
    const nh = startH + (ev.clientY - startY) / viewport.scale
    n.resizeBox(nw, nh)
    box.value = [nw, nh]
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function urlOf(f: File): string { return URL.createObjectURL(f) }
</script>

<template>
  <div class="mi-node">
    <NodeHeader :title="nodeTitle" />
    <div class="mi-body">
      <textarea
        v-model="text"
        class="mi-textarea"
        placeholder="输入多模态提示语…"
        rows="3"
        @input="onTextInput"
      />
      <div v-if="imageFiles.length > 0" class="mi-imgs">
        <div v-for="(f, i) in imageFiles" :key="i" class="mi-chip">
          <img :src="urlOf(f)" class="mi-chip-img" />
          <button class="mi-chip-x" @click="removeImage(i)">×</button>
        </div>
      </div>
      <div class="mi-actions">
        <label class="mi-btn mi-btn-pick">
          <input type="file" accept="image/*" multiple hidden @change="(e) => onPickImages((e.target as HTMLInputElement).files)" />
          ＋ 添加图片
        </label>
        <button class="mi-btn mi-btn-send" :disabled="!text.trim() && imageFiles.length === 0" @click="onSendClick">发送</button>
      </div>
    </div>
    <div class="mi-resize" @pointerdown="onResizeStart" />
  </div>
</template>

<style scoped lang="less">
.mi-node {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  background: #fff; border-radius: 6px;
  overflow: hidden; position: relative;
  padding: 0 8px 8px;
}
.mi-body { flex: 1; display: flex; padding-top: 8px; flex-direction: column; gap: 6px; }
.mi-textarea {
  all: unset; flex: 1; min-height: 40px;
  padding: 6px 8px; font-size: 12px; line-height: 1.5;
  border: 1px solid #e2e8f0; border-radius: 4px; resize: none;
  font-family: inherit; color: #1e293b;
  &:focus { border-color: #6366f1; }
}
.mi-imgs { display: flex; flex-wrap: wrap; gap: 4px; }
.mi-chip {
  position: relative; width: 48px; height: 48px;
  border-radius: 4px; overflow: hidden; border: 1px solid #e2e8f0;
}
.mi-chip-img { width: 100%; height: 100%; object-fit: cover; }
.mi-chip-x {
  position: absolute; top: 1px; right: 1px;
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(0,0,0,0.6); color: #fff; font-size: 10px;
  line-height: 14px; text-align: center; border: none; padding: 0; cursor: pointer;
}
.mi-actions { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.mi-btn {
  all: unset; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0 10px; font-size: 11px; border-radius: 4px; height: 24px;
}
.mi-btn-pick { background: #f1f5f9; color: #475569; border: 1px dashed #cbd5e1; &:hover { background: #e2e8f0; } }
.mi-btn-send {
  background: #6366f1; color: #fff; font-weight: 500;
  &:hover:not(:disabled) { background: #4f46e5; }
  &:disabled { background: #a5b4fc; cursor: not-allowed; }
}
.mi-resize {
  position: absolute; right: 0; bottom: 0;
  width: 14px; height: 14px; cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, #cbd5e1 50%, #cbd5e1 60%, transparent 60%, transparent 70%, #cbd5e1 70%, #cbd5e1 80%, transparent 80%);
}
</style>
