import type { LocalizedText } from '../../../shared/language'

/**
 * TxtFile 节点帮助文档（TxtFileHelpDialog）的全部文案，9 种语言全配。
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
    zh: '文本文件节点持有一段 <code>.txt</code> 文本，并把它同时作为<b>纯文本</b>和<b>文件</b>向下游送出。它没有标题栏，中间是文件图标，图标下方显示文件名与大小。',
    en: 'The Text File node holds a <code>.txt</code> text and sends it downstream both as <b>plain text</b> and as a <b>file</b>. It has no title bar — a file icon sits in the centre, with the file name and size below it.',
    ja: 'テキストファイルノードは <code>.txt</code> のテキストを保持し、それを<b>プレーンテキスト</b>としても<b>ファイル</b>としても下流へ送り出します。タイトルバーはなく、中央にファイルアイコン、その下にファイル名とサイズを表示します。',
    ko: '텍스트 파일 노드는 <code>.txt</code> 텍스트를 보관하고, 이를 <b>일반 텍스트</b>와 <b>파일</b>로 동시에 하위에 내보냅니다. 제목 표시줄이 없으며 가운데에 파일 아이콘이 있고 그 아래에 파일 이름과 크기가 표시됩니다.',
    es: 'El nodo Archivo de texto contiene un texto <code>.txt</code> y lo envía a los nodos posteriores tanto como <b>texto plano</b> como <b>archivo</b>. No tiene barra de título: en el centro hay un icono de archivo y, debajo, el nombre y el tamaño.',
    ar: 'تحتفظ عقدة ملف النص بمحتوى نصي من نوع <code>.txt</code> وتُرسله إلى العقد اللاحقة <b>كنص عادي</b> و<b>كملف</b> في آن واحد. لا تحتوي على شريط عنوان، وفي وسطها أيقونة ملف وتحتها اسم الملف وحجمه.',
    fr: 'Le nœud Fichier texte contient un texte <code>.txt</code> et l’envoie aux nœuds en aval à la fois comme <b>texte brut</b> et comme <b>fichier</b>. Il n’a pas de barre de titre : une icône de fichier est au centre, avec le nom et la taille en dessous.',
    pt: 'O nó Ficheiro de texto contém um texto <code>.txt</code> e envia-o aos nós seguintes tanto como <b>texto simples</b> como <b>ficheiro</b>. Não tem barra de título: no centro está um ícone de ficheiro e, abaixo, o nome e o tamanho.',
    ru: 'Узел «Текстовый файл» хранит текст <code>.txt</code> и отправляет его последующим узлам и как <b>простой текст</b>, и как <b>файл</b>. У него нет заголовка: в центре — значок файла, под ним имя и размер.'
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
    zh: '输出 <code>content</code>：节点当前持有的<b>纯文本</b>（string），任何接受字符串的下游节点都能直接接上。',
    en: 'Output <code>content</code>: the <b>plain text</b> (string) the node currently holds; any downstream node that accepts a string can connect to it directly.',
    ja: '出力 <code>content</code>：ノードが現在保持している<b>プレーンテキスト</b>（文字列）です。文字列を受け取る任意の下流ノードにそのまま接続できます。',
    ko: '출력 <code>content</code>: 노드가 현재 보관하는 <b>일반 텍스트</b>(문자열)로, 문자열을 받는 모든 하위 노드에 바로 연결할 수 있습니다.',
    es: 'Salida <code>content</code>: el <b>texto plano</b> (cadena) que el nodo contiene actualmente; cualquier nodo posterior que acepte una cadena puede conectarse directamente.',
    ar: 'منفذ الإخراج <code>content</code>: <b>النص العادي</b> (سلسلة نصية) الذي تحتفظ به العقدة حاليًا؛ ويمكن توصيله مباشرة بأي عقدة لاحقة تقبل نصًا.',
    fr: 'Sortie <code>content</code> : le <b>texte brut</b> (chaîne) que le nœud contient actuellement ; tout nœud en aval acceptant une chaîne peut s’y connecter directement.',
    pt: 'Saída <code>content</code>: o <b>texto simples</b> (string) que o nó contém atualmente; qualquer nó seguinte que aceite uma string pode ligar-se diretamente.',
    ru: 'Выход <code>content</code>: текущий <b>простой текст</b> узла (строка); к нему можно напрямую подключить любой последующий узел, принимающий строку.'
  },
  portsLi2: {
    zh: '输出 <code>file</code>：<code>TxtFileValue</code>（kind 为 <code>txt-file</code>），下游接 txt 或通用文件类型的节点都能连上。',
    en: 'Output <code>file</code>: a <code>TxtFileValue</code> (kind <code>txt-file</code>); downstream nodes that accept txt files or generic files can connect to it.',
    ja: '出力 <code>file</code>：<code>TxtFileValue</code>（kind は <code>txt-file</code>）です。txt ファイルまたは汎用ファイルを受け取る下流ノードに接続できます。',
    ko: '출력 <code>file</code>: <code>TxtFileValue</code>(kind는 <code>txt-file</code>)이며, txt 파일이나 일반 파일을 받는 하위 노드에 연결할 수 있습니다.',
    es: 'Salida <code>file</code>: un <code>TxtFileValue</code> (kind <code>txt-file</code>); pueden conectarse los nodos posteriores que acepten archivos txt o archivos genéricos.',
    ar: 'منفذ الإخراج <code>file</code>: قيمة <code>TxtFileValue</code> (نوعها <code>txt-file</code>)؛ ويمكن توصيل العقد اللاحقة التي تقبل ملفات txt أو الملفات العامة بها.',
    fr: 'Sortie <code>file</code> : un <code>TxtFileValue</code> (kind <code>txt-file</code>) ; les nœuds en aval acceptant les fichiers txt ou les fichiers génériques peuvent s’y connecter.',
    pt: 'Saída <code>file</code>: um <code>TxtFileValue</code> (kind <code>txt-file</code>); os nós seguintes que aceitem ficheiros txt ou ficheiros genéricos podem ligar-se.',
    ru: 'Выход <code>file</code>: значение <code>TxtFileValue</code> (kind <code>txt-file</code>); к нему подключаются последующие узлы, принимающие txt-файлы или файлы общего типа.'
  },
  portsLi3: {
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
  portsLi4: {
    zh: '输入 <code>file-in</code>：只接受 txt 文件；收到文件会<b>替换</b>本节点当前文件，并重新读取其内容。',
    en: 'Input <code>file-in</code>: accepts only txt files; a received file <b>replaces</b> the node’s current file and its content is re-read.',
    ja: '入力 <code>file-in</code>：txt ファイルのみを受け付けます。ファイルを受け取ると本ノードの現在のファイルを<b>置き換え</b>、内容を読み直します。',
    ko: '입력 <code>file-in</code>: txt 파일만 받습니다. 파일을 받으면 이 노드의 현재 파일을 <b>교체</b>하고 내용을 다시 읽습니다.',
    es: 'Entrada <code>file-in</code>: solo acepta archivos txt; al recibir uno, <b>reemplaza</b> el archivo actual del nodo y se vuelve a leer su contenido.',
    ar: 'منفذ الإدخال <code>file-in</code>: يقبل ملفات txt فقط؛ وعند استلام ملف فإنه <b>يستبدل</b> ملف العقدة الحالي وتُعاد قراءة محتواه.',
    fr: 'Entrée <code>file-in</code> : n’accepte que les fichiers txt ; un fichier reçu <b>remplace</b> le fichier actuel du nœud et son contenu est relu.',
    pt: 'Entrada <code>file-in</code>: aceita apenas ficheiros txt; ao receber um, <b>substitui</b> o ficheiro atual do nó e o conteúdo é relido.',
    ru: 'Вход <code>file-in</code>: принимает только txt-файлы; полученный файл <b>заменяет</b> текущий файл узла, и его содержимое читается заново.'
  },
  portsLi5: {
    zh: '输入 <code>content-in</code>：收到字符串即写入节点内容；若本节点<b>已有文件名</b>，新内容会同步落盘覆盖该文件。',
    en: 'Input <code>content-in</code>: a received string is written into the node’s content; if the node <b>already has a file name</b>, the new content is also written to disk, overwriting that file.',
    ja: '入力 <code>content-in</code>：文字列を受け取るとノードの内容に書き込みます。本ノードに<b>ファイル名がある</b>場合は、新しい内容がディスクにも書き込まれ、そのファイルを上書きします。',
    ko: '입력 <code>content-in</code>: 문자열을 받으면 노드 내용에 기록합니다. 이 노드에 <b>파일 이름이 있으면</b> 새 내용이 디스크에도 기록되어 해당 파일을 덮어씁니다.',
    es: 'Entrada <code>content-in</code>: la cadena recibida se escribe en el contenido del nodo; si el nodo <b>ya tiene nombre de archivo</b>, el nuevo contenido también se guarda en disco, sobrescribiendo ese archivo.',
    ar: 'منفذ الإدخال <code>content-in</code>: تُكتَب السلسلة المستلمة في محتوى العقدة؛ وإذا كان للعقدة <b>اسم ملف</b> بالفعل، فيُكتَب المحتوى الجديد على القرص أيضًا مستبدلًا ذلك الملف.',
    fr: 'Entrée <code>content-in</code> : la chaîne reçue est écrite dans le contenu du nœud ; si le nœud a <b>déjà un nom de fichier</b>, le nouveau contenu est aussi écrit sur le disque, écrasant ce fichier.',
    pt: 'Entrada <code>content-in</code>: a string recebida é escrita no conteúdo do nó; se o nó <b>já tiver um nome de ficheiro</b>, o novo conteúdo também é gravado no disco, substituindo esse ficheiro.',
    ru: 'Вход <code>content-in</code>: полученная строка записывается в содержимое узла; если у узла <b>уже есть имя файла</b>, новое содержимое также сохраняется на диск, перезаписывая этот файл.'
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
    zh: '双击卡片，用<b>系统默认应用</b>打开该文件。',
    en: 'Double-click the card to open the file with the <b>system default app</b>.',
    ja: 'カードをダブルクリックすると、<b>システムの既定アプリ</b>でファイルを開きます。',
    ko: '카드를 두 번 클릭하면 <b>시스템 기본 앱</b>으로 파일을 엽니다.',
    es: 'Haz doble clic en la tarjeta para abrir el archivo con la <b>aplicación predeterminada del sistema</b>.',
    ar: 'انقر مرتين على البطاقة لفتح الملف باستخدام <b>التطبيق الافتراضي للنظام</b>.',
    fr: 'Double-cliquez sur la carte pour ouvrir le fichier avec l’<b>application par défaut du système</b>.',
    pt: 'Faça duplo clique no cartão para abrir o ficheiro com a <b>aplicação predefinida do sistema</b>.',
    ru: 'Дважды щёлкните по карточке, чтобы открыть файл <b>приложением по умолчанию</b>.'
  },
  useLi2: {
    zh: '把图标<b>拖出窗口</b>丢到桌面或文件夹，即可把文件移动到该位置。',
    en: 'Drag the icon <b>out of the window</b> onto the desktop or a folder to move the file there.',
    ja: 'アイコンを<b>ウィンドウの外</b>へドラッグしてデスクトップやフォルダにドロップすると、ファイルをその場所へ移動できます。',
    ko: '아이콘을 <b>창 밖으로</b> 끌어 바탕 화면이나 폴더에 놓으면 파일이 그 위치로 이동합니다.',
    es: 'Arrastra el icono <b>fuera de la ventana</b> hasta el escritorio o una carpeta para mover el archivo allí.',
    ar: 'اسحب الأيقونة <b>خارج النافذة</b> وأفلتها على سطح المكتب أو في مجلد لنقل الملف إلى هناك.',
    fr: 'Faites glisser l’icône <b>hors de la fenêtre</b> vers le bureau ou un dossier pour y déplacer le fichier.',
    pt: 'Arraste o ícone <b>para fora da janela</b> até à área de trabalho ou a uma pasta para mover o ficheiro para lá.',
    ru: 'Перетащите значок <b>за пределы окна</b> на рабочий стол или в папку, чтобы переместить файл туда.'
  },
  useLi3: {
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
  useLi4: {
    zh: '用外部编辑器改动该文件时，节点会自动<b>重新读取</b>内容并把新文本传给下游。',
    en: 'When the file is changed in an external editor, the node automatically <b>re-reads</b> it and passes the new text downstream.',
    ja: '外部エディタでこのファイルを変更すると、ノードは自動的に内容を<b>読み直し</b>、新しいテキストを下流へ渡します。',
    ko: '외부 편집기에서 이 파일을 수정하면 노드가 자동으로 내용을 <b>다시 읽고</b> 새 텍스트를 하위로 전달합니다.',
    es: 'Si modificas el archivo en un editor externo, el nodo <b>vuelve a leer</b> el contenido automáticamente y pasa el nuevo texto a los nodos posteriores.',
    ar: 'عند تعديل الملف في محرر خارجي، تعيد العقدة <b>قراءة</b> المحتوى تلقائيًا وتمرّر النص الجديد إلى العقد اللاحقة.',
    fr: 'Si le fichier est modifié dans un éditeur externe, le nœud le <b>relit</b> automatiquement et transmet le nouveau texte en aval.',
    pt: 'Se o ficheiro for alterado num editor externo, o nó <b>volta a ler</b> o conteúdo automaticamente e passa o novo texto a jusante.',
    ru: 'Если файл изменён во внешнем редакторе, узел автоматически <b>перечитывает</b> содержимое и передаёт новый текст дальше.'
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
    zh: '尚未选择文件时，卡片上显示「<b>未选择文件</b>」，此时不会向下游输出内容。',
    en: 'Until a file is selected the card shows “<b>No file selected</b>”, and nothing is sent downstream.',
    ja: 'ファイルを選んでいない間、カードには「<b>未選択</b>」と表示され、下流へは何も出力されません。',
    ko: '파일을 선택하지 않은 동안 카드에 “<b>파일 선택 안 됨</b>”이 표시되며, 하위로 아무것도 출력되지 않습니다.',
    es: 'Mientras no se seleccione un archivo, la tarjeta muestra «<b>Sin archivo seleccionado</b>» y no se envía nada a los nodos posteriores.',
    ar: 'إلى أن يتم اختيار ملف، تعرض البطاقة «<b>لم يتم اختيار ملف</b>»، ولا يُخرَج شيء إلى العقد اللاحقة.',
    fr: 'Tant qu’aucun fichier n’est sélectionné, la carte affiche « <b>Aucun fichier sélectionné</b> » et rien n’est envoyé en aval.',
    pt: 'Enquanto não for selecionado um ficheiro, o cartão mostra “<b>Nenhum ficheiro selecionado</b>” e nada é enviado a jusante.',
    ru: 'Пока файл не выбран, на карточке отображается «<b>Файл не выбран</b>», и ничего не отправляется дальше.'
  },
  notesLi2: {
    zh: '卡片下方显示文件名与大小，大小按 B / KB / MB 自动分档显示。',
    en: 'Below the icon the card shows the file name and size, with the size automatically scaled to B / KB / MB.',
    ja: 'アイコンの下にファイル名とサイズが表示され、サイズは B / KB / MB 単位で自動的に切り替わります。',
    ko: '아이콘 아래에 파일 이름과 크기가 표시되며, 크기는 B / KB / MB 단위로 자동 변환됩니다.',
    es: 'Bajo el icono, la tarjeta muestra el nombre y el tamaño del archivo, con el tamaño escalado automáticamente a B / KB / MB.',
    ar: 'تعرض البطاقة أسفل الأيقونة اسم الملف وحجمه، مع تحويل الحجم تلقائيًا إلى وحدات B / KB / MB.',
    fr: 'Sous l’icône, la carte affiche le nom et la taille du fichier, la taille étant automatiquement convertie en B / KB / MB.',
    pt: 'Abaixo do ícone, o cartão mostra o nome e o tamanho do ficheiro, com o tamanho convertido automaticamente em B / KB / MB.',
    ru: 'Под значком карточка показывает имя и размер файла; размер автоматически переводится в B / KB / MB.'
  }
} satisfies Record<string, LocalizedText>