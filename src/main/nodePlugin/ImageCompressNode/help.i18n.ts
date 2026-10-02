import type { LocalizedText } from '../../../shared/language'

/**
 * ImageCompress 节点帮助文档（ImageCompressHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片短文案变化频繁，帮助文档整篇体量大、改动少。
 * 约定：带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。与语言无关的记号（size、source、image、jpg、png 等）
 * 保留在所属句子里，不单独抽词条。
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
    zh: '图片压缩节点接收一张图片，按<b>目标尺寸</b>（最长边像素）等比缩小后输出，导出格式可选 <code>jpg</code> 或 <code>png</code>。它管「尺寸」，不改画质参数——需要调画质请用画质调整节点。',
    en: 'The Image Compress node takes an image, scales it down proportionally to a <b>target size</b> (longest edge in pixels), and outputs the result. The export format can be <code>jpg</code> or <code>png</code>. It handles <b>size</b>, not quality settings — use the image quality node for that.',
    ja: '画像圧縮ノードは1枚の画像を受け取り、<b>目標サイズ</b>（最長辺のピクセル数）まで縦横比を保って縮小して出力します。書き出し形式は <code>jpg</code> または <code>png</code> を選べます。扱うのは「サイズ」で、画質パラメータは変更しません。画質を調整したい場合は画質調整ノードを使用してください。',
    ko: '이미지 압축 노드는 이미지를 받아 <b>목표 크기</b>(가장 긴 변의 픽셀 수)까지 비율을 유지하며 축소해 출력합니다. 내보내기 형식은 <code>jpg</code> 또는 <code>png</code>를 선택할 수 있습니다. 이 노드는 「크기」를 다루며 화질 파라미터는 바꾸지 않습니다. 화질을 조정하려면 화질 조정 노드를 사용하세요.',
    es: 'El nodo Comprimir imagen recibe una imagen, la reduce proporcionalmente hasta el <b>tamaño objetivo</b> (el lado más largo en píxeles) y la envía a la salida. El formato de exportación puede ser <code>jpg</code> o <code>png</code>. Se encarga del <b>tamaño</b>, no de la calidad; para eso usa el nodo de calidad de imagen.',
    ar: 'تستقبل عقدة ضغط الصورة صورةً وتقلّصها مع الحفاظ على النسبة حتى <b>الحجم الهدف</b> (أطول ضلع بالبكسل) ثم تُخرجها. يمكن اختيار صيغة التصدير <code>jpg</code> أو <code>png</code>. تتولّى هذه العقدة «الحجم» ولا تغيّر إعدادات الجودة؛ اضبط الجودة من عقدة ضبط جودة الصورة.',
    fr: 'Le nœud Compresser l’image reçoit une image, la réduit proportionnellement jusqu’à la <b>taille cible</b> (le plus grand côté en pixels) et renvoie le résultat. Le format d’export peut être <code>jpg</code> ou <code>png</code>. Il gère la <b>taille</b>, pas la qualité ; utilisez le nœud de qualité d’image pour cela.',
    pt: 'O nó Comprimir imagem recebe uma imagem, reduz proporcionalmente até o <b>tamanho alvo</b> (o lado maior em píxeis) e envia o resultado. O formato de exportação pode ser <code>jpg</code> ou <code>png</code>. Ele cuida do <b>tamanho</b>, não da qualidade; para isso use o nó de qualidade de imagem.',
    ru: 'Узел «Сжатие изображения» принимает изображение, пропорционально уменьшает его до <b>целевого размера</b> (длина большей стороны в пикселях) и выводит результат. Формат экспорта — <code>jpg</code> или <code>png</code>. Он отвечает за <b>размер</b>, а не за качество; для качества используйте узел настройки качества изображения.'
  },

  // —— 配置 ——
  configTitle: {
    zh: '配置',
    en: 'Settings',
    ja: '設定',
    ko: '설정',
    es: 'Configuración',
    ar: 'الإعدادات',
    fr: 'Réglages',
    pt: 'Configurações',
    ru: 'Настройки'
  },
  configLi1: {
    zh: '目标尺寸取<b>最长边</b>的像素数，图片按比例等比缩放；只缩小、不放大（小于目标尺寸的图保持原样）',
    en: 'The target size is the pixel count of the <b>longest edge</b>; the image is scaled proportionally. It only shrinks, never enlarges (images smaller than the target stay as they are)',
    ja: '目標サイズは<b>最長辺</b>のピクセル数で、画像は縦横比を保って縮小されます。縮小のみで拡大はしません（目標より小さい画像はそのまま）',
    ko: '목표 크기는 <b>가장 긴 변</b>의 픽셀 수이며, 이미지는 비율을 유지해 축소됩니다. 축소만 하고 확대하지 않습니다(목표보다 작은 이미지는 그대로 유지)',
    es: 'El tamaño objetivo es el número de píxeles del <b>lado más largo</b>; la imagen se escala proporcionalmente. Solo reduce, nunca amplía (las imágenes menores que el objetivo se dejan igual)',
    ar: 'الحجم الهدف هو عدد بكسلات <b>أطول ضلع</b>، وتُقاس الصورة بشكل متناسب. يقلّص فقط ولا يكبّر (الصور الأصغر من الهدف تبقى كما هي)',
    fr: 'La taille cible correspond au nombre de pixels du <b>plus grand côté</b> ; l’image est mise à l’échelle proportionnellement. Elle ne fait que réduire, jamais agrandir (les images plus petites que la cible restent inchangées)',
    pt: 'O tamanho alvo é o número de píxeis do <b>lado maior</b>; a imagem é escalada proporcionalmente. Apenas reduz, nunca amplia (imagens menores que o alvo permanecem inalteradas)',
    ru: 'Целевой размер — число пикселей <b>большей стороны</b>; изображение масштабируется пропорционально. Оно только уменьшается, но не увеличивается (изображения меньше цели остаются без изменений)'
  },
  configLi2: {
    zh: '尺寸来自左侧 <code>size</code> 端口（数字）；未接线时用默认值 <b>800</b>',
    en: 'The size comes from the <code>size</code> port on the left (a number); when unconnected, the default <b>800</b> is used',
    ja: 'サイズは左側の <code>size</code> ポート（数値）から取得します。未接続の場合は既定値 <b>800</b> を使用します',
    ko: '크기는 왼쪽 <code>size</code> 포트(숫자)에서 가져옵니다. 연결하지 않으면 기본값 <b>800</b>을 사용합니다',
    es: 'El tamaño proviene del puerto <code>size</code> de la izquierda (un número); si no está conectado, se usa el valor predeterminado <b>800</b>',
    ar: 'يُؤخذ الحجم من منفذ <code>size</code> على اليسار (رقم)؛ وعند عدم التوصيل تُستخدم القيمة الافتراضية <b>800</b>',
    fr: 'La taille provient du port <code>size</code> à gauche (un nombre) ; s’il n’est pas connecté, la valeur par défaut <b>800</b> est utilisée',
    pt: 'O tamanho vem do porto <code>size</code> à esquerda (um número); quando não conectado, usa-se o valor padrão <b>800</b>',
    ru: 'Размер берётся из порта <code>size</code> слева (число); если он не подключён, используется значение по умолчанию <b>800</b>'
  },
  configLi3: {
    zh: '导出格式用卡片右上角的下拉选择，可选 <code>jpg</code> 或 <code>png</code>（默认 <code>jpg</code>）：<code>jpg</code> 有损、体积更小、不支持透明；<code>png</code> 无损、可保留透明',
    en: 'Pick the export format from the dropdown at the top-right of the card: <code>jpg</code> or <code>png</code> (default <code>jpg</code>). <code>jpg</code> is lossy with a smaller size and no transparency; <code>png</code> is lossless and keeps transparency',
    ja: '書き出し形式はカード右上のドロップダウンで <code>jpg</code> または <code>png</code> を選びます（既定は <code>jpg</code>）。<code>jpg</code> は非可逆で容量が小さく、透明に対応しません。<code>png</code> は可逆で透明を保持します',
    ko: '내보내기 형식은 카드 오른쪽 위의 드롭다운에서 <code>jpg</code> 또는 <code>png</code>를 선택합니다(기본 <code>jpg</code>). <code>jpg</code>는 손실 압축으로 용량이 작고 투명을 지원하지 않으며, <code>png</code>는 무손실이며 투명을 유지합니다',
    es: 'Elige el formato de exportación en el desplegable de la esquina superior derecha: <code>jpg</code> o <code>png</code> (predeterminado <code>jpg</code>). <code>jpg</code> es con pérdida, ocupa menos y no admite transparencia; <code>png</code> es sin pérdida y conserva la transparencia',
    ar: 'اختر صيغة التصدير من القائمة المنسدلة أعلى يمين البطاقة: <code>jpg</code> أو <code>png</code> (الافتراضي <code>jpg</code>). صيغة <code>jpg</code> بفقدان، وحجمها أصغر، ولا تدعم الشفافية؛ أما <code>png</code> فبلا فقدان وتحافظ على الشفافية',
    fr: 'Choisissez le format d’export dans la liste déroulante en haut à droite de la carte : <code>jpg</code> ou <code>png</code> (par défaut <code>jpg</code>). <code>jpg</code> est avec perte, plus léger et sans transparence ; <code>png</code> est sans perte et conserve la transparence',
    pt: 'Escolha o formato de exportação na lista suspensa no canto superior direito do cartão: <code>jpg</code> ou <code>png</code> (padrão <code>jpg</code>). <code>jpg</code> tem perdas, ocupa menos e não suporta transparência; <code>png</code> é sem perdas e mantém a transparência',
    ru: 'Формат экспорта выбирается в списке в правом верхнем углу карточки: <code>jpg</code> или <code>png</code> (по умолчанию <code>jpg</code>). <code>jpg</code> — с потерями, меньше по размеру и без прозрачности; <code>png</code> — без потерь и сохраняет прозрачность'
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
    zh: '<code>size</code>（尺寸）：数字输入，目标最长边像素；不接线时用默认 <b>800</b>',
    en: '<code>size</code>: numeric input for the target longest-edge pixels; defaults to <b>800</b> when unconnected',
    ja: '<code>size</code>：目標の最長辺ピクセルを指定する数値入力。未接続時は既定の <b>800</b>',
    ko: '<code>size</code>: 목표로 할 가장 긴 변 픽셀을 지정하는 숫자 입력. 연결하지 않으면 기본 <b>800</b>',
    es: '<code>size</code>: entrada numérica con los píxeles del lado más largo objetivo; si no se conecta, usa <b>800</b> por defecto',
    ar: '<code>size</code>: إدخال رقمي لبكسلات أطول ضلع مستهدف؛ وعند عدم التوصيل يُستخدم <b>800</b> افتراضيًا',
    fr: '<code>size</code> : entrée numérique pour les pixels du plus grand côté cible ; par défaut <b>800</b> si non connecté',
    pt: '<code>size</code>: entrada numérica com os píxeis do lado maior alvo; quando não conectado, usa <b>800</b> por padrão',
    ru: '<code>size</code>: числовой вход для пикселей большей стороны; при отсутствии подключения используется <b>800</b> по умолчанию'
  },
  portsLi2: {
    zh: '<code>source</code>（图片）：图片输入，接上游图片；上游变化时自动重新压缩',
    en: '<code>source</code>: image input; connecting an upstream image re-compresses automatically when it changes',
    ja: '<code>source</code>：画像入力。上流の画像を接続すると、上流が変わったときに自動で再圧縮します',
    ko: '<code>source</code>: 이미지 입력. 상위 이미지를 연결하면 상위가 바뀔 때 자동으로 다시 압축합니다',
    es: '<code>source</code>: entrada de imagen; al conectar una imagen de origen, se vuelve a comprimir automáticamente cuando cambia',
    ar: '<code>source</code>: إدخال صورة؛ عند توصيل صورة من مصدر أعلى تُعاد الضغط تلقائيًا عند تغيّرها',
    fr: '<code>source</code> : entrée d’image ; en connectant une image en amont, la compression se relance automatiquement lorsqu’elle change',
    pt: '<code>source</code>: entrada de imagem; ao conectar uma imagem de origem, ela é recomprimida automaticamente quando muda',
    ru: '<code>source</code>: вход изображения; при подключении изображения из вышестоящего узла оно автоматически пересжимается при изменении'
  },
  portsLi3: {
    zh: '<code>image</code>（压缩图）：图片输出，把压缩后的图片交给下游节点',
    en: '<code>image</code>: image output, passing the compressed image to downstream nodes',
    ja: '<code>image</code>：画像出力。圧縮後の画像を下流ノードへ渡します',
    ko: '<code>image</code>: 이미지 출력. 압축된 이미지를 하위 노드로 전달합니다',
    es: '<code>image</code>: salida de imagen; entrega la imagen comprimida a los nodos posteriores',
    ar: '<code>image</code>: إخراج صورة؛ يمرّر الصورة المضغوطة إلى العقد اللاحقة',
    fr: '<code>image</code> : sortie d’image ; transmet l’image compressée aux nœuds en aval',
    pt: '<code>image</code>: saída de imagem; entrega a imagem comprimida aos nós seguintes',
    ru: '<code>image</code>: выход изображения; передаёт сжатое изображение последующим узлам'
  },

  // —— 两种触发方式 ——
  runTitle: {
    zh: '两种触发方式',
    en: 'Two ways to trigger',
    ja: '2つの起動方法',
    ko: '두 가지 실행 방식',
    es: 'Dos formas de activarlo',
    ar: 'طريقتان للتشغيل',
    fr: 'Deux façons de déclencher',
    pt: 'Duas formas de acionar',
    ru: 'Два способа запуска'
  },
  runLi1: {
    zh: '<b>拖入（一次性）</b>：把带图片输出的节点（如「图片文件」节点）拖到本节点上 → 压缩一次；之后源节点变化不再触发，源节点会被送回原位',
    en: '<b>Drop (one-shot)</b>: drag a node with an image output (such as an Image File node) onto this node to compress once; later changes to the source no longer trigger it, and the source is returned to its original position',
    ja: '<b>ドロップ（1回のみ）</b>：画像を出力するノード（「画像ファイル」ノードなど）をこのノードにドロップすると1回だけ圧縮します。その後はソースが変わっても再実行されず、ソースは元の位置に戻されます',
    ko: '<b>드롭(1회성)</b>: 이미지 출력이 있는 노드(예: 「이미지 파일」 노드)를 이 노드 위로 끌어다 놓으면 한 번 압축합니다. 이후에는 소스가 바뀌어도 다시 실행되지 않으며, 소스는 원래 위치로 돌아갑니다',
    es: '<b>Soltar (una vez)</b>: arrastra un nodo con salida de imagen (como un nodo «Archivo de imagen») sobre este nodo para comprimir una vez; después, los cambios del origen ya no lo activan y el origen vuelve a su posición original',
    ar: '<b>الإفلات (مرة واحدة)</b>: اسحب عقدة لها إخراج صورة (مثل عقدة «ملف صورة») وأفلتها على هذه العقدة للضغط مرة واحدة؛ وبعدها لا يؤدي تغيّر المصدر إلى إعادة التشغيل، وتُعاد العقدة المصدر إلى موضعها',
    fr: '<b>Dépôt (une seule fois)</b> : faites glisser un nœud avec une sortie d’image (comme un nœud « Fichier image ») sur ce nœud pour compresser une fois ; ensuite, les changements de la source ne le relancent plus, et la source revient à sa position d’origine',
    pt: '<b>Soltar (uma vez)</b>: arraste um nó com saída de imagem (como um nó «Arquivo de imagem») sobre este nó para comprimir uma vez; depois, mudanças na origem não o acionam mais, e a origem volta à posição original',
    ru: '<b>Перетаскивание (однократно)</b>: перетащите узел с выходом-изображением (например, узел «Файл изображения») на этот узел, чтобы сжать один раз; после этого изменения источника больше не запускают сжатие, а источник возвращается на прежнее место'
  },
  runLi2: {
    zh: '<b>端口输入（响应式）</b>：左侧 <code>source</code> 端口接上游图片 → 上游值变化时自动重新压缩，下游跟着刷新',
    en: '<b>Port input (live)</b>: connect an upstream image to the <code>source</code> port on the left → it re-compresses automatically when the upstream value changes, refreshing downstream nodes',
    ja: '<b>ポート入力（リアルタイム）</b>：左側の <code>source</code> ポートに上流の画像を接続 → 上流の値が変わると自動で再圧縮し、下流も更新されます',
    ko: '<b>포트 입력(실시간)</b>: 왼쪽 <code>source</code> 포트에 상위 이미지를 연결 → 상위 값이 바뀌면 자동으로 다시 압축하고 하위도 갱신됩니다',
    es: '<b>Entrada por puerto (en vivo)</b>: conecta una imagen de origen al puerto <code>source</code> de la izquierda → se vuelve a comprimir automáticamente cuando cambia el valor de origen, actualizando los nodos posteriores',
    ar: '<b>إدخال منفذ (تفاعلي)</b>: وصّل صورة من مصدر أعلى بمنفذ <code>source</code> على اليسار → تُعاد الضغط تلقائيًا عند تغيّر قيمة المصدر، وتتحدّث العقد اللاحقة',
    fr: '<b>Entrée par port (en direct)</b> : connectez une image en amont au port <code>source</code> à gauche → la compression se relance automatiquement lorsque la valeur amont change, actualisant les nœuds en aval',
    pt: '<b>Entrada por porto (em tempo real)</b>: conecte uma imagem de origem ao porto <code>source</code> à esquerda → ela é recomprimida automaticamente quando o valor de origem muda, atualizando os nós seguintes',
    ru: '<b>Вход через порт (в реальном времени)</b>: подключите изображение к порту <code>source</code> слева → при изменении значения оно автоматически пересжимается, обновляя последующие узлы'
  },
  runLi3: {
    zh: '两种方式可共存；同时存在时<b>端口值优先</b>于拖入路径',
    en: 'Both can coexist; when both are present, the <b>port value takes priority</b> over the drop path',
    ja: '両方式は併用できます。両方ある場合は<b>ポート値がドロップより優先</b>されます',
    ko: '두 방식을 함께 쓸 수 있습니다. 둘 다 있으면 <b>포트 값이 드롭보다 우선</b>합니다',
    es: 'Ambas pueden coexistir; cuando ocurren a la vez, el <b>valor del puerto tiene prioridad</b> sobre el arrastre',
    ar: 'يمكن أن تتواجدا معًا؛ وعند وجودهما تُعطى <b>قيمة المنفذ الأولوية</b> على مسار الإفلات',
    fr: 'Les deux peuvent coexister ; lorsqu’ils sont tous les deux présents, la <b>valeur du port est prioritaire</b> sur le dépôt',
    pt: 'As duas podem coexistir; quando ambas ocorrem, o <b>valor do porto tem prioridade</b> sobre o arrasto',
    ru: 'Оба способа могут сосуществовать; при наличии обоих <b>приоритет у значения порта</b>, а не у перетаскивания'
  },

  // —— 结果与体积 ——
  outputTitle: {
    zh: '结果与体积',
    en: 'Result & file size',
    ja: '結果とファイルサイズ',
    ko: '결과와 파일 크기',
    es: 'Resultado y tamaño de archivo',
    ar: 'النتيجة وحجم الملف',
    fr: 'Résultat et poids du fichier',
    pt: 'Resultado e tamanho do arquivo',
    ru: 'Результат и размер файла'
  },
  outputLi1: {
    zh: '中间预览区展示压缩后的图片',
    en: 'The preview area in the middle shows the compressed image',
    ja: '中央のプレビューエリアに圧縮後の画像を表示します',
    ko: '가운데 미리보기 영역에 압축된 이미지를 표시합니다',
    es: 'El área de vista previa central muestra la imagen comprimida',
    ar: 'تعرض منطقة المعاينة في الوسط الصورة المضغوطة',
    fr: 'La zone d’aperçu au centre affiche l’image compressée',
    pt: 'A área de pré-visualização central mostra a imagem comprimida',
    ru: 'Область предпросмотра в центре показывает сжатое изображение'
  },
  outputLi2: {
    zh: '底部显示<b>原始</b>与<b>压缩后</b>的文件体积，无结果时显示 <code>--</code>',
    en: 'The bottom shows the <b>original</b> and <b>compressed</b> file sizes, or <code>--</code> when there is no result',
    ja: '<b>元の</b>ファイルサイズと<b>圧縮後</b>のファイルサイズを下部に表示します。結果がないときは <code>--</code>',
    ko: '하단에 <b>원본</b>과 <b>압축 후</b> 파일 용량을 표시하며, 결과가 없으면 <code>--</code>를 표시합니다',
    es: 'Abajo se muestran los tamaños <b>original</b> y <b>comprimido</b>; si no hay resultado, <code>--</code>',
    ar: 'يعرض أسفل البطاقة حجم الملف <b>الأصلي</b> و<b>المضغوط</b>، ويظهر <code>--</code> عند عدم وجود نتيجة',
    fr: 'En bas s’affichent la taille <b>d’origine</b> et la taille <b>compressée</b> ; <code>--</code> s’il n’y a pas de résultat',
    pt: 'Abaixo são exibidos os tamanhos <b>original</b> e <b>comprimido</b>; quando não há resultado, <code>--</code>',
    ru: 'Внизу показаны размеры <b>исходного</b> и <b>сжатого</b> файлов, а при отсутствии результата — <code>--</code>'
  },
  outputLi3: {
    zh: '减少百分比：体积<b>变小</b>显示 <code>-x%</code>（绿色），<b>变大</b>显示 <code>+x%</code>（橙色）',
    en: 'Reduction percentage: <b>smaller</b> shows <code>-x%</code> (green), <b>larger</b> shows <code>+x%</code> (orange)',
    ja: '削減率：容量が<b>小さくなった</b>場合は <code>-x%</code>（緑）、<b>大きくなった</b>場合は <code>+x%</code>（オレンジ）',
    ko: '감소율: 용량이 <b>작아지면</b> <code>-x%</code>(초록), <b>커지면</b> <code>+x%</code>(주황)',
    es: 'Porcentaje de reducción: si es <b>menor</b> muestra <code>-x%</code> (verde), si es <b>mayor</b> muestra <code>+x%</code> (naranja)',
    ar: 'نسبة الانخفاض: عند <b>صغر</b> الحجم تظهر <code>-x%</code> (بالأخضر)، وعند <b>كبِره</b> تظهر <code>+x%</code> (بالبرتقالي)',
    fr: 'Pourcentage de réduction : si le fichier est plus <b>petit</b>, <code>-x%</code> (vert) ; s’il est plus <b>grand</b>, <code>+x%</code> (orange)',
    pt: 'Percentual de redução: se ficar <b>menor</b>, mostra <code>-x%</code> (verde); se ficar <b>maior</b>, <code>+x%</code> (laranja)',
    ru: 'Процент уменьшения: если стало <b>меньше</b> — <code>-x%</code> (зелёный), если <b>больше</b> — <code>+x%</code> (оранжевый)'
  },

  // —— 注意 ——
  notesTitle: {
    zh: '注意',
    en: 'Notes',
    ja: '注意',
    ko: '참고',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Observações',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '压缩结果不随画布保存；重新打开画布后需再次触发压缩，节点只记住导出格式偏好',
    en: 'The compressed result is not saved with the canvas; after reopening, trigger compression again. Only the export format preference is remembered',
    ja: '圧縮結果はキャンバスに保存されません。キャンバスを開き直したら再度圧縮を実行してください。書き出し形式の設定のみ記憶されます',
    ko: '압축 결과는 캔버스에 저장되지 않습니다. 캔버스를 다시 열면 다시 압축을 실행해야 하며, 내보내기 형식 설정만 기억합니다',
    es: 'El resultado comprimido no se guarda con el lienzo; al reabrirlo, vuelve a activar la compresión. Solo se recuerda el formato de exportación',
    ar: 'لا تُحفظ نتيجة الضغط مع اللوحة؛ بعد إعادة فتحها شغّل الضغط مرة أخرى. ولا يُحتفظ إلا بتفضيل صيغة التصدير',
    fr: 'Le résultat compressé n’est pas enregistré avec le canevas ; après réouverture, relancez la compression. Seule la préférence de format d’export est mémorisée',
    pt: 'O resultado comprimido não é salvo com a tela; ao reabri-la, acione a compressão novamente. Apenas a preferência de formato de exportação é lembrada',
    ru: 'Результат сжатия не сохраняется вместе с холстом; после повторного открытия запустите сжатие снова. Запоминается только выбранный формат экспорта'
  },
  notesLi2: {
    zh: '点「生成图片文件节点」可把压缩结果落盘，并在画布上新建一个图片文件节点',
    en: 'Click “Create image file node” to write the compressed result to disk and add a new Image File node on the canvas',
    ja: '「画像ファイルノードを生成」をクリックすると、圧縮結果をディスクに保存し、キャンバスに画像ファイルノードを新規作成します',
    ko: '「이미지 파일 노드 생성」을 클릭하면 압축 결과를 디스크에 저장하고 캔버스에 이미지 파일 노드를 새로 만듭니다',
    es: 'Haz clic en «Crear nodo de archivo de imagen» para guardar el resultado comprimido en disco y añadir un nodo de archivo de imagen al lienzo',
    ar: 'انقر على «إنشاء عقدة ملف صورة» لحفظ نتيجة الضغط على القرص وإنشاء عقدة ملف صورة جديدة على اللوحة',
    fr: 'Cliquez sur « Créer un nœud de fichier image » pour enregistrer le résultat compressé sur le disque et ajouter un nœud de fichier image sur le canevas',
    pt: 'Clique em «Criar nó de arquivo de imagem» para gravar o resultado comprimido no disco e adicionar um nó de arquivo de imagem na tela',
    ru: 'Нажмите «Создать узел файла изображения», чтобы сохранить результат сжатия на диск и добавить на холст новый узел файла изображения'
  },
  notesLi3: {
    zh: '若源图、目标尺寸和导出格式都没变，则不会重复压缩，避免无谓的重复计算',
    en: 'If the source image, target size, and export format are all unchanged, it will not re-compress, avoiding redundant work',
    ja: 'ソース画像・目標サイズ・書き出し形式がいずれも変わっていなければ再圧縮は行わず、無駄な再計算を防ぎます',
    ko: '원본 이미지, 목표 크기, 내보내기 형식이 모두 그대로면 다시 압축하지 않아 불필요한 중복 연산을 피합니다',
    es: 'Si la imagen de origen, el tamaño objetivo y el formato de exportación no cambian, no se vuelve a comprimir, evitando cálculos redundantes',
    ar: 'إذا لم تتغيّر الصورة المصدر ولا الحجم الهدف ولا صيغة التصدير، فلا تُعاد الضغط، تفاديًا للحسابات المكررة',
    fr: 'Si l’image source, la taille cible et le format d’export restent identiques, la compression n’est pas relancée, ce qui évite des calculs inutiles',
    pt: 'Se a imagem de origem, o tamanho alvo e o formato de exportação não mudarem, ela não é recomprimida, evitando cálculos desnecessários',
    ru: 'Если исходное изображение, целевой размер и формат экспорта не изменились, повторное сжатие не выполняется — это исключает лишние вычисления'
  }
} satisfies Record<string, LocalizedText>