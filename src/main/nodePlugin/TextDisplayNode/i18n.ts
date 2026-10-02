import type { LocalizedText } from '../../../shared/language'

/**
 * TextDisplay 节点卡片内的全部文案。
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
  empty: {
    zh: '（暂无输出）',
    en: '(No output)',
    ja: '（出力なし）',
    ko: '(출력 없음)',
    es: '(Sin salida)',
    ar: '(لا يوجد إخراج)',
    fr: '(Aucune sortie)',
    pt: '(Sem saída)',
    ru: '(Нет вывода)'
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
    ru: 'Узел не найден'
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
    ru: 'Перетащите, чтобы изменить размер узла'
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
    zh: '文本展示节点使用说明',
    en: 'Text Display node help',
    ja: 'テキスト表示ノードの使い方',
    ko: '텍스트 표시 노드 도움말',
    es: 'Ayuda del nodo Mostrar texto',
    ar: 'مساعدة عقدة عرض النص',
    fr: 'Aide du nœud Affichage texte',
    pt: 'Ajuda do nó Exibir texto',
    ru: 'Справка по узлу «Отображение текста»'
  }
} satisfies Record<string, LocalizedText>
