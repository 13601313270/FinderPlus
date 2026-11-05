import type { LocalizedText } from '../../../shared/language'

/**
 * BoolDisplay 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  empty: {
    zh: '（待输入）',
    en: '(Awaiting)',
    ja: '（待機中）',
    ko: '(대기 중)',
    es: '(En espera)',
    ar: '(في انتظار)',
    fr: '(En attente)',
    pt: '(Aguardando)',
    ru: '(Ожидание)',
    hi: '(प्रतीक्षा)',
    id: '(Menunggu)',
    de: '(Warten)',
    vi: '(Đang chờ)',
    tr: '(Bekleniyor)',
    it: '(In attesa)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found',
    ja: 'ノードが存在しません',
    ko: '노드 없음',
    es: 'Nodo no encontrado',
    ar: 'العقدة غير موجودة',
    fr: 'Nœud introuvable',
    pt: 'Nó não encontrado',
    ru: 'Узел не найден',
    hi: 'नोड मौजूद नहीं है',
    id: 'Node tidak ditemukan',
    de: 'Knoten nicht gefunden',
    vi: 'Không tìm thấy nút',
    tr: 'Düğüm bulunamadı',
    it: 'Nodo non trovato'
  },
  stateTrue: {
    zh: '真',
    en: 'True',
    ja: '真',
    ko: '참',
    es: 'Verdadero',
    ar: 'صحيح',
    fr: 'Vrai',
    pt: 'Verdadeiro',
    ru: 'Истина',
    hi: 'सत्य',
    id: 'Benar',
    de: 'Wahr',
    vi: 'Đúng',
    tr: 'Doğru',
    it: 'Vero'
  },
  stateFalse: {
    zh: '假',
    en: 'False',
    ja: '偽',
    ko: '거짓',
    es: 'Falso',
    ar: 'خطأ',
    fr: 'Faux',
    pt: 'Falso',
    ru: 'Ложь',
    hi: 'असत्य',
    id: 'Salah',
    de: 'Falsch',
    vi: 'Sai',
    tr: 'Yanlış',
    it: 'Falso'
  },
  helpDialogTitle: {
    zh: '布尔值展示节点使用说明',
    en: 'Bool Display node help',
    ja: 'ブール表示ノードの使い方',
    ko: '불리언 표시 노드 도움말',
    es: 'Ayuda del nodo Mostrar booleano',
    ar: 'مساعدة عقدة عرض منطقي',
    fr: 'Aide du nœud Affichage booléen',
    pt: 'Ajuda do nó Exibir booleano',
    ru: 'Справка по узлу «Отображение логического»',
    hi: 'बूलियन प्रदर्शन नोड सहायता',
    id: 'Bantuan node Tampilan boolean',
    de: 'Hilfe zum Knoten „Bool-Anzeige“',
    vi: 'Trợ giúp nút Hiển thị boolean',
    tr: 'Bool Görüntüleme düğümü yardımı',
    it: 'Guida del nodo Visualizzazione booleano'
  }
} satisfies Record<string, LocalizedText>
