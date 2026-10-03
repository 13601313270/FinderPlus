<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, type Component } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import {
  TableNode,
  type ColumnType,
  type ColumnDef,
  type BusinessType,
  BUSINESS_TYPE_MAP,
  resolveBusinessType
} from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import TextInput from './columnTypes/text/Input.vue'
import TextCell from './columnTypes/text/Cell.vue'
import NumberInput from './columnTypes/number/Input.vue'
import NumberCell from './columnTypes/number/Cell.vue'
import BooleanInput from './columnTypes/boolean/Input.vue'
import BooleanCell from './columnTypes/boolean/Cell.vue'
import ColorInput from './columnTypes/color/Input.vue'
import ColorCell from './columnTypes/color/Cell.vue'

/** 业务类型 → 输入组件映射（表单里用） */
const inputComponents: Record<BusinessType, Component> = {
  text: TextInput,
  number: NumberInput,
  boolean: BooleanInput,
  color: ColorInput
}

/** 业务类型 → 单元格展示组件（表格里用） */
const cellComponents: Record<BusinessType, Component> = {
  text: TextCell,
  number: NumberCell,
  boolean: BooleanCell,
  color: ColorCell
}

const props = defineProps<{ id: string }>()

const tableNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TableNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => tableNode.value, '表')
const { startDrag } = useNodePosition(() => tableNode.value)

// —— 表格状态 ——
interface Row {
  id: number
  [key: string]: unknown
}

const rows = ref<Row[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const errorMsg = ref('')

// —— 弹窗状态 ——
const dialogMode = ref<'add' | 'edit'>('add')
const showDialog = ref(false)
const editingRowId = ref<number | null>(null)
const formValues = reactive<Record<string, unknown>>({})

// —— 列设置弹窗 ——
const showColumnDialog = ref(false)
const newColumnName = ref('')
const newColumnTitle = ref('')
const newColumnBusinessType = ref<BusinessType>('text')
const columnError = ref('')

let offChanged: (() => void) | undefined

/** 缓存的列定义签名，用于 onChanged 守卫。
 *  比对维度：name + type（SQL 层决定物理表结构） + businessType（决定渲染组件）。
 *  title 等纯 UI 元信息不在这里——改它们不触发 ensureAndLoad，零额外 IO。 */
let lastColumnsSig = ''

function columnsSig(columns: ColumnDef[]): string {
  return JSON.stringify(
    columns.map((c) => ({
      name: c.name,
      type: c.type,
      businessType: resolveBusinessType(c)
    }))
  )
}

// —— 列定义变化时刷新物理表 + 重读数据 ——
onMounted(async () => {
  const node = tableNode.value
  if (!node) return

  lastColumnsSig = columnsSig(node.columns)
  offChanged = node.onChanged(() => {
    // 位置变化也会触发 notifyChanged，先比列签名再决定要不要 reload
    const curSig = columnsSig(node.columns)
    if (curSig === lastColumnsSig) return
    lastColumnsSig = curSig
    ensureAndLoad()
  })

  await ensureAndLoad()
})

onUnmounted(() => {
  offChanged?.()
})

async function ensureAndLoad(): Promise<void> {
  const node = tableNode.value
  if (!node) return

  errorMsg.value = ''

  // 1. 确保物理表存在（CREATE TABLE IF NOT EXISTS）
  const colNames = node.columns.map((c) => c.name).join(', ') || '(无自定义列)'
  console.log(`[TableNode] ensure table for ${node.id}, columns: ${colNames}`)

  // @ts-ignore — 只在 renderer 里有 window.tableApi
  const ensureResult = await window.tableApi.ensure({
    nodeId: node.id,
    columns: node.columns
  }).catch(() => ({ ok: false as const, error: 'ensure failed' }))

  if (!ensureResult.ok) {
    errorMsg.value = ensureResult.error
    return
  }

  // 2. 加载第一页数据
  page.value = 1
  await loadPage()
}

async function loadPage(): Promise<void> {
  const node = tableNode.value
  if (!node) return

  loading.value = true
  errorMsg.value = ''

  try {
    // @ts-ignore
    const result = await window.tableApi.queryPage({
      nodeId: node.id,
      columns: node.columns,
      page: page.value,
      pageSize
    })

    if (result.ok) {
      rows.value = result.rows as Row[]
      total.value = result.total
    } else {
      errorMsg.value = result.error
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

// —— 分页 ——
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function goToPage(p: number): void {
  const target = Math.max(1, Math.min(totalPages.value, p))
  if (target !== page.value) {
    page.value = target
    loadPage()
  }
}

// —— 新增行 ——
function openAddDialog(): void {
  const node = tableNode.value
  if (!node) return

  // 初始化表单值：按列类型给默认值
  Object.keys(formValues).forEach((k) => delete formValues[k])
  for (const c of node.columns) {
    formValues[c.name] = defaultValueForType(c.type)
  }

  dialogMode.value = 'add'
  editingRowId.value = null
  showDialog.value = true
}

// —— 编辑行 ——
function openEditDialog(row: Row): void {
  const node = tableNode.value
  if (!node) return

  Object.keys(formValues).forEach((k) => delete formValues[k])
  for (const c of node.columns) {
    formValues[c.name] = row[c.name] ?? defaultValueForType(c.type)
  }

  dialogMode.value = 'edit'
  editingRowId.value = Number(row.id)
  showDialog.value = true
}

function defaultValueForType(type: ColumnType): unknown {
  switch (type) {
    case 'number': return 0
    case 'boolean': return false
    case 'string': return ''
  }
}

function coerceFormValue(raw: unknown, type: ColumnType): unknown {
  switch (type) {
    case 'number': {
      const n = Number(raw)
      return Number.isFinite(n) ? n : 0
    }
    case 'boolean':
      return !!raw
    case 'string':
      return raw == null ? '' : String(raw)
  }
}

// —— 提交弹窗 ——
async function submitDialog(): Promise<void> {
  const node = tableNode.value
  if (!node) return

  // 组装 values
  const values: Record<string, unknown> = {}
  for (const c of node.columns) {
    values[c.name] = coerceFormValue(formValues[c.name], c.type)
  }

  try {
    let result: { ok: boolean; error?: string; newId?: number }

    if (dialogMode.value === 'add') {
      // @ts-ignore
      result = await window.tableApi.insertRow({
        nodeId: node.id,
        columns: node.columns,
        values
      })
    } else if (editingRowId.value !== null) {
      // @ts-ignore
      result = await window.tableApi.updateRow({
        nodeId: node.id,
        columns: node.columns,
        rowId: editingRowId.value,
        values
      })
    } else {
      showDialog.value = false
      return
    }

    if (result.ok) {
      showDialog.value = false
      // 插入时如果当前页未满，直接 append；否则重新加载
      if (dialogMode.value === 'add' && rows.value.length < pageSize) {
        rows.value.push({ id: result.newId ?? 0, ...values })
        total.value++
      } else {
        await loadPage()
      }
    } else {
      errorMsg.value = result.error ?? '操作失败'
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  }
}

// —— 删除行 ——
async function deleteRow(row: Row): Promise<void> {
  const node = tableNode.value
  if (!node) return

  const ok = confirm(`确定删除第 ${row.id} 行吗？`)
  if (!ok) return

  try {
    // @ts-ignore
    const result = await window.tableApi.deleteRow({
      nodeId: node.id,
      rowId: Number(row.id)
    })

    if (result.ok) {
      total.value--
      // 如果删的是当前页最后一行且不是第一页，退一页再加载
      if (rows.value.length === 1 && page.value > 1) {
        page.value--
      }
      await loadPage()
    } else {
      errorMsg.value = result.error ?? '删除失败'
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  }
}

// —— 列管理 ——
async function addColumnFromUI(): Promise<void> {
  const node = tableNode.value
  if (!node) return

  const name = newColumnName.value.trim()
  if (!name) {
    columnError.value = '请输入列名'
    return
  }

  // 校验（和主进程保持一致）
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    columnError.value = '列名只能以字母/下划线开头，后跟字母/数字/下划线'
    return
  }

  if (node.columns.some((c) => c.name === name)) {
    columnError.value = `列名 "${name}" 已存在`
    return
  }

  columnError.value = ''

  try {
    // businessType → 存储类型 固定派生
    const storageType: ColumnType = BUSINESS_TYPE_MAP[newColumnBusinessType.value]

    // 1. 先改物理表
    // @ts-ignore
    const alterResult = await window.tableApi.addColumn({
      nodeId: node.id,
      column: { name, type: storageType }
    })

    if (!alterResult.ok) {
      columnError.value = alterResult.error
      return
    }

    // 2. 再改节点状态（saveState 会持久化到 nodes.params）
    const col: ColumnDef = { name, type: storageType, businessType: newColumnBusinessType.value }
    const title = newColumnTitle.value.trim()
    if (title) col.title = title
    node.addColumn(col)

    // 清空输入
    newColumnName.value = ''
    newColumnTitle.value = ''
    newColumnBusinessType.value = 'text'

    // 列签名变了，onChanged 会触发 ensureAndLoad
  } catch (err) {
    columnError.value = err instanceof Error ? err.message : String(err)
  }
}

/**
 * 行内修改某列的 title 显示名。
 * 调 node.updateColumnMeta 改状态，notifyChanged 持久化到 nodes.params。
 * columnsSig 守卫只拼 name+type，所以 title 变化不会触发 ensureAndLoad，零额外 IO。
 */
function updateColumnTitle(index: number, value: string): void {
  const trimmed = value.trim()
  tableNode.value?.updateColumnMeta(index, { title: trimmed || undefined })
}

async function removeColumnFromUI(colName: string): Promise<void> {
  const node = tableNode.value
  if (!node) return

  const ok = confirm(`确定删除列 "${colName}" 吗？该列所有数据将被永久删除。`)
  if (!ok) return

  try {
    // 1. 先改物理表
    // @ts-ignore
    const alterResult = await window.tableApi.removeColumn({
      nodeId: node.id,
      columnName: colName
    })

    if (!alterResult.ok) {
      columnError.value = alterResult.error
      return
    }

    // 2. 再改节点状态
    const idx = node.columns.findIndex((c) => c.name === colName)
    if (idx >= 0) {
      node.removeColumn(idx)
    }
  } catch (err) {
    columnError.value = err instanceof Error ? err.message : String(err)
  }
}
</script>

<template>
  <div class="tbl">
    <!-- 头部 -->
    <div class="tbl__header">
      <span class="tbl__handle" @pointerdown="startDrag">{{ nodeTitle }}</span>
      <div class="tbl__header-actions">
        <button
          class="tbl__add-btn tbl__add-btn--column"
          type="button"
          @click="showColumnDialog = true"
        >列设置</button>
        <button
          class="tbl__add-btn"
          type="button"
          @click="openAddDialog"
        >＋ 新增</button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="tbl__error">{{ errorMsg }}</div>

    <!-- 表格体 -->
    <div class="tbl__body">
      <table v-if="tableNode" class="tbl__table">
        <thead>
          <tr>
            <th class="tbl__th tbl__th--id">ID</th>
            <th
              v-for="col in tableNode.columns"
              :key="col.name"
              class="tbl__th"
            >{{ col.title ?? col.name }}</th>
            <th class="tbl__th tbl__th--ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0 && !loading" class="tbl__empty">
            <td :colspan="tableNode.columns.length + 2" class="tbl__empty-cell">
              暂无数据，点右上角「＋ 新增」添加第一行
            </td>
          </tr>
          <tr v-for="row in rows" :key="row.id" class="tbl__row">
            <td class="tbl__cell tbl__cell--id">{{ row.id }}</td>
            <td
              v-for="col in tableNode.columns"
              :key="col.name"
              class="tbl__cell"
            >
              <component
                :is="cellComponents[resolveBusinessType(col)]"
                :value="row[col.name]"
              />
            </td>
            <td class="tbl__cell tbl__cell--ops">
              <button
                class="tbl__op-btn"
                type="button"
                @click="openEditDialog(row)"
              >修改</button>
              <button
                class="tbl__op-btn tbl__op-btn--danger"
                type="button"
                @click="deleteRow(row)"
              >删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="tbl__loading">加载中…</div>
    </div>

    <!-- 底部分页器 -->
    <div class="tbl__footer">
      <span class="tbl__total">共 {{ total }} 条</span>
      <div class="tbl__pager">
        <button
          class="tbl__page-btn"
          type="button"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        >‹</button>
        <span class="tbl__page-info">{{ page }} / {{ totalPages }}</span>
        <button
          class="tbl__page-btn"
          type="button"
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
        >›</button>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <HelpDialog
      :visible="showDialog"
      :title="dialogMode === 'add' ? '新增一行' : '修改一行'"
      :width="420"
      @close="showDialog = false"
    >
      <div v-if="tableNode" class="tbl-form">
        <div
          v-for="col in tableNode.columns"
          :key="col.name"
          class="tbl-form__field"
        >
          <label class="tbl-form__label">
            {{ col.title ?? col.name }}
            <span class="tbl-form__type-tag">{{ resolveBusinessType(col) }}</span>
            <span v-if="col.title" class="tbl-form__name-hint">({{ col.name }})</span>
          </label>
          <component
            :is="inputComponents[resolveBusinessType(col)]"
            v-model="formValues[col.name]"
          />
        </div>

        <div class="tbl-form__actions">
          <button
            class="tbl-form__btn tbl-form__btn--cancel"
            type="button"
            @click="showDialog = false"
          >取消</button>
          <button
            class="tbl-form__btn tbl-form__btn--confirm"
            type="button"
            @click="submitDialog"
          >确定</button>
        </div>
      </div>
    </HelpDialog>

    <!-- 列设置弹窗 -->
    <HelpDialog
      :visible="showColumnDialog"
      title="列设置"
      :width="550"
      @close="showColumnDialog = false"
    >
      <div v-if="tableNode" class="tbl-col-dialog">
        <!-- 现有列列表 -->
        <div class="tbl-col-dialog__section">
          <div class="tbl-col-dialog__section-title">当前列</div>
          <div v-if="tableNode.columns.length === 0" class="tbl-col-dialog__empty">
            暂无自定义列
          </div>
          <div v-for="(col, colIndex) in tableNode.columns" :key="col.name" class="tbl-col-dialog__row">
            <div class="tbl-col-dialog__info">
              <span class="tbl-col-dialog__name">{{ col.name }}</span>
              <span class="tbl-col-dialog__type-tag">{{ resolveBusinessType(col) }}</span>
            </div>
            <input
              class="tbl-form__input tbl-col-dialog__title-input"
              :value="col.title ?? ''"
              placeholder="显示标题（可选）"
              @input="updateColumnTitle(colIndex, ($event.target as HTMLInputElement).value)"
            />
            <button
              class="tbl-col-dialog__remove"
              type="button"
              @click="removeColumnFromUI(col.name)"
            >删除</button>
          </div>
        </div>

        <!-- 添加新列 -->
        <div class="tbl-col-dialog__section">
          <div class="tbl-col-dialog__section-title">添加新列</div>
          <div class="tbl-col-dialog__add-form">
            <input
              v-model="newColumnName"
              type="text"
              class="tbl-form__input"
              placeholder="列名（如 email）"
              @keydown.enter="addColumnFromUI"
            />
            <input
              v-model="newColumnTitle"
              type="text"
              class="tbl-form__input"
              placeholder="显示标题（可选）"
              @keydown.enter="addColumnFromUI"
            />
            <select v-model="newColumnBusinessType" class="tbl-form__input tbl-col-dialog__select">
              <option value="text">text（文本）</option>
              <option value="color">color（颜色）</option>
              <option value="number">number（数字）</option>
              <option value="boolean">boolean（布尔）</option>
            </select>
            <button
              class="tbl-form__btn tbl-form__btn--confirm"
              type="button"
              @click="addColumnFromUI"
            >添加</button>
          </div>
          <div v-if="columnError" class="tbl-col-dialog__error">{{ columnError }}</div>
        </div>

        <div class="tbl-form__actions">
          <button
            class="tbl-form__btn tbl-form__btn--cancel"
            type="button"
            @click="showColumnDialog = false; columnError = ''"
          >关闭</button>
        </div>
      </div>
    </HelpDialog>
  </div>
</template>

<style scoped lang="less">
.tbl {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px 4px;
    border-bottom: 1px dashed #d5d9e0;
    flex-shrink: 0;

    &-actions {
      display: flex;
      gap: 6px;
    }
  }

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;

    &:active { cursor: grabbing; }
  }

  &__add-btn {
    all: unset;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background: @color-primary;
    color: #fff;
    transition: opacity 0.15s;

    &:hover { opacity: 0.85; }

    &--column {
      background: #f1f5f9;
      color: #475569;

      &:hover { background: #e2e8f0; opacity: 1; }
    }
  }

  &__error {
    padding: 4px 6px;
    background: #fee2e2;
    color: #dc2626;
    font-size: 11px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  &__th {
    position: sticky;
    top: 0;
    background: #f8fafc;
    padding: 4px 6px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;

    &--id { width: 48px; text-align: center; }
    &--ops { width: 100px; text-align: center; }
  }

  &__row {
    border-bottom: 1px solid #f1f5f9;

    &:hover { background: #f8fafc; }
  }

  &__cell {
    padding: 4px 6px;
    color: #1e293b;
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;

    &--id { text-align: center; color: #64748b; }
    &--ops { text-align: center; }
  }

  &__empty-cell {
    padding: 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 11px;
  }

  &__loading {
    padding: 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 11px;
  }

  &__op-btn {
    all: unset;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 6px;
    margin: 0 2px;
    border-radius: 3px;
    background: #eff6ff;
    color: #2563eb;

    &:hover { background: #dbeafe; }

    &--danger {
      background: #fef2f2;
      color: #dc2626;

      &:hover { background: #fee2e2; }
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 4px 2px;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0;
  }

  &__total {
    font-size: 11px;
    color: #64748b;
  }

  &__pager {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__page-btn {
    all: unset;
    cursor: pointer;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #475569;
    border-radius: 4px;
    background: #f1f5f9;

    &:hover:not(:disabled) { background: #e2e8f0; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }

  &__page-info {
    font-size: 11px;
    color: #64748b;
    min-width: 48px;
    text-align: center;
  }
}

.tbl-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__type-tag {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #f1f5f9;
    color: #64748b;
    font-weight: 400;
  }

  &__input {
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;

    &:focus { border-color: #3b82f6; }
  }

  &__checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #374151;
    cursor: pointer;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  &__btn {
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    border: none;

    &--cancel {
      background: #f3f4f6;
      color: #4b5563;

      &:hover { background: #e5e7eb; }
    }

    &--confirm {
      background: #3b82f6;
      color: #fff;

      &:hover { background: #2563eb; }
    }
  }
}

// —— 列设置弹窗样式（不在 .tbl 作用域里） ——
.tbl-col-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__section-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: #f8fafc;
    border-radius: 6px;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    min-width: 130px;
  }

  &__name {
    font-size: 13px;
    color: #1e293b;
    font-family: monospace;
  }

  &__type-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #e2e8f0;
    color: #64748b;
    font-family: monospace;
    text-transform: uppercase;
  }

  &__title-input {
    flex: 1;
    min-width: 0;
  }

  &__remove {
    all: unset;
    margin-left: auto;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #fef2f2;
    color: #dc2626;

    &:hover { background: #fee2e2; }
  }

  &__empty {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
  }

  &__add-form {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  &__select {
    min-width: 100px;
    cursor: pointer;
  }

  &__error {
    font-size: 12px;
    color: #dc2626;
  }
}
</style>
