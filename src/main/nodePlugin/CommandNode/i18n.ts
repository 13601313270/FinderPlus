import type { LocalizedText } from '../../../shared/language'

/**
 * Command 节点卡片（含齿轮编辑面板）内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)'
  },
  editCommand: {
    zh: '编辑命令',
    en: 'Edit command'
  },
  namePlaceholder: {
    zh: '命令名称，例如：构建项目',
    en: 'Command name, e.g. Build project'
  },
  clickEditHint: {
    zh: '点击编辑命令模板',
    en: 'Click to edit the command template'
  },
  noCommand: {
    zh: '（未设置命令，点击这里或齿轮设置）',
    en: '(No command set — click here or the gear to set one)'
  },
  portsCount: {
    zh: '输入端口：{n} 个（模板里用 $1…$N 引用）',
    en: 'Input ports: {n} (reference as $1…$N in the template)'
  },
  removePortHint: {
    zh: '移除末尾输入端口',
    en: 'Remove the last input port'
  },
  addPortHint: {
    zh: '新增输入端口',
    en: 'Add an input port'
  },
  running: {
    zh: '执行中…',
    en: 'Running…'
  },
  run: {
    zh: '执行',
    en: 'Run'
  },
  noOutput: {
    zh: '（无输出）',
    en: '(No output)'
  },
  clickToRun: {
    zh: '（点击执行运行已保存的命令）',
    en: '(Click Run to execute the saved command)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found'
  },
  runHint: {
    zh: '执行已保存的命令',
    en: 'Run the saved command'
  },
  runHintNoCommand: {
    zh: '请先点击齿轮设置命令',
    en: 'Click the gear to set a command first'
  },
  editorTitle: {
    zh: '编辑命令模板',
    en: 'Edit command template'
  },
  templatePlaceholder: {
    zh: '命令模板，例如：npm run build -- $1',
    en: 'Command template, e.g. npm run build -- $1'
  },
  cancel: {
    zh: '取消',
    en: 'Cancel'
  },
  save: {
    zh: '保存',
    en: 'Save'
  }
} satisfies Record<string, LocalizedText>