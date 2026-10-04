<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { viewport } from '@renderer/canvas/viewport'

const { t } = useI18n()
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import {
  TableNode,
  type ColumnType,
  type ColumnDef,
  type BusinessType,
  BUSINESS_TYPE_MAP,
  resolveBusinessType,
  resolveShowInList
} from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import TextInput from './columnTypes/text/Input.vue'
import TextCell from './columnTypes/text/Cell.vue'
import TextareaInput from './columnTypes/textarea/Input.vue'
import TextareaCell from './columnTypes/textarea/Cell.vue'
import NumberInput from './columnTypes/number/Input.vue'
import NumberCell from './columnTypes/number/Cell.vue'
import BooleanInput from './columnTypes/boolean/Input.vue'
import BooleanCell from './columnTypes/boolean/Cell.vue'
import ColorInput from './columnTypes/color/Input.vue'
import ColorCell from './columnTypes/color/Cell.vue'
import TimeInput from './columnTypes/time/Input.vue'
import TimeCell from './columnTypes/time/Cell.vue'
import TableHelpDialog from './TableHelpDialog.vue'

/** 业务类型 → 输入组件映射（表单里用） */
const inputComponents: Record<BusinessType, Component> = {
  text: TextInput,
  textarea: TextareaInput,
  number: NumberInput,
  boolean: BooleanInput,
  color: ColorInput,
  time: TimeInput
}

/** 业务类型 → 单元格展示组件（表格里用） */
const cellComponents: Record<BusinessType, Component> = {
  text: TextCell,
  textarea: TextareaCell,
  number: NumberCell,
  boolean: BooleanCell,
  color: ColorCell,
  time: TimeCell
}

const props = defineProps<{ id: string }>()

const tableNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TableNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => tableNode.value, t('table.nodeFallback'))
const { box, startDrag } = useNodePosition(() => tableNode.value)

/**
 * 用来强制 listColumns / formColumns 重算的 dummy ref。
 * TableNode.columns 是普通 class array，Vue 追踪不到内部对象的属性变化（showInList / title 等），
 * 所以每次 columns 变化时手动 bump 一下，让依赖它的 computed 重新执行。
 */
const columnsVersion = ref(0)

/** 表格（列表视图）显示的列——过滤掉 showInList: false 的 */
const listColumns = computed<ColumnDef[]>(() => {
  columnsVersion.value  // 强制依赖 dummy ref
  return tableNode.value?.columns.filter((c) => resolveShowInList(c)) ?? []
})
/** 表单（新增/编辑弹窗）显示的列——全部 */
const formColumns = computed<ColumnDef[]>(() => {
  columnsVersion.value
  return tableNode.value?.columns ? [...tableNode.value.columns] : []
})

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

// —— 搜索栏 ——
/** 列设置了 showInSearch: true 的列 */
const searchColumns = computed<ColumnDef[]>(() => {
  columnsVersion.value  // 和 listColumns / formColumns 一样，强制依赖 dummy ref
  return tableNode.value?.columns.filter((c) => c.showInSearch === true) ?? []
})
/** 搜索栏输入值（列名 → 值） */
const searchValues = reactive<Record<string, unknown>>({})

// —— 排序状态 ——
type SortOrder = 'ASC' | 'DESC'
const sortField = ref<string | null>(null)
const sortOrder = ref<SortOrder | null>(null)

/** 三态排序循环：无 → ASC → DESC → 无 */
function cycleSort(colName: string): void {
  if (sortField.value !== colName) {
    sortField.value = colName
    sortOrder.value = 'ASC'
  } else if (sortOrder.value === 'ASC') {
    sortOrder.value = 'DESC'
  } else if (sortOrder.value === 'DESC') {
    sortField.value = null
    sortOrder.value = null
  } else {
    sortOrder.value = 'ASC'
  }
  page.value = 1
  loadPage()
}
let searchValuesVersion = 0

// —— 弹窗状态 ——
const dialogMode = ref<'add' | 'edit'>('add')
const showDialog = ref(false)
const editingRowId = ref<number | null>(null)
const formValues = reactive<Record<string, unknown>>({})

// —— 列设置弹窗 ——
const showColumnDialog = ref(false)
const showAddColumnDialog = ref(false)
const newColumnName = ref('')
const newColumnTitle = ref('')
const newColumnBusinessType = ref<BusinessType>('text')
/** 新增列时的默认值（跟着 newColumnBusinessType 变类型） */
const newColumnDefaultValue = ref<unknown>('')
/** 新增列时的元信息开关 */
const newColumnShowInList = ref(true)
const newColumnShowInSearch = ref(false)
const newColumnCanUpdate = ref(true)
const newColumnCanSort = ref(false)
const columnError = ref('')

// —— 帮助弹窗 ——
const showHelp = ref(false)

// businessType 切换时，defaultValue 重置成该类型的初始值，避免脏值串类型
watch(newColumnBusinessType, (bt) => {
  const storageType = BUSINESS_TYPE_MAP[bt]
  newColumnDefaultValue.value = defaultValueForType(storageType)
})

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
    // 1. 无论什么变化，先 bump dummy ref → listColumns / formColumns 重算 → UI 刷新
    columnsVersion.value++
    // 2. 再决定要不要重建物理表 + 重读（只有 SQL 语法层变化才需要）
    const curSig = columnsSig(node.columns)
    if (curSig === lastColumnsSig) return
    lastColumnsSig = curSig
    ensureAndLoad()
  })

  await ensureAndLoad()
})

onUnmounted(() => {
  offChanged?.()
  onResizeEnd()
})

// —— 东南角 resize：拖手柄 → setBox（TableNode.setBox override 会钳制到 MIN_W/MIN_H） ——
let resizing = false
let resizeStartClientX = 0
let resizeStartClientY = 0
let resizeStartBox: [number, number] = [0, 0]

function startResize(e: PointerEvent): void {
  e.preventDefault()
  e.stopPropagation()
  resizing = true
  resizeStartClientX = e.clientX
  resizeStartClientY = e.clientY
  resizeStartBox = [box.value[0], box.value[1]]
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizing || !tableNode.value) return
  const scale = viewport.scale || 1
  const w = resizeStartBox[0] + (e.clientX - resizeStartClientX) / scale
  const h = resizeStartBox[1] + (e.clientY - resizeStartClientY) / scale
  tableNode.value.setBox(w, h)
}

function onResizeEnd(): void {
  resizing = false
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
}

async function ensureAndLoad(): Promise<void> {
  const node = tableNode.value
  if (!node) return

  errorMsg.value = ''

  // 1. 确保物理表存在（CREATE TABLE IF NOT EXISTS）
  const colNames = node.columns.map((c) => c.name).join(', ') || t('table.noCustomColumns')
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

  // 构造 WHERE 条件
  const where: Array<{ column: string; op: '=' | 'LIKE'; value: unknown }> = []
  for (const col of node.columns) {
    if (col.showInSearch !== true) continue
    const v = searchValues[col.name]
    if (v === undefined || v === null || v === '') continue
    const storageType = col.type
    if (storageType === 'string') {
      where.push({ column: col.name, op: 'LIKE', value: v })
    } else {
      where.push({ column: col.name, op: '=', value: v })
    }
  }

  try {
    // 构造 sort 参数（sortField/sortOrder 同时存在才传）
    const sort = sortField.value && sortOrder.value
      ? { column: sortField.value, order: sortOrder.value }
      : null

    // @ts-ignore
    const result = await window.tableApi.queryPage({
      nodeId: node.id,
      columns: node.columns,
      page: page.value,
      pageSize,
      where,
      sort
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

  // 初始化表单值：优先用用户配置的 defaultValue，没设就按列类型兜底
  Object.keys(formValues).forEach((k) => delete formValues[k])
  for (const c of node.columns) {
    formValues[c.name] = c.defaultValue !== undefined
      ? c.defaultValue
      : defaultValueForType(c.type)
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
      errorMsg.value = result.error ?? t('table.submitFailed')
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  }
}

// —— 删除行 ——
async function deleteRow(row: Row): Promise<void> {
  const node = tableNode.value
  if (!node) return

  const ok = confirm(t('table.confirmDeleteRow', { id: row.id }))
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
      errorMsg.value = result.error ?? t('table.deleteFailed')
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : String(err)
  }
}

// —— 列管理 ——
/** 打开添加列弹窗（带上默认值） */
function openAddColumnDialog(): void {
  columnError.value = ''
  showAddColumnDialog.value = true
}

/** 关闭添加列弹窗（顺手清一下错误提示） */
function closeAddColumnDialog(): void {
  showAddColumnDialog.value = false
  columnError.value = ''
}

async function addColumnFromUI(): Promise<void> {
  const node = tableNode.value
  if (!node) return

  const name = newColumnName.value.trim()
  if (!name) {
    columnError.value = t('table.errorEmptyName')
    return
  }

  // 校验（和主进程保持一致）
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    columnError.value = t('table.errorInvalidName')
    return
  }

  if (node.columns.some((c) => c.name === name)) {
    columnError.value = t('table.errorDuplicateName', { name })
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
    const col: ColumnDef = {
      name,
      type: storageType,
      businessType: newColumnBusinessType.value,
      showInList: newColumnShowInList.value,
      showInSearch: newColumnShowInSearch.value,
      canUpdate: newColumnCanUpdate.value,
      canSort: newColumnCanSort.value
    }
    const title = newColumnTitle.value.trim()
    if (title) col.title = title
    // defaultValue 存用户最终值（''/0/false 都是有效默认值），null/undefined 表示不设
    const dv = newColumnDefaultValue.value
    if (dv !== null && dv !== undefined) col.defaultValue = dv
    node.addColumn(col)

    // 清空输入
    newColumnName.value = ''
    newColumnTitle.value = ''
    newColumnBusinessType.value = 'text'
    newColumnDefaultValue.value = ''
    newColumnShowInList.value = true
    newColumnShowInSearch.value = false
    newColumnCanUpdate.value = true
    newColumnCanSort.value = false

    // 成功加完，关掉添加弹窗（列设置主弹窗保持打开，方便继续加）
    showAddColumnDialog.value = false
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

/** 切换列的 showInList 开关。纯 node state，不碰物理表。 */
function nodeToggleShowInList(index: number, col: ColumnDef): void {
  tableNode.value?.updateColumnMeta(index, { showInList: !resolveShowInList(col) })
}

/** 设置某列的 defaultValue。用户清空时存 null，openAddDialog 里会回退到 defaultValueForType。 */
function nodeSetDefaultValue(index: number, value: unknown, col: ColumnDef): void {
  // 动态 Input 组件 emit ''（text）/ 0（number）/ false（boolean）都算有效值
  // 只有显式传 null 才表示"不设默认值"
  const storageType = col.type
  const fallback = defaultValueForType(storageType)
  const dv = value === fallback ? null : value
  tableNode.value?.updateColumnMeta(index, { defaultValue: dv })
}

/** 清空所有搜索条件 + 重置第一页 + 重新加载 */
function resetSearch(): void {
  Object.keys(searchValues).forEach((k) => delete searchValues[k])
  page.value = 1
  searchValuesVersion++
  loadPage()
}

/** 切换某列的 showInSearch 开关 */
function nodeToggleShowInSearch(index: number, col: ColumnDef): void {
  tableNode.value?.updateColumnMeta(index, { showInSearch: !col.showInSearch })
}

/** 切换某列的 canUpdate。默认 true（可改），false 时修改弹窗禁用。 */
function nodeToggleCanUpdate(index: number, col: ColumnDef): void {
  tableNode.value?.updateColumnMeta(index, { canUpdate: col.canUpdate === false })
}

/** 切换某列的 canSort。默认 false（不可排序）。 */
function nodeToggleCanSort(index: number, col: ColumnDef): void {
  tableNode.value?.updateColumnMeta(index, { canSort: !col.canSort })
}

async function removeColumnFromUI(colName: string): Promise<void> {
  const node = tableNode.value
  if (!node) return

  const ok = confirm(t('table.confirmDeleteColumn', { name: colName }))
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
      // 显式 bump，不依赖 notifyChanged → onChanged 链路
      columnsVersion.value++
    }
  } catch (err) {
    columnError.value = err instanceof Error ? err.message : String(err)
  }
}
</script>

<template>
  <div class="tbl">
    <!-- 头部 -->
    <div class="tbl__header" @pointerdown="startDrag">
      <span class="tbl__handle">{{ nodeTitle }}</span>
      <div class="tbl__header-actions">
        <button
          class="tbl__add-btn tbl__add-btn--column"
          type="button"
          @click="showColumnDialog = true"
        >{{ $t('table.columnSettings') }}</button>
        <button
          class="tbl__add-btn tbl__add-btn--column"
          type="button"
          @click="tableNode?.addQueryPort()"
          :title="$t('table.sqlPortTitle')"
        >{{ $t('table.sqlPort') }}</button>
        <button
          class="tbl__help-btn"
          type="button"
          @click.stop="showHelp = true"
        >?</button>
      </div>
    </div>

    <!-- 工具栏：左侧搜索（可选），右侧新增（始终可见） -->
    <div class="tbl__search">
      <template v-if="searchColumns.length > 0">
        <div
          v-for="col in searchColumns"
          :key="col.name"
          class="tbl__search-field"
        >
          <span class="tbl__search-label">{{ col.title ?? col.name }}</span>
          <component
            :is="inputComponents[resolveBusinessType(col)]"
            v-model="searchValues[col.name]"
            class="tbl__search-input"
          />
        </div>
        <button class="tbl__search-btn" type="button" @click="page = 1; loadPage()">{{ $t('table.search') }}</button>
        <button class="tbl__search-btn tbl__search-btn--reset" type="button" @click="resetSearch">{{ $t('table.reset') }}</button>
      </template>
      <button
        class="tbl__add-btn tbl__add-btn--search"
        type="button"
        @click="openAddDialog"
      >{{ $t('table.addRow') }}</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="tbl__error">{{ errorMsg }}</div>

    <!-- 表格体 -->
    <div class="tbl__body">
      <table v-if="tableNode" class="tbl__table">
        <thead>
          <tr>
            <th class="tbl__th tbl__th--id">{{ $t('table.rowId') }}</th>
            <th
              v-for="col in listColumns"
              :key="col.name"
              class="tbl__th"
              :class="{
                'tbl__th--sortable': col.canSort === true,
                'tbl__th--asc': sortField === col.name && sortOrder === 'ASC',
                'tbl__th--desc': sortField === col.name && sortOrder === 'DESC'
              }"
              @click="col.canSort === true && cycleSort(col.name)"
            >
              {{ col.title ?? col.name }}
              <span v-if="col.canSort === true" class="tbl__sort-indicator">
                <span class="tbl__sort-arrow tbl__sort-arrow--asc">▲</span>
                <span class="tbl__sort-arrow tbl__sort-arrow--desc">▼</span>
              </span>
            </th>
            <th class="tbl__th tbl__th--ops">{{ $t('table.headerOperations') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0 && !loading" class="tbl__empty">
            <td :colspan="tableNode.columns.length + 2" class="tbl__empty-cell">
              {{ $t('table.emptyHint') }}
            </td>
          </tr>
          <tr v-for="row in rows" :key="row.id" class="tbl__row">
            <td class="tbl__cell tbl__cell--id">{{ row.id }}</td>
            <td
              v-for="col in listColumns"
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
              >{{ $t('table.edit') }}</button>
              <button
                class="tbl__op-btn tbl__op-btn--danger"
                type="button"
                @click="deleteRow(row)"
              >{{ $t('table.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="tbl__loading">{{ $t('table.loading') }}</div>
    </div>

    <!-- 底部分页器 -->
    <div class="tbl__footer">
      <span class="tbl__total">{{ $t('table.totalRows', { total }) }}</span>
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
      :title="dialogMode === 'add' ? $t('table.dialogTitleAdd') : $t('table.dialogTitleEdit')"
      :width="420"
      @close="showDialog = false"
    >
      <div v-if="tableNode" class="tbl-form">
        <div
          v-for="col in formColumns"
          :key="col.name"
          class="tbl-form__field"
        >
          <label class="tbl-form__label">
            {{ col.title ?? col.name }}
            <!-- <span class="tbl-form__type-tag">{{ resolveBusinessType(col) }}</span> -->
            <span v-if="col.title" class="tbl-form__name-hint">({{ col.name }})</span>
          </label>
          <component
            :is="inputComponents[resolveBusinessType(col)]"
            v-model="formValues[col.name]"
            :disabled="dialogMode === 'edit' && col.canUpdate === false"
          />
        </div>

        <div class="tbl-form__actions">
          <button
            class="tbl-form__btn tbl-form__btn--cancel"
            type="button"
            @click="showDialog = false"
          >{{ $t('table.dialogCancel') }}</button>
          <button
            class="tbl-form__btn tbl-form__btn--confirm"
            type="button"
            @click="submitDialog"
          >{{ $t('table.dialogConfirm') }}</button>
        </div>
      </div>
    </HelpDialog>

    <!-- 列设置弹窗 -->
    <HelpDialog
      :visible="showColumnDialog"
      :title="$t('table.columnSettings')"
      :width="720"
      @close="showColumnDialog = false"
    >
      <div v-if="tableNode" class="tbl-col-dialog">
        <!-- 现有列列表 -->
        <div class="tbl-col-dialog__section">
          <div class="tbl-col-dialog__section-title">{{ $t('table.colSectionTitle') }}</div>
          <div v-if="tableNode.columns.length === 0" class="tbl-col-dialog__empty">
            {{ $t('table.colEmpty') }}
          </div>
          <table v-else class="tbl-col-dialog__table">
            <thead>
              <tr>
                <th>{{ $t('table.colHeaderName') }}</th>
                <th>{{ $t('table.colHeaderType') }}</th>
                <th>{{ $t('table.colHeaderTitle') }}</th>
                <th>{{ $t('table.colHeaderDefault') }}</th>
                <th>{{ $t('table.colHeaderList') }}</th>
                <th>{{ $t('table.colHeaderSearch') }}</th>
                <th>{{ $t('table.colHeaderCanUpdate') }}</th>
                <th>{{ $t('table.colHeaderCanSort') }}</th>
                <th>{{ $t('table.colHeaderOperations') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(col, colIndex) in formColumns" :key="col.name" class="tbl-col-dialog__row">
                <td class="tbl-col-dialog__name-cell">{{ col.name }}</td>
                <td>
                  <span class="tbl-col-dialog__type-tag">{{ $t('table.businessType.' + resolveBusinessType(col)) }}</span>
                </td>
                <td>
                  <input
                    class="tbl-form__input tbl-col-dialog__title-input"
                    :value="col.title ?? ''"
                    :placeholder="$t('table.titlePlaceholder')"
                    @input="updateColumnTitle(colIndex, ($event.target as HTMLInputElement).value)"
                  />
                </td>
                <td>
                  <component
                    :is="inputComponents[resolveBusinessType(col)]"
                    :model-value="col.defaultValue ?? defaultValueForType(col.type)"
                    @update:model-value="(v) => nodeSetDefaultValue(colIndex, v, col)"
                    class="tbl-col-dialog__default-input"
                  />
                </td>
                <td class="tbl-col-dialog__toggle-cell">
                  <label class="tbl-col-dialog__toggle" :title="resolveShowInList(col) ? $t('table.colVisible') : $t('table.colHidden')">
                    <input
                      type="checkbox"
                      :checked="resolveShowInList(col)"
                      @change="nodeToggleShowInList(colIndex, col)"
                    />
                  </label>
                </td>
                <td class="tbl-col-dialog__toggle-cell">
                  <label class="tbl-col-dialog__toggle" :title="col.showInSearch ? $t('table.searchVisible') : $t('table.searchHidden')">
                    <input
                      type="checkbox"
                      :checked="col.showInSearch === true"
                      @change="nodeToggleShowInSearch(colIndex, col)"
                    />
                  </label>
                </td>
                <td class="tbl-col-dialog__toggle-cell">
                  <label class="tbl-col-dialog__toggle" :title="col.canUpdate === false ? $t('table.canEditDisabled') : $t('table.canEditEnabled')">
                    <input
                      type="checkbox"
                      :checked="col.canUpdate !== false"
                      @change="nodeToggleCanUpdate(colIndex, col)"
                    />
                  </label>
                </td>
                <td class="tbl-col-dialog__toggle-cell">
                  <label class="tbl-col-dialog__toggle" :title="col.canSort ? $t('table.sortEnabled') : $t('table.sortDisabled')">
                    <input
                      type="checkbox"
                      :checked="col.canSort === true"
                      @change="nodeToggleCanSort(colIndex, col)"
                    />
                  </label>
                </td>
                <td class="tbl-col-dialog__ops-cell">
                  <button
                    class="tbl-col-dialog__remove"
                    type="button"
                    @click="removeColumnFromUI(col.name)"
                  >{{ $t('table.delete') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="columnError" class="tbl-col-dialog__error">{{ columnError }}</div>

        <!-- 添加新列：一个按钮触发独立弹窗 -->
        <div class="tbl-col-dialog__section">
          <button
            class="tbl-col-dialog__add-trigger"
            type="button"
            @click="openAddColumnDialog"
          >{{ $t('table.addColumnTrigger') }}</button>
        </div>

        <div class="tbl-form__actions">
          <button
            class="tbl-form__btn tbl-form__btn--cancel"
            type="button"
            @click="showColumnDialog = false; columnError = ''"
          >{{ $t('table.close') }}</button>
        </div>
      </div>
    </HelpDialog>

    <!-- 添加列弹窗 -->
    <HelpDialog
      :visible="showAddColumnDialog"
      :title="$t('table.addColTitle')"
      :width="440"
      @close="closeAddColumnDialog"
    >
      <div class="tbl-add-col">
        <div class="tbl-form__field">
          <label class="tbl-form__label">{{ $t('table.addColNameLabel') }}</label>
          <input
            v-model="newColumnName"
            type="text"
            class="tbl-form__input"
            :placeholder="$t('table.addColNamePlaceholder')"
            @keydown.enter="addColumnFromUI"
          />
        </div>

        <div class="tbl-form__field">
          <label class="tbl-form__label">{{ $t('table.addColTitleLabel') }}</label>
          <input
            v-model="newColumnTitle"
            type="text"
            class="tbl-form__input"
            :placeholder="$t('table.addColTitlePlaceholder')"
            @keydown.enter="addColumnFromUI"
          />
        </div>

        <div class="tbl-form__field">
          <label class="tbl-form__label">{{ $t('table.addColBusinessTypeLabel') }}</label>
          <select v-model="newColumnBusinessType" class="tbl-form__input tbl-col-dialog__select">
            <option value="text">text（{{ $t('table.businessType.text') }}）</option>
            <option value="textarea">textarea（{{ $t('table.businessType.textarea') }}）</option>
            <option value="color">color（{{ $t('table.businessType.color') }}）</option>
            <option value="time">time（{{ $t('table.businessType.time') }}）</option>
            <option value="number">number（{{ $t('table.businessType.number') }}）</option>
            <option value="boolean">boolean（{{ $t('table.businessType.boolean') }}）</option>
          </select>
        </div>

        <div class="tbl-form__field">
          <label class="tbl-form__label">{{ $t('table.addColDefaultLabel') }}</label>
          <component
            :is="inputComponents[newColumnBusinessType]"
            v-model="newColumnDefaultValue"
          />
        </div>

        <div class="tbl-add-col__toggles">
          <label class="tbl-col-dialog__toggle" :title="$t('table.addColShowInListTitle')">
            <input type="checkbox" v-model="newColumnShowInList" />
            <span>{{ $t('table.addColShowInListLabel') }}</span>
          </label>
          <label class="tbl-col-dialog__toggle" :title="$t('table.addColShowInSearchTitle')">
            <input type="checkbox" v-model="newColumnShowInSearch" />
            <span>{{ $t('table.addColShowInSearchLabel') }}</span>
          </label>
          <label class="tbl-col-dialog__toggle" :title="$t('table.addColCanUpdateTitle')">
            <input type="checkbox" v-model="newColumnCanUpdate" />
            <span>{{ $t('table.addColCanUpdateLabel') }}</span>
          </label>
          <label class="tbl-col-dialog__toggle" :title="$t('table.addColCanSortTitle')">
            <input type="checkbox" v-model="newColumnCanSort" />
            <span>{{ $t('table.addColCanSortLabel') }}</span>
          </label>
        </div>

        <div v-if="columnError" class="tbl-col-dialog__error">{{ columnError }}</div>

        <div class="tbl-form__actions">
          <button
            class="tbl-form__btn tbl-form__btn--cancel"
            type="button"
            @click="closeAddColumnDialog"
          >{{ $t('table.addColCancel') }}</button>
          <button
            class="tbl-form__btn tbl-form__btn--confirm"
            type="button"
            @click="addColumnFromUI"
          >{{ $t('table.addColConfirm') }}</button>
        </div>
      </div>
    </HelpDialog>

    <!-- 帮助弹窗 -->
    <HelpDialog
      :visible="showHelp"
      :title="nodeTitle"
      :width="520"
      @close="showHelp = false"
    >
      <TableHelpDialog />
    </HelpDialog>

    <!-- 东南角 resize 手柄 -->
    <div class="tbl__resize" @pointerdown.stop="startResize" :title="$t('table.resizeTooltip')" />
  </div>
</template>

<style scoped lang="less">
.tbl {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: visible;

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

  &__search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
    flex-wrap: wrap;

    &-field {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &-label {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
    }

    &-input {
      width: 100px;
      min-width: 60px;
    }

    &-btn {
      all: unset;
      cursor: pointer;
      padding: 2px 10px;
      font-size: 11px;
      border-radius: 3px;
      background: #2563eb;
      color: white;
      flex-shrink: 0;

      &:hover { background: #1d4ed8; }

      &--reset {
        background: transparent;
        color: #64748b;
        border: 1px solid #cbd5e1;

        &:hover { background: #f1f5f9; color: #374151; }
      }
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

    &--search {
      /* 在搜索栏（flex）里自动靠右 */
      margin-left: auto;
    }
  }

  &__help-btn {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
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

    &--sortable {
      cursor: pointer;
      user-select: none;

      &:hover { background: #eef2f7; }
    }

    &--asc, &--desc { background: #e2e8f0; }
  }

  &__sort-indicator {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    margin-left: 2px;
    line-height: 0;
    vertical-align: middle;
  }

  &__sort-arrow {
    font-size: 8px;
    color: #94a3b8;

    &--asc.active { color: #2563eb; }
    &--desc.active { color: #2563eb; }
  }

  &__th--asc .tbl__sort-arrow--asc { color: #2563eb; }
  &__th--desc .tbl__sort-arrow--desc { color: #2563eb; }

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

  &__resize {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #4a7cff 50%);
    z-index: 2;
  }
}

.tbl-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__field {
    display: flex;
    flex-direction: row;
    gap: 4px;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    min-width: 120px;
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
    /* 表格行（tbody tr） */
    background: transparent;
    transition: background 0.15s;

    &:hover { background: #f8fafc; }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th, td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #eef2f7;
      vertical-align: middle;
    }

    thead th {
      background: #f1f5f9;
      font-weight: 600;
      color: #475569;
      font-size: 11px;
      white-space: nowrap;
    }

    tbody tr:last-child td { border-bottom: none; }
  }

  &__name-cell {
    font-family: monospace;
    color: #1e293b;
    font-size: 12px;
    white-space: nowrap;
  }

  &__toggle-cell {
    text-align: center;
    white-space: nowrap;
  }

  &__ops-cell {
    text-align: center;
    white-space: nowrap;
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
    width: 120px;
  }

  &__default-input {
    width: 110px;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: #64748b;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;

    input { cursor: pointer; }
  }

  &__remove {
    all: unset;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #fef2f2;
    color: #dc2626;
    display: inline-block;

    &:hover { background: #fee2e2; }
  }

  &__empty {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
  }

  &__add-form {
    /* 已废弃——添加新列改成独立弹窗，保留类名兼容旧引用 */
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  &__add-trigger {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 12px;
    border-radius: 6px;
    background: #eff6ff;
    color: #2563eb;
    border: 1px dashed #93c5fd;
    transition: background 0.15s;

    &:hover {
      background: #dbeafe;
      border-style: solid;
    }
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

/* —— 添加列弹窗内部样式 —— */
.tbl-add-col {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 8px 10px;
    background: #f8fafc;
    border-radius: 6px;
  }
}
</style>
