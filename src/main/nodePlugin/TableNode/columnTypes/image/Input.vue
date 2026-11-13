<script setup lang="ts">
import { ref } from 'vue'

/**
 * image 业务类型表单输入：点击选图 → 存到节点目录 → emit relPath 字符串。
 *
 * 对外接口统一：modelValue + update:modelValue。
 * modelValue 是 relPath 字符串（与 Cell 组件的值一致）。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean; nodeId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const localPreviewUrl = ref<string>('') // 选中待上传的图片的临时预览 URL
const uploading = ref(false)

// File → 纯 base64 字符串
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const commaIdx = dataUrl.indexOf(',')
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFilePicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 先给个临时预览（Object URL，不占主进程资源）
  localPreviewUrl.value = URL.createObjectURL(file)
  uploading.value = true

  try {
    const dataBase64 = await fileToBase64(file)
    // @ts-ignore — preload API
    const saveRes = await window.tableApi.saveFile({
      // @ts-ignore
      canvasId: window.getCurrentCanvasId(),
      nodeId: props.nodeId,
      fileName: file.name,
      dataBase64
    })
    if (saveRes.ok) {
      emit('update:modelValue', saveRes.relPath)
    } else {
      console.warn('[ImageInput] 存文件失败：', saveRes.error)
      localPreviewUrl.value = ''
    }
  } catch (err) {
    console.warn('[ImageInput] 异常：', err)
    localPreviewUrl.value = ''
  } finally {
    uploading.value = false
    // 重置 input，允许用户选同一个文件
    input.value = ''
  }
}

function clearImage(): void {
  localPreviewUrl.value = ''
  emit('update:modelValue', '')
}

// 优先显示本地预览（新选的图），否则显示已有 value（从 SQLite 加载的）
function getDisplayUrl(): string {
  if (localPreviewUrl.value) return localPreviewUrl.value
  return '' // 从 SQLite 加载已有图的预览暂时不做（Cell 组件单独处理）
}
</script>

<template>
  <div class="img-input">
    <!-- 选图按钮：始终显示 -->
    <label v-if="!disabled" class="img-input__btn" :class="{ 'img-input__btn--busy': uploading }">
      <span v-if="!localPreviewUrl">📷 选择图片</span>
      <span v-else>🔄 更换</span>
      <input
        type="file"
        accept="image/*"
        class="img-input__file"
        :disabled="uploading"
        @change="onFilePicked"
      />
    </label>

    <!-- 临时预览 + 清除 -->
    <template v-if="localPreviewUrl">
      <img :src="localPreviewUrl" class="img-input__preview" alt="" />
      <button type="button" class="img-input__clear" @click="clearImage">✕</button>
    </template>
  </div>
</template>

<style scoped>
.img-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.img-input__btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  border: 1px dashed var(--color-border, #d1d5db);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  background: var(--color-bg-secondary, #f9fafb);
  transition: all 0.15s;
}
.img-input__btn:hover {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}
.img-input__btn--busy {
  opacity: 0.6;
  cursor: not-allowed;
}
.img-input__file {
  display: none;
}

.img-input__preview {
  max-width: 64px;
  max-height: 48px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid var(--color-border, #d1d5db);
}

.img-input__clear {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-secondary, #f3f4f6);
  cursor: pointer;
  color: var(--color-text-muted, #6b7280);
}
.img-input__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
