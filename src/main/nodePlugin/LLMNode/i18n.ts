import type { LocalizedText } from '../../../shared/language'

/**
 * LLM 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)',
    ja: 'ノードをドラッグ（ヘッダー全体がドラッグ可能）',
    ko: '노드 드래그 (헤더 전체를 드래그 가능)',
    es: 'Arrastrar nodo (toda la cabecera es arrastrable)',
    ar: 'اسحب العقدة (الترويسة بأكملها قابلة للسحب)',
    fr: 'Glisser le nœud (tout l’en-tête est déplaçable)',
    pt: 'Arrastar nó (o cabeçalho inteiro é arrastável)',
    ru: 'Перетащить узел (перетаскивается весь заголовок)'
  },
  keyConfigured: {
    zh: 'LLM 已配置，点击修改 Key',
    en: 'LLM configured; click to change key',
    ja: 'LLM 設定済み。クリックして Key を変更',
    ko: 'LLM 설정됨; 클릭하여 Key 변경',
    es: 'LLM configurado; haz clic para cambiar la clave',
    ar: 'تم تهيئة LLM؛ انقر لتغيير المفتاح',
    fr: 'LLM configuré ; cliquez pour changer la clé',
    pt: 'LLM configurado; clique para alterar a chave',
    ru: 'LLM настроен; нажмите, чтобы изменить ключ'
  },
  keyMissing: {
    zh: '点击配置 LLM API Key',
    en: 'Click to configure LLM API key',
    ja: 'クリックして LLM API Key を設定',
    ko: '클릭하여 LLM API Key 설정',
    es: 'Haz clic para configurar la clave API de LLM',
    ar: 'انقر لتهيئة مفتاح API الخاص بـ LLM',
    fr: 'Cliquez pour configurer la clé API LLM',
    pt: 'Clique para configurar a chave de API do LLM',
    ru: 'Нажмите, чтобы настроить ключ API LLM'
  },
  loading: {
    zh: '推理中…',
    en: 'Thinking…',
    ja: '推論中…',
    ko: '추론 중…',
    es: 'Pensando…',
    ar: 'جارٍ التفكير…',
    fr: 'Réflexion…',
    pt: 'Pensando…',
    ru: 'Думает…'
  },
  waitingUpstream: {
    zh: '（等待上游输入触发…）',
    en: '(Waiting for upstream input to trigger…)',
    ja: '（上流入力のトリガーを待機中…）',
    ko: '(상위 입력 트리거 대기 중…)',
    es: '(Esperando a que la entrada anterior se active…)',
    ar: '(في انتظار تفعيل الإدخال من المنبع…)',
    fr: '(En attente du déclenchement par l’entrée amont…)',
    pt: '(Aguardando o disparo da entrada anterior…)',
    ru: '(Ожидание запуска от входящего ввода…)'
  },
  promptHint: {
    zh: '（输入 prompt 后点击发送…）',
    en: '(Enter a prompt and click send…)',
    ja: '（prompt を入力して送信をクリック…）',
    ko: '(prompt를 입력하고 전송 클릭…)',
    es: '(Introduce un prompt y pulsa enviar…)',
    ar: '(أدخل موجهًا ثم انقر على إرسال…)',
    fr: '(Saisissez un prompt puis cliquez sur envoyer…)',
    pt: '(Insira um prompt e clique em enviar…)',
    ru: '(Введите промпт и нажмите отправить…)'
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
  promptPlaceholder: {
    zh: '输入 prompt...',
    en: 'Enter prompt...',
    ja: 'prompt を入力...',
    ko: 'prompt 입력...',
    es: 'Introduce el prompt...',
    ar: 'أدخل الموجه...',
    fr: 'Saisissez un prompt...',
    pt: 'Insira o prompt...',
    ru: 'Введите промпт...'
  },
  autoCall: {
    zh: '自动调用',
    en: 'Auto-call',
    ja: '自動呼び出し',
    ko: '자동 호출',
    es: 'Llamada automática',
    ar: 'استدعاء تلقائي',
    fr: 'Appel automatique',
    pt: 'Chamada automática',
    ru: 'Автовызов'
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
    zh: '大模型节点使用说明',
    en: 'LLM node help',
    ja: '大規模言語モデルノードの使い方',
    ko: '대규모 언어 모델 노드 사용 설명',
    es: 'Ayuda del nodo Modelo de lenguaje',
    ar: 'تعليمات عقدة النموذج اللغوي',
    fr: 'Aide du nœud Modèle de langage',
    pt: 'Ajuda do nó Modelo de linguagem',
    ru: 'Справка по узлу «Языковая модель»'
  }
} satisfies Record<string, LocalizedText>
