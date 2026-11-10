import type { LocalizedText } from '../../../shared/language'

/** 端口标签（引擎构造端口时用）—— 复用 BufferNode 同形态 */
export const inLabel: LocalizedText = {
  zh: '入',
  en: 'In',
  ja: '入力',
  ko: '입력',
  es: 'Entrada',
  ar: 'إدخال',
  fr: 'Entrée',
  pt: 'Entrada',
  ru: 'Ввод',
  hi: 'इनपुट',
  id: 'Masukan',
  de: 'Eingabe',
  vi: 'Vào',
  tr: 'Giriş',
  it: 'Ingresso'
}

export const outLabel: LocalizedText = {
  zh: '出',
  en: 'Out',
  ja: '出力',
  ko: '출력',
  es: 'Salida',
  ar: 'إخراج',
  fr: 'Sortie',
  pt: 'Saída',
  ru: 'Вывод',
  hi: 'आउटपुट',
  id: 'Keluaran',
  de: 'Ausgabe',
  vi: 'Ra',
  tr: 'Çıkış',
  it: 'Uscita'
}

/** 卡片内文案 */
export const messages = {
  inputsLabel: {
    zh: '输入',
    en: 'In',
    ja: '入力',
    ko: '입력',
    es: 'Entrada',
    ar: 'إدخال',
    fr: 'Entrée',
    pt: 'Entrada',
    ru: 'Ввод',
    hi: 'इनपुट',
    id: 'Masukan',
    de: 'Eingabe',
    vi: 'Vào',
    tr: 'Giriş',
    it: 'Ingresso'
  },
  outputsLabel: {
    zh: '输出',
    en: 'Out',
    ja: '出力',
    ko: '출력',
    es: 'Salida',
    ar: 'إخراج',
    fr: 'Sortie',
    pt: 'Saída',
    ru: 'Вывод',
    hi: 'आउटपुट',
    id: 'Keluaran',
    de: 'Ausgabe',
    vi: 'Ra',
    tr: 'Çıkış',
    it: 'Uscita'
  },
  inLabel,
  outLabel,
} satisfies Record<string, LocalizedText>
