import type { LocalizedText } from '../../../shared/language'

/**
 * HumanReview 节点卡片内的全部文案。
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
  reviewLabel: {
    zh: '待审核',
    en: 'Pending review',
    ja: 'レビュー待ち',
    ko: '검토 대기',
    es: 'Pendiente de revisión',
    ar: 'بانتظار المراجعة',
    fr: 'En attente de révision',
    pt: 'Aguardando revisão',
    ru: 'Ожидает проверки'
  },
  awaitingInput: {
    zh: '（等待输入）',
    en: '(Waiting for input)',
    ja: '（入力待ち）',
    ko: '(입력 대기)',
    es: '(Esperando entrada)',
    ar: '(في انتظار الإدخال)',
    fr: '(En attente d’entrée)',
    pt: '(Aguardando entrada)',
    ru: '(Ожидание ввода)'
  },
  queueRemaining: {
    zh: '队列中还有 {n} 项',
    en: '{n} more in queue',
    ja: 'キューにあと {n} 件',
    ko: '큐에 {n}개 남음',
    es: '{n} más en la cola',
    ar: '{n} أخرى في الطابور',
    fr: '{n} de plus dans la file',
    pt: '{n} mais na fila',
    ru: 'Ещё {n} в очереди'
  },
  queueEmpty: {
    zh: '队列为空',
    en: 'Queue is empty',
    ja: 'キューは空です',
    ko: '큐가 비어 있음',
    es: 'La cola está vacía',
    ar: 'الطابور فارغ',
    fr: 'La file est vide',
    pt: 'A fila está vazia',
    ru: 'Очередь пуста'
  },
  approve: {
    zh: '同意',
    en: 'Approve',
    ja: '承認',
    ko: '승인',
    es: 'Aprobar',
    ar: 'موافقة',
    fr: 'Approuver',
    pt: 'Aprovar',
    ru: 'Одобрить'
  },
  reject: {
    zh: '拒绝',
    en: 'Reject',
    ja: '却下',
    ko: '거부',
    es: 'Rechazar',
    ar: 'رفض',
    fr: 'Rejeter',
    pt: 'Rejeitar',
    ru: 'Отклонить'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '人工审核节点使用说明',
    en: 'Human Review node help',
    ja: '人によるレビューノードの使い方',
    ko: '인간 검토 노드 사용 설명',
    es: 'Ayuda del nodo Revisión humana',
    ar: 'مساعدة عقدة المراجعة البشرية',
    fr: 'Aide du nœud Révision humaine',
    pt: 'Ajuda do nó Revisão humana',
    ru: 'Справка по узлу «Ручная проверка»'
  }
} satisfies Record<string, LocalizedText>
