export const messages = {
  loading: {
    zh: '执行中…',
    en: 'Running…',
    ja: '実行中…',
    ko: '실행 중…',
    es: 'Ejecutando…',
    fr: 'Exécution…',
    de: 'Läuft…'
  },
  send: {
    zh: '发送',
    en: 'Send',
    ja: '送信',
    ko: '보내기',
    es: 'Enviar',
    fr: 'Envoyer',
    de: 'Senden'
  },
  stop: {
    zh: '取消',
    en: 'Cancel',
    ja: 'キャンセル',
    ko: '취소',
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen'
  },
  modelHint: {
    zh: '拖入一个 LLM 节点作为 Model',
    en: 'Drop an LLM node here as Model',
    ja: 'LLM ノードをドラッグして Model にしてください',
    ko: 'LLM 노드를 여기로 드래그하여 Model로 설정하세요',
    es: 'Arrastra un nodo LLM aquí como Modelo',
    fr: 'Déposez un nœud LLM ici comme modèle',
    de: 'Ziehen Sie einen LLM-Knoten hierher als Modell'
  },
  toolHint: {
    zh: '拖入节点作为工具',
    en: 'Drop nodes here as tools',
    ja: 'ノードをドラッグしてツールにしてください',
    ko: '노드를 여기로 드래그하여 도구로 설정하세요',
    es: 'Arrastra nodos aquí como herramientas',
    fr: 'Déposez des nœuds ici comme outils',
    de: 'Ziehen Sie Knoten hierher als Werkzeuge'
  },
  toolsHeader: {
    zh: '画布工具',
    en: 'Canvas Tools',
    ja: 'キャンバスツール',
    ko: '캔버스 도구',
    es: 'Herramientas de lienzo',
    fr: 'Outils du canevas',
    de: 'Canvas-Werkzeuge'
  },
  builtinHeader: {
    zh: '内置工具',
    en: 'Built-in Tools',
    ja: 'ビルトインツール',
    ko: '내장 도구',
    es: 'Herramientas integradas',
    fr: 'Outils intégrés',
    de: 'Integrierte Werkzeuge'
  },
  trajectoryHeader: {
    zh: '执行轨迹',
    en: 'Trajectory',
    ja: '実行軌跡',
    ko: '실행 궤적',
    es: 'Trayectoria',
    fr: 'Trajectoire',
    de: 'Trajektorie'
  },
  iterationsLabel: {
    zh: '轮次',
    en: 'Iterations',
    ja: '反復',
    ko: '반복',
    es: 'Iteraciones',
    fr: 'Itérations',
    de: 'Iterationen'
  },
  promptPlaceholder: {
    zh: '在此输入提示语',
    en: 'Enter your prompt here',
    ja: 'プロンプトを入力',
    ko: '프롬프트를 입력하세요',
    es: 'Escribe tu prompt',
    fr: 'Entrez votre prompt',
    de: 'Prompt hier eingeben'
  },
  waitingModel: {
    zh: '等待 LLM 模型绑定',
    en: 'Waiting for LLM model',
    ja: 'LLM モデル待ち',
    ko: 'LLM 모델 대기 중',
    es: 'Esperando modelo LLM',
    fr: 'En attente du modèle LLM',
    de: 'Warte auf LLM-Modell'
  },
  removeTool: {
    zh: '移除',
    en: 'Remove',
    ja: '削除',
    ko: '제거',
    es: 'Quitar',
    fr: 'Supprimer',
    de: 'Entfernen'
  },
  pickImage: {
    zh: '添加图片',
    en: 'Add image',
    ja: '画像を追加',
    ko: '이미지 추가',
    es: 'Añadir imagen',
    fr: 'Ajouter une image',
    de: 'Bild hinzufügen'
  },

  // —— 自动调用 ——
  autoCall: {
    zh: '自动调用',
    en: 'Auto call',
    ja: '自動実行',
    ko: '자동 실행',
    es: 'Llamada automática',
    fr: 'Appel automatique',
    de: 'Auto-Aufruf'
  },

  // —— 动态工具注册 ——
  allowToolDefine: {
    zh: '允许动态工具',
    en: 'Dynamic tools',
    ja: '動的ツール',
    ko: '동적 도구',
    es: 'Herramientas dinámicas',
    fr: 'Outils dynamiques',
    de: 'Dynamische Werkzeuge'
  },

  // —— 连续对话模式 ——
  chatMode: {
    zh: '连续对话',
    en: 'Chat mode',
    ja: '連続対話',
    ko: '연속 대화',
    es: 'Modo conversación',
    fr: 'Mode conversation',
    de: 'Chat-Modus'
  },
  chatModeOn: {
    zh: '开启',
    en: 'Enabled',
    ja: '有効',
    ko: '활성화',
    es: 'Activado',
    fr: 'Activé',
    de: 'Aktiviert'
  },
  chatModeHint: {
    zh: '开启后，每次发送的 prompt 会追加到历史中，下次执行带上完整上下文',
    en: 'When enabled, each prompt is appended to history and sent with full context next time',
    ja: '有効にすると、毎回の prompt が履歴に追加され、次回実行時に完全なコンテキストと共に送信されます',
    ko: '활성화하면 매번 prompt가 기록에 추가되고 다음 실행 시 전체 컨텍스트와 함께 전송됩니다',
    es: 'Cuando está habilitado, cada prompt se agrega al historial y se envía con el contexto completo la próxima vez',
    fr: 'Lorsqu’il est activé, chaque prompt est ajouté à l’historique et envoyé avec le contexte complet la prochaine fois',
    de: 'Wenn aktiviert, wird jeder prompt zum Verlauf hinzugefügt und beim nächsten Mal mit vollständigem Kontext gesendet'
  },
  clearHistory: {
    zh: '清空历史',
    en: 'Clear history',
    ja: '履歴をクリア',
    ko: '기록 지우기',
    es: 'Limpiar historial',
    fr: 'Effacer l’historique',
    de: 'Verlauf löschen'
  },
  historyMsgs: {
    zh: '条消息',
    en: 'messages',
    ja: '件のメッセージ',
    ko: '개의 메시지',
    es: 'mensajes',
    fr: 'messages',
    de: 'Nachrichten'
  },
  historyUser: {
    zh: '用户',
    en: 'You',
    ja: 'ユーザー',
    ko: '사용자',
    es: 'Tú',
    fr: 'Vous',
    de: 'Du'
  },
  historyAssistant: {
    zh: 'AI',
    en: 'AI',
    ja: 'AI',
    ko: 'AI',
    es: 'IA',
    fr: 'IA',
    de: 'KI'
  }
}
