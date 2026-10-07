import type { LocalizedText } from '../../../shared/language'

/**
 * BoolInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  clickToOpen: {
    zh: '点击开启',
    en: 'Click to turn on',
    ja: 'クリックでオン',
    ko: '클릭하여 켜기',
    es: 'Clic para activar',
    ar: 'انقر للتشغيل',
    fr: 'Cliquer pour activer',
    pt: 'Clique para ligar',
    ru: 'Нажмите, чтобы включить',
    hi: 'चालू करने के लिए क्लिक करें',
    id: 'Klik untuk menyalakan',
    de: 'Zum Einschalten klicken',
    vi: 'Nhấp để bật',
    tr: 'Açmak için tıkla',
    it: 'Clicca per attivare'
  },
  clickToClose: {
    zh: '点击关闭',
    en: 'Click to turn off',
    ja: 'クリックでオフ',
    ko: '클릭하여 끄기',
    es: 'Clic para desactivar',
    ar: 'انقر للإيقاف',
    fr: 'Cliquer pour désactiver',
    pt: 'Clique para desligar',
    ru: 'Нажмите, чтобы выключить',
    hi: 'बंद करने के लिए क्लिक करें',
    id: 'Klik untuk mematikan',
    de: 'Zum Ausschalten klicken',
    vi: 'Nhấp để tắt',
    tr: 'Kapatmak için tıkla',
    it: 'Clicca per disattivare'
  },
  helpDialogTitle: {
    zh: '布尔输入节点使用说明',
    en: 'Boolean Input node help',
    ja: 'ブール入力ノードの使い方',
    ko: '불리언 입력 노드 사용 안내',
    es: 'Ayuda del nodo Entrada booleana',
    ar: 'مساعدة عقدة الإدخال المنطقي',
    fr: 'Aide du nœud Entrée booléenne',
    pt: 'Ajuda do nó Entrada booleana',
    ru: 'Справка по узлу «Логический ввод»',
    hi: 'बूलियन इनपुट नोड सहायता',
    id: 'Bantuan node Masukan boolean',
    de: 'Hilfe zum Knoten „Boolesche Eingabe“',
    vi: 'Trợ giúp nút Đầu vào boolean',
    tr: 'Mantıksal Giriş düğümü yardımı',
    it: 'Guida del nodo Input booleano'
  }
} satisfies Record<string, LocalizedText>
