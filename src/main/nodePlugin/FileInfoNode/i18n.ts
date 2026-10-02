import type { LocalizedText } from '../../../shared/language'

/**
 * FileInfo 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  labelName: {
    zh: '名称',
    en: 'Name'
  },
  labelSize: {
    zh: '大小',
    en: 'Size'
  },
  labelType: {
    zh: '类型',
    en: 'Type'
  },
  empty: {
    zh: '（暂无输入）',
    en: '(No input)'
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