import type { LocalizedText } from '../../../shared/language'

/**
 * AnyFile 节点卡片内的全部文案。
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
    ru: 'Перетащить узел · перетащите за пределы окна, чтобы переместить файл · двойной щелчок открывает приложением по умолчанию',
    hi: 'नोड खींचें · फ़ाइल ले जाने के लिए विंडो से बाहर खींचें · सिस्टम डिफ़ॉल्ट ऐप से खोलने के लिए डबल-क्लिक करें',
    id: 'Seret node · seret keluar jendela untuk memindahkan berkas · klik ganda untuk membuka dengan aplikasi bawaan sistem',
    de: 'Knoten ziehen · zum Verschieben der Datei aus dem Fenster ziehen · doppelklicken, um sie mit der System-Standard-App zu öffnen',
    vi: 'Kéo nút · kéo ra ngoài cửa sổ để di chuyển tệp · nhấp đúp để mở bằng ứng dụng mặc định của hệ thống',
    tr: 'Düğümü sürükle · dosyayı taşımak için pencerenin dışına sürükle · sistem varsayılan uygulamasıyla açmak için çift tıkla',
    it: 'Trascina il nodo · trascina fuori dalla finestra per spostare il file · doppio clic per aprirlo con l’app predefinita di sistema'
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
    ru: 'Перетащить узел (файл не выбран)',
    hi: 'नोड खींचें (कोई फ़ाइल चयनित नहीं)',
    id: 'Seret node (tidak ada berkas dipilih)',
    de: 'Knoten ziehen (keine Datei ausgewählt)',
    vi: 'Kéo nút (chưa chọn tệp)',
    tr: 'Düğümü sürükle (dosya seçilmedi)',
    it: 'Trascina il nodo (nessun file selezionato)'
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
    ru: 'Файл не выбран',
    hi: 'कोई फ़ाइल चयनित नहीं',
    id: 'Tidak ada berkas dipilih',
    de: 'Keine Datei ausgewählt',
    vi: 'Chưa chọn tệp',
    tr: 'Dosya seçilmedi',
    it: 'Nessun file selezionato'
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
    ru: 'Справка',
    hi: 'सहायता',
    id: 'Bantuan',
    de: 'Hilfe',
    vi: 'Trợ giúp',
    tr: 'Yardım',
    it: 'Guida'
  },
  helpDialogTitle: {
    zh: '任意文件节点使用说明',
    en: 'Any file node help',
    ja: '汎用ファイルノードの使い方',
    ko: '범용 파일 노드 사용 설명',
    es: 'Ayuda del nodo Archivo genérico',
    ar: 'تعليمات عقدة الملف العام',
    fr: 'Aide du nœud Fichier générique',
    pt: 'Ajuda do nó Ficheiro genérico',
    ru: 'Справка по узлу «Обычный файл»',
    hi: 'किसी भी फ़ाइल नोड सहायता',
    id: 'Bantuan node Berkas Apa Saja',
    de: 'Hilfe zum Knoten „Beliebige Datei“',
    vi: 'Trợ giúp nút Tệp bất kỳ',
    tr: 'Herhangi Bir Dosya düğümü yardımı',
    it: 'Guida al nodo File qualsiasi'
  }
} satisfies Record<string, LocalizedText>