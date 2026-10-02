import type { LocalizedText } from '../../../shared/language'

/**
 * TextInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已按 LANGUAGE_CODES 全量配置。
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
  nodeSettings: {
    zh: '节点设置',
    en: 'Node settings',
    ja: 'ノード設定',
    ko: '노드 설정',
    es: 'Ajustes del nodo',
    ar: 'إعدادات العقدة',
    fr: 'Paramètres du nœud',
    pt: 'Configurações do nó',
    ru: 'Настройки узла'
  },
  placeholderMultiline: {
    zh: '输入文本…  (Ctrl+Enter 发送)',
    en: 'Type text…  (Ctrl+Enter to send)',
    ja: 'テキストを入力…  (Ctrl+Enter で送信)',
    ko: '텍스트 입력…  (Ctrl+Enter로 전송)',
    es: 'Escribe texto…  (Ctrl+Enter para enviar)',
    ar: 'اكتب النص…  (Ctrl+Enter للإرسال)',
    fr: 'Saisissez du texte…  (Ctrl+Entrée pour envoyer)',
    pt: 'Digite o texto…  (Ctrl+Enter para enviar)',
    ru: 'Введите текст…  (Ctrl+Enter для отправки)'
  },
  placeholderSingle: {
    zh: '输入文本…  (Enter 发送)',
    en: 'Type text…  (Enter to send)',
    ja: 'テキストを入力…  (Enter で送信)',
    ko: '텍스트 입력…  (Enter로 전송)',
    es: 'Escribe texto…  (Enter para enviar)',
    ar: 'اكتب النص…  (Enter للإرسال)',
    fr: 'Saisissez du texte…  (Entrée pour envoyer)',
    pt: 'Digite o texto…  (Enter para enviar)',
    ru: 'Введите текст…  (Enter для отправки)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found',
    ja: 'ノードが存在しません',
    ko: '노드를 찾을 수 없음',
    es: 'Nodo no encontrado',
    ar: 'العقدة غير موجودة',
    fr: 'Nœud introuvable',
    pt: 'Nó não encontrado',
    ru: 'Узел не найден'
  },
  autoSendOn: {
    zh: '已开启：停止输入后自动发送',
    en: 'On: auto-send after you stop typing',
    ja: 'オン：入力を止めると自動送信',
    ko: '켜짐: 입력을 멈추면 자동 전송',
    es: 'Activado: envío automático al dejar de escribir',
    ar: 'مفعّل: إرسال تلقائي بعد التوقف عن الكتابة',
    fr: 'Activé : envoi automatique après l’arrêt de la saisie',
    pt: 'Ativado: envio automático ao parar de digitar',
    ru: 'Вкл.: автоотправка после остановки ввода'
  },
  autoSendOff: {
    zh: '已关闭：需手动点击发送',
    en: 'Off: send manually',
    ja: 'オフ：手動で送信',
    ko: '꺼짐: 수동으로 전송',
    es: 'Desactivado: enviar manualmente',
    ar: 'متوقف: أرسل يدويًا',
    fr: 'Désactivé : envoi manuel',
    pt: 'Desativado: enviar manualmente',
    ru: 'Выкл.: отправить вручную'
  },
  autoSendDisabled: {
    zh: '自动发送已开启，无需手动发送',
    en: 'Auto-send is on; no need to send manually',
    ja: '自動送信がオンのため、手動送信は不要です',
    ko: '자동 전송이 켜져 있어 수동 전송이 필요하지 않습니다',
    es: 'El envío automático está activado; no hace falta enviar manualmente',
    ar: 'الإرسال التلقائي مفعّل؛ لا حاجة للإرسال يدويًا',
    fr: 'L’envoi automatique est activé ; pas besoin d’envoyer manuellement',
    pt: 'O envio automático está ativado; não é preciso enviar manualmente',
    ru: 'Автоотправка включена; отправлять вручную не нужно'
  },
  sendHint: {
    zh: '发送到下游节点',
    en: 'Send to downstream node',
    ja: '下流ノードへ送信',
    ko: '하위 노드로 전송',
    es: 'Enviar al nodo posterior',
    ar: 'أرسل إلى العقدة اللاحقة',
    fr: 'Envoyer au nœud en aval',
    pt: 'Enviar para o nó seguinte',
    ru: 'Отправить в следующий узел'
  },
  autoSend: {
    zh: '自动发送',
    en: 'Auto-send',
    ja: '自動送信',
    ko: '자동 전송',
    es: 'Envío automático',
    ar: 'إرسال تلقائي',
    fr: 'Envoi automatique',
    pt: 'Envio automático',
    ru: 'Автоотправка'
  },
  send: {
    zh: '发送',
    en: 'Send',
    ja: '送信',
    ko: '전송',
    es: 'Enviar',
    ar: 'إرسال',
    fr: 'Envoyer',
    pt: 'Enviar',
    ru: 'Отправить'
  },
  multiline: {
    zh: '多行输入',
    en: 'Multiline input',
    ja: '複数行入力',
    ko: '여러 줄 입력',
    es: 'Entrada multilínea',
    ar: 'إدخال متعدد الأسطر',
    fr: 'Saisie multiligne',
    pt: 'Entrada multilinha',
    ru: 'Многострочный ввод'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '文本输入节点使用说明',
    en: 'Text Input node help',
    ja: 'テキスト入力ノードの使い方',
    ko: '텍스트 입력 노드 사용 설명',
    es: 'Ayuda del nodo Entrada de texto',
    ar: 'تعليمات عقدة إدخال النص',
    fr: 'Aide du nœud Saisie de texte',
    pt: 'Ajuda do nó Entrada de texto',
    ru: 'Справка по узлу «Ввод текста»'
  }
} satisfies Record<string, LocalizedText>