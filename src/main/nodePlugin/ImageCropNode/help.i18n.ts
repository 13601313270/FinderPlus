import type { LocalizedText } from '../../../shared/language'

/**
 * ImageCrop 节点帮助文档（ImageCropHelpDialog）的全部文案，9 种语言全配。
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
    zh: '图片裁剪节点接收一张图片，框选一块区域裁剪后从右侧 <code>image</code> 端口输出给下游节点。裁剪框坐标按<b>原图像素</b>保存。',
    en: 'The Image Crop node takes an image, crops a selected region, and outputs the result to downstream nodes from the <code>image</code> port on the right. The crop box coordinates are stored in <b>original image pixels</b>.',
    ja: '画像切り抜きノードは画像を受け取り、選択した領域を切り抜いて、右側の <code>image</code> ポートから下流ノードへ出力します。切り抜き枠の座標は<b>元画像のピクセル</b>で保存されます。',
    ko: '이미지 자르기 노드는 이미지를 받아 선택한 영역을 잘라낸 뒤 오른쪽 <code>image</code> 포트에서 하위 노드로 출력합니다. 자르기 상자의 좌표는 <b>원본 이미지 픽셀</b> 기준으로 저장됩니다.',
    es: 'El nodo Recortar imagen toma una imagen, recorta la región seleccionada y envía el resultado a los nodos posteriores desde el puerto <code>image</code> de la derecha. Las coordenadas del recuadro se guardan en <b>píxeles de la imagen original</b>.',
    ar: 'تستقبل عقدة قص الصورة صورةً، وتقصّ منطقة محددة، ثم تُخرج النتيجة إلى العقد اللاحقة من منفذ <code>image</code> على اليمين. تُحفظ إحداثيات إطار القص بوحدة <b>بكسل الصورة الأصلية</b>.',
    fr: 'Le nœud Recadrage d’image prend une image, découpe la zone sélectionnée et envoie le résultat aux nœuds en aval depuis le port <code>image</code> à droite. Les coordonnées du cadre sont stockées en <b>pixels de l’image d’origine</b>.',
    pt: 'O nó Recortar imagem recebe uma imagem, recorta a região selecionada e envia o resultado aos nós seguintes pelo porto <code>image</code> à direita. As coordenadas do quadro de recorte são guardadas em <b>pixels da imagem original</b>.',
    ru: 'Узел «Обрезка изображения» принимает изображение, обрезает выбранную область и выводит результат последующим узлам из порта <code>image</code> справа. Координаты рамки хранятся в <b>пикселях исходного изображения</b>.'
  },

  // —— 如何框选 ——
  useTitle: {
    zh: '如何框选',
    en: 'Selecting the crop area',
    ja: '切り抜き範囲の指定',
    ko: '자를 영역 선택',
    es: 'Cómo seleccionar el área',
    ar: 'كيفية تحديد منطقة القص',
    fr: 'Sélection de la zone',
    pt: 'Como selecionar a área',
    ru: 'Выбор области'
  },
  useLi1: {
    zh: '拖动裁剪框<b>内部</b>可整体移动位置',
    en: 'Drag <b>inside</b> the crop box to move it as a whole',
    ja: '切り抜き枠の<b>内側</b>をドラッグすると枠ごと移動します',
    ko: '자르기 상자 <b>안쪽</b>을 드래그하면 상자 전체가 이동합니다',
    es: 'Arrastra <b>dentro</b> del recuadro para moverlo entero',
    ar: 'اسحب <b>داخل</b> إطار القص لتحريكه بالكامل',
    fr: 'Faites glisser <b>à l’intérieur</b> du cadre pour le déplacer entièrement',
    pt: 'Arraste <b>dentro</b> do quadro para movê-lo por inteiro',
    ru: 'Перетаскивайте <b>внутри</b> рамки, чтобы переместить её целиком'
  },
  useLi2: {
    zh: '拖动四角与四边的<b>八个手柄</b>可自由缩放裁剪框',
    en: 'Drag the <b>eight handles</b> on the corners and edges to resize the crop box freely',
    ja: '四隅と四辺の<b>8つのハンドル</b>をドラッグして切り抜き枠を自由に拡大縮小できます',
    ko: '네 모서리와 네 변의 <b>8개 핸들</b>을 드래그해 자르기 상자를 자유롭게 조절합니다',
    es: 'Arrastra los <b>ocho tiradores</b> de las esquinas y los bordes para redimensionar el recuadro libremente',
    ar: 'اسحب <b>المقابض الثمانية</b> على الزوايا والحواف لتغيير حجم إطار القص بحرية',
    fr: 'Faites glisser les <b>huit poignées</b> des coins et des bords pour redimensionner librement le cadre',
    pt: 'Arraste os <b>oito puxadores</b> dos cantos e das bordas para redimensionar o quadro livremente',
    ru: 'Перетаскивайте <b>восемь маркеров</b> по углам и сторонам, чтобы свободно менять размер рамки'
  },
  useLi3: {
    zh: '裁剪框上方实时显示当前区域的像素尺寸（<code>宽×高</code>）',
    en: 'The pixel size of the current region (<code>W×H</code>) is shown above the crop box in real time',
    ja: '切り抜き枠の上に現在の領域のピクセルサイズ（<code>幅×高さ</code>）がリアルタイムで表示されます',
    ko: '자르기 상자 위에 현재 영역의 픽셀 크기(<code>너비×높이</code>)가 실시간으로 표시됩니다',
    es: 'Sobre el recuadro se muestra en tiempo real el tamaño en píxeles de la región (<code>An×Al</code>)',
    ar: 'يُعرض فوق إطار القص حجم المنطقة الحالي بالبكسل (<code>العرض×الارتفاع</code>) في الوقت الفعلي',
    fr: 'La taille en pixels de la zone actuelle (<code>L×H</code>) s’affiche en temps réel au-dessus du cadre',
    pt: 'O tamanho em pixels da região atual (<code>L×A</code>) é mostrado acima do quadro em tempo real',
    ru: 'Над рамкой в реальном времени показывается размер области в пикселях (<code>Ш×В</code>)'
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
    zh: '左侧 <code>图片</code> 输入端口接收图片（<code>ImgFileValue</code>）；上游图片变化时源图与裁剪框自动刷新',
    en: 'The <code>Image</code> input port on the left accepts an image (<code>ImgFileValue</code>); when the upstream image changes, the source image and crop box refresh automatically',
    ja: '左側の <code>画像</code> 入力ポートは画像（<code>ImgFileValue</code>）を受け取ります。上流の画像が変わると元画像と切り抜き枠が自動で更新されます',
    ko: '왼쪽 <code>이미지</code> 입력 포트는 이미지(<code>ImgFileValue</code>)를 받습니다. 상위 이미지가 바뀌면 원본 이미지와 자르기 상자가 자동으로 갱신됩니다',
    es: 'El puerto de entrada <code>Imagen</code> de la izquierda acepta una imagen (<code>ImgFileValue</code>); cuando cambia la imagen en curso, la imagen y el recuadro se actualizan solos',
    ar: 'يقبل منفذ الإدخال <code>صورة</code> على اليسار صورةً (<code>ImgFileValue</code>)؛ وعند تغيّر الصورة من المنبع تتحدّث الصورة الأصلية وإطار القص تلقائيًا',
    fr: 'Le port d’entrée <code>Image</code> à gauche accepte une image (<code>ImgFileValue</code>) ; lorsque l’image en amont change, l’image source et le cadre se rafraîchissent automatiquement',
    pt: 'O porto de entrada <code>Imagem</code> à esquerda aceita uma imagem (<code>ImgFileValue</code>); quando a imagem de origem muda, a imagem-fonte e o quadro de recorte atualizam-se sozinhos',
    ru: 'Входной порт <code>Изображение</code> слева принимает изображение (<code>ImgFileValue</code>); при изменении исходного изображения картинка и рамка обновляются автоматически'
  },
  portsLi2: {
    zh: '右侧 <code>裁剪图</code> 输出端口输出裁剪结果（<code>ImgFileValue</code>），保持源图格式、文件名加 <code>-cropped</code> 后缀',
    en: 'The <code>Cropped Image</code> output port on the right outputs the result (<code>ImgFileValue</code>), keeping the source format and appending <code>-cropped</code> to the file name',
    ja: '右側の <code>切り抜き画像</code> 出力ポートは切り抜き結果（<code>ImgFileValue</code>）を出力し、元画像の形式を保ちファイル名に <code>-cropped</code> を付けます',
    ko: '오른쪽 <code>자른 이미지</code> 출력 포트는 자르기 결과(<code>ImgFileValue</code>)를 출력하며, 원본 형식을 유지하고 파일명에 <code>-cropped</code>를 붙입니다',
    es: 'El puerto de salida <code>Imagen recortada</code> de la derecha emite el resultado (<code>ImgFileValue</code>), conservando el formato de origen y añadiendo <code>-cropped</code> al nombre',
    ar: 'يُخرج منفذ <code>الصورة المقصوصة</code> على اليمين النتيجة (<code>ImgFileValue</code>) مع الحفاظ على تنسيق المصدر وإضافة اللاحقة <code>-cropped</code> إلى اسم الملف',
    fr: 'Le port de sortie <code>Image recadrée</code> à droite émet le résultat (<code>ImgFileValue</code>), en conservant le format source et en ajoutant <code>-cropped</code> au nom',
    pt: 'O porto de saída <code>Imagem recortada</code> à direita emite o resultado (<code>ImgFileValue</code>), mantendo o formato de origem e acrescentando <code>-cropped</code> ao nome',
    ru: 'Выходной порт <code>Обрезанное изображение</code> справа выдаёт результат (<code>ImgFileValue</code>), сохраняя формат источника и добавляя <code>-cropped</code> к имени'
  },
  portsLi3: {
    zh: '可拖入<b>图片节点</b>（一次性裁剪），也可用端口接线（响应式裁剪）',
    en: 'You can drop in an <b>image node</b> (one-off crop) or connect the port (reactive crop)',
    ja: '<b>画像ノード</b>をドロップする（一度だけの切り抜き）か、ポートを接続する（リアクティブ切り抜き）ことができます',
    ko: '<b>이미지 노드</b>를 끌어다 놓거나(1회성 자르기), 포트에 연결(반응형 자르기)할 수 있습니다',
    es: 'Puedes soltar un <b>nodo de imagen</b> (recorte puntual) o conectar el puerto (recorte reactivo)',
    ar: 'يمكنك إسقاط <b>عقدة صورة</b> (قص لمرة واحدة) أو توصيل المنفذ (قص تفاعلي)',
    fr: 'Vous pouvez déposer un <b>nœud image</b> (recadrage ponctuel) ou connecter le port (recadrage réactif)',
    pt: 'Você pode soltar um <b>nó de imagem</b> (recorte pontual) ou conectar o porto (recorte reativo)',
    ru: 'Можно перетащить <b>узел изображения</b> (разовая обрезка) или подключить порт (реактивная обрезка)'
  },

  // —— 裁剪与输出 ——
  runTitle: {
    zh: '裁剪与输出',
    en: 'Cropping & output',
    ja: '切り抜きと出力',
    ko: '자르기와 출력',
    es: 'Recorte y salida',
    ar: 'القص والإخراج',
    fr: 'Recadrage et sortie',
    pt: 'Recorte e saída',
    ru: 'Обрезка и вывод'
  },
  runLi1: {
    zh: '点「<b>确认裁剪</b>」按当前裁剪框裁剪，结果提交到输出端口，下游节点随即刷新',
    en: 'Click <b>Confirm crop</b> to crop by the current box; the result is committed to the output port and downstream nodes refresh',
    ja: '「<b>切り抜き確定</b>」をクリックすると現在の枠で切り抜き、結果を出力ポートに commit して下流ノードが更新されます',
    ko: '“<b>자르기 확정</b>”을 클릭하면 현재 상자대로 자르고, 결과를 출력 포트에 commit하여 하위 노드가 갱신됩니다',
    es: 'Haz clic en <b>Confirmar recorte</b> para recortar con el recuadro actual; el resultado se confirma en el puerto de salida y los nodos posteriores se actualizan',
    ar: 'انقر على «<b>تأكيد القص</b>» للقص وفق الإطار الحالي، وتُثبَّت النتيجة في منفذ الإخراج فتتحدّث العقد اللاحقة',
    fr: 'Cliquez sur <b>Confirmer le recadrage</b> pour recadrer selon le cadre actuel ; le résultat est validé sur le port de sortie et les nœuds en aval se rafraîchissent',
    pt: 'Clique em <b>Confirmar recorte</b> para recortar com o quadro atual; o resultado é confirmado no porto de saída e os nós seguintes atualizam-se',
    ru: 'Нажмите <b>Подтвердить обрезку</b>, чтобы обрезать по текущей рамке; результат отправляется в выходной порт, и последующие узлы обновляются'
  },
  runLi2: {
    zh: '打开「<b>自动裁剪</b>」后，拖动裁剪框结束或源图加载完成时会自动裁剪',
    en: 'With <b>Auto crop</b> on, cropping runs automatically when you finish dragging the box or the source image loads',
    ja: '「<b>自動切り抜き</b>」をオンにすると、枠のドラッグ終了時や元画像の読み込み完了時に自動で切り抜きます',
    ko: '“<b>자동 자르기</b>”를 켜면 상자 드래그를 마치거나 원본 이미지 로딩이 끝날 때 자동으로 자릅니다',
    es: 'Con <b>Recorte automático</b> activado, se recorta solo al terminar de arrastrar el recuadro o al cargar la imagen',
    ar: 'عند تفعيل «<b>القص التلقائي</b>» يتم القص تلقائيًا عند انتهاء سحب الإطار أو اكتمال تحميل الصورة',
    fr: 'Avec <b>Recadrage auto</b> activé, le recadrage se fait automatiquement à la fin du glissement ou au chargement de l’image',
    pt: 'Com o <b>Recorte automático</b> ligado, o recorte acontece sozinho ao terminar de arrastar o quadro ou ao carregar a imagem',
    ru: 'При включённой <b>автообрезке</b> обрезка выполняется автоматически после перетаскивания рамки или загрузки исходного изображения'
  },
  runLi3: {
    zh: '源图与裁剪框都没变化时会<b>跳过</b>重复裁剪',
    en: 'If neither the source image nor the crop box changed, the crop is <b>skipped</b>',
    ja: '元画像も切り抜き枠も変わっていない場合は重複した切り抜きを<b>スキップ</b>します',
    ko: '원본 이미지와 자르기 상자 모두 바뀌지 않으면 중복 자르기를 <b>건너뜁니다</b>',
    es: 'Si ni la imagen ni el recuadro han cambiado, se <b>omite</b> el recorte repetido',
    ar: 'إذا لم تتغيّر الصورة الأصلية ولا إطار القص، يتم <b>تخطي</b> القص المكرر',
    fr: 'Si ni l’image source ni le cadre n’ont changé, le recadrage est <b>ignoré</b>',
    pt: 'Se nem a imagem-fonte nem o quadro mudaram, o recorte é <b>ignorado</b>',
    ru: 'Если ни исходное изображение, ни рамка не изменились, повторная обрезка <b>пропускается</b>'
  },
  runLi4: {
    zh: '点「<b>生成图片文件节点</b>」会先裁剪、写出文件，并在节点下方创建一个图片文件节点',
    en: 'Click <b>Create image file node</b> to crop, write the file, and add an image file node below this node',
    ja: '「<b>画像ファイルノードを生成</b>」をクリックすると、切り抜いてファイルを書き出し、このノードの下に画像ファイルノードを作成します',
    ko: '“<b>이미지 파일 노드 생성</b>”을 클릭하면 먼저 자르고 파일을 저장한 뒤, 노드 아래에 이미지 파일 노드를 만듭니다',
    es: 'Haz clic en <b>Crear nodo de archivo de imagen</b> para recortar, guardar el archivo y crear un nodo de imagen debajo',
    ar: 'انقر على «<b>إنشاء عقدة ملف صورة</b>» ليقصّ أولًا ويكتب الملف وينشئ عقدة ملف صورة أسفل هذه العقدة',
    fr: 'Cliquez sur <b>Créer un nœud de fichier image</b> pour recadrer, écrire le fichier et ajouter un nœud image en dessous',
    pt: 'Clique em <b>Criar nó de arquivo de imagem</b> para recortar, gravar o arquivo e criar um nó de imagem abaixo',
    ru: 'Нажмите <b>Создать узел файла изображения</b>, чтобы обрезать, сохранить файл и добавить узел изображения ниже'
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
    zh: '重新拖入图片节点或上游端口值变化时，裁剪框会重置为<b>整张原图</b>',
    en: 'Dropping an image node in again, or a change in the upstream port value, resets the crop box to the <b>full image</b>',
    ja: '画像ノードを再ドロップするか上流ポートの値が変わると、切り抜き枠は<b>元画像全体</b>にリセットされます',
    ko: '이미지 노드를 다시 끌어다 놓거나 상위 포트 값이 바뀌면 자르기 상자가 <b>원본 전체</b>로 초기화됩니다',
    es: 'Si vuelves a soltar un nodo de imagen o cambia el valor del puerto de origen, el recuadro se restablece a la <b>imagen completa</b>',
    ar: 'عند إسقاط عقدة صورة مرة أخرى أو تغيّر قيمة منفذ المنبع، يُعاد ضبط إطار القص إلى <b>الصورة كاملة</b>',
    fr: 'Déposer à nouveau un nœud image ou un changement de valeur en amont réinitialise le cadre à l’<b>image entière</b>',
    pt: 'Soltar um nó de imagem de novo ou uma mudança de valor a montante redefine o quadro para a <b>imagem inteira</b>',
    ru: 'Повторное перетаскивание узла изображения или изменение значения входного порта сбрасывает рамку на <b>всё изображение</b>'
  },
  notesLi2: {
    zh: '拖入图片节点属于<b>一次性</b>操作，之后源节点变化不会自动重裁；需要响应式请改用端口接线',
    en: 'Dropping an image node is a <b>one-off</b> action; later changes to the source node won’t re-crop automatically — connect the port instead for reactive cropping',
    ja: '画像ノードのドロップは<b>一度だけ</b>の操作で、その後は元ノードが変わっても自動では再切り抜きしません。リアクティブにしたい場合はポート接続を使ってください',
    ko: '이미지 노드 드롭은 <b>1회성</b> 작업이라 이후 원본 노드가 바뀌어도 자동으로 다시 자르지 않습니다. 반응형이 필요하면 포트 연결을 사용하세요',
    es: 'Soltar un nodo de imagen es una acción <b>puntual</b>; los cambios posteriores del nodo de origen no recortan solos; para algo reactivo, conecta el puerto',
    ar: 'إسقاط عقدة صورة إجراء <b>لمرة واحدة</b>؛ ولن يُعاد القص تلقائيًا عند تغيّر العقدة المصدر لاحقًا — استخدم توصيل المنفذ للقص التفاعلي',
    fr: 'Déposer un nœud image est une action <b>ponctuelle</b> ; les changements ultérieurs du nœud source ne recadrent pas automatiquement — utilisez le port pour un recadrage réactif',
    pt: 'Soltar um nó de imagem é uma ação <b>pontual</b>; mudanças posteriores no nó de origem não recortam sozinhas — para recorte reativo, use o porto',
    ru: 'Перетаскивание узла изображения — <b>разовое</b> действие; последующие изменения исходного узла не перезапускают обрезку — для реактивности подключайте порт'
  },
  notesLi3: {
    zh: '裁剪框位置随画布保存，重新打开后自动恢复',
    en: 'The crop box position is saved with the canvas and restored when you reopen it',
    ja: '切り抜き枠の位置はキャンバスとともに保存され、再度開くと復元されます',
    ko: '자르기 상자 위치는 캔버스와 함께 저장되어 다시 열면 복원됩니다',
    es: 'La posición del recuadro se guarda con el lienzo y se restaura al reabrirlo',
    ar: 'يُحفظ موضع إطار القص مع اللوحة ويُستعاد عند إعادة فتحها',
    fr: 'La position du cadre est enregistrée avec le canevas et restaurée à la réouverture',
    pt: 'A posição do quadro é guardada com a tela e restaurada ao reabrir',
    ru: 'Положение рамки сохраняется вместе с холстом и восстанавливается при повторном открытии'
  }
} satisfies Record<string, LocalizedText>