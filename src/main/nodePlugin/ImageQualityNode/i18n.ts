import type { LocalizedText } from '../../../shared/language'

/**
 * ImageQuality 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖入图片节点压缩一次 · 或左侧端口接图片响应式压缩',
    en: 'Drop an image node to compress once · or connect an image to the left port for live compression',
    ja: '画像ノードをドロップで1回圧縮 · または左ポートに画像を接続してリアルタイム圧縮',
    ko: '이미지 노드를 드롭해 한 번 압축 · 또는 왼쪽 포트에 이미지를 연결해 실시간 압축',
    es: 'Suelta un nodo de imagen para comprimir una vez · o conecta una imagen al puerto izquierdo para compresión en vivo',
    ar: 'أفلت عقدة صورة للضغط مرة واحدة · أو صِل صورة بالمنفذ الأيسر للضغط الفوري',
    fr: 'Déposez un nœud image pour compresser une fois · ou connectez une image au port gauche pour une compression en direct',
    pt: 'Solte um nó de imagem para comprimir uma vez · ou conecte uma imagem à porta esquerda para compressão ao vivo',
    ru: 'Перетащите узел изображения для однократного сжатия · или подключите изображение к левому порту для сжатия в реальном времени'
  },
  formatHint: {
    zh: '选择导出格式（改变后重新压缩）',
    en: 'Choose export format (re-compresses on change)',
    ja: '出力形式を選択（変更すると再圧縮）',
    ko: '내보내기 형식 선택 (변경 시 다시 압축)',
    es: 'Elige el formato de exportación (vuelve a comprimir al cambiar)',
    ar: 'اختر صيغة التصدير (يُعاد الضغط عند التغيير)',
    fr: 'Choisissez le format d’export (recompresse au changement)',
    pt: 'Escolha o formato de exportação (recomprime ao alterar)',
    ru: 'Выберите формат экспорта (повторное сжатие при изменении)'
  },
  resultAlt: {
    zh: '压缩结果预览',
    en: 'Compressed result preview',
    ja: '圧縮結果のプレビュー',
    ko: '압축 결과 미리보기',
    es: 'Vista previa del resultado comprimido',
    ar: 'معاينة النتيجة المضغوطة',
    fr: 'Aperçu du résultat compressé',
    pt: 'Prévia do resultado comprimido',
    ru: 'Предпросмотр сжатого результата'
  },
  placeholder: {
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
  qualityLabel: {
    zh: '质量',
    en: 'Quality',
    ja: '品質',
    ko: '품질',
    es: 'Calidad',
    ar: 'الجودة',
    fr: 'Qualité',
    pt: 'Qualidade',
    ru: 'Качество'
  },
  sliderHint: {
    zh: '调整压缩质量（松手后重新压缩）',
    en: 'Adjust compression quality (re-compresses on release)',
    ja: '圧縮品質を調整（離すと再圧縮）',
    ko: '압축 품질 조정 (놓으면 다시 압축)',
    es: 'Ajusta la calidad de compresión (vuelve a comprimir al soltar)',
    ar: 'اضبط جودة الضغط (يُعاد الضغط عند الإفلات)',
    fr: 'Réglez la qualité de compression (recompresse au relâchement)',
    pt: 'Ajuste a qualidade de compressão (recomprime ao soltar)',
    ru: 'Настройте качество сжатия (повторное сжатие при отпускании)'
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
    es: 'Crear nodo de imagen',
    ar: 'إنشاء عقدة ملف صورة',
    fr: 'Créer un nœud image',
    pt: 'Criar nó de imagem',
    ru: 'Создать узел изображения'
  },
  createNodeHint: {
    zh: '以压缩结果为基础新建一个图片文件节点',
    en: 'Create a new image file node from the compressed result',
    ja: '圧縮結果を基に新しい画像ファイルノードを作成',
    ko: '압축 결과를 기반으로 새 이미지 파일 노드 생성',
    es: 'Crea un nuevo nodo de archivo de imagen a partir del resultado comprimido',
    ar: 'إنشاء عقدة ملف صورة جديدة بناءً على النتيجة المضغوطة',
    fr: 'Créer un nouveau nœud de fichier image à partir du résultat compressé',
    pt: 'Criar um novo nó de arquivo de imagem a partir do resultado comprimido',
    ru: 'Создать новый узел файла изображения на основе сжатого результата'
  },
  errorUnsupported: {
    zh: '压缩失败：不支持的图片格式或文件已损坏',
    en: 'Compression failed: unsupported image format or corrupted file',
    ja: '圧縮に失敗：未対応の画像形式、またはファイルが破損しています',
    ko: '압축 실패: 지원하지 않는 이미지 형식이거나 파일이 손상되었습니다',
    es: 'Error de compresión: formato de imagen no compatible o archivo dañado',
    ar: 'فشل الضغط: صيغة صورة غير مدعومة أو ملف تالف',
    fr: 'Échec de la compression : format d’image non pris en charge ou fichier corrompu',
    pt: 'Falha na compressão: formato de imagem não suportado ou arquivo corrompido',
    ru: 'Не удалось сжать: неподдерживаемый формат изображения или повреждённый файл'
  },
  errorWasm: {
    zh: '压缩失败：wasm 初始化或编码出错',
    en: 'Compression failed: wasm init or encoding error',
    ja: '圧縮に失敗：wasm の初期化またはエンコードエラー',
    ko: '압축 실패: wasm 초기화 또는 인코딩 오류',
    es: 'Error de compresión: fallo de inicialización de wasm o de codificación',
    ar: 'فشل الضغط: خطأ في تهيئة wasm أو الترميز',
    fr: 'Échec de la compression : erreur d’initialisation wasm ou d’encodage',
    pt: 'Falha na compressão: erro de inicialização do wasm ou de codificação',
    ru: 'Не удалось сжать: ошибка инициализации wasm или кодирования'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 안내',
    es: 'Ayuda',
    ar: 'تعليمات',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片质量节点使用说明',
    en: 'Image Quality node help',
    ja: '画像品質ノードの使い方',
    ko: '이미지 품질 노드 사용 안내',
    es: 'Ayuda del nodo Calidad de imagen',
    ar: 'تعليمات عقدة جودة الصورة',
    fr: 'Aide du nœud Qualité d’image',
    pt: 'Ajuda do nó Qualidade de imagem',
    ru: 'Справка по узлу «Качество изображения»'
  }
} satisfies Record<string, LocalizedText>