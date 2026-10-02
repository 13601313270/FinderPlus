import type { LocalizedText } from '../../../shared/language'

/**
 * BackgroundRemove 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖入图片节点抠图一次 · 或左侧端口接图片响应式抠图',
    en: 'Drop an image node to remove background once · or connect an image to the left port for live removal',
    ja: '画像ノードをドロップで1回背景除去 · または左ポートに画像を接続してリアルタイム背景除去',
    ko: '이미지 노드를 드롭해 한 번 배경 제거 · 또는 왼쪽 포트에 이미지를 연결해 실시간 배경 제거',
    es: 'Suelta un nodo de imagen para quitar el fondo una vez · o conecta una imagen al puerto izquierdo para eliminación en vivo',
    ar: 'أفلت عقدة صورة لإزالة الخلفية مرة واحدة · أو صِل صورة بالمنفذ الأيسر للإزالة الفورية',
    fr: 'Déposez un nœud image pour supprimer l’arrière-plan une fois · ou connectez une image au port gauche pour une suppression en direct',
    pt: 'Solte um nó de imagem para remover o fundo uma vez · ou conecte uma imagem à porta esquerda para remoção ao vivo',
    ru: 'Перетащите узел изображения для однократного удаления фона · или подключите изображение к левому порту для удаления в реальном времени'
  },
  resultAlt: {
    zh: '去背景结果预览',
    en: 'Background-removed result preview',
    ja: '背景除去結果のプレビュー',
    ko: '배경 제거 결과 미리보기',
    es: 'Vista previa del resultado sin fondo',
    ar: 'معاينة النتيجة بعد إزالة الخلفية',
    fr: 'Aperçu du résultat sans arrière-plan',
    pt: 'Prévia do resultado sem fundo',
    ru: 'Предпросмотр результата без фона'
  },
  preparing: {
    zh: '准备中…',
    en: 'Preparing…',
    ja: '準備中…',
    ko: '준비 중…',
    es: 'Preparando…',
    ar: 'جارٍ التحضير…',
    fr: 'Préparation…',
    pt: 'A preparar…',
    ru: 'Подготовка…'
  },
  processing: {
    zh: '处理中 {pct}%',
    en: 'Processing {pct}%',
    ja: '処理中 {pct}%',
    ko: '처리 중 {pct}%',
    es: 'Procesando {pct}%',
    ar: 'جارٍ المعالجة {pct}%',
    fr: 'Traitement {pct}%',
    pt: 'A processar {pct}%',
    ru: 'Обработка {pct}%'
  },
  processingFallback: {
    zh: '处理中…',
    en: 'Processing…',
    ja: '処理中…',
    ko: '처리 중…',
    es: 'Procesando…',
    ar: 'جارٍ المعالجة…',
    fr: 'Traitement…',
    pt: 'A processar…',
    ru: 'Обработка…'
  },
  failed: {
    zh: '处理失败',
    en: 'Processing failed',
    ja: '処理に失敗',
    ko: '처리 실패',
    es: 'Error de procesamiento',
    ar: 'فشلت المعالجة',
    fr: 'Échec du traitement',
    pt: 'Falha no processamento',
    ru: 'Не удалось обработать'
  },
  emptyPlaceholder: {
    zh: '拖图片节点进来 · 或左侧端口接图片',
    en: 'Drop an image node here · or connect an image to the left port',
    ja: '画像ノードをここにドロップ · または左ポートに画像を接続',
    ko: '이미지 노드를 여기에 드롭 · 또는 왼쪽 포트에 이미지 연결',
    es: 'Suelta un nodo de imagen aquí · o conecta una imagen al puerto izquierdo',
    ar: 'أفلت عقدة صورة هنا · أو صِل صورة بالمنفذ الأيسر',
    fr: 'Déposez un nœud image ici · ou connectez une image au port gauche',
    pt: 'Solte um nó de imagem aqui · ou conecte uma imagem à porta esquerda',
    ru: 'Перетащите узел изображения сюда · или подключите изображение к левому порту'
  },
  done: {
    zh: '背景已去除',
    en: 'Background removed',
    ja: '背景を除去しました',
    ko: '배경이 제거됨',
    es: 'Fondo eliminado',
    ar: 'تمت إزالة الخلفية',
    fr: 'Arrière-plan supprimé',
    pt: 'Fundo removido',
    ru: 'Фон удалён'
  },
  hint: {
    zh: '端口响应式 · 拖入一次性',
    en: 'Port: live · Drop: one-shot',
    ja: 'ポートはリアルタイム · ドロップは1回のみ',
    ko: '포트는 실시간 · 드롭은 1회',
    es: 'Puerto: en vivo · Soltar: una vez',
    ar: 'المنفذ: فوري · الإفلات: مرة واحدة',
    fr: 'Port : en direct · Dépôt : unique',
    pt: 'Porta: ao vivo · Soltar: uma vez',
    ru: 'Порт: в реальном времени · Перетаскивание: однократно'
  },
  createNode: {
    zh: '生成图片文件节点',
    en: 'Create image file node',
    ja: '画像ファイルノードを生成',
    ko: '이미지 파일 노드 생성',
    es: 'Crear nodo de archivo de imagen',
    ar: 'إنشاء عقدة ملف صورة',
    fr: 'Créer un nœud de fichier image',
    pt: 'Criar nó de arquivo de imagem',
    ru: 'Создать узел файла изображения'
  },
  createNodeHint: {
    zh: '以抠图结果为基础新建一个图片文件节点',
    en: 'Create a new image file node from the background-removed result',
    ja: '背景除去結果を基に新しい画像ファイルノードを作成',
    ko: '배경 제거 결과를 기반으로 새 이미지 파일 노드 생성',
    es: 'Crea un nuevo nodo de archivo de imagen a partir del resultado sin fondo',
    ar: 'إنشاء عقدة ملف صورة جديدة بناءً على النتيجة بعد إزالة الخلفية',
    fr: 'Créer un nouveau nœud de fichier image à partir du résultat sans arrière-plan',
    pt: 'Criar um novo nó de arquivo de imagem a partir do resultado sem fundo',
    ru: 'Создать новый узел файла изображения на основе результата без фона'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات الاستخدام',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '背景移除节点使用说明',
    en: 'Background Remove node help',
    ja: '背景除去ノードの使い方',
    ko: '배경 제거 노드 사용 설명',
    es: 'Ayuda del nodo Quitar fondo',
    ar: 'تعليمات عقدة إزالة الخلفية',
    fr: 'Aide du nœud Suppression d’arrière-plan',
    pt: 'Ajuda do nó Remover fundo',
    ru: 'Справка по узлу «Удаление фона»'
  }
} satisfies Record<string, LocalizedText>
