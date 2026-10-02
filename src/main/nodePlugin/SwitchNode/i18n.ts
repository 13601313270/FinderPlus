import type { LocalizedText } from '../../../shared/language'

/**
 * Switch 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
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
    it: 'Trascina nodo'
  },
  branchPass: {
    zh: '✓ 通过',
    en: '✓ Pass',
    ja: '✓ 通過',
    ko: '✓ 통과',
    es: '✓ Pasa',
    ar: '✓ يمر',
    fr: '✓ Pass',
    pt: '✓ Passa',
    ru: '✓ Пропустить',
    hi: '✓ पास',
    id: '✓ Lolos',
    de: '✓ Bestanden',
    vi: '✓ Đạt',
    tr: '✓ Geçti',
    it: '✓ Supera'
  },
  branchFail: {
    zh: '✗ 驳回',
    en: '✗ Reject',
    ja: '✗ 却下',
    ko: '✗ 반려',
    es: '✗ Rechaza',
    ar: '✗ يُرفض',
    fr: '✗ Rejet',
    pt: '✗ Rejeita',
    ru: '✗ Отклонить',
    hi: '✗ अस्वीकार',
    id: '✗ Tolak',
    de: '✗ Abgelehnt',
    vi: '✗ Từ chối',
    tr: '✗ Reddet',
    it: '✗ Rifiuta'
  }
} satisfies Record<string, LocalizedText>
