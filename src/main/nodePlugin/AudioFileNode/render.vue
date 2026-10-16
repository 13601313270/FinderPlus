<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { base64ToBlob } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioFileNode } from './node'
import { inferAudioMime } from './mime'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'
import { nodeManifests } from '../index'
import { resolveNodeTitle } from '../manifest'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'

const props = defineProps<{ id: string }>()
const t = useLocalizedMessages(messages)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof AudioFileNode ? node : undefined
})

const fileName = ref('')
const fileSizeFormatted = ref('')
const fileFormat = ref('')

let blobUrl: string | null = null
const previewUrl = ref<string | null>(null)
const nodeTitle = useNodeTitle(AudioFileNode.TYPE)

let unsubscribe: (() => void) | undefined

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function refreshBlob(): Promise<void> {
  const n = fileNode.value
  if (!n) return
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
  if (!n.fileName) {
    previewUrl.value = null
    return
  }
  try {
    // @ts-ignore
    const b64 = await window.fileApi.readBinary(n.fileName)
    const mime = inferAudioMime(n.fileName)
    blobUrl = URL.createObjectURL(base64ToBlob(b64, mime))
    previewUrl.value = blobUrl
  } catch {
    previewUrl.value = null
  }
}

function refresh(): void {
  const n = fileNode.value
  if (!n) return
  fileName.value = n.fileName
  fileSizeFormatted.value = n.fileSize ? formatSize(n.fileSize) : ''
  fileFormat.value = n.displayFormat
  void refreshBlob()
}

onMounted(() => {
  const n = fileNode.value
  if (!n) return
  unsubscribe = n.onChanged(() => refresh())
  refresh()
})

onBeforeUnmount(() => {
  unsubscribe?.()
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
})

async function onSelectFile(): Promise<void> {
  try {
    // @ts-ignore
    const picked = await window.fileApi.pickFile({
      multiple: false,
      filters: [{
        name: 'Audio',
        extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus']
      }]
    })
    if (!picked?.length) return
    const path = picked[0].path
    // @ts-ignore
    await window.fileApi.copyToCanvas(path)
  } catch (err) {
    console.warn('[AudioFileNode] pick file failed', err)
  }
}
</script>

<template>
  <div class="af-card">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!fileName" class="af-empty">
      <button type="button" class="af-select-btn" @click.stop="onSelectFile">
        {{ t('selectFile') }}
      </button>
    </div>

    <div v-else class="af-body">
      <div class="af-filename" :title="fileName">{{ fileName }}</div>

      <div v-if="previewUrl" class="af-preview">
        <audio :src="previewUrl" controls preload="metadata" />
      </div>
      <div v-else class="af-preview af-preview--placeholder">
        <span class="af-icon">🎵</span>
      </div>

      <div class="af-meta">
        <span v-if="fileFormat" class="af-tag">{{ fileFormat }}</span>
        <span v-if="fileSizeFormatted" class="af-size">{{ fileSizeFormatted }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.af-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  height: 100%;
  box-sizing: border-box;

  &-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &-select-btn {
    padding: 6px 14px;
    border: 1px dashed #c7d2fe;
    border-radius: 6px;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 12px;
    cursor: pointer;

    &:hover { background: #e0e7ff; }
  }

  &-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 0;
  }

  &-filename {
    font-size: 11px;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-preview {
    display: flex;
    align-items: center;

    audio {
      width: 100%;
      height: 32px;
    }

    &--placeholder {
      justify-content: center;
      height: 40px;
      background: #f3f4f6;
      border-radius: 6px;
    }
  }

  &-icon {
    font-size: 22px;
  }

  &-meta {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  &-tag {
    font-size: 10px;
    padding: 1px 6px;
    background: #ede9fe;
    color: #6d28d9;
    border-radius: 3px;
    font-weight: 500;
  }

  &-size {
    font-size: 10px;
    color: #9ca3af;
  }
}
</style>
