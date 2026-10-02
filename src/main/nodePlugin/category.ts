import type { LocalizedText } from '../../shared/language'

/**
 * 节点分类：调色板菜单的分组维度。
 *
 * 分类是**跨插件共享的词汇表**，所以集中定义在这里，而不是散在各个插件里：
 * 插件只声明 `category: 'image'` 这样的 id，标签文案由本文件统一提供。
 * 这与 NodePluginManifest.title 的分工一致——插件管自己叫什么，分类管它归哪一类。
 *
 * 数组顺序就是调色板里的分组展示顺序。
 * 'other' 固定放最后，当兜底桶：没配 category 的插件（比如第三方老插件）归到这里，
 * 保证它们不会因为少配一个字段就从菜单里消失。
 */
export const NODE_CATEGORIES = [
  'input',
  'text-data',
  'image',
  'ai',
  'file',
  'flow',
  'other'
] as const

export type NodeCategory = (typeof NODE_CATEGORIES)[number]

/**
 * 分类显示名的多语言表。
 *
 * 和节点标题一样按 LANGUAGE_CODES 全量配置，取词交给 resolveLocalizedText 兜底，
 * 这样分类名不需要进渲染进程的中央词条表（i18n/locales），
 * 第三方插件也只认分类 id、不必关心翻译。
 */
export const CATEGORY_LABELS: Record<NodeCategory, LocalizedText> = {
  input: {
    zh: '输入',
    en: 'Input',
    ja: '入力',
    ko: '입력',
    es: 'Entrada',
    ar: 'الإدخال',
    fr: 'Entrée',
    pt: 'Entrada',
    ru: 'Ввод',
    hi: 'इनपुट',
    id: 'Masukan',
    de: 'Eingabe',
    vi: 'Nhập liệu',
    tr: 'Giriş',
    it: 'Input',
  },
  'text-data': {
    zh: '文本与数据',
    en: 'Text & Data',
    ja: 'テキストとデータ',
    ko: '텍스트와 데이터',
    es: 'Texto y datos',
    ar: 'النص والبيانات',
    fr: 'Texte et données',
    pt: 'Texto e dados',
    ru: 'Текст и данные',
    hi: 'टेक्स्ट और डेटा',
    id: 'Teks & Data',
    de: 'Text & Daten',
    vi: 'Văn bản & Dữ liệu',
    tr: 'Metin ve Veri',
    it: 'Testo e dati',
  },
  image: {
    zh: '图像处理',
    en: 'Image Processing',
    ja: '画像処理',
    ko: '이미지 처리',
    es: 'Procesamiento de imagen',
    ar: 'معالجة الصور',
    fr: "Traitement d'image",
    pt: 'Processamento de imagem',
    ru: 'Обработка изображений',
    hi: 'छवि प्रसंस्करण',
    id: 'Pemrosesan Gambar',
    de: 'Bildverarbeitung',
    vi: 'Xử lý ảnh',
    tr: 'Görüntü İşleme',
    it: 'Elaborazione immagine',
  },
  ai: {
    zh: 'AI 能力',
    en: 'AI',
    ja: 'AI',
    ko: 'AI',
    es: 'IA',
    ar: 'الذكاء الاصطناعي',
    fr: 'IA',
    pt: 'IA',
    ru: 'ИИ',
    hi: 'AI',
    id: 'AI',
    de: 'KI',
    vi: 'AI',
    tr: 'YZ',
    it: 'IA',
  },
  file: {
    zh: '文件与目录',
    en: 'Files & Folders',
    ja: 'ファイルとフォルダ',
    ko: '파일과 폴더',
    es: 'Archivos y carpetas',
    ar: 'الملفات والمجلدات',
    fr: 'Fichiers et dossiers',
    pt: 'Arquivos e pastas',
    ru: 'Файлы и папки',
    hi: 'फ़ाइलें और फ़ोल्डर',
    id: 'Berkas & Folder',
    de: 'Dateien & Ordner',
    vi: 'Tệp & Thư mục',
    tr: 'Dosyalar ve Klasörler',
    it: 'File e cartelle',
  },
  flow: {
    zh: '流程与自动化',
    en: 'Flow & Automation',
    ja: 'フローと自動化',
    ko: '흐름과 자동화',
    es: 'Flujo y automatización',
    ar: 'التدفق والأتمتة',
    fr: 'Flux et automatisation',
    pt: 'Fluxo e automação',
    ru: 'Поток и автоматизация',
    hi: 'प्रवाह और स्वचालन',
    id: 'Alur & Otomatisasi',
    de: 'Ablauf & Automatisierung',
    vi: 'Luồng & Tự động hóa',
    tr: 'Akış ve Otomasyon',
    it: 'Flusso e automazione',
  },
  other: {
    zh: '其他',
    en: 'Other',
    ja: 'その他',
    ko: '기타',
    es: 'Otros',
    ar: 'أخرى',
    fr: 'Autres',
    pt: 'Outros',
    ru: 'Прочее',
    hi: 'अन्य',
    id: 'Lainnya',
    de: 'Sonstiges',
    vi: 'Khác',
    tr: 'Diğer',
    it: 'Altro',
  },
}

/** 未声明 category 的节点的归属分类 */
export const DEFAULT_NODE_CATEGORY: NodeCategory = 'other'