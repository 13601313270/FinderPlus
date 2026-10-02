import type { LocalizedText } from '../../../shared/language'

/**
 * ImgFile 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点 · 拖出窗口移动文件 · 双击用系统默认应用打开',
    en: 'Drag node · drag out of the window to move the file · double-click to open with the system default app',
    ja: 'ノードをドラッグ · ウィンドウの外へドラッグでファイルを移動 · ダブルクリックでシステムの既定アプリで開く',
    ko: '노드 드래그 · 창 밖으로 끌어 파일 이동 · 두 번 클릭하면 시스템 기본 앱으로 열기',
    es: 'Arrastrar el nodo · arrástralo fuera de la ventana para mover el archivo · doble clic para abrirlo con la aplicación predeterminada del sistema',
    ar: 'اسحب العقدة · اسحبها خارج النافذة لنقل الملف · انقر مرتين لفتحه بالتطبيق الافتراضي للنظام',
    fr: 'Glisser le nœud · faites-le glisser hors de la fenêtre pour déplacer le fichier · double-cliquez pour l’ouvrir avec l’application par défaut du système',
    pt: 'Arrastar o nó · arraste para fora da janela para mover o ficheiro · duplo clique para abrir com a aplicação predefinida do sistema',
    ru: 'Перетащить узел · перетащите за пределы окна, чтобы переместить файл · двойной щелчок открывает приложением по умолчанию'
  },
  dragHintEmpty: {
    zh: '拖动节点（未选文件）',
    en: 'Drag node (no file selected)',
    ja: 'ノードをドラッグ（ファイル未選択）',
    ko: '노드 드래그 (파일 선택 안 됨)',
    es: 'Arrastrar el nodo (sin archivo seleccionado)',
    ar: 'اسحب العقدة (لم يتم اختيار ملف)',
    fr: 'Glisser le nœud (aucun fichier sélectionné)',
    pt: 'Arrastar o nó (nenhum ficheiro selecionado)',
    ru: 'Перетащить узел (файл не выбран)'
  },
  altPreview: {
    zh: '图片预览',
    en: 'Image preview',
    ja: '画像プレビュー',
    ko: '이미지 미리보기',
    es: 'Vista previa de la imagen',
    ar: 'معاينة الصورة',
    fr: 'Aperçu de l’image',
    pt: 'Prévia da imagem',
    ru: 'Предпросмотр изображения'
  },
  emptyFile: {
    zh: '未选择文件',
    en: 'No file selected',
    ja: 'ファイル未選択',
    ko: '파일 선택 안 됨',
    es: 'Sin archivo seleccionado',
    ar: 'لم يتم اختيار ملف',
    fr: 'Aucun fichier sélectionné',
    pt: 'Nenhum ficheiro selecionado',
    ru: 'Файл не выбран'
  },
  resizeHint: {
    zh: '拖拽调整预览大小（保持原图比例）',
    en: 'Drag to resize the preview (keeps image ratio)',
    ja: 'ドラッグしてプレビューの大きさを変更（元の比率を保持）',
    ko: '드래그하여 미리보기 크기 조절 (원본 비율 유지)',
    es: 'Arrastra para cambiar el tamaño de la vista previa (mantiene la proporción original)',
    ar: 'اسحب لتغيير حجم المعاينة (مع الحفاظ على نسبة الصورة الأصلية)',
    fr: 'Glissez pour redimensionner l’aperçu (conserve les proportions d’origine)',
    pt: 'Arraste para redimensionar a prévia (mantém a proporção original)',
    ru: 'Перетащите, чтобы изменить размер предпросмотра (сохраняя пропорции оригинала)'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات الاستخدام',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片文件节点使用说明',
    en: 'Image file node help',
    ja: '画像ファイルノードの使い方',
    ko: '이미지 파일 노드 사용 설명',
    es: 'Ayuda del nodo Archivo de imagen',
    ar: 'تعليمات عقدة ملف الصورة',
    fr: 'Aide du nœud Fichier image',
    pt: 'Ajuda do nó Ficheiro de imagem',
    ru: 'Справка по узлу «Файл изображения»'
  }
} satisfies Record<string, LocalizedText>