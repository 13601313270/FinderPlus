import type { LocalizedText } from '../../../shared/language'

/** 输入端口标签：通用「入」 */
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

/** 输出端口标签：通用「出」 */
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

/** 节点卡片内文案 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node',
    ja: 'ノードをドラッグ',
    ko: '노드 드래그',
    es: 'Arrastrar nodo',
    ar: 'اسحب العقدة',
    fr: 'Glisser le nœud',
    pt: 'Arrastar nó',
    ru: 'Перетащить узел',
    hi: 'नोड खींचें',
    id: 'Seret node',
    de: 'Knoten ziehen',
    vi: 'Kéo nút',
    tr: 'Düğümü sürükle',
    it: 'Trascina il nodo',
  }
} satisfies Record<string, LocalizedText>
