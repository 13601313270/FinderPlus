import type { LocalizedText } from '../../../shared/language'

/**
 * ImagePreview 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '在画布内拖拽移动节点 · 拖出窗口导出图片到桌面/文件夹',
    en: 'Drag inside the canvas to move · drag outside the window to export the image to the desktop/folder',
    ja: 'キャンバス内でドラッグしてノードを移動 · ウィンドウ外にドラッグで画像をデスクトップ/フォルダに書き出し',
    ko: '캔버스 안에서 드래그해 노드 이동 · 창 밖으로 드래그해 이미지를 데스크톱/폴더로 내보내기',
    es: 'Arrastra dentro del lienzo para mover · arrastra fuera de la ventana para exportar la imagen al escritorio/carpeta',
    ar: 'اسحب داخل اللوحة لتحريك العقدة · واسحب خارج النافذة لتصدير الصورة إلى سطح المكتب/المجلد',
    fr: 'Faites glisser dans le canevas pour déplacer · faites glisser hors de la fenêtre pour exporter l’image vers le bureau/dossier',
    pt: 'Arraste dentro do canvas para mover · arraste para fora da janela para exportar a imagem para o ambiente de trabalho/pasta',
    ru: 'Перетащите внутри холста, чтобы переместить узел · перетащите за пределы окна, чтобы экспортировать изображение на рабочий стол/в папку'
  },
  needSourceHint: {
    zh: '请先连接图片来源',
    en: 'Connect an image source first',
    ja: '先に画像ソースを接続してください',
    ko: '먼저 이미지 소스를 연결하세요',
    es: 'Conecta primero una fuente de imagen',
    ar: 'صِل مصدر صورة أولًا',
    fr: 'Connectez d’abord une source d’image',
    pt: 'Ligue primeiro uma fonte de imagem',
    ru: 'Сначала подключите источник изображения'
  },
  altPreview: {
    zh: '图片预览',
    en: 'Image preview',
    ja: '画像プレビュー',
    ko: '이미지 미리보기',
    es: 'Vista previa de imagen',
    ar: 'معاينة الصورة',
    fr: 'Aperçu de l’image',
    pt: 'Prévia da imagem',
    ru: 'Предпросмотр изображения'
  },
  waitingInput: {
    zh: '等待图片输入',
    en: 'Waiting for image input',
    ja: '画像の入力を待機中',
    ko: '이미지 입력 대기 중',
    es: 'Esperando entrada de imagen',
    ar: 'في انتظار إدخال صورة',
    fr: 'En attente d’une image en entrée',
    pt: 'A aguardar entrada de imagem',
    ru: 'Ожидание ввода изображения'
  },
  loading: {
    zh: '图片加载中…',
    en: 'Loading image…',
    ja: '画像を読み込み中…',
    ko: '이미지 로딩 중…',
    es: 'Cargando imagen…',
    ar: 'جارٍ تحميل الصورة…',
    fr: 'Chargement de l’image…',
    pt: 'A carregar imagem…',
    ru: 'Загрузка изображения…'
  },
  createNode: {
    zh: '新建图片文件节点',
    en: 'Create image file node',
    ja: '画像ファイルノードを新規作成',
    ko: '이미지 파일 노드 새로 만들기',
    es: 'Crear nuevo nodo de archivo de imagen',
    ar: 'إنشاء عقدة ملف صورة جديدة',
    fr: 'Créer un nœud de fichier image',
    pt: 'Criar nó de arquivo de imagem',
    ru: 'Создать узел файла изображения'
  },
  createNodeHint: {
    zh: '点击在当前节点旁边新建图片文件节点',
    en: 'Click to create an image file node next to this one',
    ja: 'クリックすると現在のノードの隣に画像ファイルノードを新規作成',
    ko: '클릭하면 현재 노드 옆에 이미지 파일 노드를 새로 만듭니다',
    es: 'Haz clic para crear un nodo de archivo de imagen junto a este',
    ar: 'انقر لإنشاء عقدة ملف صورة بجوار هذه العقدة',
    fr: 'Cliquez pour créer un nœud de fichier image à côté de celui-ci',
    pt: 'Clique para criar um nó de arquivo de imagem ao lado deste',
    ru: 'Нажмите, чтобы создать узел файла изображения рядом с этим'
  },
  resizeHint: {
    zh: '拖拽调整预览大小（保持图片比例）',
    en: 'Drag to resize the preview (keeps image ratio)',
    ja: 'ドラッグでプレビューのサイズを変更（画像の比率を保持）',
    ko: '드래그하여 미리보기 크기 조절 (이미지 비율 유지)',
    es: 'Arrastra para cambiar el tamaño de la vista previa (mantiene la proporción de la imagen)',
    ar: 'اسحب لتغيير حجم المعاينة (مع الحفاظ على نسبة الصورة)',
    fr: 'Faites glisser pour redimensionner l’aperçu (conserve les proportions de l’image)',
    pt: 'Arraste para redimensionar a prévia (mantém a proporção da imagem)',
    ru: 'Перетащите, чтобы изменить размер предпросмотра (сохраняет пропорции изображения)'
  },
  formatUnknown: {
    zh: '未知',
    en: 'Unknown',
    ja: '不明',
    ko: '알 수 없음',
    es: 'Desconocido',
    ar: 'غير معروف',
    fr: 'Inconnu',
    pt: 'Desconhecido',
    ru: 'Неизвестно'
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
    zh: '图片预览节点使用说明',
    en: 'Image Preview node help',
    ja: '画像プレビューノードの使い方',
    ko: '이미지 미리보기 노드 사용 설명',
    es: 'Ayuda del nodo Vista previa de imagen',
    ar: 'تعليمات عقدة معاينة الصورة',
    fr: 'Aide du nœud Aperçu d’image',
    pt: 'Ajuda do nó Pré-visualizar imagem',
    ru: 'Справка по узлу «Предпросмотр изображения»'
  }
} satisfies Record<string, LocalizedText>
