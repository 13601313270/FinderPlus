import type { LocalizedText } from '../../../shared/language'

/**
 * FileInfo 节点卡片内的全部文案。
 *
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
    ru: 'Перетащить узел'
  },
  labelName: {
    zh: '名称',
    en: 'Name',
    ja: '名前',
    ko: '이름',
    es: 'Nombre',
    ar: 'الاسم',
    fr: 'Nom',
    pt: 'Nome',
    ru: 'Имя'
  },
  labelSize: {
    zh: '大小',
    en: 'Size',
    ja: 'サイズ',
    ko: '크기',
    es: 'Tamaño',
    ar: 'الحجم',
    fr: 'Taille',
    pt: 'Tamanho',
    ru: 'Размер'
  },
  labelType: {
    zh: '类型',
    en: 'Type',
    ja: 'タイプ',
    ko: '유형',
    es: 'Tipo',
    ar: 'النوع',
    fr: 'Type',
    pt: 'Tipo',
    ru: 'Тип'
  },
  empty: {
    zh: '（暂无输入）',
    en: '(No input)',
    ja: '（入力なし）',
    ko: '(입력 없음)',
    es: '(Sin entrada)',
    ar: '(لا يوجد إدخال)',
    fr: '(Aucune entrée)',
    pt: '(Sem entrada)',
    ru: '(Нет входа)'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: 'ヘルプ',
    ko: '도움말',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '文件信息节点使用说明',
    en: 'File Info node help',
    ja: 'ファイル情報ノードの使い方',
    ko: '파일 정보 노드 사용 방법',
    es: 'Ayuda del nodo Información de archivo',
    ar: 'مساعدة عقدة معلومات الملف',
    fr: 'Aide du nœud Informations de fichier',
    pt: 'Ajuda do nó Informações do arquivo',
    ru: 'Справка по узлу «Информация о файле»'
  }
} satisfies Record<string, LocalizedText>