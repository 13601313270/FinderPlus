<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

/**
 * image 业务类型表单输入：点击选图 → emit 原生 File 对象。
 * 存盘统一由 TableNode.insertRowValues 处理（避免取消弹窗后留下孤儿文件）。
 *
 * 对外接口统一：modelValue + update:modelValue。
 * modelValue 可能是：string（已有 relPath 从 SQLite 加载）| File（新选的待存）| ''（清空）。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean; nodeId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

/** 显示用的预览 URL：可能是 Object URL（新选的 File），也可能是 data URL（从磁盘加载的已有图） */
const previewUrl = ref<string>('')

// 已有图是从磁盘 readFileAsDataUrl 加载的，不是 Object URL，
// 所以需要区分 —— 只有 Object URL 才需要 revoke
let _isObjectUrl = false

async function loadExistingRelPath(relPath: string): Promise<void> {
  try {
    // @ts-ignore
    const res = await window.tableApi.readFileAsDataUrl({
      // @ts-ignore
      canvasId: window.getCurrentCanvasId(),
      nodeId: props.nodeId,
      relPath
    })
    if (res.ok) {
      if (previewUrl.value && _isObjectUrl) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = URL.createObjectURL(new Blob([res.buffer], { type: res.mime }))
      _isObjectUrl = true // blob URL（不管是 createObjectURL 还是 Blob 构造的）都需要 revoke
    }
  } catch (err) {
    console.warn('[ImageInput] 加载已有图失败：', relPath, err)
  }
}

/** modelValue 变化时同步 */
watch(() => props.modelValue, async (val) => {
  // 释放旧 Object URL
  if (previewUrl.value && _isObjectUrl) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  _isObjectUrl = false

  if (val instanceof File) {
    previewUrl.value = URL.createObjectURL(val)
    _isObjectUrl = true
  } else if (typeof val === 'string' && val) {
    // 已有 relPath —— 加载磁盘文件做预览
    await loadExistingRelPath(val)
  }
}, { immediate: true })

function onFilePicked(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 替换前释放旧 Object URL
  if (previewUrl.value && _isObjectUrl) {
    URL.revokeObjectURL(previewUrl.value)
  }

  previewUrl.value = URL.createObjectURL(file)
  _isObjectUrl = true
  emit('update:modelValue', file)

  // 重置 input，允许用户选同一个文件
  input.value = ''
}

function clearImage(): void {
  if (previewUrl.value && _isObjectUrl) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  _isObjectUrl = false
  emit('update:modelValue', '')
}

onMounted(() => {
  // immediate watch 已经处理了，这里什么都不用做
})

// 组件卸载时释放 Object URL
function dispose(): void {
  if (previewUrl.value && _isObjectUrl) {
    URL.revokeObjectURL(previewUrl.value)
  }
}
defineExpose({ dispose })
</script>

<template>
  <div class="img-input">
    <!-- 选图按钮 -->
    <label v-if="!disabled" class="img-input__btn">
      <span v-if="!previewUrl">📷 选择图片</span>
      <span v-else>🔄 更换</span>
      <input
        type="file"
        accept="image/*"
        class="img-input__file"
        @change="onFilePicked"
      />
    </label>

    <!-- 预览图（不管是新选的 File 还是已有的 relPath，都渲染） -->
    <template v-if="previewUrl">
      <img :src="previewUrl" class="img-input__preview" alt="" />
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
