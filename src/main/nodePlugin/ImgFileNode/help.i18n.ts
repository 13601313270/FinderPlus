import type { LocalizedText } from '../../../shared/language'

/**
 * ImgFile 节点帮助文档（ImgFileHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片短文案变化频繁，帮助文档整篇体量大、改动少。
 * 约定：带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。
 */
export const helpMessages = {
  // —— 这是什么 ——
  whatTitle: {
    zh: '这是什么？',
    en: 'What is this?',
    ja: 'これは何？',
    ko: '이것은 무엇인가요?',
    es: '¿Qué es esto?',
    ar: 'ما هذا؟',
    fr: 'Qu’est-ce que c’est ?',
    pt: 'O que é isto?',
    ru: 'Что это?'
  },
  whatBody: {
    zh: '图片文件节点持有一个图片文件（<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>），在卡片内以缩略图预览，并把该图片作为<b>文件</b>向下游送出。缩略图下方显示文件名、大小与格式，图片加载后还会显示原始像素尺寸。',
    en: 'The Image File node holds an image file (<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>), previews it as a thumbnail inside the card, and sends it downstream as a <b>file</b>. Below the thumbnail the card shows the file name, size and format, plus the original pixel dimensions once the image has loaded.',
    ja: '画像ファイルノードは 1 つの画像ファイル（<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>）を保持し、カード内にサムネイルでプレビューして、その画像を<b>ファイル</b>として下流へ送り出します。サムネイルの下にはファイル名・サイズ・形式が表示され、読み込み後は元のピクセル寸法も表示されます。',
    ko: '이미지 파일 노드는 하나의 이미지 파일(<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>)을 보관하고, 카드 안에 썸네일로 미리 보여 주며, 그 이미지를 <b>파일</b>로 하위에 내보냅니다. 썸네일 아래에는 파일 이름, 크기, 형식이 표시되고, 이미지가 로드되면 원본 픽셀 크기도 표시됩니다.',
    es: 'El nodo Archivo de imagen contiene un archivo de imagen (<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>), lo previsualiza como miniatura dentro de la tarjeta y lo envía a los nodos posteriores como <b>archivo</b>. Bajo la miniatura se muestran el nombre, el tamaño y el formato y, tras cargarse la imagen, también sus dimensiones originales en píxeles.',
    ar: 'تحتفظ عقدة ملف الصورة بملف صورة واحد (<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>)، وتعرضه كصورة مصغّرة داخل البطاقة، وتُرسله إلى العقد اللاحقة <b>كملف</b>. أسفل الصورة المصغّرة يظهر اسم الملف وحجمه وصيغته، وبعد تحميل الصورة تظهر أيضًا أبعادها الأصلية بالبكسل.',
    fr: 'Le nœud Fichier image contient un fichier image (<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>), l’affiche en miniature dans la carte et l’envoie aux nœuds en aval comme <b>fichier</b>. Sous la miniature figurent le nom, la taille et le format, ainsi que les dimensions d’origine en pixels une fois l’image chargée.',
    pt: 'O nó Ficheiro de imagem contém um ficheiro de imagem (<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>), pré-visualiza-o como miniatura dentro do cartão e envia-o aos nós seguintes como <b>ficheiro</b>. Abaixo da miniatura mostram-se o nome, o tamanho e o formato e, após o carregamento, também as dimensões originais em píxeis.',
    ru: 'Узел «Файл изображения» хранит один файл изображения (<code>.jpg</code> / <code>.jpeg</code> / <code>.png</code> / <code>.gif</code> / <code>.webp</code> / <code>.bmp</code>), показывает его миниатюрой на карточке и отправляет последующим узлам как <b>файл</b>. Под миниатюрой отображаются имя, размер и формат, а после загрузки изображения — также исходные размеры в пикселях.'
  },

  // —— 端口 ——
  portsTitle: {
    zh: '端口',
    en: 'Ports',
    ja: 'ポート',
    ko: '포트',
    es: 'Puertos',
    ar: 'المنافذ',
    fr: 'Ports',
    pt: 'Portas',
    ru: 'Порты'
  },
  portsLi1: {
    zh: '输出 <code>file</code>：<code>ImgFileValue</code>（kind 为 <code>img-file</code>），下游接受图片或通用文件类型的节点都能连上。',
    en: 'Output <code>file</code>: an <code>ImgFileValue</code> (kind <code>img-file</code>); downstream nodes that accept images or generic files can connect to it.',
    ja: '出力 <code>file</code>：<code>ImgFileValue</code>（kind は <code>img-file</code>）です。画像または汎用ファイルを受け取る下流ノードに接続できます。',
    ko: '출력 <code>file</code>: <code>ImgFileValue</code>(kind는 <code>img-file</code>)이며, 이미지나 일반 파일을 받는 하위 노드에 연결할 수 있습니다.',
    es: 'Salida <code>file</code>: un <code>ImgFileValue</code> (kind <code>img-file</code>); pueden conectarse los nodos posteriores que acepten imágenes o archivos genéricos.',
    ar: 'منفذ الإخراج <code>file</code>: قيمة <code>ImgFileValue</code> (نوعها <code>img-file</code>)؛ ويمكن توصيل العقد اللاحقة التي تقبل الصور أو الملفات العامة بها.',
    fr: 'Sortie <code>file</code> : un <code>ImgFileValue</code> (kind <code>img-file</code>) ; les nœuds en aval acceptant les images ou les fichiers génériques peuvent s’y connecter.',
    pt: 'Saída <code>file</code>: um <code>ImgFileValue</code> (kind <code>img-file</code>); os nós seguintes que aceitem imagens ou ficheiros genéricos podem ligar-se.',
    ru: 'Выход <code>file</code>: значение <code>ImgFileValue</code> (kind <code>img-file</code>); к нему подключаются последующие узлы, принимающие изображения или файлы общего типа.'
  },
  portsLi2: {
    zh: '输出 <code>path</code>：该文件在画布目录下的<b>绝对路径</b>（string）。',
    en: 'Output <code>path</code>: the file’s <b>absolute path</b> inside the canvas directory (string).',
    ja: '出力 <code>path</code>：キャンバスディレクトリ内にあるこのファイルの<b>絶対パス</b>（文字列）です。',
    ko: '출력 <code>path</code>: 캔버스 디렉터리 안에서 이 파일의 <b>절대 경로</b>(문자열)입니다.',
    es: 'Salida <code>path</code>: la <b>ruta absoluta</b> del archivo dentro del directorio del lienzo (cadena).',
    ar: 'منفذ الإخراج <code>path</code>: <b>المسار المطلق</b> للملف داخل مجلد اللوحة (سلسلة نصية).',
    fr: 'Sortie <code>path</code> : le <b>chemin absolu</b> du fichier dans le répertoire du canevas (chaîne).',
    pt: 'Saída <code>path</code>: o <b>caminho absoluto</b> do ficheiro dentro da pasta da tela (string).',
    ru: 'Выход <code>path</code>: <b>абсолютный путь</b> к файлу в каталоге холста (строка).'
  },
  portsLi3: {
    zh: '输入 <code>file-in</code>：只接受图片文件；收到文件会<b>替换</b>本节点当前文件，并重新读取二进制内容重建缩略图。',
    en: 'Input <code>file-in</code>: accepts only image files; a received file <b>replaces</b> the node’s current file, and its binary content is re-read to rebuild the thumbnail.',
    ja: '入力 <code>file-in</code>：画像ファイルのみを受け付けます。ファイルを受け取ると本ノードの現在のファイルを<b>置き換え</b>、バイナリ内容を読み直してサムネイルを再構築します。',
    ko: '입력 <code>file-in</code>: 이미지 파일만 받습니다. 파일을 받으면 이 노드의 현재 파일을 <b>교체</b>하고 이진 내용을 다시 읽어 썸네일을 다시 만듭니다.',
    es: 'Entrada <code>file-in</code>: solo acepta archivos de imagen; al recibir uno, <b>reemplaza</b> el archivo actual del nodo y se vuelve a leer su contenido binario para reconstruir la miniatura.',
    ar: 'منفذ الإدخال <code>file-in</code>: يقبل ملفات الصور فقط؛ وعند استلام ملف فإنه <b>يستبدل</b> ملف العقدة الحالي وتُعاد قراءة محتواه الثنائي لإعادة بناء الصورة المصغّرة.',
    fr: 'Entrée <code>file-in</code> : n’accepte que les fichiers image ; un fichier reçu <b>remplace</b> le fichier actuel du nœud et son contenu binaire est relu pour reconstruire la miniature.',
    pt: 'Entrada <code>file-in</code>: aceita apenas ficheiros de imagem; ao receber um, <b>substitui</b> o ficheiro atual do nó e o conteúdo binário é relido para reconstruir a miniatura.',
    ru: 'Вход <code>file-in</code>: принимает только файлы изображений; полученный файл <b>заменяет</b> текущий файл узла, а его двоичное содержимое перечитывается для восстановления миниатюры.'
  },

  // —— 使用与交互 ——
  useTitle: {
    zh: '使用与交互',
    en: 'Usage & interaction',
    ja: '使い方と操作',
    ko: '사용 및 조작',
    es: 'Uso e interacción',
    ar: 'الاستخدام والتفاعل',
    fr: 'Utilisation et interaction',
    pt: 'Utilização e interação',
    ru: 'Использование и взаимодействие'
  },
  useLi1: {
    zh: '双击卡片，用<b>系统默认应用</b>打开该图片。',
    en: 'Double-click the card to open the image with the <b>system default app</b>.',
    ja: 'カードをダブルクリックすると、<b>システムの既定アプリ</b>で画像を開きます。',
    ko: '카드를 두 번 클릭하면 <b>시스템 기본 앱</b>으로 이미지를 엽니다.',
    es: 'Haz doble clic en la tarjeta para abrir la imagen con la <b>aplicación predeterminada del sistema</b>.',
    ar: 'انقر مرتين على البطاقة لفتح الصورة باستخدام <b>التطبيق الافتراضي للنظام</b>.',
    fr: 'Double-cliquez sur la carte pour ouvrir l’image avec l’<b>application par défaut du système</b>.',
    pt: 'Faça duplo clique no cartão para abrir a imagem com a <b>aplicação predefinida do sistema</b>.',
    ru: 'Дважды щёлкните по карточке, чтобы открыть изображение <b>приложением по умолчанию</b>.'
  },
  useLi2: {
    zh: '把卡片<b>拖出窗口</b>丢到桌面或文件夹，即可把文件移动到该位置。',
    en: 'Drag the card <b>out of the window</b> onto the desktop or a folder to move the file there.',
    ja: 'カードを<b>ウィンドウの外</b>へドラッグしてデスクトップやフォルダにドロップすると、ファイルをその場所へ移動できます。',
    ko: '카드를 <b>창 밖으로</b> 끌어 바탕 화면이나 폴더에 놓으면 파일이 그 위치로 이동합니다.',
    es: 'Arrastra la tarjeta <b>fuera de la ventana</b> hasta el escritorio o una carpeta para mover el archivo allí.',
    ar: 'اسحب البطاقة <b>خارج النافذة</b> وأفلتها على سطح المكتب أو في مجلد لنقل الملف إلى هناك.',
    fr: 'Faites glisser la carte <b>hors de la fenêtre</b> vers le bureau ou un dossier pour y déplacer le fichier.',
    pt: 'Arraste o cartão <b>para fora da janela</b> até à área de trabalho ou a uma pasta para mover o ficheiro para lá.',
    ru: 'Перетащите карточку <b>за пределы окна</b> на рабочий стол или в папку, чтобы переместить файл туда.'
  },
  useLi3: {
    zh: '拖动卡片<b>右下角</b>的手柄，可调整预览大小（宽度 100–800 像素），高度按<b>原图比例</b>自动变化。',
    en: 'Drag the handle at the card’s <b>bottom-right</b> to resize the preview (width 100–800 px); the height changes automatically to keep the <b>image’s ratio</b>.',
    ja: 'カード<b>右下</b>のハンドルをドラッグするとプレビューの大きさを変更できます（幅 100〜800 ピクセル）。高さは<b>元の比率</b>を保って自動的に変わります。',
    ko: '카드 <b>오른쪽 아래</b>의 핸들을 끌면 미리보기 크기를 조절할 수 있습니다(너비 100~800픽셀). 높이는 <b>원본 비율</b>에 맞춰 자동으로 바뀝니다.',
    es: 'Arrastra el tirador de la <b>esquina inferior derecha</b> de la tarjeta para cambiar el tamaño de la vista previa (ancho 100–800 px); la altura se ajusta sola manteniendo la <b>proporción original</b>.',
    ar: 'اسحب المقبض في <b>الزاوية السفلية اليمنى</b> للبطاقة لتغيير حجم المعاينة (العرض 100–800 بكسل)، ويتغيّر الارتفاع تلقائيًا حفاظًا على <b>نسبة الصورة الأصلية</b>.',
    fr: 'Faites glisser la poignée en <b>bas à droite</b> de la carte pour redimensionner l’aperçu (largeur 100–800 px) ; la hauteur s’ajuste automatiquement en conservant les <b>proportions d’origine</b>.',
    pt: 'Arraste o puxador no <b>canto inferior direito</b> do cartão para redimensionar a pré-visualização (largura 100–800 px); a altura ajusta-se automaticamente mantendo a <b>proporção original</b>.',
    ru: 'Перетащите маркер в <b>правом нижнем углу</b> карточки, чтобы изменить размер предпросмотра (ширина 100–800 пикселей); высота меняется автоматически, сохраняя <b>пропорции оригинала</b>.'
  },
  useLi4: {
    zh: '拖动卡片本身（空白处或文件名）可移动节点在画布上的位置。',
    en: 'Drag the card itself (on empty space or the file name) to move the node around the canvas.',
    ja: 'カード自体（余白やファイル名）をドラッグすると、キャンバス上でノードを移動できます。',
    ko: '카드 자체(여백이나 파일 이름)를 끌면 캔버스에서 노드 위치를 옮길 수 있습니다.',
    es: 'Arrastra la propia tarjeta (en el espacio vacío o el nombre) para mover el nodo por el lienzo.',
    ar: 'اسحب البطاقة نفسها (من المساحة الفارغة أو اسم الملف) لتحريك العقدة على اللوحة.',
    fr: 'Faites glisser la carte elle-même (sur un espace vide ou le nom du fichier) pour déplacer le nœud sur le canevas.',
    pt: 'Arraste o próprio cartão (no espaço vazio ou no nome do ficheiro) para mover o nó pela tela.',
    ru: 'Перетащите саму карточку (за пустое место или имя файла), чтобы переместить узел по холсту.'
  },

  // —— 注意事项 ——
  notesTitle: {
    zh: '注意事项',
    en: 'Notes',
    ja: '注意事項',
    ko: '유의 사항',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Notas',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '尚未选择文件时，卡片上显示「<b>未选择文件</b>」，此时不会向下游输出文件。',
    en: 'Until a file is selected the card shows “<b>No file selected</b>”, and no file is sent downstream.',
    ja: 'ファイルを選んでいない間、カードには「<b>未選択</b>」と表示され、下流へはファイルを出力しません。',
    ko: '파일을 선택하지 않은 동안 카드에 “<b>파일 선택 안 됨</b>”이 표시되며, 하위로 파일을 출력하지 않습니다.',
    es: 'Mientras no se seleccione un archivo, la tarjeta muestra «<b>Sin archivo seleccionado</b>» y no se envía ningún archivo a los nodos posteriores.',
    ar: 'إلى أن يتم اختيار ملف، تعرض البطاقة «<b>لم يتم اختيار ملف</b>»، ولا يُخرَج أي ملف إلى العقد اللاحقة.',
    fr: 'Tant qu’aucun fichier n’est sélectionné, la carte affiche « <b>Aucun fichier sélectionné</b> » et aucun fichier n’est envoyé en aval.',
    pt: 'Enquanto não for selecionado um ficheiro, o cartão mostra “<b>Nenhum ficheiro selecionado</b>” e nenhum ficheiro é enviado a jusante.',
    ru: 'Пока файл не выбран, на карточке отображается «<b>Файл не выбран</b>», и файл не отправляется дальше.'
  },
  notesLi2: {
    zh: '卡片内显示图片缩略图，下方为文件名、大小与格式（JPEG / PNG / GIF / WebP / BMP），图片加载后还会显示原始像素尺寸。',
    en: 'The card shows the image thumbnail, with the file name, size and format (JPEG / PNG / GIF / WebP / BMP) below; once loaded, the original pixel dimensions are shown too.',
    ja: 'カード内には画像のサムネイル、その下にファイル名・サイズ・形式（JPEG / PNG / GIF / WebP / BMP）が表示され、読み込み後は元のピクセル寸法も表示されます。',
    ko: '카드 안에는 이미지 썸네일이, 그 아래에는 파일 이름·크기·형식(JPEG / PNG / GIF / WebP / BMP)이 표시되며, 이미지가 로드되면 원본 픽셀 크기도 표시됩니다.',
    es: 'La tarjeta muestra la miniatura de la imagen y, debajo, el nombre, el tamaño y el formato (JPEG / PNG / GIF / WebP / BMP); una vez cargada, también las dimensiones originales en píxeles.',
    ar: 'تعرض البطاقة صورة مصغّرة، وأسفلها اسم الملف والحجم والصيغة (JPEG / PNG / GIF / WebP / BMP)، وبعد تحميل الصورة تظهر أيضًا أبعادها الأصلية بالبكسل.',
    fr: 'La carte affiche la miniature de l’image, puis en dessous le nom, la taille et le format (JPEG / PNG / GIF / WebP / BMP) ; une fois chargée, les dimensions d’origine en pixels s’affichent aussi.',
    pt: 'O cartão mostra a miniatura da imagem e, abaixo, o nome, o tamanho e o formato (JPEG / PNG / GIF / WebP / BMP); após o carregamento, também as dimensões originais em píxeis.',
    ru: 'На карточке отображается миниатюра изображения, а под ней — имя, размер и формат (JPEG / PNG / GIF / WebP / BMP); после загрузки также показываются исходные размеры в пикселях.'
  },
  notesLi3: {
    zh: '文件大小按 B / KB / MB 自动分档显示。',
    en: 'The file size is automatically shown in B / KB / MB.',
    ja: 'ファイルサイズは B / KB / MB 単位で自動的に表示されます。',
    ko: '파일 크기는 B / KB / MB 단위로 자동 표시됩니다.',
    es: 'El tamaño del archivo se muestra automáticamente en B / KB / MB.',
    ar: 'يُعرض حجم الملف تلقائيًا بوحدات B / KB / MB.',
    fr: 'La taille du fichier est automatiquement affichée en B / KB / MB.',
    pt: 'O tamanho do ficheiro é mostrado automaticamente em B / KB / MB.',
    ru: 'Размер файла автоматически отображается в B / KB / MB.'
  }
} satisfies Record<string, LocalizedText>