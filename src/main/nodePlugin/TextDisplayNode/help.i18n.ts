import type { LocalizedText } from '../../../shared/language'

/**
 * TextDisplay 节点帮助文档（TextDisplayHelpDialog）的全部文案，9 种语言全配。
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
    zh: '文本展示节点把上游传入的字符串<b>原样显示</b>在卡片里。它没有输出端口——它的产出就是「展示」这件事本身，常用来查看或调试上游节点的结果。',
    en: 'The Text Display node <b>shows</b> the string sent from upstream right in the card. It has no output port — its output is the act of displaying itself, handy for inspecting or debugging the results of upstream nodes.',
    ja: 'テキスト表示ノードは、上流から渡された文字列をカード内に<b>そのまま表示</b>します。出力ポートは持ちません——表示すること自体が役割で、上流ノードの結果の確認やデバッグに便利です。',
    ko: '텍스트 표시 노드는 상위에서 전달된 문자열을 카드 안에 <b>그대로 표시</b>합니다. 출력 포트는 없습니다. 표시하는 것 자체가 역할이며, 상위 노드의 결과를 확인하거나 디버깅할 때 유용합니다.',
    es: 'El nodo Mostrar texto <b>muestra</b> directamente en la tarjeta la cadena que llega desde aguas arriba. No tiene puerto de salida: su resultado es el propio hecho de mostrar, útil para inspeccionar o depurar los resultados de los nodos anteriores.',
    ar: 'تعمل عقدة عرض النص على <b>عرض</b> النص الوارد من العقد السابقة مباشرةً داخل البطاقة. لا يوجد لها منفذ إخراج — فمخرَجها هو فعل العرض نفسه، وهو مفيد لفحص نتائج العقد السابقة أو تصحيحها.',
    fr: 'Le nœud Affichage texte <b>affiche</b> directement dans la carte la chaîne envoyée en amont. Il n’a pas de port de sortie : son résultat est l’affichage lui-même, pratique pour inspecter ou déboguer les résultats des nœuds en amont.',
    pt: 'O nó Exibir texto <b>mostra</b> a string que chega de montante diretamente no cartão. Ele não tem porto de saída: seu resultado é o próprio ato de exibir, útil para inspecionar ou depurar os resultados dos nós anteriores.',
    ru: 'Узел «Отображение текста» <b>показывает</b> строку, пришедшую от вышестоящих узлов, прямо в карточке. У него нет выходного порта — его результат и есть само отображение; это удобно для просмотра и отладки результатов вышестоящих узлов.'
  },

  // —— 输入端口 ——
  portsTitle: {
    zh: '输入端口',
    en: 'Input port',
    ja: '入力ポート',
    ko: '입력 포트',
    es: 'Puerto de entrada',
    ar: 'منفذ الإدخال',
    fr: 'Port d’entrée',
    pt: 'Porto de entrada',
    ru: 'Входной порт'
  },
  portsLi1: {
    zh: '左侧 <code>text</code> 输入端口只接受字符串（<code>StringValue</code>）',
    en: 'The <code>text</code> input port on the left accepts only strings (<code>StringValue</code>)',
    ja: '左側の <code>text</code> 入力ポートは文字列（<code>StringValue</code>）のみを受け付けます',
    ko: '왼쪽 <code>text</code> 입력 포트는 문자열(<code>StringValue</code>)만 받습니다',
    es: 'El puerto de entrada <code>text</code> de la izquierda acepta solo cadenas (<code>StringValue</code>)',
    ar: 'يقبل منفذ الإدخال <code>text</code> على اليسار النصوص فقط (<code>StringValue</code>)',
    fr: 'Le port d’entrée <code>text</code> à gauche n’accepte que des chaînes (<code>StringValue</code>)',
    pt: 'O porto de entrada <code>text</code> à esquerda aceita apenas strings (<code>StringValue</code>)',
    ru: 'Входной порт <code>text</code> слева принимает только строки (<code>StringValue</code>)'
  },
  portsLi2: {
    zh: '没接输入、或上游还没算出结果时，正文显示「暂无输出」占位提示；引擎里找不到该节点时显示「节点不存在」',
    en: 'When nothing is connected or the upstream has not produced a result yet, the body shows a “No output” placeholder; if the node cannot be found in the engine, it shows “Node not found”',
    ja: '入力が未接続、または上流がまだ結果を出していない場合、本文に「出力なし」のプレースホルダーが表示されます。エンジン内にノードが見つからない場合は「ノードが存在しません」と表示されます',
    ko: '입력이 연결되지 않았거나 상위가 아직 결과를 내지 않은 경우 본문에 “출력 없음” 자리 표시가 나타납니다. 엔진에서 노드를 찾을 수 없으면 “노드 없음”이 표시됩니다',
    es: 'Cuando no hay nada conectado o el nodo anterior aún no ha producido un resultado, el cuerpo muestra el marcador “Sin salida”; si el nodo no se encuentra en el motor, muestra “Nodo no encontrado”',
    ar: 'عند عدم توصيل أي مدخل أو عدم إنتاج العقدة السابقة نتيجة بعد، يعرض المتن العنصر النائب «لا يوجد إخراج»؛ وإذا تعذّر العثور على العقدة في المحرك، يعرض «العقدة غير موجودة»',
    fr: 'Si rien n’est connecté ou que l’amont n’a pas encore produit de résultat, le corps affiche le texte indicatif « Aucune sortie » ; si le nœud est introuvable dans le moteur, il affiche « Nœud introuvable »',
    pt: 'Quando nada está conectado ou o nó anterior ainda não produziu um resultado, o corpo exibe o marcador “Sem saída”; se o nó não for encontrado no motor, exibe “Nó não encontrado”',
    ru: 'Если ничего не подключено или вышестоящий узел ещё не выдал результат, в теле отображается подсказка «Нет вывода»; если узел не найден в движке — «Узел не найден»'
  },

  // —— 怎么用 ——
  useTitle: {
    zh: '怎么用',
    en: 'How to use',
    ja: '使い方',
    ko: '사용 방법',
    es: 'Cómo se usa',
    ar: 'كيفية الاستخدام',
    fr: 'Utilisation',
    pt: 'Como usar',
    ru: 'Как использовать'
  },
  useLi1: {
    zh: '内容比卡片长时，可在展示区域内<b>滚动</b>查看；滚到顶部或底部后继续滚，会放行给画布平移',
    en: 'When the content is longer than the card, you can <b>scroll</b> within the display area to read it; once you reach the top or bottom and keep scrolling, the canvas takes over to pan',
    ja: '内容がカードより長い場合は、表示エリア内を<b>スクロール</b>して閲覧できます。上端または下端に達してさらにスクロールすると、キャンバスの移動に引き継がれます',
    ko: '내용이 카드보다 길면 표시 영역 안에서 <b>스크롤</b>하여 볼 수 있습니다. 맨 위나 맨 아래에 도달한 뒤 계속 스크롤하면 캔버스 이동으로 넘어갑니다',
    es: 'Cuando el contenido es más largo que la tarjeta, puedes <b>desplazarte</b> dentro del área de visualización para leerlo; al llegar arriba o abajo y seguir desplazándote, el lienzo toma el control para desplazarse',
    ar: 'عندما يكون المحتوى أطول من البطاقة، يمكنك <b>التمرير</b> داخل منطقة العرض لقراءته؛ وعند الوصول إلى الأعلى أو الأسفل والاستمرار في التمرير، تنتقل السيطرة إلى اللوحة للتحريك',
    fr: 'Lorsque le contenu dépasse la carte, vous pouvez <b>faire défiler</b> la zone d’affichage pour le lire ; une fois en haut ou en bas, continuer à faire défiler laisse le canevas se déplacer',
    pt: 'Quando o conteúdo é maior que o cartão, você pode <b>rolar</b> dentro da área de exibição para lê-lo; ao chegar ao topo ou à base e continuar rolando, o controle passa para a tela para deslocá-la',
    ru: 'Если содержимое длиннее карточки, его можно <b>прокручивать</b> внутри области отображения; достигнув верха или низа и продолжив прокрутку, управление переходит к холсту для панорамирования'
  },
  useLi2: {
    zh: '拖拽卡片<b>右下角</b>的手柄可调整节点尺寸（宽 160–800、高 80–600）；拖拽标题栏可移动节点位置',
    en: 'Drag the handle at the <b>bottom-right</b> corner of the card to resize the node (width 160–800, height 80–600); drag the title bar to move the node',
    ja: 'カード<b>右下</b>のハンドルをドラッグするとノードのサイズを変更できます（幅 160–800、高さ 80–600）。タイトルバーをドラッグするとノードを移動できます',
    ko: '카드 <b>오른쪽 아래</b> 모서리의 핸들을 드래그하면 노드 크기를 조절할 수 있습니다 (너비 160–800, 높이 80–600). 제목 표시줄을 드래그하면 노드를 이동할 수 있습니다',
    es: 'Arrastra el tirador de la esquina <b>inferior derecha</b> de la tarjeta para cambiar el tamaño del nodo (ancho 160–800, alto 80–600); arrastra la barra de título para mover el nodo',
    ar: 'اسحب المقبض في الزاوية <b>السفلى اليمنى</b> للبطاقة لتغيير حجم العقدة (العرض 160–800، الارتفاع 80–600)؛ واسحب شريط العنوان لنقل العقدة',
    fr: 'Faites glisser la poignée en <b>bas à droite</b> de la carte pour redimensionner le nœud (largeur 160–800, hauteur 80–600) ; faites glisser la barre de titre pour déplacer le nœud',
    pt: 'Arraste a alça no canto <b>inferior direito</b> do cartão para redimensionar o nó (largura 160–800, altura 80–600); arraste a barra de título para mover o nó',
    ru: 'Перетаскивайте маркер в <b>правом нижнем</b> углу карточки, чтобы изменить размер узла (ширина 160–800, высота 80–600); перетаскивайте заголовок, чтобы переместить узел'
  },

  // —— 注意事项 ——
  notesTitle: {
    zh: '注意事项',
    en: 'Notes',
    ja: '注意事項',
    ko: '참고 사항',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Observações',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '本节点没有输出端口，<b>不会向下游传递数据</b>，只把上游送来的字符串显示出来',
    en: 'This node has no output port and <b>passes no data downstream</b>; it merely displays the string sent from upstream',
    ja: 'このノードには出力ポートがなく、<b>下流へデータを渡しません</b>。上流から送られた文字列を表示するだけです',
    ko: '이 노드에는 출력 포트가 없어 <b>하위로 데이터를 전달하지 않으며</b>, 상위에서 보낸 문자열을 표시할 뿐입니다',
    es: 'Este nodo no tiene puerto de salida y <b>no pasa datos aguas abajo</b>; solo muestra la cadena enviada desde aguas arriba',
    ar: 'لا يوجد لهذه العقدة منفذ إخراج و<b>لا تمرّر أي بيانات إلى العقد اللاحقة</b>، بل تعرض فقط النص الوارد من العقد السابقة',
    fr: 'Ce nœud n’a pas de port de sortie et <b>ne transmet aucune donnée en aval</b> ; il ne fait qu’afficher la chaîne envoyée en amont',
    pt: 'Este nó não tem porto de saída e <b>não passa dados adiante</b>; apenas exibe a string enviada de montante',
    ru: 'У этого узла нет выходного порта, и он <b>не передаёт данные дальше</b> — он лишь показывает строку, пришедшую от вышестоящих узлов'
  },
  notesLi2: {
    zh: '展示的内容由上游派生而来，本节点不保存自身状态；画布重新载入时，要等上游重新计算后才会自动刷新回来',
    en: 'The displayed content is derived from upstream, and this node keeps no state of its own; when the canvas reloads, it refreshes automatically only after upstream recomputes',
    ja: '表示内容は上流から派生したもので、このノードは自身の状態を保存しません。キャンバスを再読み込みした際は、上流が再計算してから自動的に更新されます',
    ko: '표시되는 내용은 상위에서 파생된 것이며, 이 노드는 자체 상태를 저장하지 않습니다. 캔버스를 다시 불러오면 상위가 다시 계산한 뒤에야 자동으로 갱신됩니다',
    es: 'El contenido mostrado se deriva de aguas arriba y este nodo no guarda estado propio; al recargar el lienzo, solo se refresca automáticamente después de que el nodo anterior vuelva a calcular',
    ar: 'المحتوى المعروض مشتق من العقد السابقة، وهذه العقدة لا تحفظ حالتها؛ وعند إعادة تحميل اللوحة لا يُحدَّث تلقائيًا إلا بعد إعادة حساب العقد السابقة',
    fr: 'Le contenu affiché est dérivé de l’amont et ce nœud ne conserve aucun état propre ; au rechargement du canevas, il ne se rafraîchit automatiquement qu’après le recalcul de l’amont',
    pt: 'O conteúdo exibido é derivado de montante e este nó não guarda estado próprio; ao recarregar a tela, ele só é atualizado automaticamente após o nó anterior recalcular',
    ru: 'Отображаемое содержимое является производным от вышестоящих узлов, и этот узел не хранит собственного состояния; при перезагрузке холста оно обновится автоматически только после повторного расчёта вышестоящего узла'
  }
} satisfies Record<string, LocalizedText>