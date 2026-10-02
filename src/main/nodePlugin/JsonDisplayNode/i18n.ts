import type { LocalizedText } from '../../../shared/language'

/**
 * JsonDisplay 节点卡片内的全部文案。
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
  noInput: {
    zh: '（暂无输入）',
    en: '(No input yet)',
    ja: '（入力なし）',
    ko: '(입력 없음)',
    es: '(Sin entrada)',
    ar: '(لا يوجد إدخال)',
    fr: '(Aucune entrée)',
    pt: '(Sem entrada)',
    ru: '(Нет входа)'
  },
  parseErrorTitle: {
    zh: 'JSON 解析失败',
    en: 'JSON parse failed',
    ja: 'JSON の解析に失敗',
    ko: 'JSON 파싱 실패',
    es: 'Fallo al analizar JSON',
    ar: 'فشل تحليل JSON',
    fr: 'Échec de l’analyse JSON',
    pt: 'Falha na análise do JSON',
    ru: 'Ошибка разбора JSON'
  },
  emptyInput: {
    zh: '（空输入）',
    en: '(Empty input)',
    ja: '（空の入力）',
    ko: '(빈 입력)',
    es: '(Entrada vacía)',
    ar: '(إدخال فارغ)',
    fr: '(Entrée vide)',
    pt: '(Entrada vazia)',
    ru: '(Пустой ввод)'
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
  collapse: {
    zh: '收起',
    en: 'Collapse',
    ja: '折りたたむ',
    ko: '접기',
    es: 'Contraer',
    ar: 'طي',
    fr: 'Replier',
    pt: 'Recolher',
    ru: 'Свернуть'
  },
  expand: {
    zh: '展开',
    en: 'Expand',
    ja: '展開',
    ko: '펼치기',
    es: 'Expandir',
    ar: 'توسيع',
    fr: 'Déplier',
    pt: 'Expandir',
    ru: 'Развернуть'
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
    zh: 'JSON 展示节点使用说明',
    en: 'JSON Display node help',
    ja: 'JSON 表示ノードの使い方',
    ko: 'JSON 표시 노드 도움말',
    es: 'Ayuda del nodo Mostrar JSON',
    ar: 'مساعدة عقدة عرض JSON',
    fr: 'Aide du nœud Affichage JSON',
    pt: 'Ajuda do nó Exibir JSON',
    ru: 'Справка по узлу «Отображение JSON»'
  }
} satisfies Record<string, LocalizedText>
