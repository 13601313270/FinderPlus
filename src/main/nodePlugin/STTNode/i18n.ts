import type { LocalizedText } from '../../../shared/language'

/**
 * 语音提取文字节点卡片 / 详情面板的文案。
 * 只配 zh + en，其余语言由 useLocalizedMessages 兜底到英语。
 */
export const messages: Record<string, LocalizedText> = {
  providerLabel: {
    zh: '服务商',
    en: 'Provider'
  },
  modelLabel: {
    zh: '模型',
    en: 'Model'
  },
  languageLabel: {
    zh: '语言提示',
    en: 'Language Hint'
  },
  workspaceIdLabel: {
    zh: '业务空间 ID（必填）',
    en: 'Workspace ID (required)'
  },
  workspaceIdPlaceholder: {
    zh: '例如 llm-xxxxxxxx',
    en: 'e.g. llm-xxxxxxxx'
  },
  apiKeyMissing: {
    zh: '当前服务商的 API Key 未配置，请先在设置中填写',
    en: 'API Key for this provider is not configured — set it in Settings'
  },
  workspaceMissing: {
    zh: '该模型需要填写业务空间 ID（Workspace ID）',
    en: 'This model requires a Workspace ID'
  },
  audioLabel: {
    zh: '音频',
    en: 'Audio'
  },
  pickAudio: {
    zh: '选择音频文件',
    en: 'Pick Audio File'
  },
  clearAudio: {
    zh: '清除',
    en: 'Clear'
  },
  audioConnected: {
    zh: '已从上游接线：{name}',
    en: 'Connected from upstream: {name}'
  },
  audioNotSelected: {
    zh: '未选择音频（可在详情中选择，或从音频文件节点接线）',
    en: 'No audio selected (pick one in details, or connect an Audio File node)'
  },
  autoGenerate: {
    zh: '收到音频时自动识别',
    en: 'Transcribe automatically on new audio'
  },
  generateButton: {
    zh: '提取文字',
    en: 'Extract Text'
  },
  cancelButton: {
    zh: '取消',
    en: 'Cancel'
  },
  resultLabel: {
    zh: '识别结果',
    en: 'Result'
  },
  emptyResult: {
    zh: '暂无结果',
    en: 'No result yet'
  },
  openDetailTitle: {
    zh: '配置（服务商、模型、音频…）',
    en: 'Configure (provider, model, audio...)'
  }
}
