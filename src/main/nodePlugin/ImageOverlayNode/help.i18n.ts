import type { LocalizedText } from '../../../shared/language'

/**
 * 图片叠加节点帮助文档（ImageOverlayHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片/配置弹窗的短文案变化频繁，帮助文档整篇
 * 体量大且改动少，拆开后两边互不干扰。跟随节点文件夹一起搬运，保持插件自包含。
 *
 * 约定：凡带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。与语言无关的记号（composite、img-file、Shift、× 等）
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
    zh: '图片叠加节点把多张图片按<b>图层顺序</b>叠在一起，合成一张 PNG（保留透明通道），从右侧 <code>composite</code> 端口输出给下游节点。每个输入端口接一张图，接到端口上的图可以在节点右侧的预览区里自由拖拽定位、拉伸缩放。',
    en: 'The Image Overlay node stacks multiple images according to <b>layer order</b> into a single PNG (keeping the alpha channel), and outputs it to downstream nodes via the <code>composite</code> port on the right. Each input port takes one image; an image connected to a port can be dragged, positioned and resized freely in the preview area on the right of the node.',
    ja: '画像オーバーレイノードは、複数の画像を<b>レイヤー順</b>に重ねて1枚の PNG（アルファチャンネルを保持）に合成し、右側の <code>composite</code> ポートから下流ノードへ出力します。各入力ポートには画像1枚を接続でき、ポートに接続した画像はノード右側のプレビュー領域で自由にドラッグして位置調整・拡大縮小できます。',
    ko: '이미지 오버레이 노드는 여러 이미지를 <b>레이어 순서</b>대로 겹쳐 하나의 PNG(알파 채널 유지)로 합성하고, 오른쪽 <code>composite</code> 포트를 통해 하위 노드로 출력합니다. 각 입력 포트에는 이미지 한 장을 연결하며, 포트에 연결된 이미지는 노드 오른쪽 미리보기 영역에서 자유롭게 드래그하여 위치를 조정하고 확대/축소할 수 있습니다.',
    es: 'El nodo Superposición de imágenes apila varias imágenes según el <b>orden de capas</b> en un único PNG (conservando el canal alfa) y lo envía a los nodos posteriores por el puerto <code>composite</code> de la derecha. Cada puerto de entrada admite una imagen; las imágenes conectadas a un puerto se pueden arrastrar, posicionar y redimensionar libremente en el área de vista previa a la derecha del nodo.',
    ar: 'تعمل عقدة تراكب الصور على تكديس عدة صور وفق <b>ترتيب الطبقات</b> في صورة PNG واحدة (مع الحفاظ على قناة الشفافية)، وتُخرجها إلى العقد اللاحقة عبر منفذ <code>composite</code> على اليمين. يستقبل كل منفذ إدخال صورة واحدة؛ ويمكن سحب الصور المتصلة بالمنفذ وتحريكها وتغيير حجمها بحرية في منطقة المعاينة على يمين العقدة.',
    fr: 'Le nœud Superposition d’images empile plusieurs images selon l’<b>ordre des calques</b> en un seul PNG (canal alpha conservé) et l’envoie aux nœuds en aval via le port <code>composite</code> à droite. Chaque port d’entrée reçoit une image ; les images connectées à un port peuvent être déplacées, positionnées et redimensionnées librement dans la zone d’aperçu à droite du nœud.',
    pt: 'O nó Sobreposição de imagens empilha várias imagens segundo a <b>ordem das camadas</b> num único PNG (mantendo o canal alfa) e envia-o aos nós seguintes através do porto <code>composite</code> à direita. Cada porto de entrada recebe uma imagem; as imagens ligadas a um porto podem ser arrastadas, posicionadas e redimensionadas livremente na área de pré-visualização à direita do nó.',
    ru: 'Узел «Наложение изображений» накладывает несколько изображений в порядке <b>слоёв</b>, объединяя их в один PNG (с сохранением альфа-канала), и выводит его последующим узлам через порт <code>composite</code> справа. Каждый входной порт принимает одно изображение; подключённые к порту изображения можно свободно перетаскивать, позиционировать и масштабировать в области предпросмотра справа от узла.'
  },

  // —— 输入端口（图层） ——
  inputsTitle: {
    zh: '输入端口（图层）',
    en: 'Input ports (layers)',
    ja: '入力ポート（レイヤー）',
    ko: '입력 포트 (레이어)',
    es: 'Puertos de entrada (capas)',
    ar: 'منافذ الإدخال (الطبقات)',
    fr: 'Ports d’entrée (calques)',
    pt: 'Portas de entrada (camadas)',
    ru: 'Входные порты (слои)'
  },
  inputsLi1: {
    zh: '初始有 <b>2 个</b>输入端口，每个端口接一张图',
    en: 'There are <b>2</b> input ports initially, each taking one image',
    ja: '初期状態では入力ポートが <b>2 個</b>あり、各ポートに画像1枚を接続します',
    ko: '처음에는 입력 포트가 <b>2개</b> 있으며, 각 포트에 이미지 한 장을 연결합니다',
    es: 'Inicialmente hay <b>2</b> puertos de entrada, cada uno admite una imagen',
    ar: 'يوجد في البداية <b>2</b> من منافذ الإدخال، ويستقبل كل منفذ صورة واحدة',
    fr: 'Il y a <b>2</b> ports d’entrée au départ, chacun recevant une image',
    pt: 'Existem <b>2</b> portos de entrada inicialmente, cada um recebe uma imagem',
    ru: 'Изначально есть <b>2</b> входных порта, каждый принимает одно изображение'
  },
  inputsLi2: {
    zh: '所有端口都被占满时，会<b>自动新增</b>一个端口；也可以点左侧的「＋ 添加图层」手动加',
    en: 'When all ports are full, a new port is <b>added automatically</b>; you can also add one manually by clicking “＋ Add layer” on the left',
    ja: 'すべてのポートが埋まると、ポートが<b>自動で追加</b>されます。左側の「＋ レイヤーを追加」をクリックして手動で追加することもできます',
    ko: '모든 포트가 가득 차면 포트가 <b>자동으로 추가</b>됩니다. 왼쪽의 “＋ 레이어 추가”를 클릭해 수동으로 추가할 수도 있습니다',
    es: 'Cuando todos los puertos están ocupados, se <b>añade uno automáticamente</b>; también puedes añadirlo manualmente pulsando «＋ Añadir capa» a la izquierda',
    ar: 'عند امتلاء جميع المنافذ، يُضاف منفذ <b>تلقائيًا</b>؛ ويمكنك أيضًا إضافته يدويًا بالنقر على «＋ إضافة طبقة» على اليسار',
    fr: 'Lorsque tous les ports sont occupés, un port est <b>ajouté automatiquement</b> ; vous pouvez aussi en ajouter un manuellement en cliquant sur « ＋ Ajouter un calque » à gauche',
    pt: 'Quando todos os portos estão preenchidos, um porto é <b>adicionado automaticamente</b>; também pode adicionar um manualmente clicando em “＋ Adicionar camada” à esquerda',
    ru: 'Когда все порты заняты, порт <b>добавляется автоматически</b>; можно также добавить его вручную, нажав «＋ Добавить слой» слева'
  },
  inputsLi3: {
    zh: '端口顺序 = 图层顺序：<code>图层 1</code> 在最底层，序号越大越靠上（后画的盖住先画的）',
    en: 'Port order = layer order: <code>Layer 1</code> is at the bottom; the higher the number, the higher the layer (later ones cover earlier ones)',
    ja: 'ポート順 = レイヤー順：<code>レイヤー 1</code> が最下層で、番号が大きいほど上になります（後に描いたものが先のものを覆います）',
    ko: '포트 순서 = 레이어 순서: <code>레이어 1</code>이 가장 아래에 있고, 번호가 클수록 위에 놓입니다 (나중에 그린 것이 먼저 그린 것을 덮습니다)',
    es: 'Orden de puertos = orden de capas: <code>Capa 1</code> está abajo del todo; cuanto mayor es el número, más arriba queda (las posteriores tapan a las anteriores)',
    ar: 'ترتيب المنافذ = ترتيب الطبقات: <code>الطبقة 1</code> في الأسفل، وكلما زاد الرقم ارتفعت الطبقة (اللاحقة تغطي السابقة)',
    fr: 'Ordre des ports = ordre des calques : <code>Calque 1</code> est tout en bas ; plus le numéro est élevé, plus le calque est au-dessus (les suivants recouvrent les précédents)',
    pt: 'Ordem dos portos = ordem das camadas: <code>Camada 1</code> está na base; quanto maior o número, mais acima fica (as posteriores tapam as anteriores)',
    ru: 'Порядок портов = порядок слоёв: <code>Слой 1</code> находится в самом низу; чем больше номер, тем выше слой (нарисованные позже перекрывают нарисованные раньше)'
  },
  inputsLi4: {
    zh: '每个端口只能接一张图，接入类型为图片值（<code>img-file</code> 节点或上游图片输出）',
    en: 'Each port accepts only one image; the connection type is an image value (an <code>img-file</code> node or an upstream image output)',
    ja: '各ポートは画像1枚のみ接続でき、接続する型は画像値です（<code>img-file</code> ノードまたは上流の画像出力）',
    ko: '각 포트에는 이미지 한 장만 연결할 수 있으며, 연결 유형은 이미지 값입니다 (<code>img-file</code> 노드 또는 상위 이미지 출력)',
    es: 'Cada puerto solo admite una imagen; el tipo de conexión es un valor de imagen (un nodo <code>img-file</code> o una salida de imagen de entrada)',
    ar: 'يستقبل كل منفذ صورة واحدة فقط، ونوع الاتصال قيمة صورة (عقدة <code>img-file</code> أو إخراج صورة من المنبع)',
    fr: 'Chaque port n’accepte qu’une seule image ; le type de connexion est une valeur d’image (un nœud <code>img-file</code> ou une sortie d’image en amont)',
    pt: 'Cada porto aceita apenas uma imagem; o tipo de ligação é um valor de imagem (um nó <code>img-file</code> ou uma saída de imagem de montante)',
    ru: 'Каждый порт принимает только одно изображение; тип подключения — значение изображения (узел <code>img-file</code> или вывод изображения сверху)'
  },
  inputsLi5: {
    zh: '只有<b>最后一个</b>已连接的端口能删除（列表里的 <code>×</code>），且至少保留 1 个图层',
    en: 'Only the <b>last</b> connected port can be deleted (the <code>×</code> in the list), and at least 1 layer must always remain',
    ja: '削除できるのは<b>最後の</b>接続済みポートだけです（リスト内の <code>×</code>）。また、少なくとも1つのレイヤーを保持する必要があります',
    ko: '<b>마지막</b> 연결된 포트만 삭제할 수 있으며(목록의 <code>×</code>), 최소 1개의 레이어는 유지해야 합니다',
    es: 'Solo se puede eliminar el <b>último</b> puerto conectado (la <code>×</code> de la lista), y siempre debe quedar al menos 1 capa',
    ar: 'يمكن حذف <b>المنفذ الأخير</b> المتصل فقط (رمز <code>×</code> في القائمة)، مع الإبقاء على طبقة واحدة على الأقل',
    fr: 'Seul le <b>dernier</b> port connecté peut être supprimé (le <code>×</code> dans la liste), et au moins 1 calque doit toujours rester',
    pt: 'Apenas o <b>último</b> porto ligado pode ser eliminado (o <code>×</code> na lista), e deve permanecer sempre pelo menos 1 camada',
    ru: 'Удалить можно только <b>последний</b> подключённый порт (значок <code>×</code> в списке), при этом должен остаться хотя бы 1 слой'
  },
  inputsWarn: {
    zh: '图层顺序由端口顺序决定，<b>不能直接拖动调整</b>。想换层序需要重新接线，或删掉尾部端口后重连。',
    en: 'Layer order is determined by port order and <b>cannot be changed by dragging</b>. To change the layer order, reconnect the wires, or delete the trailing ports and reconnect them.',
    ja: 'レイヤー順はポート順で決まり、<b>直接ドラッグして変更できません</b>。順序を入れ替えるには、配線し直すか、末尾のポートを削除してから再接続します。',
    ko: '레이어 순서는 포트 순서로 정해지며 <b>직접 드래그하여 바꿀 수 없습니다</b>. 순서를 바꾸려면 배선을 다시 연결하거나, 끝의 포트를 삭제한 뒤 다시 연결해야 합니다.',
    es: 'El orden de las capas lo determina el orden de los puertos y <b>no se puede cambiar arrastrando</b>. Para cambiar el orden, vuelve a conectar los cables o elimina los puertos finales y reconéctalos.',
    ar: 'يُحدَّد ترتيب الطبقات بترتيب المنافذ و<b>لا يمكن تغييره بالسحب</b>. لتغيير الترتيب، أعد توصيل الأسلاك، أو احذف المنافذ الطرفية ثم أعد توصيلها.',
    fr: 'L’ordre des calques est déterminé par l’ordre des ports et <b>ne peut pas être modifié par glisser-déposer</b>. Pour changer l’ordre, reconnectez les liaisons, ou supprimez les ports de fin puis reconnectez-les.',
    pt: 'A ordem das camadas é determinada pela ordem dos portos e <b>não pode ser alterada arrastando</b>. Para mudar a ordem, volte a ligar os cabos, ou elimine os portos finais e volte a ligá-los.',
    ru: 'Порядок слоёв определяется порядком портов, и его <b>нельзя изменить перетаскиванием</b>. Чтобы изменить порядок, переподключите связи или удалите конечные порты и подключите их заново.'
  },

  // —— 定位与缩放 ——
  positionTitle: {
    zh: '定位与缩放',
    en: 'Positioning & scaling',
    ja: '位置調整と拡大縮小',
    ko: '위치 조정 및 크기 조절',
    es: 'Posición y escala',
    ar: 'التموضع والتحجيم',
    fr: 'Positionnement et mise à l’échelle',
    pt: 'Posicionamento e escala',
    ru: 'Позиционирование и масштабирование'
  },
  positionLi1: {
    zh: '点左侧图层条目、或点预览区里的图片，即可<b>选中</b>该图层（出现蓝色边框）',
    en: 'Click a layer item on the left, or an image in the preview area, to <b>select</b> that layer (a blue border appears)',
    ja: '左側のレイヤー項目、またはプレビュー領域の画像をクリックすると、そのレイヤーを<b>選択</b>できます（青い枠が表示されます）',
    ko: '왼쪽의 레이어 항목을 클릭하거나 미리보기 영역의 이미지를 클릭하면 해당 레이어를 <b>선택</b>할 수 있습니다 (파란 테두리 표시)',
    es: 'Haz clic en un elemento de capa a la izquierda, o en una imagen del área de vista previa, para <b>seleccionar</b> esa capa (aparece un borde azul)',
    ar: 'انقر على عنصر طبقة على اليسار، أو على صورة في منطقة المعاينة، <b>لتحديد</b> تلك الطبقة (يظهر إطار أزرق)',
    fr: 'Cliquez sur un élément de calque à gauche, ou sur une image dans la zone d’aperçu, pour <b>sélectionner</b> ce calque (une bordure bleue apparaît)',
    pt: 'Clique num elemento de camada à esquerda, ou numa imagem da área de pré-visualização, para <b>selecionar</b> essa camada (aparece uma borda azul)',
    ru: 'Нажмите элемент слоя слева или изображение в области предпросмотра, чтобы <b>выделить</b> этот слой (появится синяя рамка)'
  },
  positionLi2: {
    zh: '选中后<b>拖动图片</b>即可移动位置，坐标以合成画布左上角为原点',
    en: 'Once selected, <b>drag the image</b> to move it; coordinates are relative to the top-left corner of the composite canvas',
    ja: '選択後、<b>画像をドラッグ</b>すると位置を移動できます。座標の原点は合成キャンバスの左上隅です',
    ko: '선택한 뒤 <b>이미지를 드래그</b>하면 위치를 이동할 수 있습니다. 좌표의 원점은 합성 캔버스의 왼쪽 위 모서리입니다',
    es: 'Una vez seleccionada, <b>arrastra la imagen</b> para moverla; las coordenadas tienen su origen en la esquina superior izquierda del lienzo compuesto',
    ar: 'بعد التحديد، <b>اسحب الصورة</b> لتحريك موضعها؛ ونقطة الأصل للإحداثيات هي الزاوية العلوية اليسرى للوحة التركيب',
    fr: 'Une fois sélectionnée, <b>faites glisser l’image</b> pour la déplacer ; les coordonnées ont pour origine le coin supérieur gauche du canevas composite',
    pt: 'Depois de selecionada, <b>arraste a imagem</b> para mover a posição; as coordenadas têm origem no canto superior esquerdo do canvas composto',
    ru: 'После выделения <b>перетащите изображение</b>, чтобы изменить положение; начало координат — левый верхний угол составного холста'
  },
  positionLi3: {
    zh: '选中后四角出现蓝色手柄，<b>拖动手柄</b>拉伸缩放；按住 <code>Shift</code> 可等比缩放',
    en: 'Once selected, blue handles appear at the four corners; <b>drag a handle</b> to resize. Hold <code>Shift</code> to scale proportionally',
    ja: '選択すると四隅に青いハンドルが表示されます。<b>ハンドルをドラッグ</b>して拡大縮小し、<code>Shift</code> を押しながらで縦横比を保って縮尺できます',
    ko: '선택하면 네 모서리에 파란 핸들이 나타납니다. <b>핸들을 드래그</b>하여 크기를 조절하며, <code>Shift</code>를 누르면 비율을 유지한 채 확대/축소할 수 있습니다',
    es: 'Al seleccionar aparecen manejadores azules en las cuatro esquinas; <b>arrastra un manejador</b> para redimensionar. Mantén <code>Shift</code> para escalar de forma proporcional',
    ar: 'عند التحديد تظهر مقابض زرقاء في الزوايا الأربع؛ <b>اسحب المقبض</b> لتغيير الحجم. اضغط مع الاستمرار على <code>Shift</code> للتحجيم بنفس النسبة',
    fr: 'Une fois sélectionné, des poignées bleues apparaissent aux quatre coins ; <b>faites glisser une poignée</b> pour redimensionner. Maintenez <code>Shift</code> pour une mise à l’échelle proportionnelle',
    pt: 'Depois de selecionada, aparecem alças azuis nos quatro cantos; <b>arraste uma alça</b> para redimensionar. Mantenha <code>Shift</code> para escalar proporcionalmente',
    ru: 'После выделения по четырём углам появятся синие маркеры; <b>перетащите маркер</b>, чтобы изменить размер. Удерживайте <code>Shift</code> для пропорционального масштабирования'
  },
  positionLi4: {
    zh: '新接入的图会按<b>原始像素尺寸</b>初始化位置和大小；手动调整过之后不会再被自动覆盖',
    en: 'Newly connected images are initialized in position and size at their <b>original pixel dimensions</b>; after manual adjustment they will no longer be overwritten automatically',
    ja: '新しく接続された画像は<b>元のピクセルサイズ</b>で位置と大きさが初期化されます。手動で調整した後は自動で上書きされなくなります',
    ko: '새로 연결된 이미지는 <b>원래 픽셀 크기</b>로 위치와 크기가 초기화됩니다. 수동으로 조정한 뒤에는 더 이상 자동으로 덮어쓰지 않습니다',
    es: 'Las imágenes recién conectadas se inicializan en posición y tamaño según su <b>tamaño en píxeles original</b>; tras un ajuste manual ya no se sobrescriben automáticamente',
    ar: 'تُهيَّأ الصور المتصلة حديثًا في الموضع والحجم وفق <b>أبعاد البكسل الأصلية</b>؛ وبعد التعديل اليدوي لن تُستبدل تلقائيًا',
    fr: 'Les images nouvellement connectées sont initialisées en position et en taille selon leurs <b>dimensions en pixels d’origine</b> ; après un ajustement manuel, elles ne sont plus écrasées automatiquement',
    pt: 'As imagens recém-ligadas são inicializadas em posição e tamanho segundo as suas <b>dimensões originais em píxeis</b>; após um ajuste manual já não são sobrescritas automaticamente',
    ru: 'Новые подключённые изображения инициализируются по положению и размеру согласно <b>исходным размерам в пикселях</b>; после ручной настройки они больше не перезаписываются автоматически'
  },
  positionLi5: {
    zh: '点预览区空白处可取消选中',
    en: 'Click an empty spot in the preview area to deselect',
    ja: 'プレビュー領域の空白部分をクリックすると選択を解除できます',
    ko: '미리보기 영역의 빈 곳을 클릭하면 선택이 해제됩니다',
    es: 'Haz clic en un espacio vacío del área de vista previa para deseleccionar',
    ar: 'انقر على مساحة فارغة في منطقة المعاينة لإلغاء التحديد',
    fr: 'Cliquez sur une zone vide de l’aperçu pour désélectionner',
    pt: 'Clique num espaço vazio da área de pré-visualização para desmarcar',
    ru: 'Нажмите на пустое место в области предпросмотра, чтобы снять выделение'
  },

  // —— 画布尺寸（右上角齿轮） ——
  canvasTitle: {
    zh: '画布尺寸（右上角齿轮）',
    en: 'Canvas size (gear in the top-right)',
    ja: 'キャンバスサイズ（右上の歯車）',
    ko: '캔버스 크기 (오른쪽 위 톱니바퀴)',
    es: 'Tamaño del lienzo (engranaje arriba a la derecha)',
    ar: 'حجم اللوحة (الترس في أعلى اليمين)',
    fr: 'Taille du canevas (engrenage en haut à droite)',
    pt: 'Tamanho do canvas (engrenagem no canto superior direito)',
    ru: 'Размер холста (шестерёнка в правом верхнем углу)'
  },
  tblHeaderMode: {
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
  tblHeaderMeaning: {
    zh: '含义',
    en: 'Meaning',
    ja: '意味',
    ko: '의미',
    es: 'Significado',
    ar: 'المعنى',
    fr: 'Signification',
    pt: 'Significado',
    ru: 'Значение'
  },
  tblAuto: {
    zh: '<b>自动</b>',
    en: '<b>Auto</b>',
    ja: '<b>自動</b>',
    ko: '<b>자동</b>',
    es: '<b>Automático</b>',
    ar: '<b>تلقائي</b>',
    fr: '<b>Automatique</b>',
    pt: '<b>Automático</b>',
    ru: '<b>Автоматически</b>'
  },
  tblAutoMeaning: {
    zh: '按所有图层的右边界 / 下边界自动算出画布大小',
    en: 'Computes the canvas size automatically from the right / bottom bounds of all layers',
    ja: 'すべてのレイヤーの右端 / 下端からキャンバスサイズを自動計算します',
    ko: '모든 레이어의 오른쪽 / 아래 경계를 기준으로 캔버스 크기를 자동 계산합니다',
    es: 'Calcula el tamaño del lienzo automáticamente a partir de los límites derecho / inferior de todas las capas',
    ar: 'يحسب حجم اللوحة تلقائيًا من الحدّ الأيمن / السفلي لجميع الطبقات',
    fr: 'Calcule automatiquement la taille du canevas d’après les bords droit / inférieur de tous les calques',
    pt: 'Calcula automaticamente o tamanho do canvas a partir dos limites direito / inferior de todas as camadas',
    ru: 'Автоматически вычисляет размер холста по правой / нижней границе всех слоёв'
  },
  tblFixed: {
    zh: '<b>固定尺寸</b>',
    en: '<b>Fixed size</b>',
    ja: '<b>固定サイズ</b>',
    ko: '<b>고정 크기</b>',
    es: '<b>Tamaño fijo</b>',
    ar: '<b>حجم ثابت</b>',
    fr: '<b>Taille fixe</b>',
    pt: '<b>Tamanho fixo</b>',
    ru: '<b>Фиксированный размер</b>'
  },
  tblFixedMeaning: {
    zh: '手动指定宽高，超出画布范围的内容会被裁掉',
    en: 'Set the width and height manually; content outside the canvas bounds is cropped',
    ja: '幅と高さを手動で指定します。キャンバス範囲を超えた内容は切り取られます',
    ko: '너비와 높이를 수동으로 지정하며, 캔버스 범위를 벗어난 내용은 잘립니다',
    es: 'Especifica manualmente el ancho y el alto; el contenido que sobresale del lienzo se recorta',
    ar: 'حدّد العرض والارتفاع يدويًا؛ ويُقتطع المحتوى الذي يتجاوز حدود اللوحة',
    fr: 'Spécifiez manuellement la largeur et la hauteur ; le contenu hors du canevas est rogné',
    pt: 'Define manualmente a largura e a altura; o conteúdo que ultrapassa os limites do canvas é cortado',
    ru: 'Задайте ширину и высоту вручную; содержимое за пределами холста обрезается'
  },
  canvasNote: {
    zh: '弹窗里的「恢复自动」按钮可随时切回自动模式。',
    en: 'The “Restore auto” button in the dialog switches back to auto mode at any time.',
    ja: 'ポップアップ内の「自動に戻す」ボタンで、いつでも自動モードに切り替えられます。',
    ko: '팝업의 “자동으로 복원” 버튼으로 언제든 자동 모드로 전환할 수 있습니다.',
    es: 'El botón «Restaurar automático» del cuadro de diálogo permite volver al modo automático en cualquier momento.',
    ar: 'يسمح زر «استعادة التلقائي» في النافذة المنبثقة بالعودة إلى الوضع التلقائي في أي وقت.',
    fr: 'Le bouton « Rétablir auto » de la fenêtre permet de revenir au mode automatique à tout moment.',
    pt: 'O botão “Restaurar automático” na janela permite voltar ao modo automático a qualquer momento.',
    ru: 'Кнопка «Вернуть автоматически» в окне позволяет в любой момент вернуться к автоматическому режиму.'
  },

  // —— 输出 ——
  outputsTitle: {
    zh: '输出',
    en: 'Output',
    ja: '出力',
    ko: '출력',
    es: 'Salida',
    ar: 'الإخراج',
    fr: 'Sortie',
    pt: 'Saída',
    ru: 'Выход'
  },
  outputsLi1: {
    zh: '右侧 <code>composite</code> 端口输出合成后的 PNG，保留透明通道',
    en: 'The <code>composite</code> port on the right outputs the composited PNG, keeping the alpha channel',
    ja: '右側の <code>composite</code> ポートから合成後の PNG を出力します（アルファチャンネルを保持）',
    ko: '오른쪽 <code>composite</code> 포트에서 합성된 PNG를 출력하며, 알파 채널을 유지합니다',
    es: 'El puerto <code>composite</code> de la derecha emite el PNG compuesto, conservando el canal alfa',
    ar: 'يُخرج منفذ <code>composite</code> على اليمين صورة PNG المدمجة، مع الحفاظ على قناة الشفافية',
    fr: 'Le port <code>composite</code> à droite émet le PNG composite, en conservant le canal alpha',
    pt: 'O porto <code>composite</code> à direita emite o PNG composto, mantendo o canal alfa',
    ru: 'Порт <code>composite</code> справа выводит составленный PNG с сохранением альфа-канала'
  },
  outputsLi2: {
    zh: '底部「生成图片文件节点」会把当前合成结果落成一个 <code>img-file</code> 节点，方便继续串下游',
    en: 'The “Generate image file node” button at the bottom turns the current composite result into an <code>img-file</code> node, making it easy to continue downstream',
    ja: '下部の「画像ファイルノードを生成」で、現在の合成結果を <code>img-file</code> ノードとして出力でき、下流への接続を続けられます',
    ko: '하단의 “이미지 파일 노드 생성”은 현재 합성 결과를 <code>img-file</code> 노드로 만들어 하위로 계속 연결하기 편리합니다',
    es: 'El botón «Generar nodo de archivo de imagen» de la parte inferior convierte el resultado compuesto actual en un nodo <code>img-file</code>, lo que facilita seguir enlazando hacia abajo',
    ar: 'يُحوِّل زر «إنشاء عقدة ملف صورة» في الأسفل نتيجة التركيب الحالية إلى عقدة <code>img-file</code>، ليسهل مواصلة الربط بالعقد اللاحقة',
    fr: 'Le bouton « Générer un nœud de fichier image » en bas transforme le résultat composite actuel en un nœud <code>img-file</code>, ce qui facilite l’enchaînement en aval',
    pt: 'O botão “Gerar nó de ficheiro de imagem” na parte inferior transforma o resultado composto atual num nó <code>img-file</code>, facilitando a ligação a jusante',
    ru: 'Кнопка «Создать узел файла изображения» внизу превращает текущий составной результат в узел <code>img-file</code>, что упрощает дальнейшее соединение'
  },
  outputsLi3: {
    zh: '图层或变换改动后会有约 150ms 的防抖，稳定后才重新合成',
    en: 'Changes to layers or transforms are debounced by about 150ms, and recomposition happens only after they settle',
    ja: 'レイヤーや変形の変更後は約 150ms のデバウンスが入り、落ち着いてから再合成されます',
    ko: '레이어나 변형 변경 후 약 150ms의 디바운스가 적용되며, 안정된 뒤에 다시 합성됩니다',
    es: 'Los cambios en capas o transformaciones tienen un retardo (debounce) de unos 150ms, y la recomposición ocurre solo cuando se estabilizan',
    ar: 'تخضع تغييرات الطبقات أو التحويلات لتأجيل (debounce) بنحو 150ms، ولا يُعاد التركيب إلا بعد استقرارها',
    fr: 'Les modifications de calques ou de transformations sont temporisées (debounce) d’environ 150ms, et la recomposition n’a lieu qu’une fois stabilisées',
    pt: 'As alterações de camadas ou transformações têm um debounce de cerca de 150ms, e a recomposição só ocorre depois de estabilizarem',
    ru: 'Изменения слоёв или трансформаций имеют задержку (debounce) около 150ms, и пересборка происходит только после стабилизации'
  }
} satisfies Record<string, LocalizedText>