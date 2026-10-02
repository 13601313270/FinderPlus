import type { LocalizedText } from '../../../shared/language'

/**
 * ImageCrop 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖入图片节点裁剪 · 或左侧端口接图片响应式',
    en: 'Drop an image node to crop · or connect an image to the left port for live cropping',
    ja: '画像ノードをドロップで切り抜き · または左ポートに画像を接続してリアルタイム切り抜き',
    ko: '이미지 노드를 드롭해 자르기 · 또는 왼쪽 포트에 이미지를 연결해 실시간 자르기',
    es: 'Suelta un nodo de imagen para recortar · o conecta una imagen al puerto izquierdo para recorte en vivo',
    ar: 'أفلت عقدة صورة للقص · أو صِل صورة بالمنفذ الأيسر للقص الفوري',
    fr: 'Déposez un nœud image pour recadrer · ou connectez une image au port gauche pour un recadrage en direct',
    pt: 'Solte um nó de imagem para recortar · ou conecte uma imagem à porta esquerda para recorte ao vivo',
    ru: 'Перетащите узел изображения для обрезки · или подключите изображение к левому порту для обрезки в реальном времени'
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
  sourceAlt: {
    zh: '源图',
    en: 'Source image',
    ja: '元画像',
    ko: '원본 이미지',
    es: 'Imagen de origen',
    ar: 'الصورة المصدر',
    fr: 'Image source',
    pt: 'Imagem de origem',
    ru: 'Исходное изображение'
  },
  croppedBadge: {
    zh: '已裁剪 ✓',
    en: 'Cropped ✓',
    ja: '切り抜き済み ✓',
    ko: '잘림 ✓',
    es: 'Recortado ✓',
    ar: 'تم القص ✓',
    fr: 'Recadré ✓',
    pt: 'Recortado ✓',
    ru: 'Обрезано ✓'
  },
  autoCrop: {
    zh: '自动裁剪',
    en: 'Auto crop',
    ja: '自動切り抜き',
    ko: '자동 자르기',
    es: 'Recorte automático',
    ar: 'قص تلقائي',
    fr: 'Recadrage automatique',
    pt: 'Recorte automático',
    ru: 'Автообрезка'
  },
  autoCropHint: {
    zh: '自动裁剪：开启后拖动裁剪框自动执行裁剪',
    en: 'Auto crop: crop automatically after dragging the crop box',
    ja: '自動切り抜き：オンにすると切り抜き枠をドラッグした後に自動で切り抜きます',
    ko: '자동 자르기: 켜면 자르기 상자를 드래그한 뒤 자동으로 자릅니다',
    es: 'Recorte automático: recorta automáticamente tras arrastrar el marco de recorte',
    ar: 'قص تلقائي: يقص تلقائيًا بعد سحب إطار القص',
    fr: 'Recadrage automatique : recadre automatiquement après avoir déplacé le cadre de recadrage',
    pt: 'Recorte automático: recorta automaticamente após arrastar a caixa de recorte',
    ru: 'Автообрезка: автоматически обрезает после перетаскивания рамки обрезки'
  },
  confirmCrop: {
    zh: '确认裁剪',
    en: 'Confirm crop',
    ja: '切り抜きを確定',
    ko: '자르기 확인',
    es: 'Confirmar recorte',
    ar: 'تأكيد القص',
    fr: 'Confirmer le recadrage',
    pt: 'Confirmar recorte',
    ru: 'Подтвердить обрезку'
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
    zh: '图片裁剪节点使用说明',
    en: 'Image Crop node help',
    ja: '画像切り抜きノードの使い方',
    ko: '이미지 자르기 노드 사용 설명',
    es: 'Ayuda del nodo Recortar imagen',
    ar: 'تعليمات عقدة قص الصورة',
    fr: 'Aide du nœud Recadrage d’image',
    pt: 'Ajuda do nó Recortar imagem',
    ru: 'Справка по узлу «Обрезка изображения»'
  }
} satisfies Record<string, LocalizedText>
