<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import {
  TableNode,
  type ColumnType,
  type ColumnDef,
  type BusinessType,
  BUSINESS_TYPE_MAP,
  resolveBusinessType,
  resolveShowInList,
  defaultValueForType
} from './node'
import TextInput from './columnTypes/text/Input.vue'
import TextareaInput from './columnTypes/textarea/Input.vue'
import NumberInput from './columnTypes/number/Input.vue'
import BooleanInput from './columnTypes/boolean/Input.vue'
import ColorInput from './columnTypes/color/Input.vue'
import TimeInput from './columnTypes/time/Input.vue'
import DateInput from './columnTypes/date/Input.vue'
import ImageInput from './columnTypes/image/Input.vue'
import AudioInput from './columnTypes/audio/Input.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'

const { t } = useI18n()
const props = defineProps<{ nodeId: string }>()

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
  file: TextInput
}

// —— 节点 & 生命周期 ——
const node = shallowRef<TableNode | undefined>(undefined)
let offChanged: (() => void) | undefined

// —— pageSize ——
const pageSizeInput = ref(10)
const PRESET_SIZES = [10, 20, 50, 100]

// —— 列管理 UI 状态 ——
/** 强制列列表重算的 dummy ref */
const columnsVersion = ref(0)
/** 列列表（来自 node.columns，依赖 columnsVersion 强制重算） */
const formColumns = computed<ColumnDef[]>(() => {
  columnsVersion.value
  return node.value ? [...node.value.columns] : []
})

// —— SQL 端口管理 ——
/** 强制 queryPorts 列表重渲染的 dummy ref */
const sqlPortVersion = ref(0)
/** SQL 查询端口对列表 */
const sqlPortPairs = computed(() => {
  sqlPortVersion.value
  return node.value ? [...node.value.queryPorts] : []
})

/** 添加列表单是否展开 */
const showAddColumnForm = ref(false)
const newColumnName = ref('')
const newColumnTitle = ref('')
const newColumnBusinessType = ref<BusinessType>('text')
const newColumnDefaultValue = ref<unknown>('')
const newColumnShowInList = ref(true)
const newColumnShowInSearch = ref(false)
const newColumnCanUpdate = ref(true)
const newColumnCanSort = ref(false)
const columnError = ref('')

// businessType 切换时，defaultValue 重置成该类型的初始值
watch(newColumnBusinessType, (bt) => {
  const storageType = BUSINESS_TYPE_MAP[bt]
  newColumnDefaultValue.value = defaultValueForType(storageType)
})

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof TableNode) {
    node.value = found
    pageSizeInput.value = found.pageSize
    columnsVersion.value++
    offChanged = found.onChanged(() => {
      pageSizeInput.value = found.pageSize
      columnsVersion.value++
      sqlPortVersion.value++
    })
  }
})

onBeforeUnmount(() => {
  offChanged?.()
})

// —— pageSize 操作 ——
function applyPageSize(): void {
  const n = node.value
  if (!n) return
  const v = Math.round(pageSizeInput.value)
  if (Number.isFinite(v) && v >= 1 && v <= 1000) {
    n.setPageSize(v)
  } else {
    pageSizeInput.value = n.pageSize
  }
}

function applyPreset(size: number): void {
  node.value?.setPageSize(size)
}

// —— 列管理操作 ——
function resetAddColumnForm(): void {
  newColumnName.value = ''
  newColumnTitle.value = ''
  newColumnBusinessType.value = 'text'
  newColumnDefaultValue.value = ''
  newColumnShowInList.value = true
  newColumnShowInSearch.value = false
  newColumnCanUpdate.value = true
  newColumnCanSort.value = false
  columnError.value = ''
}

function openAddColumnForm(): void {
  resetAddColumnForm()
  showAddColumnForm.value = true
}

function closeAddColumnForm(): void {
  showAddColumnForm.value = false
  columnError.value = ''
}

async function addColumnFromUI(): Promise<void> {
  const n = node.value
  if (!n) return

  const name = newColumnName.value.trim()
  if (!name) { columnError.value = t('table.errorEmptyName'); return }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) { columnError.value = t('table.errorInvalidName'); return }
  if (n.columns.some((c) => c.name === name)) {
    columnError.value = t('table.errorDuplicateName', { name })
    return
  }
  columnError.value = ''

  try {
    const storageType: ColumnType = BUSINESS_TYPE_MAP[newColumnBusinessType.value]
    // @ts-ignore
    const alterResult = await window.tableApi.addColumn({
      nodeId: n.id,
      column: { name, type: storageType }
    })
    if (!alterResult.ok) { columnError.value = alterResult.error; return }

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
    const dv = newColumnDefaultValue.value
    if (dv !== null && dv !== undefined) col.defaultValue = dv
    n.addColumn(col)

    resetAddColumnForm()
    showAddColumnForm.value = false
  } catch (err) {
    columnError.value = err instanceof Error ? err.message : String(err)
  }
}

function updateColumnTitle(index: number, value: string): void {
  const trimmed = value.trim()
  node.value?.updateColumnMeta(index, { title: trimmed || undefined })
}

function nodeToggleShowInList(index: number, col: ColumnDef): void {
  node.value?.updateColumnMeta(index, { showInList: !resolveShowInList(col) })
}

function nodeSetDefaultValue(index: number, value: unknown, col: ColumnDef): void {
  const fallback = defaultValueForType(col.type)
  const dv = value === fallback ? null : value
  node.value?.updateColumnMeta(index, { defaultValue: dv })
}

function nodeToggleShowInSearch(index: number, col: ColumnDef): void {
  node.value?.updateColumnMeta(index, { showInSearch: !col.showInSearch })
}

function nodeToggleCanUpdate(index: number, col: ColumnDef): void {
  node.value?.updateColumnMeta(index, { canUpdate: col.canUpdate === false })
}

function nodeToggleCanSort(index: number, col: ColumnDef): void {
  node.value?.updateColumnMeta(index, { canSort: !col.canSort })
}

async function removeColumnFromUI(colName: string): Promise<void> {
  const n = node.value
  if (!n) return
  const ok = confirm(t('table.confirmDeleteColumn', { name: colName }))
  if (!ok) return

  try {
    // @ts-ignore
    const alterResult = await window.tableApi.removeColumn({
      nodeId: n.id,
      columnName: colName
    })
    if (!alterResult.ok) { columnError.value = alterResult.error; return }

    const idx = n.columns.findIndex((c) => c.name === colName)
    if (idx >= 0) {
      n.removeColumn(idx)
      columnsVersion.value++
    }
  } catch (err) {
    columnError.value = err instanceof Error ? err.message : String(err)
  }
}

/** 添加 SQL 查询端口 */
function addQueryPortFromUI(): void {
  node.value?.addQueryPort()
  sqlPortVersion.value++
}

/** 移除 SQL 查询端口对（带 confirm） */
function removeQueryPortFromUI(id: string, idx: number): void {
  const n = node.value
  if (!n) return
  const ok = confirm(t('table.sqlPortConfirmDelete', { idx: idx + 1 }))
  if (!ok) return
  n.removeQueryPort(id)
  sqlPortVersion.value++
}
</script>

<template>
  <div class="detail-panel">
    <!-- ===== 每页记录数 ===== -->
    <div class="detail-panel__section">
      <div class="detail-panel__section-title">{{ $t('table.detailPageSizeLabel') }}</div>
      <div class="detail-panel__row">
        <input
          v-model.number="pageSizeInput"
          type="number"
          min="1"
          max="1000"
          class="detail-panel__input"
          @blur="applyPageSize"
          @keydown.enter="applyPageSize"
        />
        <button class="detail-panel__apply-btn" type="button" @click="applyPageSize">
          {{ $t('table.detailApply') }}
        </button>
      </div>
      <div class="detail-panel__hint">{{ $t('table.detailPageSizeHint') }}</div>
      <div class="detail-panel__presets">
        <button
          v-for="s in PRESET_SIZES"
          :key="s"
          class="detail-panel__preset"
          type="button"
          :class="{ 'detail-panel__preset--active': node?.pageSize === s }"
          @click="applyPreset(s)"
        >{{ s }}</button>
      </div>
    </div>

    <!-- ===== 列管理 ===== -->
    <div class="detail-panel__section">
      <div class="detail-panel__section-title">{{ $t('table.columnSettings') }}</div>

      <!-- 现有列列表 -->
      <div v-if="!node || node.columns.length === 0" class="detail-panel__empty">
        {{ $t('table.colEmpty') }}
      </div>
      <table v-else class="detail-panel__table">
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
          <tr v-for="(col, colIndex) in formColumns" :key="col.name">
            <td class="detail-panel__name-cell">{{ col.name }}</td>
            <td>
              <span class="detail-panel__type-tag">{{ $t('table.businessType.' + resolveBusinessType(col)) }}</span>
            </td>
            <td>
              <input
                class="detail-panel__col-input"
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
                class="detail-panel__col-default"
                :node-id="props.nodeId"
              />
            </td>
            <td class="detail-panel__toggle-cell">
              <label class="detail-panel__toggle">
                <input type="checkbox" :checked="resolveShowInList(col)" @change="nodeToggleShowInList(colIndex, col)" />
              </label>
            </td>
            <td class="detail-panel__toggle-cell">
              <label class="detail-panel__toggle">
                <input type="checkbox" :checked="col.showInSearch === true" @change="nodeToggleShowInSearch(colIndex, col)" />
              </label>
            </td>
            <td class="detail-panel__toggle-cell">
              <label class="detail-panel__toggle">
                <input type="checkbox" :checked="col.canUpdate !== false" @change="nodeToggleCanUpdate(colIndex, col)" />
              </label>
            </td>
            <td class="detail-panel__toggle-cell">
              <label class="detail-panel__toggle">
                <input type="checkbox" :checked="col.canSort === true" @change="nodeToggleCanSort(colIndex, col)" />
              </label>
            </td>
            <td class="detail-panel__ops-cell">
              <button class="detail-panel__remove" type="button" @click="removeColumnFromUI(col.name)">
                {{ $t('table.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 错误提示 -->
      <div v-if="columnError" class="detail-panel__error">{{ columnError }}</div>

      <!-- 添加列：按钮触发独立弹窗 -->
      <div class="detail-panel__add-trigger-wrap">
        <button class="detail-panel__add-trigger" type="button" @click="openAddColumnForm">
          ＋ {{ $t('table.addColumnTrigger') }}
        </button>
      </div>
    </div>

    <!-- 添加列弹窗 -->
    <HelpDialog
      :visible="showAddColumnForm"
      :title="$t('table.addColTitle')"
      :width="440"
      @close="closeAddColumnForm"
    >
      <div class="detail-panel__add-form">
        <div class="detail-panel__field">
          <label class="detail-panel__label">{{ $t('table.addColNameLabel') }}</label>
          <input
            v-model="newColumnName"
            type="text"
            class="detail-panel__input"
            :placeholder="$t('table.addColNamePlaceholder')"
            @keydown.enter="addColumnFromUI"
          />
        </div>
        <div class="detail-panel__field">
          <label class="detail-panel__label">{{ $t('table.addColTitleLabel') }}</label>
          <input
            v-model="newColumnTitle"
            type="text"
            class="detail-panel__input"
            :placeholder="$t('table.addColTitlePlaceholder')"
            @keydown.enter="addColumnFromUI"
          />
        </div>
        <div class="detail-panel__field">
          <label class="detail-panel__label">{{ $t('table.addColBusinessTypeLabel') }}</label>
          <select v-model="newColumnBusinessType" class="detail-panel__input">
            <option value="text">text（{{ $t('table.businessType.text') }}）</option>
            <option value="textarea">textarea（{{ $t('table.businessType.textarea') }}）</option>
            <option value="number">number（{{ $t('table.businessType.number') }}）</option>
            <option value="boolean">boolean（{{ $t('table.businessType.boolean') }}）</option>
            <option value="color">color（{{ $t('table.businessType.color') }}）</option>
            <option value="time">time（{{ $t('table.businessType.time') }}）</option>
            <option value="date">date（{{ $t('table.businessType.date') }}）</option>
            <option value="image">image（{{ $t('table.businessType.image') }}）</option>
            <option value="audio">audio（{{ $t('table.businessType.audio') }}）</option>
          </select>
        </div>
        <div class="detail-panel__field">
          <label class="detail-panel__label">{{ $t('table.addColDefaultLabel') }}</label>
          <component :is="inputComponents[newColumnBusinessType]" v-model="newColumnDefaultValue" />
        </div>
        <div class="detail-panel__toggles">
          <label class="detail-panel__toggle">
            <input type="checkbox" v-model="newColumnShowInList" />
            <span>{{ $t('table.addColShowInListLabel') }}</span>
          </label>
          <label class="detail-panel__toggle">
            <input type="checkbox" v-model="newColumnShowInSearch" />
            <span>{{ $t('table.addColShowInSearchLabel') }}</span>
          </label>
          <label class="detail-panel__toggle">
            <input type="checkbox" v-model="newColumnCanUpdate" />
            <span>{{ $t('table.addColCanUpdateLabel') }}</span>
          </label>
          <label class="detail-panel__toggle">
            <input type="checkbox" v-model="newColumnCanSort" />
            <span>{{ $t('table.addColCanSortLabel') }}</span>
          </label>
        </div>
        <div v-if="columnError" class="detail-panel__error">{{ columnError }}</div>
        <div class="detail-panel__add-actions">
          <button class="detail-panel__btn detail-panel__btn--cancel" type="button" @click="closeAddColumnForm">
            {{ $t('table.addColCancel') }}
          </button>
          <button class="detail-panel__btn detail-panel__btn--confirm" type="button" @click="addColumnFromUI">
            {{ $t('table.addColConfirm') }}
          </button>
        </div>
      </div>
    </HelpDialog>

    <!-- ===== SQL 端口管理 ===== -->
    <div class="detail-panel__section">
      <div class="detail-panel__section-title">{{ $t('table.sqlPortSectionTitle') }}</div>

      <div v-if="sqlPortPairs.length === 0" class="detail-panel__empty">
        {{ $t('table.sqlPortEmpty') }}
      </div>
      <table v-else class="detail-panel__table">
        <thead>
          <tr>
            <th>{{ $t('table.colHeaderName') }}</th>
            <th>{{ $t('table.colHeaderOperations') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(pair, idx) in sqlPortPairs" :key="pair.id">
            <td class="detail-panel__name-cell">
              {{ pair.input.label?.zh ?? '' }} / {{ pair.output.label.zh }}
            </td>
            <td class="detail-panel__ops-cell">
              <button
                class="detail-panel__remove"
                type="button"
                @click="removeQueryPortFromUI(pair.id, idx)"
              >{{ $t('table.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="detail-panel__add-trigger-wrap">
        <button class="detail-panel__add-trigger" type="button" @click="addQueryPortFromUI">
          ＋ {{ $t('table.sqlPortAdd') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__section-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    min-width: 110px;
    color: #374151;
    display: flex;
    align-items: center;
  }

  &__hint {
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.4;
  }

  &__empty {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
  }

  // —— pageSize ——
  &__row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }

  &__input {
    flex: 1;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
    color: #1f2937;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    // 去掉 number 输入框右侧箭头
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  &__apply-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    transition: background 0.15s;

    &:hover { background: #2563eb; }
    &:active { background: #1d4ed8; }
  }

  &__presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__preset {
    all: unset;
    cursor: pointer;
    padding: 4px 12px;
    font-size: 12px;
    color: #475569;
    background: #f1f5f9;
    border-radius: 4px;
    transition: background 0.15s, color 0.15s;

    &:hover { background: #e2e8f0; color: #1f2937; }

    &--active {
      background: #2563eb;
      color: #fff;

      &:hover { background: #1d4ed8; color: #fff; }
    }
  }

  // —— 列管理表格 ——
  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th, td {
      padding: 6px 6px;
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
    tbody tr:hover { background: #f8fafc; }
  }

  &__name-cell {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #1e293b;
    font-size: 12px;
    white-space: nowrap;
  }

  &__type-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #e2e8f0;
    color: #64748b;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase;
  }

  &__col-input {
    width: 100px;
    padding: 4px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    outline: none;

    &:focus { border-color: #2563eb; }
  }

  &__col-default {
    width: 110px;
  }

  &__toggle-cell, &__ops-cell {
    text-align: center;
    white-space: nowrap;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: #64748b;
    cursor: pointer;
    user-select: none;

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

    &:hover { background: #fee2e2; }
  }

  &__error {
    font-size: 12px;
    color: #dc2626;
  }

  // —— 添加列表单 ——
  &__add-trigger-wrap {
    display: flex;
    justify-content: flex-start;
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

  &__add-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafbfc;
  }

  &__field {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
  }

  &__toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 8px 10px;
    background: #f1f5f9;
    border-radius: 6px;
  }

  &__add-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
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
</style>
