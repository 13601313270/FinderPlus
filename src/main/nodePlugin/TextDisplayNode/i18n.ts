import type { LocalizedText } from '../../../shared/language'

/**
 * TextDisplay 节点卡片内的全部文案。
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
  helpDialogTitle: {
    zh: '文本展示节点使用说明',
    en: 'Text Display node help',
    ja: 'テキスト表示ノードの使い方',
    ko: '텍스트 표시 노드 도움말',
    es: 'Ayuda del nodo Mostrar texto',
    ar: 'مساعدة عقدة عرض النص',
    fr: 'Aide du nœud Affichage texte',
    pt: 'Ajuda do nó Exibir texto',
    ru: 'Справка по узлу «Отображение текста»',
    hi: 'टेक्स्ट प्रदर्शन नोड सहायता',
    id: 'Bantuan node Tampilan teks',
    de: 'Hilfe zum Knoten „Textanzeige“',
    vi: 'Trợ giúp nút Hiển thị văn bản',
    tr: 'Metin Görüntüleme düğümü yardımı',
    it: 'Guida del nodo Visualizzazione testo'
  },
  previewHint: {
    zh: '全屏预览',
    en: 'Fullscreen preview',
    ja: 'フルスクリーンプレビュー',
    ko: '전체 화면 미리보기',
    es: 'Vista previa a pantalla completa',
    ar: 'معاينة ملء الشاشة',
    fr: 'Aperçu plein écran',
    pt: 'Pré-visualização em tela cheia',
    ru: 'Полноэкранный просмотр',
    hi: 'फुलस्क्रीन पूर्वावलोकन',
    id: 'Pratinjau layar penuh',
    de: 'Vollbild-Vorschau',
    vi: 'Xem trước toàn màn hình',
    tr: 'Tam ekran önizleme',
    it: 'Anteprima a schermo intero'
  },
  previewDialogTitle: {
    zh: '文本预览',
    en: 'Text preview',
    ja: 'テキストプレビュー',
    ko: '텍스트 미리보기',
    es: 'Vista previa de texto',
    ar: 'معاينة النص',
    fr: 'Aperçu du texte',
    pt: 'Pré-visualização de texto',
    ru: 'Просмотр текста',
    hi: 'पाठ पूर्वावलोकन',
    id: 'Pratinjau teks',
    de: 'Textvorschau',
    vi: 'Xem trước văn bản',
    tr: 'Metin önizleme',
    it: 'Anteprima testo'
  }
} satisfies Record<string, LocalizedText>
