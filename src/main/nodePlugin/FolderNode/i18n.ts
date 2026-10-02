import type { LocalizedText } from '../../../shared/language'

/**
 * Folder 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  fileCount: {
    zh: '{n} 个文件',
    en: '{n} files',
    ja: '{n} 個のファイル',
    ko: '파일 {n}개',
    es: '{n} archivos',
    ar: '{n} ملف',
    fr: '{n} fichiers',
    pt: '{n} arquivos',
    ru: '{n} файлов'
  },
  resizeHint: {
    zh: '拖动调整文件夹大小（最小 2×2）',
    en: 'Drag to resize the folder (min 2×2)',
    ja: 'ドラッグしてフォルダの大きさを変更（最小 2×2）',
    ko: '드래그하여 폴더 크기 조절 (최소 2×2)',
    es: 'Arrastra para cambiar el tamaño de la carpeta (mín. 2×2)',
    ar: 'اسحب لتغيير حجم المجلد (الحد الأدنى 2×2)',
    fr: 'Glissez pour redimensionner le dossier (min. 2×2)',
    pt: 'Arraste para redimensionar a pasta (mín. 2×2)',
    ru: 'Перетащите, чтобы изменить размер папки (минимум 2×2)'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 안내',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '文件夹节点使用说明',
    en: 'Folder node help',
    ja: 'フォルダノードの使い方',
    ko: '폴더 노드 사용 안내',
    es: 'Ayuda del nodo Carpeta',
    ar: 'مساعدة عقدة المجلد',
    fr: 'Aide du nœud Dossier',
    pt: 'Ajuda do nó Pasta',
    ru: 'Справка по узлу «Папка»'
  }
} satisfies Record<string, LocalizedText>