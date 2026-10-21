import type { LocalizedText } from '../../../shared/language'

export const messages: Record<string, LocalizedText> = {
  startTimeLabel: {
    zh: '开始时间（秒）',
    en: 'Start (s)'
  },
  endTimeLabel: {
    zh: '结束时间（秒）',
    en: 'End (s)'
  },
  trimButton: {
    zh: '截取',
    en: 'Trim'
  },
  trimming: {
    zh: '截取中…',
    en: 'Trimming…'
  },
  noAudioHint: {
    zh: '请接线输入音频',
    en: 'Connect an audio input'
  }
}