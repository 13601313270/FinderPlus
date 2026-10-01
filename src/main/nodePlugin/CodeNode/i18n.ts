import type { LocalizedText } from '../../../shared/language'

/**
 * Code 节点卡片（主视图 + 配置弹窗）内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 *
 * 注：代码示例里的 "端口名" / 值 属于展示文案，一并按语言替换为 portName / value。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help'
  },
  configTitle: {
    zh: '配置端口与代码',
    en: 'Configure ports and code'
  },
  configBtn: {
    zh: '配置函数',
    en: 'Configure function'
  },
  running: {
    zh: '执行中…',
    en: 'Running…'
  },
  run: {
    zh: '执行',
    en: 'Run'
  },
  clickToRun: {
    zh: '（点击执行运行代码）',
    en: '(Click Run to execute the code)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found'
  },
  statusIdle: {
    zh: '空闲',
    en: 'Idle'
  },
  statusRunning: {
    zh: '执行中',
    en: 'Running'
  },
  statusDone: {
    zh: '完成',
    en: 'Done'
  },
  statusError: {
    zh: '出错',
    en: 'Error'
  },
  autoLabel: {
    zh: '自动',
    en: 'Auto'
  },
  runHint: {
    zh: '执行代码',
    en: 'Run the code'
  },
  runHintNoCode: {
    zh: '请先在编辑区写代码',
    en: 'Write some code in the editor first'
  },
  helpDialogTitle: {
    zh: '代码节点使用说明',
    en: 'Code node help'
  },
  configDialogTitle: {
    zh: '配置函数',
    en: 'Configure function'
  },
  inputsTitle: {
    zh: '输入端口',
    en: 'Input ports'
  },
  outputsTitle: {
    zh: '输出端口',
    en: 'Output ports'
  },
  addInputHint: {
    zh: '添加一个输入端口',
    en: 'Add an input port'
  },
  addOutputHint: {
    zh: '添加一个输出端口',
    en: 'Add an output port'
  },
  inputsEmpty: {
    zh: '点击 + 添加输入端口',
    en: 'Click + to add an input port'
  },
  outputsEmpty: {
    zh: '至少保留一个输出端口',
    en: 'Keep at least one output port'
  },
  typeLabel: {
    zh: '类型',
    en: 'Type'
  },
  varNameLabel: {
    zh: '变量名',
    en: 'Variable name'
  },
  portNameLabel: {
    zh: '端口名',
    en: 'Port name'
  },
  inputKindHint: {
    zh: '选择此输入接受的 Value 类型',
    en: 'Choose the Value type this input accepts'
  },
  outputKindHint: {
    zh: '选择此输出产出的 Value 类型',
    en: 'Choose the Value type this output produces'
  },
  removeInputHint: {
    zh: '删除此输入端口',
    en: 'Remove this input port'
  },
  removeOutputHint: {
    zh: '删除此输出端口（至少保留一个）',
    en: 'Remove this output port (keep at least one)'
  },
  snippetPortName: {
    zh: '"端口名"',
    en: '"portName"'
  },
  snippetValue: {
    zh: '值',
    en: 'value'
  },
  snippetCall: {
    zh: 'callOutputPort("端口名", 值)',
    en: 'callOutputPort("portName", value)'
  },
  copyHint: {
    zh: '复制函数签名',
    en: 'Copy the function signature'
  },
  copied: {
    zh: '已复制',
    en: 'Copied'
  },
  availablePorts: {
    zh: '可用端口：',
    en: 'Available ports: '
  },
  portKindHint: {
    zh: '类型: {kind}',
    en: 'Type: {kind}'
  },
  editorPlaceholderWithInputs: {
    zh: "写函数体，通过 callOutputPort('端口名', 值) 提交。\n直接用上方输入的变量名访问，例如：\ncallOutputPort('result', price * qty)\n\nsetTimeout / Promise.then 里的延迟调用也能正常触发",
    en: "Write the function body and submit via callOutputPort('portName', value).\nAccess inputs directly by their variable names, e.g.:\ncallOutputPort('result', price * qty)\n\nDeferred calls inside setTimeout / Promise.then also work"
  },
  editorPlaceholderWithoutInputs: {
    zh: "写函数体，通过 callOutputPort('端口名', 值) 提交，例如：\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nsetTimeout / Promise.then 里的延迟调用也能正常触发",
    en: "Write the function body and submit via callOutputPort('portName', value), e.g.:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nDeferred calls inside setTimeout / Promise.then also work"
  },
  errNameEmpty: {
    zh: '名称不能为空',
    en: 'Name cannot be empty'
  },
  errNameInvalid: {
    zh: '名称必须是合法 JS 标识符（字母/数字/$/_，不能数字开头）',
    en: 'Name must be a valid JS identifier (letters/digits/$/_, cannot start with a digit)'
  },
  errNameReserved: {
    zh: '不能用保留字 "{name}"',
    en: '"{name}" is a reserved word'
  },
  errNameDuplicateInput: {
    zh: '变量名 "{name}" 已存在',
    en: 'Variable name "{name}" already exists'
  },
  errNameDuplicateOutput: {
    zh: '端口名 "{name}" 已存在',
    en: 'Port name "{name}" already exists'
  },
  errNameConflictInput: {
    zh: '端口名 "{name}" 与输入变量名冲突',
    en: 'Port name "{name}" conflicts with an input variable name'
  }
} satisfies Record<string, LocalizedText>