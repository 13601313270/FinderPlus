import type { LocalizedText } from '../../../shared/language'

/**
 * NumberDisplay 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  empty: {
    zh: '（暂无输出）',
    en: '(No output)',
    ja: '（出力なし）',
    ko: '(출력 없음)',
    es: '(Sin salida)',
    ar: '(لا يوجد إخراج)',
    fr: '(Aucune sortie)',
    pt: '(Sem saída)',
    ru: '(Нет вывода)',
    hi: '(कोई आउटपुट नहीं)',
    id: '(Tidak ada keluaran)',
    de: '(Keine Ausgabe)',
    vi: '(Không có đầu ra)',
    tr: '(Çıkış yok)',
    it: '(Nessun output)'
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
  resizeHint: {
    zh: '拖拽调整节点大小',
    en: 'Drag to resize the node',
    ja: 'ドラッグでノードのサイズを変更',
    ko: '드래그하여 노드 크기 조절',
    es: 'Arrastra para cambiar el tamaño del nodo',
    ar: 'اسحب لتغيير حجم العقدة',
    fr: 'Glisser pour redimensionner le nœud',
    pt: 'Arraste para redimensionar o nó',
    ru: 'Перетащите, чтобы изменить размер узла',
    hi: 'नोड का आकार बदलने के लिए खींचें',
    id: 'Seret untuk mengubah ukuran node',
    de: 'Ziehen, um die Knotengröße zu ändern',
    vi: 'Kéo để thay đổi kích thước nút',
    tr: 'Düğüm boyutunu değiştirmek için sürükle',
    it: 'Trascina per ridimensionare il nodo'
  },
  settingsHint: {
    zh: '设置',
    en: 'Settings',
    ja: '設定',
    ko: '설정',
    es: 'Ajustes',
    ar: 'الإعدادات',
    fr: 'Réglages',
    pt: 'Configurações',
    ru: 'Настройки',
    hi: 'सेटिंग्स',
    id: 'Pengaturan',
    de: 'Einstellungen',
    vi: 'Cài đặt',
    tr: 'Ayarlar',
    it: 'Impostazioni'
  },
  settingsTitle: {
    zh: '文字颜色',
    en: 'Text color',
    ja: '文字色',
    ko: '글자 색',
    es: 'Color del texto',
    ar: 'لون النص',
    fr: 'Couleur du texte',
    pt: 'Cor do texto',
    ru: 'Цвет текста',
    hi: 'टेक्स्ट का रंग',
    id: 'Warna teks',
    de: 'Textfarbe',
    vi: 'Màu chữ',
    tr: 'Metin rengi',
    it: 'Colore del testo'
  },
  customLabel: {
    zh: '自定义',
    en: 'Custom',
    ja: 'カスタム',
    ko: '사용자 지정',
    es: 'Personalizado',
    ar: 'مخصص',
    fr: 'Personnalisé',
    pt: 'Personalizado',
    ru: 'Свой',
    hi: 'कस्टम',
    id: 'Kustom',
    de: 'Benutzerdefiniert',
    vi: 'Tùy chỉnh',
    tr: 'Özel',
    it: 'Personalizzato'
  },
  helpDialogTitle: {
    zh: '数字展示节点使用说明',
    en: 'Number Display node help',
    ja: '数値表示ノードの使い方',
    ko: '숫자 표시 노드 도움말',
    es: 'Ayuda del nodo Mostrar número',
    ar: 'مساعدة عقدة عرض الرقم',
    fr: 'Aide du nœud Affichage nombre',
    pt: 'Ajuda do nó Exibir número',
    ru: 'Справка по узлу «Отображение числа»',
    hi: 'संख्या प्रदर्शन नोड सहायता',
    id: 'Bantuan node Tampilan angka',
    de: 'Hilfe zum Knoten „Zahlenanzeige“',
    vi: 'Trợ giúp nút Hiển thị số',
    tr: 'Sayı Görüntüleme düğümü yardımı',
    it: 'Guida del nodo Visualizzazione numero'
  }
} satisfies Record<string, LocalizedText>
