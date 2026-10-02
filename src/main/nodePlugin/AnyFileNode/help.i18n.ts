import type { LocalizedText } from '../../../shared/language'

/**
 * AnyFile 节点帮助文档（AnyFileHelpDialog）的全部文案，9 种语言全配。
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
    zh: '通用文件节点是文件类型的<b>兜底</b>：任何后缀都能接，注册表里排在最后，只有当其它文件节点都不匹配时才落到它身上。它没有标题栏，中间是文件图标，图标下方显示文件名与大小。',
    en: 'The Generic File node is the <b>catch-all</b> for file types: it accepts any extension and sits last in the registry, so it is only used when no other file node matches. It has no title bar — a file icon sits in the centre, with the file name and size below it.',
    ja: '汎用ファイルノードはファイル種別の<b>フォールバック</b>です。あらゆる拡張子を受け付け、レジストリの最後に配置されるため、他のファイルノードがどれも一致しないときだけ使われます。タイトルバーはなく、中央にファイルアイコン、その下にファイル名とサイズを表示します。',
    ko: '범용 파일 노드는 파일 유형의 <b>폴백</b>입니다. 모든 확장자를 받으며 레지스트리 맨 뒤에 위치하므로, 다른 파일 노드가 하나도 일치하지 않을 때만 사용됩니다. 제목 표시줄이 없으며 가운데에 파일 아이콘이 있고 그 아래에 파일 이름과 크기가 표시됩니다.',
    es: 'El nodo Archivo genérico es el <b>comodín</b> de los tipos de archivo: acepta cualquier extensión y ocupa el último lugar del registro, por lo que solo se usa cuando ningún otro nodo de archivo coincide. No tiene barra de título: en el centro hay un icono de archivo y, debajo, el nombre y el tamaño.',
    ar: 'عقدة الملف العام هي <b>الخيار الاحتياطي</b> لأنواع الملفات: تقبل أي امتداد وتأتي في آخر السجل، فلا تُستخدم إلا عندما لا تطابق أي عقدة ملف أخرى. لا تحتوي على شريط عنوان، وفي وسطها أيقونة ملف وتحتها اسم الملف وحجمه.',
    fr: 'Le nœud Fichier générique est le <b>repli</b> des types de fichiers : il accepte toute extension et se place en dernier dans le registre, il n’est donc utilisé que lorsqu’aucun autre nœud de fichier ne correspond. Il n’a pas de barre de titre : une icône de fichier est au centre, avec le nom et la taille en dessous.',
    pt: 'O nó Ficheiro genérico é o <b>recurso de reserva</b> dos tipos de ficheiro: aceita qualquer extensão e fica em último no registo, pelo que só é usado quando nenhum outro nó de ficheiro corresponde. Não tem barra de título: no centro está um ícone de ficheiro e, abaixo, o nome e o tamanho.',
    ru: 'Узел «Обычный файл» — <b>запасной</b> для типов файлов: он принимает любое расширение и стоит последним в реестре, поэтому используется только тогда, когда ни один другой файловый узел не подошёл. У него нет заголовка: в центре — значок файла, под ним имя и размер.'
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
    zh: '输出 <code>file</code>：<code>FileValue</code>（kind 为 <code>file</code>），下游接通用文件类型的节点都能连上。',
    en: 'Output <code>file</code>: a <code>FileValue</code> (kind <code>file</code>); downstream nodes that accept generic files can connect to it.',
    ja: '出力 <code>file</code>：<code>FileValue</code>（kind は <code>file</code>）です。汎用ファイルを受け取る下流ノードに接続できます。',
    ko: '출력 <code>file</code>: <code>FileValue</code>(kind는 <code>file</code>)이며, 일반 파일을 받는 하위 노드에 연결할 수 있습니다.',
    es: 'Salida <code>file</code>: un <code>FileValue</code> (kind <code>file</code>); pueden conectarse los nodos posteriores que acepten archivos genéricos.',
    ar: 'منفذ الإخراج <code>file</code>: قيمة <code>FileValue</code> (نوعها <code>file</code>)؛ ويمكن توصيل العقد اللاحقة التي تقبل الملفات العامة بها.',
    fr: 'Sortie <code>file</code> : un <code>FileValue</code> (kind <code>file</code>) ; les nœuds en aval acceptant les fichiers génériques peuvent s’y connecter.',
    pt: 'Saída <code>file</code>: um <code>FileValue</code> (kind <code>file</code>); os nós seguintes que aceitem ficheiros genéricos podem ligar-se.',
    ru: 'Выход <code>file</code>: значение <code>FileValue</code> (kind <code>file</code>); к нему подключаются последующие узлы, принимающие файлы общего типа.'
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
    zh: '输入 <code>file-in</code>：接受任意文件，收到文件会<b>替换</b>本节点当前文件，并重新读取它。',
    en: 'Input <code>file-in</code>: accepts any file; a received file <b>replaces</b> the node’s current file and is re-read.',
    ja: '入力 <code>file-in</code>：任意のファイルを受け付けます。ファイルを受け取ると本ノードの現在のファイルを<b>置き換え</b>、読み直します。',
    ko: '입력 <code>file-in</code>: 모든 파일을 받습니다. 파일을 받으면 이 노드의 현재 파일을 <b>교체</b>하고 다시 읽습니다.',
    es: 'Entrada <code>file-in</code>: acepta cualquier archivo; al recibir uno, <b>reemplaza</b> el archivo actual del nodo y se vuelve a leer.',
    ar: 'منفذ الإدخال <code>file-in</code>: يقبل أي ملف؛ وعند استلام ملف فإنه <b>يستبدل</b> ملف العقدة الحالي وتُعاد قراءته.',
    fr: 'Entrée <code>file-in</code> : accepte n’importe quel fichier ; un fichier reçu <b>remplace</b> le fichier actuel du nœud et est relu.',
    pt: 'Entrada <code>file-in</code>: aceita qualquer ficheiro; ao receber um, <b>substitui</b> o ficheiro atual do nó e este é relido.',
    ru: 'Вход <code>file-in</code>: принимает любой файл; полученный файл <b>заменяет</b> текущий файл узла и читается заново.'
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
    zh: '图标下方显示文件名与大小，大小按 B / KB / MB 自动分档显示。',
    en: 'Below the icon the card shows the file name and size, with the size automatically scaled to B / KB / MB.',
    ja: 'アイコンの下にファイル名とサイズが表示され、サイズは B / KB / MB 単位で自動的に切り替わります。',
    ko: '아이콘 아래에 파일 이름과 크기가 표시되며, 크기는 B / KB / MB 단위로 자동 변환됩니다.',
    es: 'Bajo el icono, la tarjeta muestra el nombre y el tamaño del archivo, con el tamaño escalado automáticamente a B / KB / MB.',
    ar: 'تعرض البطاقة أسفل الأيقونة اسم الملف وحجمه، مع تحويل الحجم تلقائيًا إلى وحدات B / KB / MB.',
    fr: 'Sous l’icône, la carte affiche le nom et la taille du fichier, la taille étant automatiquement convertie en B / KB / MB.',
    pt: 'Abaixo do ícone, o cartão mostra o nome e o tamanho do ficheiro, com o tamanho convertido automaticamente em B / KB / MB.',
    ru: 'Под значком карточка показывает имя и размер файла; размер автоматически переводится в B / KB / MB.'
  },
  notesLi3: {
    zh: '图标上的标签显示文件后缀缩写（大写）；没有后缀时显示 <code>FILE</code>。',
    en: 'The label on the icon shows the file extension in capitals; when there is no extension it shows <code>FILE</code>.',
    ja: 'アイコン上のラベルにはファイル拡張子の略称（大文字）が表示されます。拡張子がない場合は <code>FILE</code> と表示されます。',
    ko: '아이콘의 라벨에는 파일 확장자 약어(대문자)가 표시됩니다. 확장자가 없으면 <code>FILE</code>로 표시됩니다.',
    es: 'La etiqueta del icono muestra la extensión del archivo en mayúsculas; si no hay extensión, muestra <code>FILE</code>.',
    ar: 'يعرض الملصق على الأيقونة اختصار امتداد الملف (بأحرف كبيرة)، وعند عدم وجود امتداد يظهر <code>FILE</code>.',
    fr: 'L’étiquette sur l’icône affiche l’extension du fichier en majuscules ; en l’absence d’extension, elle affiche <code>FILE</code>.',
    pt: 'A etiqueta no ícone mostra a extensão do ficheiro em maiúsculas; quando não há extensão, mostra <code>FILE</code>.',
    ru: 'Ярлык на значке показывает расширение файла заглавными буквами; если расширения нет, отображается <code>FILE</code>.'
  },
  notesLi4: {
    zh: '删除本节点时，画布目录里对应的文件副本也会一并删除。',
    en: 'Deleting this node also deletes the matching file copy in the canvas directory.',
    ja: '本ノードを削除すると、キャンバスディレクトリ内の対応するファイルのコピーも一緒に削除されます。',
    ko: '이 노드를 삭제하면 캔버스 디렉터리에 있는 해당 파일 사본도 함께 삭제됩니다.',
    es: 'Al eliminar este nodo también se elimina la copia correspondiente del archivo en el directorio del lienzo.',
    ar: 'عند حذف هذه العقدة تُحذف أيضًا نسخة الملف المقابلة في مجلد اللوحة.',
    fr: 'Supprimer ce nœud supprime aussi la copie correspondante du fichier dans le répertoire du canevas.',
    pt: 'Eliminar este nó elimina também a cópia correspondente do ficheiro na pasta da tela.',
    ru: 'При удалении этого узла соответствующая копия файла в каталоге холста также удаляется.'
  }
} satisfies Record<string, LocalizedText>