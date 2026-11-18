<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { viewport } from '@renderer/canvas/viewport'

const { t } = useI18n()
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import {
  TableNode,
  type ColumnType,
  type ColumnDef,
  type BusinessType,
  resolveBusinessType,
  resolveShowInList,
  defaultValueForType
} from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
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
import DateInput from './columnTypes/date/Input.vue'
import DateCell from './columnTypes/date/Cell.vue'
import ImageInput from './columnTypes/image/Input.vue'
import ImageCell from './columnTypes/image/Cell.vue'
import AudioInput from './columnTypes/audio/Input.vue'
import AudioCell from './columnTypes/audio/Cell.vue'
import TableHelpDialog from './TableHelpDialog.vue'

/** 业务类型 → 输入组件映射（表单里用） */
const inputComponents: Record<BusinessType, Component> = {
  text: TextInput,
  textarea: TextareaInput,
  number: NumberInput,
  boolean: BooleanInput,
  color: ColorInput,
  time: TimeInput,
  date: DateInput,
  image: ImageInput,
  audio: AudioInput,
  file: TextInput // TODO: 后续补 FileInput
}

/** 业务类型 → 单元格展示组件（表格里用） */
const cellComponents: Record<BusinessType, Component> = {
  text: TextCell,
  textarea: TextareaCell,
  number: NumberCell,
  boolean: BooleanCell,
  color: ColorCell,
  time: TimeCell,
  date: DateCell,
  image: ImageCell,
  audio: AudioCell,
  file: TextCell // TODO: 后续补 FileCell
}

const props = defineProps<{ id: string }>()

const tableNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TableNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => tableNode.value, t('table.nodeFallback'))
const { openNodeDetail } = useNodeDetail()

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
/** pageSize 也走 dummy ref 模式：node.pageSize 改了之后 bump 一下，强制 computed 重算 */
const pageSizeVersion = ref(0)
const pageSize = computed(() => {
  pageSizeVersion.value  // 强制依赖 dummy ref
  return tableNode.value?.pageSize ?? 10
})
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

// —— 帮助弹窗 ——
const showHelp = ref(false)

// —— SQL 端口管理弹窗 ——

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
  let lastMutationsVersion = node.mutationsVersion
  let lastPageSize = node.pageSize

  offChanged = node.onChanged(() => {
    // —— pageSize 变化：bump dummy ref 让 computed 重算，回第一页，重新查 ——
    if (node.pageSize !== lastPageSize) {
      lastPageSize = node.pageSize
      pageSizeVersion.value++
      page.value = 1
      loadPage()
      return
    }

    // 只有列定义真正变化（SQL 语法层）才 bump dummy ref 强制 computed 重算。
    // position / port 等变化也会走 notifyChanged，但这些不该触发列重渲染——
    // 否则拖动节点时 columnsVersion 反复 bump，打断 Vue 拖拽事件链。
    const curSig = columnsSig(node.columns)
    if (curSig !== lastColumnsSig) {
      lastColumnsSig = curSig
      columnsVersion.value++
      ensureAndLoad()
      return
    }

    // —— DML 副作用检测：mutationsVersion 变化说明 insert/update/delete 改过行 ——
    if (node.mutationsVersion !== lastMutationsVersion) {
      lastMutationsVersion = node.mutationsVersion
      loadPage()
    }
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
  const n = tableNode.value
  resizeStartBox = n ? [...n.box] : [0, 0]
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

  // @ts-ignore — 只在 renderer 里有 window.tableApi
  const ensureResult = await window.tableApi.ensure({
    nodeId: node.id,
    // @ts-ignore
    canvasId: window.getCurrentCanvasId(),
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
      pageSize: pageSize.value,
      where,
      sort
    })

    if (result.ok) {
      const totalCount = result.total as number
      // 数据被删后当前页可能越界，校正到合法范围
      const maxPage = Math.max(1, Math.ceil(totalCount / pageSize.value))
      if (page.value > maxPage) {
        page.value = maxPage
        // 页码变了，重新查才能拿到正确的 rows
        await loadPage()
        return
      }
      rows.value = result.rows as Row[]
      total.value = totalCount
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
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

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

function coerceFormValue(raw: unknown, type: ColumnType): unknown {
  // File 对象原样透传 —— insertRowValues 里会识别并存盘
  if (raw instanceof File) return raw

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
      // 统一走 TableNode.insertRowValues — 带 key 校验 + File 预处理 + 类型校验
      result = await node.insertRowValues(values)
    } else if (editingRowId.value !== null) {
      // 统一走 TableNode.updateRowValues — 额外带旧文件清理
      result = await node.updateRowValues(editingRowId.value, values)
    } else {
      showDialog.value = false
      return
    }

    if (result.ok) {
      showDialog.value = false
      // 插入时如果当前页未满，直接 append；否则重新加载
      if (dialogMode.value === 'add' && rows.value.length < pageSize.value) {
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
    const result = await node.deleteRowValues(Number(row.id))

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

/** 清空所有搜索条件 + 重置第一页 + 重新加载 */
function resetSearch(): void {
  Object.keys(searchValues).forEach((k) => delete searchValues[k])
  page.value = 1
  searchValuesVersion++
  loadPage()
}
</script>

<template>
  <div class="tbl">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          class="tbl__config-btn"
          type="button"
          :title="$t('table.detailPageSizeLabel')"
          @pointerdown.stop
          @click.stop="openNodeDetail(props.id)"
        >
          <GearIcon />
        </button>
        <button
          class="tbl__refresh-btn"
          type="button"
          :title="$t('table.refreshTooltip')"
          @click="page = 1; resetSearch(); loadPage()"
        >⟳</button>
      </template>
    </NodeHeader>

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
                :node-id="props.id"
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
            :node-id="props.id"
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
  padding: 0 8px 8px;
  gap: 4px;
  overflow: visible;

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

  &__config-btn {
    all: unset;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;

    svg { width: 12px; height: 12px; }
    &:hover { background: #dbeafe; color: #2563eb; }
  }

  &__refresh-btn {
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
    font-size: 13px;
    color: #303b4a;
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
