import type { LocalizedText } from '../../../shared/language'

/**
 * ImageGen 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)',
    ja: 'ノードをドラッグ（ヘッダー全体をつかめます）',
    ko: '노드 드래그 (헤더 전체를 잡을 수 있습니다)',
    es: 'Arrastra el nodo (toda la cabecera es arrastrable)',
    ar: 'اسحب العقدة (الترويسة بأكملها قابلة للسحب)',
    fr: 'Glisser le nœud (tout l’en-tête est déplaçable)',
    pt: 'Arrastar nó (toda a cabeçalho é arrastável)',
    ru: 'Перетащить узел (вся шапка доступна для перетаскивания)'
  },
  gearConfigured: {
    zh: '图像模型已配置，点击修改 Key',
    en: 'Image model configured, click to change Key',
    ja: '画像モデルは設定済み、クリックして Key を変更',
    ko: '이미지 모델이 구성됨, 클릭하여 Key 변경',
    es: 'Modelo de imagen configurado, haz clic para cambiar la Key',
    ar: 'تم تهيئة نموذج الصور، انقر لتغيير Key',
    fr: 'Modèle d’image configuré, cliquez pour changer la Key',
    pt: 'Modelo de imagem configurado, clique para alterar a Key',
    ru: 'Модель изображений настроена, нажмите, чтобы изменить Key'
  },
  gearConfigure: {
    zh: '点击配置图像 API Key',
    en: 'Click to configure image API Key',
    ja: 'クリックして画像 API Key を設定',
    ko: '클릭하여 이미지 API Key 구성',
    es: 'Haz clic para configurar la API Key de imagen',
    ar: 'انقر لتهيئة API Key للصور',
    fr: 'Cliquez pour configurer la API Key d’image',
    pt: 'Clique para configurar a API Key de imagem',
    ru: 'Нажмите, чтобы настроить API Key для изображений'
  },
  generating: {
    zh: '生成中…',
    en: 'Generating…',
    ja: '生成中…',
    ko: '생성 중…',
    es: 'Generando…',
    ar: 'جارٍ الإنشاء…',
    fr: 'Génération…',
    pt: 'A gerar…',
    ru: 'Создание…'
  },
  generate: {
    zh: '生成',
    en: 'Generate',
    ja: '生成',
    ko: '생성',
    es: 'Generar',
    ar: 'إنشاء',
    fr: 'Générer',
    pt: 'Gerar',
    ru: 'Создать'
  },
  resultAlt: {
    zh: '生成结果',
    en: 'Generated result',
    ja: '生成結果',
    ko: '생성 결과',
    es: 'Resultado generado',
    ar: 'النتيجة المُنشأة',
    fr: 'Résultat généré',
    pt: 'Resultado gerado',
    ru: 'Созданный результат'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found',
    ja: 'ノードが存在しません',
    ko: '노드가 존재하지 않습니다',
    es: 'El nodo no existe',
    ar: 'العقدة غير موجودة',
    fr: 'Nœud introuvable',
    pt: 'Nó não encontrado',
    ru: 'Узел не найден'
  },
  needApiKey: {
    zh: '请先点右上角齿轮配置图像 API Key',
    en: 'Click the gear at the top-right to configure the image API Key',
    ja: '先に右上の歯車をクリックして画像 API Key を設定してください',
    ko: '먼저 오른쪽 위 톱니바퀴를 클릭해 이미지 API Key를 구성하세요',
    es: 'Haz clic en el engranaje de arriba a la derecha para configurar la API Key de imagen',
    ar: 'انقر على الترس في أعلى اليمين لتهيئة API Key للصور',
    fr: 'Cliquez sur l’engrenage en haut à droite pour configurer la API Key d’image',
    pt: 'Clique na engrenagem no canto superior direito para configurar a API Key de imagem',
    ru: 'Нажмите шестерёнку в правом верхнем углу, чтобы настроить API Key для изображений'
  },
  needPrompt: {
    zh: '请连接上游提示词',
    en: 'Connect an upstream prompt',
    ja: '上流のプロンプトを接続してください',
    ko: '상위 프롬프트를 연결하세요',
    es: 'Conecta un prompt de entrada',
    ar: 'صِل موجّهًا من المنبع',
    fr: 'Connectez un prompt en amont',
    pt: 'Ligue um prompt de montante',
    ru: 'Подключите вышестоящий промпт'
  },
  ready: {
    zh: '点击「生成」开始文生图',
    en: 'Click "Generate" to start text-to-image',
    ja: '「生成」をクリックしてテキストからの画像生成を開始',
    ko: '“생성”을 클릭해 텍스트-이미지 생성을 시작하세요',
    es: 'Pulsa «Generar» para iniciar la generación de imagen a partir de texto',
    ar: 'انقر على «إنشاء» لبدء توليد الصور من النص',
    fr: 'Cliquez sur « Générer » pour lancer la génération d’image à partir de texte',
    pt: 'Clique em “Gerar” para iniciar a geração de imagem a partir de texto',
    ru: 'Нажмите «Создать», чтобы начать генерацию изображения из текста'
  },
  sizeFromUpstream: {
    zh: '尺寸来自上游连线（当前 {size}）',
    en: 'Size comes from upstream connection (current {size})',
    ja: 'サイズは上流の接続から取得（現在 {size}）',
    ko: '크기는 상위 연결에서 옵니다 (현재 {size})',
    es: 'El tamaño proviene de la conexión de entrada (actual {size})',
    ar: 'يأتي الحجم من اتصال المنبع (الحالي {size})',
    fr: 'La taille provient de la connexion en amont (actuelle : {size})',
    pt: 'O tamanho vem da ligação de montante (atual: {size})',
    ru: 'Размер берётся из вышестоящего соединения (текущий: {size})'
  },
  currentModel: {
    zh: '当前模型：{model}',
    en: 'Current model: {model}',
    ja: '現在のモデル：{model}',
    ko: '현재 모델: {model}',
    es: 'Modelo actual: {model}',
    ar: 'النموذج الحالي: {model}',
    fr: 'Modèle actuel : {model}',
    pt: 'Modelo atual: {model}',
    ru: 'Текущая модель: {model}'
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
    zh: '图片生成节点使用说明',
    en: 'Image Generation node help',
    ja: '画像生成ノードの使い方',
    ko: '이미지 생성 노드 사용 안내',
    es: 'Ayuda del nodo de generación de imágenes',
    ar: 'مساعدة عقدة توليد الصور',
    fr: 'Aide du nœud de génération d’images',
    pt: 'Ajuda do nó de geração de imagens',
    ru: 'Справка по узлу генерации изображений'
  }
} satisfies Record<string, LocalizedText>
