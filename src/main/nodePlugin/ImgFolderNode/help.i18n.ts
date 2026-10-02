import type { LocalizedText } from '../../../shared/language'

/**
 * ImgFolder 节点帮助文档（ImgFolderHelpDialog）的全部文案，9 种语言全配。
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
    zh: '图片文件夹节点把多张图片收纳进一个<b>缩略图网格</b>：点格可选、右键出菜单、还能把图片拖回画布。当前选中的那张图片会从右侧 <code>image</code> 端口输出给下游节点。',
    en: 'The Image Folder node gathers several images into a <b>thumbnail grid</b>: click a cell to select, right-click for a menu, and drag images back out to the canvas. The currently selected image is output to downstream nodes from the <code>image</code> port on the right.',
    ja: '画像フォルダノードは複数の画像を<b>サムネイルグリッド</b>にまとめます。クリックで選択、右クリックでメニュー、画像をキャンバスへドラッグで戻せます。現在選択中の画像は右側の <code>image</code> ポートから下流ノードへ出力されます。',
    ko: '이미지 폴더 노드는 여러 이미지를 <b>썸네일 그리드</b>에 모읍니다. 클릭해 선택하고, 오른쪽 클릭으로 메뉴를 열고, 이미지를 캔버스로 다시 끌어낼 수 있습니다. 현재 선택된 이미지는 오른쪽 <code>image</code> 포트에서 하위 노드로 출력됩니다.',
    es: 'El nodo Carpeta de imágenes reúne varias imágenes en una <b>cuadrícula de miniaturas</b>: haz clic en una celda para seleccionarla, clic derecho para un menú y arrastra imágenes de vuelta al lienzo. La imagen seleccionada se envía a los nodos posteriores desde el puerto <code>image</code> de la derecha.',
    ar: 'تجمع عقدة مجلد الصور عدة صور في <b>شبكة مصغّرات</b>: انقر على خلية لتحديدها، أو انقر بزر الفأرة الأيمن لفتح قائمة، ويمكنك سحب الصور مرة أخرى إلى اللوحة. تُخرَج الصورة المحدّدة حاليًا إلى العقد اللاحقة من منفذ <code>image</code> على اليمين.',
    fr: 'Le nœud Dossier d’images rassemble plusieurs images dans une <b>grille de vignettes</b> : cliquez sur une case pour la sélectionner, faites un clic droit pour un menu et faites glisser les images vers le canevas. L’image sélectionnée est envoyée aux nœuds en aval depuis le port <code>image</code> à droite.',
    pt: 'O nó Pasta de imagens reúne várias imagens em uma <b>grade de miniaturas</b>: clique em uma célula para selecionar, clique com o botão direito para um menu e arraste imagens de volta ao quadro. A imagem selecionada é enviada aos nós seguintes pelo porto <code>image</code> à direita.',
    ru: 'Узел «Папка изображений» собирает несколько изображений в <b>сетку миниатюр</b>: щёлкните ячейку, чтобы выбрать, нажмите правой кнопкой для меню и перетащите изображения обратно на холст. Выбранное изображение выводится последующим узлам из порта <code>image</code> справа.'
  },

  // —— 怎么用 ——
  useTitle: {
    zh: '怎么用',
    en: 'How to use',
    ja: '使い方',
    ko: '사용 방법',
    es: 'Cómo usar',
    ar: 'كيفية الاستخدام',
    fr: 'Utilisation',
    pt: 'Como usar',
    ru: 'Как использовать'
  },
  useLi1: {
    zh: '<b>点一下</b>任意格子即切换选中；选中的格子高亮，右下角显示它的文件名',
    en: '<b>Click</b> any cell to switch the selection; the selected cell is highlighted and its file name shows at the bottom right',
    ja: '<b>クリック</b>で任意のセルを選択でき、選択したセルはハイライトされ、右下にファイル名が表示されます',
    ko: '<b>클릭</b>하면 원하는 셀이 선택되고, 선택된 셀은 강조되며 오른쪽 아래에 파일 이름이 표시됩니다',
    es: '<b>Haz clic</b> en cualquier celda para cambiar la selección; la celda elegida se resalta y su nombre de archivo aparece abajo a la derecha',
    ar: '<b>انقر</b> على أي خلية لتغيير التحديد؛ تُبرَز الخلية المحدّدة ويظهر اسم ملفها في أسفل اليمين',
    fr: '<b>Cliquez</b> sur une case pour changer la sélection ; la case choisie est mise en surbrillance et son nom de fichier s’affiche en bas à droite',
    pt: '<b>Clique</b> em qualquer célula para mudar a seleção; a célula escolhida fica destacada e o nome do arquivo aparece no canto inferior direito',
    ru: '<b>Щёлкните</b> любую ячейку, чтобы сменить выбор; выбранная ячейка подсвечивается, а её имя файла показывается внизу справа'
  },
  useLi2: {
    zh: '<b>右键</b>格子会弹出该图片节点自己的菜单（重命名、删除等）',
    en: '<b>Right-click</b> a cell to open that image node’s own menu (rename, delete, etc.)',
    ja: '<b>右クリック</b>すると、その画像ノード自身のメニュー（名前変更、削除など）が開きます',
    ko: '<b>오른쪽 클릭</b>하면 해당 이미지 노드 자체의 메뉴(이름 변경, 삭제 등)가 열립니다',
    es: '<b>Haz clic derecho</b> en una celda para abrir el menú propio de ese nodo de imagen (renombrar, eliminar, etc.)',
    ar: 'يؤدي <b>النقر بزر الفأرة الأيمن</b> على خلية إلى فتح قائمة عقدة الصورة نفسها (إعادة التسمية، الحذف، إلخ)',
    fr: '<b>Un clic droit</b> sur une case ouvre le menu propre à ce nœud image (renommer, supprimer, etc.)',
    pt: '<b>Clique com o botão direito</b> em uma célula para abrir o menu do próprio nó de imagem (renomear, excluir etc.)',
    ru: '<b>Правый клик</b> по ячейке открывает собственное меню этого узла изображения (переименование, удаление и т. п.)'
  },
  useLi3: {
    zh: '<b>拖动</b>格子可移动图片；拖到文件夹外松手就把它释放回画布，成为独立的图片节点',
    en: '<b>Drag</b> a cell to move the image; release it outside the folder to drop it back onto the canvas as an independent image node',
    ja: '<b>ドラッグ</b>で画像を移動でき、フォルダの外で離すとキャンバスへ戻り、独立した画像ノードになります',
    ko: '<b>드래그</b>하면 이미지를 옮길 수 있고, 폴더 밖에서 놓으면 캔버스로 돌아가 독립된 이미지 노드가 됩니다',
    es: '<b>Arrastra</b> una celda para mover la imagen; al soltarla fuera de la carpeta vuelve al lienzo como un nodo de imagen independiente',
    ar: '<b>اسحب</b> الخلية لتحريك الصورة؛ وإذا أفلتها خارج المجلد فستعود إلى اللوحة كعقدة صورة مستقلة',
    fr: '<b>Faites glisser</b> une case pour déplacer l’image ; relâchez-la hors du dossier pour la reposer sur le canevas en tant que nœud image indépendant',
    pt: '<b>Arraste</b> uma célula para mover a imagem; solte-a fora da pasta para devolvê-la ao quadro como um nó de imagem independente',
    ru: '<b>Перетащите</b> ячейку, чтобы переместить изображение; отпустите за пределами папки, чтобы вернуть его на холст как отдельный узел изображения'
  },
  useLi4: {
    zh: '<b>按住顶部横栏</b>拖动可整体移动文件夹（横栏是移动整个文件夹的唯一手柄）',
    en: '<b>Press and drag the top bar</b> to move the whole folder (the bar is the only handle for moving the folder)',
    ja: '<b>上部のバーを押しながらドラッグ</b>するとフォルダ全体を移動できます（バーはフォルダ全体を移動する唯一のハンドルです）',
    ko: '<b>상단 바를 누르고 드래그</b>하면 폴더 전체를 이동할 수 있습니다 (상단 바는 폴더 전체를 옮기는 유일한 핸들입니다)',
    es: '<b>Mantén pulsada la barra superior y arrástrala</b> para mover toda la carpeta (la barra es el único asa para moverla)',
    ar: '<b>اضغط مع السحب على الشريط العلوي</b> لتحريك المجلد بأكمله (الشريط هو المقبض الوحيد لتحريك المجلد)',
    fr: '<b>Maintenez et faites glisser la barre du haut</b> pour déplacer tout le dossier (la barre est la seule poignée pour déplacer le dossier)',
    pt: '<b>Pressione e arraste a barra superior</b> para mover a pasta inteira (a barra é a única alça para mover a pasta)',
    ru: '<b>Зажмите и перетащите верхнюю панель</b>, чтобы переместить всю папку (панель — единственный маркер для перемещения папки)'
  },

  // —— 说明 ——
  notesTitle: {
    zh: '说明',
    en: 'Notes',
    ja: '補足',
    ko: '참고',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Observações',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '文件夹只接受<b>图片</b>——节点拖入、文件拖入、端口收值三条入口都限定为图片',
    en: 'The folder accepts only <b>images</b> — all three entry points (dropping a node, dropping a file, receiving a port value) are restricted to images',
    ja: 'フォルダは<b>画像</b>のみを受け付けます。ノードのドロップ・ファイルのドロップ・ポートでの受信の3つの入口すべてが画像に限定されます',
    ko: '폴더는 <b>이미지</b>만 받습니다. 노드 드롭, 파일 드롭, 포트로 값 받기 세 경로 모두 이미지로 제한됩니다',
    es: 'La carpeta solo acepta <b>imágenes</b>: las tres vías (soltar un nodo, soltar un archivo, recibir un valor por puerto) están limitadas a imágenes',
    ar: 'لا يقبل المجلد سوى <b>الصور</b> — المداخل الثلاثة (إفلات عقدة، إفلات ملف، استقبال قيمة عبر منفذ) كلها مقصورة على الصور',
    fr: 'Le dossier n’accepte que des <b>images</b> : les trois entrées (dépôt d’un nœud, dépôt d’un fichier, réception d’une valeur de port) sont limitées aux images',
    pt: 'A pasta aceita apenas <b>imagens</b> — as três entradas (soltar um nó, soltar um arquivo, receber um valor por porto) são restritas a imagens',
    ru: 'Папка принимает только <b>изображения</b> — все три входа (перетаскивание узла, перетаскивание файла, приём значения через порт) ограничены изображениями'
  },
  notesLi2: {
    zh: '第一张被收纳的图片会自动选中；选中项被移出后自动回退到下一张，一张都不剩就清空右侧输出',
    en: 'The first image added is selected automatically; if the selected one is removed, the selection falls back to the next image, and to an empty output if none remain',
    ja: '最初に取り込まれた画像が自動的に選択されます。選択中の画像が外されると次の画像に移り、1枚も残らなければ右側の出力は空になります',
    ko: '처음 들어온 이미지가 자동으로 선택됩니다. 선택된 이미지가 빠지면 다음 이미지로 넘어가고, 하나도 남지 않으면 오른쪽 출력이 비워집니다',
    es: 'La primera imagen añadida se selecciona automáticamente; si se quita la seleccionada, pasa a la siguiente imagen, y si no queda ninguna, la salida de la derecha se vacía',
    ar: 'تُحدَّد الصورة الأولى المُضافة تلقائيًا؛ وإذا أُزيلت المحدّدة ينتقل التحديد إلى الصورة التالية، وإن لم تبقَ أي صورة يُفرَّغ الإخراج على اليمين',
    fr: 'La première image ajoutée est sélectionnée automatiquement ; si celle qui est sélectionnée est retirée, la sélection passe à l’image suivante, et la sortie à droite se vide s’il n’en reste aucune',
    pt: 'A primeira imagem adicionada é selecionada automaticamente; se a selecionada for removida, a seleção passa para a próxima imagem e, se não sobrar nenhuma, a saída à direita é esvaziada',
    ru: 'Первое добавленное изображение выбирается автоматически; если выбранное убрать, выбор переходит к следующему изображению, а если не останется ни одного — правый выход очищается'
  },
  notesLi3: {
    zh: '选中的图片通过右侧 <code>image</code> 端口输出，下游连边即可拿到「当前选中的图」；选中图片被替换或异步读回后，输出会自动更新',
    en: 'The selected image is output from the <code>image</code> port on the right, so a downstream edge receives the “currently selected image”; if that image is replaced or read back asynchronously, the output updates automatically',
    ja: '選択中の画像は右側の <code>image</code> ポートから出力されるため、下流で辺をつなぐと「現在選択中の画像」を取得できます。選択中の画像が置き換えられたり非同期で読み戻されたりすると、出力は自動的に更新されます',
    ko: '선택된 이미지는 오른쪽 <code>image</code> 포트로 출력되므로, 하위에 연결하면 “현재 선택된 이미지”를 얻을 수 있습니다. 선택된 이미지가 교체되거나 비동기로 다시 읽히면 출력이 자동으로 갱신됩니다',
    es: 'La imagen seleccionada se envía por el puerto <code>image</code> de la derecha, así que una conexión posterior recibe la “imagen seleccionada actualmente”; si esa imagen se reemplaza o se relee de forma asíncrona, la salida se actualiza sola',
    ar: 'تُخرَج الصورة المحدّدة من منفذ <code>image</code> على اليمين، لذا يحصل أي اتصال لاحق على «الصورة المحدّدة حاليًا»؛ وإذا استُبدلت هذه الصورة أو أُعيد قراءتها بشكل غير متزامن، يتحدّث الإخراج تلقائيًا',
    fr: 'L’image sélectionnée est émise par le port <code>image</code> à droite : une connexion en aval reçoit donc « l’image actuellement sélectionnée » ; si cette image est remplacée ou relue de façon asynchrone, la sortie se met à jour automatiquement',
    pt: 'A imagem selecionada é enviada pelo porto <code>image</code> à direita, então uma conexão seguinte recebe a “imagem selecionada no momento”; se essa imagem for substituída ou relida de forma assíncrona, a saída é atualizada automaticamente',
    ru: 'Выбранное изображение выводится из порта <code>image</code> справа, поэтому соединение далее получает «текущее выбранное изображение»; если оно будет заменено или асинхронно перечитано, выход обновится автоматически'
  },
  notesLi4: {
    zh: '拖动右下角的手柄可调整文件夹大小（最小 2×2 格）',
    en: 'Drag the handle at the bottom-right corner to resize the folder (min 2×2)',
    ja: '右下のハンドルをドラッグするとフォルダの大きさを変更できます（最小 2×2）',
    ko: '오른쪽 아래 핸들을 드래그하면 폴더 크기를 조절할 수 있습니다 (최소 2×2)',
    es: 'Arrastra el asa de la esquina inferior derecha para cambiar el tamaño de la carpeta (mín. 2×2)',
    ar: 'اسحب المقبض في الزاوية السفلية اليمنى لتغيير حجم المجلد (الحد الأدنى 2×2)',
    fr: 'Faites glisser la poignée en bas à droite pour redimensionner le dossier (min. 2×2)',
    pt: 'Arraste a alça no canto inferior direito para redimensionar a pasta (mín. 2×2)',
    ru: 'Перетащите маркер в правом нижнем углу, чтобы изменить размер папки (минимум 2×2)'
  },
  notesLi5: {
    zh: '底部提示实时显示图片总数和当前选中的文件名',
    en: 'The hint at the bottom shows the total number of images and the currently selected file name in real time',
    ja: '下部のヒントには画像の総数と現在選択中のファイル名がリアルタイムで表示されます',
    ko: '하단 힌트에는 이미지 총 개수와 현재 선택된 파일 이름이 실시간으로 표시됩니다',
    es: 'La pista inferior muestra en tiempo real el número total de imágenes y el nombre del archivo seleccionado',
    ar: 'يظهر التلميح في الأسفل إجمالي عدد الصور واسم الملف المحدّد حاليًا في الوقت الفعلي',
    fr: 'L’indication en bas affiche en temps réel le nombre total d’images et le nom du fichier sélectionné',
    pt: 'A dica na parte inferior mostra em tempo real o total de imagens e o nome do arquivo selecionado',
    ru: 'Подсказка внизу показывает в реальном времени общее число изображений и имя выбранного файла'
  }
} satisfies Record<string, LocalizedText>