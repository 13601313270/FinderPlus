import type { LocalizedText } from '../../../shared/language'

/**
 * ImageOverlay 节点卡片（左面板 + 画布预览 + 尺寸弹窗）内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  layerLabel: {
    zh: '图层 {n}',
    en: 'Layer {n}',
    ja: 'レイヤー {n}',
    ko: '레이어 {n}',
    es: 'Capa {n}',
    ar: 'الطبقة {n}',
    fr: 'Calque {n}',
    pt: 'Camada {n}',
    ru: 'Слой {n}'
  },
  portSummary: {
    zh: '{total} 端口 · {connected} 已连',
    en: '{total} ports · {connected} connected',
    ja: '{total} ポート · {connected} 接続済み',
    ko: '{total} 포트 · {connected} 연결됨',
    es: '{total} puertos · {connected} conectados',
    ar: '{total} منفذ · {connected} متصل',
    fr: '{total} ports · {connected} connectés',
    pt: '{total} portas · {connected} ligadas',
    ru: '{total} портов · {connected} подключено'
  },
  canvasSizeTitle: {
    zh: '画布尺寸设置',
    en: 'Canvas size settings',
    ja: 'キャンバスサイズ設定',
    ko: '캔버스 크기 설정',
    es: 'Configuración del tamaño del lienzo',
    ar: 'إعدادات حجم اللوحة',
    fr: 'Réglage de la taille du canevas',
    pt: 'Configurações do tamanho do canvas',
    ru: 'Настройки размера холста'
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
  removeLayerHint: {
    zh: '删除此图层（仅尾部可删）',
    en: 'Remove this layer (only the last one)',
    ja: 'このレイヤーを削除（末尾のみ削除可）',
    ko: '이 레이어 삭제 (마지막 것만 삭제 가능)',
    es: 'Eliminar esta capa (solo la última)',
    ar: 'حذف هذه الطبقة (الأخيرة فقط)',
    fr: 'Supprimer ce calque (uniquement le dernier)',
    pt: 'Eliminar esta camada (apenas a última)',
    ru: 'Удалить этот слой (только последний)'
  },
  notConnected: {
    zh: '未连接',
    en: 'Not connected',
    ja: '未接続',
    ko: '연결 안 됨',
    es: 'Sin conectar',
    ar: 'غير متصل',
    fr: 'Non connecté',
    pt: 'Não ligado',
    ru: 'Не подключено'
  },
  addLayerHint: {
    zh: '添加图层',
    en: 'Add layer',
    ja: 'レイヤーを追加',
    ko: '레이어 추가',
    es: 'Añadir capa',
    ar: 'إضافة طبقة',
    fr: 'Ajouter un calque',
    pt: 'Adicionar camada',
    ru: 'Добавить слой'
  },
  addLayer: {
    zh: '＋ 添加图层',
    en: '＋ Add layer',
    ja: '＋ レイヤーを追加',
    ko: '＋ 레이어 추가',
    es: '＋ Añadir capa',
    ar: '＋ إضافة طبقة',
    fr: '＋ Ajouter un calque',
    pt: '＋ Adicionar camada',
    ru: '＋ Добавить слой'
  },
  emptyHint: {
    zh: '连接端口或点击左侧 ＋ 添加图层',
    en: 'Connect a port or click ＋ on the left to add a layer',
    ja: 'ポートを接続するか、左側の ＋ をクリックしてレイヤーを追加',
    ko: '포트를 연결하거나 왼쪽의 ＋를 클릭해 레이어 추가',
    es: 'Conecta un puerto o pulsa ＋ a la izquierda para añadir una capa',
    ar: 'صِل منفذًا أو انقر على ＋ على اليسار لإضافة طبقة',
    fr: 'Connectez un port ou cliquez sur ＋ à gauche pour ajouter un calque',
    pt: 'Ligue uma porta ou clique em ＋ à esquerda para adicionar uma camada',
    ru: 'Подключите порт или нажмите ＋ слева, чтобы добавить слой'
  },
  zoomInTitle: {
    zh: '放大预览',
    en: 'Zoom in',
    ja: 'プレビューを拡大',
    ko: '미리보기 확대',
    es: 'Ampliar vista previa',
    ar: 'تكبير المعاينة',
    fr: 'Zoom avant sur l’aperçu',
    pt: 'Ampliar prévia',
    ru: 'Увеличить предпросмотр'
  },
  zoomOutTitle: {
    zh: '缩小预览',
    en: 'Zoom out',
    ja: 'プレビューを縮小',
    ko: '미리보기 축소',
    es: 'Reducir vista previa',
    ar: 'تصغير المعاينة',
    fr: 'Zoom arrière sur l’aperçu',
    pt: 'Reduzir prévia',
    ru: 'Уменьшить предпросмотр'
  },
  resetZoomTitle: {
    zh: '恢复自适应缩放',
    en: 'Reset zoom',
    ja: '自動フィット表示に戻す',
    ko: '자동 맞춤 확대/축소로 복원',
    es: 'Restablecer el zoom automático',
    ar: 'استعادة التكبير التلقائي',
    fr: 'Rétablir le zoom automatique',
    pt: 'Restaurar o zoom automático',
    ru: 'Вернуть автоматическое масштабирование'
  },
  pngTransparent: {
    zh: 'PNG透明',
    en: 'PNG transparent',
    ja: 'PNG 透明',
    ko: 'PNG 투명',
    es: 'PNG transparente',
    ar: 'PNG شفاف',
    fr: 'PNG transparent',
    pt: 'PNG transparente',
    ru: 'PNG прозрачный'
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
  canvasSizeDialogTitle: {
    zh: '画布尺寸',
    en: 'Canvas size',
    ja: 'キャンバスサイズ',
    ko: '캔버스 크기',
    es: 'Tamaño del lienzo',
    ar: 'حجم اللوحة',
    fr: 'Taille du canevas',
    pt: 'Tamanho do canvas',
    ru: 'Размер холста'
  },
  modeLabel: {
    zh: '模式',
    en: 'Mode',
    ja: 'モード',
    ko: '모드',
    es: 'Modo',
    ar: 'الوضع',
    fr: 'Mode',
    pt: 'Modo',
    ru: 'Режим'
  },
  modeAuto: {
    zh: '自动（按图层边界）',
    en: 'Auto (fit layer bounds)',
    ja: '自動（レイヤー境界に合わせる）',
    ko: '자동 (레이어 경계에 맞춤)',
    es: 'Automático (ajustar a los límites de las capas)',
    ar: 'تلقائي (وفق حدود الطبقات)',
    fr: 'Automatique (ajuster aux limites des calques)',
    pt: 'Automático (ajustar aos limites das camadas)',
    ru: 'Автоматически (по границам слоёв)'
  },
  modeFixed: {
    zh: '固定尺寸',
    en: 'Fixed size',
    ja: '固定サイズ',
    ko: '고정 크기',
    es: 'Tamaño fijo',
    ar: 'حجم ثابت',
    fr: 'Taille fixe',
    pt: 'Tamanho fixo',
    ru: 'Фиксированный размер'
  },
  widthLabel: {
    zh: '宽',
    en: 'Width',
    ja: '幅',
    ko: '너비',
    es: 'Ancho',
    ar: 'العرض',
    fr: 'Largeur',
    pt: 'Largura',
    ru: 'Ширина'
  },
  heightLabel: {
    zh: '高',
    en: 'Height',
    ja: '高さ',
    ko: '높이',
    es: 'Alto',
    ar: 'الارتفاع',
    fr: 'Hauteur',
    pt: 'Altura',
    ru: 'Высота'
  },
  resetAuto: {
    zh: '恢复自动',
    en: 'Reset to auto',
    ja: '自動に戻す',
    ko: '자동으로 복원',
    es: 'Restaurar automático',
    ar: 'استعادة التلقائي',
    fr: 'Rétablir auto',
    pt: 'Restaurar automático',
    ru: 'Вернуть автоматически'
  },
  cancel: {
    zh: '取消',
    en: 'Cancel',
    ja: 'キャンセル',
    ko: '취소',
    es: 'Cancelar',
    ar: 'إلغاء',
    fr: 'Annuler',
    pt: 'Cancelar',
    ru: 'Отмена'
  },
  confirm: {
    zh: '确定',
    en: 'OK',
    ja: 'OK',
    ko: '확인',
    es: 'Aceptar',
    ar: 'موافق',
    fr: 'OK',
    pt: 'OK',
    ru: 'ОК'
  },
  resizeNodeHint: {
    zh: '拖拽调整节点大小（最小 400×400）',
    en: 'Drag to resize the node (min 400×400)',
    ja: 'ドラッグでノードのサイズを変更（最小 400×400）',
    ko: '드래그하여 노드 크기 조절 (최소 400×400)',
    es: 'Arrastra para redimensionar el nodo (mín. 400×400)',
    ar: 'اسحب لتغيير حجم العقدة (الحد الأدنى 400×400)',
    fr: 'Faites glisser pour redimensionner le nœud (min 400×400)',
    pt: 'Arraste para redimensionar o nó (mín. 400×400)',
    ru: 'Перетащите, чтобы изменить размер узла (мин. 400×400)'
  },
  helpDialogTitle: {
    zh: '图片叠加节点使用说明',
    en: 'Image overlay node help',
    ja: '画像オーバーレイノードの使い方',
    ko: '이미지 오버레이 노드 사용 설명',
    es: 'Ayuda del nodo Superposición de imágenes',
    ar: 'تعليمات عقدة تراكب الصور',
    fr: 'Aide du nœud Superposition d’images',
    pt: 'Ajuda do nó Sobreposição de imagens',
    ru: 'Справка по узлу «Наложение изображений»'
  }
} satisfies Record<string, LocalizedText>
