import type { LocalizedText } from '../../../shared/language'

/**
 * ImagePreview 节点帮助文档（ImagePreviewHelpDialog）的全部文案，9 种语言全配。
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
    zh: '图片预览节点接收一张图片并渲染预览，同时把这张图片<b>原样透传</b>到右侧 <code>image</code> 输出端口，供下游节点继续使用。',
    en: 'The Image Preview node renders a preview of an incoming image and <b>passes it through unchanged</b> to the <code>image</code> output port on the right for downstream nodes.',
    ja: '画像プレビューノードは受け取った画像をプレビュー表示し、その画像をそのまま右側の <code>image</code> 出力ポートへ<b>透過</b>して下流ノードで使えるようにします。',
    ko: '이미지 미리보기 노드는 받은 이미지를 미리 보여주고, 같은 이미지를 <b>그대로</b> 오른쪽 <code>image</code> 출력 포트로 전달해 하위 노드에서 쓸 수 있게 합니다.',
    es: 'El nodo Vista previa de imagen muestra una previsualización de la imagen entrante y la <b>transfiere sin cambios</b> al puerto <code>image</code> de la derecha para los nodos posteriores.',
    ar: 'تعرض عقدة معاينة الصورة الصورة الواردة، وتُمرّرها <b>كما هي</b> إلى منفذ <code>image</code> على اليمين لتستخدمها العقد اللاحقة.',
    fr: 'Le nœud Aperçu d’image affiche un aperçu de l’image reçue et la <b>transmet telle quelle</b> au port <code>image</code> à droite pour les nœuds en aval.',
    pt: 'O nó Pré-visualizar imagem mostra uma pré-visualização da imagem recebida e a <b>repassa sem alterações</b> ao porto <code>image</code> à direita para os nós seguintes.',
    ru: 'Узел «Предпросмотр изображения» показывает полученное изображение и <b>передаёт его без изменений</b> в выходной порт <code>image</code> справа для последующих узлов.'
  },

  // —— 拖拽与预览 ——
  useTitle: {
    zh: '拖拽与预览',
    en: 'Dragging & preview',
    ja: 'ドラッグとプレビュー',
    ko: '드래그와 미리보기',
    es: 'Arrastrar y previsualizar',
    ar: 'السحب والمعاينة',
    fr: 'Glisser et aperçu',
    pt: 'Arrastar e pré-visualizar',
    ru: 'Перетаскивание и предпросмотр'
  },
  useLi1: {
    zh: '在画布内拖动预览图或标题栏可移动节点位置',
    en: 'Drag the preview image or the title bar inside the canvas to move the node',
    ja: 'キャンバス内でプレビュー画像またはタイトルバーをドラッグするとノードを移動できます',
    ko: '캔버스 안에서 미리보기 이미지나 제목 표시줄을 드래그하면 노드를 이동할 수 있습니다',
    es: 'Arrastra la previsualización o la barra de título dentro del lienzo para mover el nodo',
    ar: 'اسحب صورة المعاينة أو شريط العنوان داخل اللوحة لتحريك العقدة',
    fr: 'Faites glisser l’aperçu ou la barre de titre dans le canevas pour déplacer le nœud',
    pt: 'Arraste a pré-visualização ou a barra de título dentro da tela para mover o nó',
    ru: 'Перетаскивайте предпросмотр или заголовок внутри холста, чтобы переместить узел'
  },
  useLi2: {
    zh: '把预览图<b>拖出窗口外</b>，图片会写出为文件并交给系统拖拽，可在桌面或文件夹中放下导出',
    en: 'Drag the preview <b>outside the window</b> to write the image to a file and hand it to the system drag; drop it on the desktop or a folder to export it',
    ja: 'プレビューを<b>ウィンドウの外へ</b>ドラッグすると、画像がファイルとして書き出され OS のドラッグに引き渡されるので、デスクトップやフォルダにドロップして書き出せます',
    ko: '미리보기를 <b>창 밖으로</b> 끌면 이미지가 파일로 저장되어 시스템 드래그로 넘겨지므로, 바탕 화면이나 폴더에 놓아 내보낼 수 있습니다',
    es: 'Arrastra la previsualización <b>fuera de la ventana</b> para escribir la imagen como archivo y pasarla al arrastre del sistema; suéltala en el escritorio o una carpeta para exportarla',
    ar: 'اسحب المعاينة <b>خارج النافذة</b> ليُكتب الملف وتُسلَّم إلى سحب النظام، ثم أفلتها على سطح المكتب أو في مجلد للتصدير',
    fr: 'Faites glisser l’aperçu <b>hors de la fenêtre</b> pour écrire l’image dans un fichier et la confier au glisser-déposer du système ; déposez-la sur le bureau ou dans un dossier pour l’exporter',
    pt: 'Arraste a pré-visualização <b>para fora da janela</b> para gravar a imagem num arquivo e entregá-la ao arrasto do sistema; solte na área de trabalho ou numa pasta para exportar',
    ru: 'Перетащите предпросмотр <b>за пределы окна</b>, чтобы записать изображение в файл и передать системе перетаскивания — отпустите на рабочем столе или в папке, чтобы экспортировать'
  },
  useLi3: {
    zh: '拖动右下角手柄可调整预览区大小（宽 <code>220–800px</code>、高 <code>120–600px</code>）',
    en: 'Drag the handle at the bottom-right to resize the preview (width <code>220–800px</code>, height <code>120–600px</code>)',
    ja: '右下のハンドルをドラッグするとプレビュー領域をリサイズできます（幅 <code>220〜800px</code>、高さ <code>120〜600px</code>）',
    ko: '오른쪽 아래 핸들을 드래그하면 미리보기 영역 크기를 조절할 수 있습니다(너비 <code>220–800px</code>, 높이 <code>120–600px</code>)',
    es: 'Arrastra el tirador de la esquina inferior derecha para redimensionar la previsualización (ancho <code>220–800px</code>, alto <code>120–600px</code>)',
    ar: 'اسحب المقبض في الزاوية السفلية اليمنى لتغيير حجم المعاينة (العرض <code>220–800px</code>، الارتفاع <code>120–600px</code>)',
    fr: 'Faites glisser la poignée en bas à droite pour redimensionner l’aperçu (largeur <code>220–800px</code>, hauteur <code>120–600px</code>)',
    pt: 'Arraste o puxador no canto inferior direito para redimensionar a pré-visualização (largura <code>220–800px</code>, altura <code>120–600px</code>)',
    ru: 'Перетаскивайте маркер в правом нижнем углу, чтобы изменить размер области предпросмотра (ширина <code>220–800px</code>, высота <code>120–600px</code>)'
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
    zh: '左侧 <code>图片</code> 输入端口接收图片（<code>ImgFileValue</code>）',
    en: 'The <code>Image</code> input port on the left accepts an image (<code>ImgFileValue</code>)',
    ja: '左側の <code>画像</code> 入力ポートは画像（<code>ImgFileValue</code>）を受け取ります',
    ko: '왼쪽 <code>이미지</code> 입력 포트는 이미지(<code>ImgFileValue</code>)를 받습니다',
    es: 'El puerto de entrada <code>Imagen</code> de la izquierda acepta una imagen (<code>ImgFileValue</code>)',
    ar: 'يقبل منفذ الإدخال <code>صورة</code> على اليسار صورةً (<code>ImgFileValue</code>)',
    fr: 'Le port d’entrée <code>Image</code> à gauche accepte une image (<code>ImgFileValue</code>)',
    pt: 'O porto de entrada <code>Imagem</code> à esquerda aceita uma imagem (<code>ImgFileValue</code>)',
    ru: 'Входной порт <code>Изображение</code> слева принимает изображение (<code>ImgFileValue</code>)'
  },
  portsLi2: {
    zh: '右侧 <code>图片</code> 输出端口把同一张图片<b>原样透传</b>给下游节点',
    en: 'The <code>Image</code> output port on the right <b>passes the same image through unchanged</b> to downstream nodes',
    ja: '右側の <code>画像</code> 出力ポートは同じ画像を<b>そのまま</b>下流ノードへ透過します',
    ko: '오른쪽 <code>이미지</code> 출력 포트는 같은 이미지를 <b>그대로</b> 하위 노드로 전달합니다',
    es: 'El puerto de salida <code>Imagen</code> de la derecha <b>transfiere la misma imagen sin cambios</b> a los nodos posteriores',
    ar: 'يُمرّر منفذ <code>صورة</code> على اليمين <b>الصورة نفسها كما هي</b> إلى العقد اللاحقة',
    fr: 'Le port de sortie <code>Image</code> à droite <b>transmet la même image telle quelle</b> aux nœuds en aval',
    pt: 'O porto de saída <code>Imagem</code> à direita <b>repassa a mesma imagem sem alterações</b> aos nós seguintes',
    ru: 'Выходной порт <code>Изображение</code> справа <b>передаёт то же изображение без изменений</b> последующим узлам'
  },
  portsLi3: {
    zh: '上游没有图片时输入为空，输出端口会随之<b>清空</b>，下游一并清空',
    en: 'When there is no upstream image the input is empty, the output port is <b>cleared</b> accordingly, and downstream nodes clear too',
    ja: '上流に画像がないと入力は空になり、出力ポートも<b>クリア</b>され、下流も合わせてクリアされます',
    ko: '상위에 이미지가 없으면 입력이 비고, 출력 포트도 <b>비워지며</b> 하위 노드도 함께 비워집니다',
    es: 'Si no hay imagen en curso, la entrada está vacía, el puerto de salida se <b>vacía</b> y los nodos posteriores también',
    ar: 'عند عدم وجود صورة من المنبع يكون الإدخال فارغًا، ويُ<b>تفريغ</b> منفذ الإخراج تبعًا لذلك، وتُفرَّغ العقد اللاحقة أيضًا',
    fr: 'Sans image en amont, l’entrée est vide, le port de sortie est <b>vidé</b> en conséquence et les nœuds en aval aussi',
    pt: 'Sem imagem a montante, a entrada fica vazia, o porto de saída é <b>limpo</b> e os nós seguintes também',
    ru: 'Если исходного изображения нет, вход пуст, выходной порт <b>очищается</b>, и последующие узлы тоже'
  },

  // —— 底部信息与导出 ——
  outputTitle: {
    zh: '底部信息与导出',
    en: 'Info bar & export',
    ja: '情報バーと書き出し',
    ko: '정보 표시줄과 내보내기',
    es: 'Barra de información y exportación',
    ar: 'شريط المعلومات والتصدير',
    fr: 'Barre d’infos et export',
    pt: 'Barra de informações e exportação',
    ru: 'Строка информации и экспорт'
  },
  outputLi1: {
    zh: '显示图片<b>原始尺寸</b>（<code>宽×高 px</code>），加载完成前显示「加载中」',
    en: 'Shows the image’s <b>original size</b> (<code>W×H px</code>); “Loading” appears until it is ready',
    ja: '画像の<b>元のサイズ</b>（<code>幅×高さ px</code>）を表示し、読み込み完了までは「読み込み中」と表示されます',
    ko: '이미지의 <b>원본 크기</b>(<code>너비×높이 px</code>)를 표시하며, 로딩이 끝나기 전에는 “불러오는 중”이 보입니다',
    es: 'Muestra el <b>tamaño original</b> de la imagen (<code>An×Al px</code>); hasta que cargue aparece «Cargando»',
    ar: 'يعرض <b>الحجم الأصلي</b> للصورة (<code>العرض×الارتفاع بكسل</code>)، ويظهر «جارٍ التحميل» حتى يكتمل',
    fr: 'Affiche la <b>taille d’origine</b> de l’image (<code>L×H px</code>) ; « Chargement » s’affiche tant qu’elle n’est pas prête',
    pt: 'Mostra o <b>tamanho original</b> da imagem (<code>L×A px</code>); até carregar aparece “Carregando”',
    ru: 'Показывает <b>исходный размер</b> изображения (<code>Ш×В px</code>); до загрузки отображается «Загрузка»'
  },
  outputLi2: {
    zh: '显示文件<b>大小</b>（B / KB / MB）',
    en: 'Shows the file <b>size</b> (B / KB / MB)',
    ja: 'ファイル<b>サイズ</b>（B / KB / MB）を表示します',
    ko: '파일 <b>크기</b>(B / KB / MB)를 표시합니다',
    es: 'Muestra el <b>tamaño</b> del archivo (B / KB / MB)',
    ar: 'يعرض <b>حجم</b> الملف (B / KB / MB)',
    fr: 'Affiche la <b>taille</b> du fichier (B / Ko / Mo)',
    pt: 'Mostra o <b>tamanho</b> do arquivo (B / KB / MB)',
    ru: 'Показывает <b>размер</b> файла (Б / КБ / МБ)'
  },
  outputLi3: {
    zh: '显示图片<b>格式</b>徽标（如 PNG / JPEG / WEBP，取自 MIME，缺失时回退扩展名）',
    en: 'Shows an image <b>format</b> badge (e.g. PNG / JPEG / WEBP, taken from the MIME type, falling back to the file extension)',
    ja: '画像の<b>形式</b>バッジ（例：PNG / JPEG / WEBP。MIME から取得し、なければ拡張子にフォールバック）を表示します',
    ko: '이미지 <b>형식</b> 배지(예: PNG / JPEG / WEBP, MIME에서 가져오고 없으면 확장자로 대체)를 표시합니다',
    es: 'Muestra una insignia de <b>formato</b> (p. ej. PNG / JPEG / WEBP, tomada del MIME y, si falta, de la extensión)',
    ar: 'يعرض شارة <b>التنسيق</b> (مثل PNG / JPEG / WEBP، مأخوذة من MIME، ومع غيابها من امتداد الملف)',
    fr: 'Affiche un badge de <b>format</b> (ex. PNG / JPEG / WEBP, issu du type MIME, sinon de l’extension)',
    pt: 'Mostra um selo de <b>formato</b> (ex.: PNG / JPEG / WEBP, obtido do MIME e, na falta, da extensão)',
    ru: 'Показывает значок <b>формата</b> (напр. PNG / JPEG / WEBP — из MIME, при отсутствии — из расширения файла)'
  },

  // —— 注意事项 ——
  notesTitle: {
    zh: '注意事项',
    en: 'Notes',
    ja: '注意点',
    ko: '참고 사항',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Observações',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '点「<b>新建图片文件节点</b>」会在当前节点旁新建一个图片文件节点，并把图片写出到画布目录',
    en: 'Clicking <b>Create image file node</b> adds an image file node next to this one and writes the image to the canvas folder',
    ja: '「<b>画像ファイルノードを新規作成</b>」をクリックすると、このノードの隣に画像ファイルノードを作成し、画像をキャンバスのフォルダに書き出します',
    ko: '“<b>이미지 파일 노드 새로 만들기</b>”를 클릭하면 이 노드 옆에 이미지 파일 노드를 만들고 이미지를 캔버스 폴더에 저장합니다',
    es: 'Al hacer clic en <b>Crear nodo de archivo de imagen</b> se añade un nodo de imagen junto a este y se escribe la imagen en la carpeta del lienzo',
    ar: 'عند النقر على «<b>إنشاء عقدة ملف صورة</b>» تُضاف عقدة ملف صورة بجوار هذه العقدة ويُكتب الملف في مجلد اللوحة',
    fr: 'Cliquer sur <b>Créer un nœud de fichier image</b> ajoute un nœud image à côté de celui-ci et écrit l’image dans le dossier du canevas',
    pt: 'Clicar em <b>Criar nó de arquivo de imagem</b> adiciona um nó de imagem ao lado deste e grava a imagem na pasta da tela',
    ru: 'Нажатие <b>Создать узел файла изображения</b> добавляет узел изображения рядом с этим и записывает файл в папку холста'
  },
  notesLi2: {
    zh: '预览节点本身<b>不保存状态</b>，重新打开画布后由上游重新推送图片',
    en: 'The preview node itself <b>saves no state</b>; after reopening the canvas the upstream node pushes the image again',
    ja: 'プレビューノード自体は<b>状態を保存しません</b>。キャンバスを開き直すと上流ノードから改めて画像が届きます',
    ko: '미리보기 노드 자체는 <b>상태를 저장하지 않습니다</b>. 캔버스를 다시 열면 상위 노드가 이미지를 다시 보냅니다',
    es: 'El nodo de vista previa <b>no guarda ningún estado</b>; al reabrir el lienzo, el nodo de origen vuelve a enviar la imagen',
    ar: 'عقدة المعاينة نفسها <b>لا تحفظ أي حالة</b>؛ وعند إعادة فتح اللوحة تعيد العقدة المصدر إرسال الصورة',
    fr: 'Le nœud d’aperçu <b>n’enregistre aucun état</b> ; à la réouverture du canevas, le nœud en amont renvoie l’image',
    pt: 'O nó de pré-visualização <b>não guarda estado</b>; ao reabrir a tela, o nó de origem reenvia a imagem',
    ru: 'Сам узел предпросмотра <b>не сохраняет состояние</b>; при повторном открытии холста исходный узел снова отправляет изображение'
  },
  notesLi3: {
    zh: '输出端口直接透传原始文件，<b>不做</b>转码或压缩',
    en: 'The output port passes the original file through directly, with <b>no</b> transcoding or compression',
    ja: '出力ポートは元のファイルをそのまま透過し、再エンコードや圧縮は<b>行いません</b>',
    ko: '출력 포트는 원본 파일을 그대로 전달하며, 트랜스코딩이나 압축을 <b>하지 않습니다</b>',
    es: 'El puerto de salida transfiere el archivo original tal cual, <b>sin</b> transcodificar ni comprimir',
    ar: 'يُمرّر منفذ الإخراج الملف الأصلي كما هو <b>دون</b> إعادة ترميز أو ضغط',
    fr: 'Le port de sortie transmet le fichier d’origine tel quel, <b>sans</b> transcodage ni compression',
    pt: 'O porto de saída repassa o arquivo original tal qual, <b>sem</b> transcodificação nem compactação',
    ru: 'Выходной порт передаёт исходный файл как есть, <b>без</b> перекодирования и сжатия'
  }
} satisfies Record<string, LocalizedText>