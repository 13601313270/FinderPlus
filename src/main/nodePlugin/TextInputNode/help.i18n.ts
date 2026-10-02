import type { LocalizedText } from '../../../shared/language'

/**
 * 文本输入节点帮助文档（TextInputHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片短文案变化频繁，帮助文档整篇体量大、改动少。
 * 约定：带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。与语言无关的记号（Enter、Ctrl、text 等）保留在句中，不单独抽词条。
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
    zh: '文本输入节点是<b>源头节点</b>，在节点里键入文本，即可把这段字符串从右侧 <code>text</code> 端口发送给下游节点。它没有输入端口，内容完全由你手动输入。',
    en: 'The Text Input node is a <b>source node</b>: type text into it and that string is sent to downstream nodes from the <code>text</code> port on the right. It has no input ports; the content comes entirely from your typing.',
    ja: 'テキスト入力ノードは<b>ソースノード</b>です。ノード内にテキストを入力すると、その文字列を右側の <code>text</code> ポートから下流ノードへ送信します。入力ポートはなく、内容はすべて手入力によるものです。',
    ko: '텍스트 입력 노드는 <b>소스 노드</b>입니다. 노드에 텍스트를 입력하면 그 문자열을 오른쪽 <code>text</code> 포트에서 하위 노드로 보냅니다. 입력 포트는 없으며, 내용은 전적으로 직접 입력한 것입니다.',
    es: 'El nodo Entrada de texto es un <b>nodo origen</b>: escribe texto en él y esa cadena se envía a los nodos posteriores desde el puerto <code>text</code> de la derecha. No tiene puertos de entrada; el contenido procede enteramente de lo que escribes.',
    ar: 'عقدة إدخال النص هي <b>عقدة مصدر</b>: اكتب نصًا داخلها فتُرسَل هذه السلسلة النصية إلى العقد اللاحقة من منفذ <code>text</code> على اليمين. لا تملك منافذ إدخال، والمحتوى يأتي بالكامل من كتابتك.',
    fr: 'Le nœud Saisie de texte est un <b>nœud source</b> : saisissez du texte dedans et cette chaîne est envoyée aux nœuds en aval depuis le port <code>text</code> à droite. Il n’a aucun port d’entrée ; le contenu provient entièrement de votre saisie.',
    pt: 'O nó Entrada de texto é um <b>nó de origem</b>: escreva texto nele e essa string é enviada aos nós seguintes pelo porto <code>text</code> à direita. Não tem portas de entrada; o conteúdo vem inteiramente do que escreve.',
    ru: 'Узел «Ввод текста» — это <b>узел-источник</b>: введите в него текст, и эта строка будет отправлена последующим узлам из порта <code>text</code> справа. Входных портов у него нет, содержимое задаётся полностью вручную.'
  },

  // —— 节点设置（齿轮） ——
  configTitle: {
    zh: '节点设置（齿轮）',
    en: 'Node settings (gear)',
    ja: 'ノード設定（歯車）',
    ko: '노드 설정 (톱니바퀴)',
    es: 'Ajustes del nodo (engranaje)',
    ar: 'إعدادات العقدة (الترس)',
    fr: 'Réglages du nœud (engrenage)',
    pt: 'Definições do nó (engrenagem)',
    ru: 'Настройки узла (шестерёнка)'
  },
  configLi1: {
    zh: '点标题栏最右侧的<b>齿轮</b>按钮打开设置面板。',
    en: 'Click the <b>gear</b> button at the far right of the title bar to open the settings panel.',
    ja: 'タイトルバー右端の<b>歯車</b>ボタンをクリックすると設定パネルが開きます。',
    ko: '제목 표시줄 맨 오른쪽의 <b>톱니바퀴</b> 버튼을 클릭하면 설정 패널이 열립니다.',
    es: 'Haz clic en el botón de <b>engranaje</b> del extremo derecho de la barra de título para abrir el panel de ajustes.',
    ar: 'انقر على زر <b>الترس</b> في أقصى يمين شريط العنوان لفتح لوحة الإعدادات.',
    fr: 'Cliquez sur le bouton <b>engrenage</b> à l’extrême droite de la barre de titre pour ouvrir le panneau de réglages.',
    pt: 'Clique no botão de <b>engrenagem</b> no extremo direito da barra de título para abrir o painel de definições.',
    ru: 'Нажмите кнопку с <b>шестерёнкой</b> в правом углу заголовка, чтобы открыть панель настроек.'
  },
  configLi2: {
    zh: '「多行输入」：开启后输入框变为多行文本框，节点随之变高；关闭时会自动把内容中的换行替换为空格。',
    en: '“Multiline input”: when on, the field becomes a multiline text box and the node grows taller; when turned off, line breaks in the content are automatically replaced with spaces.',
    ja: '「複数行入力」：オンにすると入力欄が複数行のテキストエリアになり、ノードの高さが増します。オフにすると、内容内の改行が自動的に空白に置き換わります。',
    ko: '“여러 줄 입력”: 켜면 입력란이 여러 줄 텍스트 상자로 바뀌고 노드가 높아집니다. 끄면 내용의 줄바꿈이 자동으로 공백으로 대체됩니다.',
    es: '«Entrada multilínea»: al activarla, el campo se convierte en un cuadro de texto multilínea y el nodo se hace más alto; al desactivarla, los saltos de línea del contenido se sustituyen automáticamente por espacios.',
    ar: '«إدخال متعدد الأسطر»: عند تشغيله يتحول حقل الإدخال إلى مربع نص متعدد الأسطر ويزداد ارتفاع العقدة؛ وعند إيقافه تُستبدل فواصل الأسطر في المحتوى بمسافات تلقائيًا.',
    fr: '« Saisie multiligne » : une fois activée, le champ devient une zone de texte multiligne et le nœud s’agrandit en hauteur ; une fois désactivée, les sauts de ligne du contenu sont automatiquement remplacés par des espaces.',
    pt: '“Entrada multilinha”: quando ativada, o campo torna-se uma caixa de texto multilinha e o nó fica mais alto; quando desativada, as quebras de linha do conteúdo são automaticamente substituídas por espaços.',
    ru: '«Многострочный ввод»: при включении поле становится многострочным текстовым блоком, а узел — выше; при выключении переводы строк в содержимом автоматически заменяются пробелами.'
  },
  configLi3: {
    zh: '「自动发送」：开启后停止输入约 500ms 自动把内容发送到下游，发送按钮随之置灰。',
    en: '“Auto-send”: when on, the content is sent downstream automatically about 500ms after you stop typing, and the Send button is greyed out.',
    ja: '「自動送信」：オンにすると、入力停止から約 500ms 後に内容が自動で下流へ送信され、送信ボタンはグレー表示になります。',
    ko: '“자동 전송”: 켜면 입력을 멈춘 뒤 약 500ms 후 내용이 자동으로 하위로 전송되고, 전송 버튼은 회색으로 비활성화됩니다.',
    es: '«Envío automático»: al activarlo, el contenido se envía a los nodos posteriores automáticamente unos 500ms después de dejar de escribir, y el botón Enviar se atenúa.',
    ar: '«الإرسال التلقائي»: عند تشغيله يُرسَل المحتوى إلى العقد اللاحقة تلقائيًا بعد نحو 500ms من التوقف عن الكتابة، ويصبح زر الإرسال باهتًا.',
    fr: '« Envoi automatique » : une fois activé, le contenu est envoyé en aval environ 500 ms après l’arrêt de la saisie, et le bouton Envoyer est grisé.',
    pt: '“Envio automático”: quando ativado, o conteúdo é enviado a jusante cerca de 500ms depois de parar de escrever, e o botão Enviar fica esbatido.',
    ru: '«Автоотправка»: при включении содержимое автоматически отправляется дальше примерно через 500 мс после остановки ввода, а кнопка «Отправить» становится неактивной.'
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
    zh: '本节点是源头节点，<b>没有输入端口</b>，只有右侧一个 <code>text</code> 输出端口。',
    en: 'This is a source node with <b>no input ports</b>; it only has a single <code>text</code> output port on the right.',
    ja: 'このノードはソースノードで、<b>入力ポートはありません</b>。右側に <code>text</code> 出力ポートが1つだけあります。',
    ko: '이 노드는 소스 노드로 <b>입력 포트가 없으며</b>, 오른쪽에 <code>text</code> 출력 포트 하나만 있습니다.',
    es: 'Este es un nodo origen y <b>no tiene puertos de entrada</b>; solo cuenta con un puerto de salida <code>text</code> a la derecha.',
    ar: 'هذه عقدة مصدر <b>بلا منافذ إدخال</b>؛ لديها منفذ إخراج واحد فقط <code>text</code> على اليمين.',
    fr: 'Ce nœud est un nœud source <b>sans port d’entrée</b> ; il ne possède qu’un port de sortie <code>text</code> à droite.',
    pt: 'Este é um nó de origem <b>sem portas de entrada</b>; tem apenas uma porta de saída <code>text</code> à direita.',
    ru: 'Это узел-источник, у него <b>нет входных портов</b> — только один выходной порт <code>text</code> справа.'
  },
  portsLi2: {
    zh: '<code>text</code> 端口输出<b>字符串</b>，可连接到任何接受字符串的下游节点。',
    en: 'The <code>text</code> port outputs a <b>string</b> and can be connected to any downstream node that accepts a string.',
    ja: '<code>text</code> ポートは<b>文字列</b>を出力し、文字列を受け取る任意の下流ノードに接続できます。',
    ko: '<code>text</code> 포트는 <b>문자열</b>을 출력하며, 문자열을 받는 모든 하위 노드에 연결할 수 있습니다.',
    es: 'El puerto <code>text</code> emite una <b>cadena</b> y puede conectarse a cualquier nodo posterior que acepte una cadena.',
    ar: 'يُخرج منفذ <code>text</code> <b>نصًا</b>، ويمكن توصيله بأي عقدة لاحقة تقبل نصًا.',
    fr: 'Le port <code>text</code> émet une <b>chaîne</b> et peut être connecté à tout nœud en aval acceptant une chaîne.',
    pt: 'A porta <code>text</code> emite uma <b>string</b> e pode ser ligada a qualquer nó seguinte que aceite uma string.',
    ru: 'Порт <code>text</code> выводит <b>строку</b> и может быть подключён к любому последующему узлу, принимающему строку.'
  },
  portsLi3: {
    zh: '节点不接收文件拖入，把文件拖到节点上不会有任何反应。',
    en: 'The node does not accept dragged files; dropping a file onto it does nothing.',
    ja: 'このノードはファイルのドロップを受け付けません。ファイルをノード上にドロップしても何も起こりません。',
    ko: '이 노드는 파일 드롭을 받지 않습니다. 파일을 노드 위에 놓아도 아무 반응이 없습니다.',
    es: 'El nodo no acepta archivos arrastrados; soltar un archivo sobre él no hace nada.',
    ar: 'لا تقبل العقدة إفلات الملفات؛ ولن يحدث شيء إذا أفلتت ملفًا فوقها.',
    fr: 'Le nœud n’accepte pas de fichiers déposés ; déposer un fichier dessus n’a aucun effet.',
    pt: 'O nó não aceita ficheiros arrastados; largar um ficheiro sobre ele não faz nada.',
    ru: 'Узел не принимает перетаскиваемые файлы: перетаскивание файла на узел ничего не делает.'
  },

  // —— 编辑与发送 ——
  runTitle: {
    zh: '编辑与发送',
    en: 'Editing & sending',
    ja: '編集と送信',
    ko: '편집 및 전송',
    es: 'Edición y envío',
    ar: 'التحرير والإرسال',
    fr: 'Édition et envoi',
    pt: 'Edição e envio',
    ru: 'Редактирование и отправка'
  },
  runLi1: {
    zh: '在输入框里键入内容只是在编辑<b>草稿</b>，此时不会下发到下游。',
    en: 'Typing in the input field only edits the <b>draft</b>; nothing is sent downstream yet.',
    ja: '入力欄への入力は<b>下書き</b>の編集だけで、この時点では下流へ送信されません。',
    ko: '입력란에 입력하는 것은 <b>초안</b>을 편집하는 것일 뿐이며, 이 시점에는 하위로 전송되지 않습니다.',
    es: 'Escribir en el campo solo edita el <b>borrador</b>; todavía no se envía nada a los nodos posteriores.',
    ar: 'الكتابة في حقل الإدخال تعدّل <b>المسودة</b> فقط، ولا يُرسَل شيء إلى العقد اللاحقة في هذه المرحلة.',
    fr: 'Saisir du texte dans le champ ne modifie que le <b>brouillon</b> ; rien n’est encore envoyé en aval.',
    pt: 'Escrever no campo apenas edita o <b>rascunho</b>; nada é enviado a jusante nesta fase.',
    ru: 'Ввод текста в поле редактирует только <b>черновик</b>; в этот момент дальше ничего не отправляется.'
  },
  runLi2: {
    zh: '点「发送」按钮（或触发快捷键）才会把草稿提交到 <code>text</code> 端口，下游才会收到。',
    en: 'Only clicking “Send” (or using a shortcut) commits the draft to the <code>text</code> port, so downstream nodes receive it.',
    ja: '「送信」ボタンを押す（またはショートカットを使う）と下書きが <code>text</code> ポートにコミットされ、下流ノードが受け取ります。',
    ko: '“전송” 버튼을 클릭하거나 단축키를 사용해야 초안이 <code>text</code> 포트에 커밋되어 하위 노드가 받습니다.',
    es: 'Solo al pulsar «Enviar» (o usar un atajo) se confirma el borrador en el puerto <code>text</code>, y los nodos posteriores lo reciben.',
    ar: 'عند النقر على «إرسال» (أو استخدام اختصار) فقط تُثبَّت المسودة في منفذ <code>text</code>، فتستقبلها العقد اللاحقة.',
    fr: 'Seul un clic sur « Envoyer » (ou un raccourci) valide le brouillon sur le port <code>text</code>, et les nœuds en aval le reçoivent.',
    pt: 'Só ao clicar em “Enviar” (ou usar um atalho) o rascunho é confirmado na porta <code>text</code>, e os nós seguintes recebem-no.',
    ru: 'Только нажатие «Отправить» (или горячая клавиша) фиксирует черновик в порте <code>text</code>, и последующие узлы его получают.'
  },
  runLi3: {
    zh: '快捷键：<b>单行</b>模式按 <code>Enter</code> 发送；<b>多行</b>模式按 <code>Ctrl/⌘ + Enter</code> 发送，单独的 <code>Enter</code> 用于换行。',
    en: 'Shortcuts: in <b>single-line</b> mode press <code>Enter</code> to send; in <b>multiline</b> mode press <code>Ctrl/⌘ + Enter</code> to send, and a plain <code>Enter</code> inserts a line break.',
    ja: 'ショートカット：<b>単一行</b>モードでは <code>Enter</code> で送信、<b>複数行</b>モードでは <code>Ctrl/⌘ + Enter</code> で送信し、単独の <code>Enter</code> は改行になります。',
    ko: '단축키: <b>한 줄</b> 모드에서는 <code>Enter</code>로 전송하고, <b>여러 줄</b> 모드에서는 <code>Ctrl/⌘ + Enter</code>로 전송하며, <code>Enter</code> 단독은 줄바꿈입니다.',
    es: 'Atajos: en modo <b>una línea</b> pulsa <code>Enter</code> para enviar; en modo <b>multilínea</b> pulsa <code>Ctrl/⌘ + Enter</code> para enviar, y <code>Enter</code> solo inserta un salto de línea.',
    ar: 'الاختصارات: في وضع <b>سطر واحد</b> اضغط <code>Enter</code> للإرسال؛ وفي وضع <b>متعدد الأسطر</b> اضغط <code>Ctrl/⌘ + Enter</code> للإرسال، بينما يُدرج <code>Enter</code> وحده فاصل سطر.',
    fr: 'Raccourcis : en mode <b>monoligne</b>, appuyez sur <code>Enter</code> pour envoyer ; en mode <b>multiligne</b>, appuyez sur <code>Ctrl/⌘ + Enter</code> pour envoyer, et <code>Enter</code> seul insère un saut de ligne.',
    pt: 'Atalhos: no modo <b>uma linha</b>, prima <code>Enter</code> para enviar; no modo <b>multilinha</b>, prima <code>Ctrl/⌘ + Enter</code> para enviar, e <code>Enter</code> sozinho insere uma quebra de linha.',
    ru: 'Горячие клавиши: в <b>однострочном</b> режиме нажмите <code>Enter</code>, чтобы отправить; в <b>многострочном</b> — <code>Ctrl/⌘ + Enter</code>, а одиночный <code>Enter</code> переносит строку.'
  },
  runLi4: {
    zh: '开启「自动发送」后即可省略手动点击，停止输入即自动提交。',
    en: 'With “Auto-send” on, you can skip manual clicking — the draft is committed automatically once you stop typing.',
    ja: '「自動送信」をオンにすると手動クリックは不要で、入力停止後に自動でコミットされます。',
    ko: '“자동 전송”을 켜면 수동 클릭 없이 입력을 멈추면 자동으로 커밋됩니다.',
    es: 'Con «Envío automático» activado puedes prescindir del clic manual: el borrador se confirma automáticamente al dejar de escribir.',
    ar: 'مع تفعيل «الإرسال التلقائي» يمكنك الاستغناء عن النقر اليدوي، إذ تُثبَّت المسودة تلقائيًا بمجرد التوقف عن الكتابة.',
    fr: 'Avec « Envoi automatique » activé, plus besoin de cliquer : le brouillon est validé automatiquement dès que vous arrêtez de saisir.',
    pt: 'Com “Envio automático” ativado, dispensa o clique manual: o rascunho é confirmado automaticamente assim que para de escrever.',
    ru: 'При включённой «Автоотправке» можно обойтись без ручных нажатий: черновик фиксируется автоматически, как только вы прекратите ввод.'
  },

  // —— 输出 ——
  outputTitle: {
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
  outputLi1: {
    zh: '<code>text</code> 端口携带最近一次<b>已提交</b>的字符串。',
    en: 'The <code>text</code> port carries the most recently <b>committed</b> string.',
    ja: '<code>text</code> ポートは直近に<b>コミット</b>された文字列を保持します。',
    ko: '<code>text</code> 포트는 가장 최근에 <b>커밋된</b> 문자열을 담고 있습니다.',
    es: 'El puerto <code>text</code> lleva la última cadena <b>confirmada</b>.',
    ar: 'يحمل منفذ <code>text</code> آخر سلسلة نصية <b>مُثبَّتة</b>.',
    fr: 'Le port <code>text</code> contient la dernière chaîne <b>validée</b>.',
    pt: 'A porta <code>text</code> transporta a string <b>confirmada</b> mais recente.',
    ru: 'Порт <code>text</code> хранит последнюю <b>зафиксированную</b> строку.'
  },
  outputLi2: {
    zh: '只有「发送」/ 快捷键 / 自动发送触发时输出才更新，仅编辑草稿不会影响下游。',
    en: 'The output updates only when triggered by Send, a shortcut, or auto-send; merely editing the draft does not affect downstream nodes.',
    ja: '出力が更新されるのは「送信」/ ショートカット / 自動送信が働いたときだけで、下書きの編集だけでは下流に影響しません。',
    ko: '출력은 “전송” / 단축키 / 자동 전송이 작동할 때만 갱신되며, 초안 편집만으로는 하위에 영향을 주지 않습니다.',
    es: 'La salida solo se actualiza cuando la dispara Enviar, un atajo o el envío automático; editar el borrador no afecta a los nodos posteriores.',
    ar: 'لا يتحدّث الإخراج إلا عند تفعيله بـ«إرسال» أو اختصار أو الإرسال التلقائي؛ ومجرد تعديل المسودة لا يؤثر على العقد اللاحقة.',
    fr: 'La sortie n’est mise à jour que lorsqu’elle est déclenchée par Envoyer, un raccourci ou l’envoi automatique ; le simple fait de modifier le brouillon n’affecte pas les nœuds en aval.',
    pt: 'A saída só é atualizada quando acionada por Enviar, um atalho ou o envio automático; apenas editar o rascunho não afeta os nós seguintes.',
    ru: 'Вывод обновляется только при срабатывании «Отправить», горячей клавиши или автоотправки; само редактирование черновика не влияет на последующие узлы.'
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
    zh: '草稿与输出分离，避免编辑过程中下游被反复重算。',
    en: 'The draft and the output are kept separate, so downstream nodes are not recomputed repeatedly while you edit.',
    ja: '下書きと出力は分離されており、編集中に下流が繰り返し再計算されるのを防ぎます。',
    ko: '초안과 출력을 분리하여 편집 중 하위가 반복해서 다시 계산되는 것을 막습니다.',
    es: 'El borrador y la salida están separados, evitando que los nodos posteriores se recalculen una y otra vez mientras editas.',
    ar: 'تُفصَل المسودة عن الإخراج، تفاديًا لإعادة حساب العقد اللاحقة مرارًا أثناء التحرير.',
    fr: 'Le brouillon et la sortie sont séparés, ce qui évite de recalculer sans cesse les nœuds en aval pendant l’édition.',
    pt: 'O rascunho e a saída estão separados, evitando que os nós seguintes sejam recalculados repetidamente durante a edição.',
    ru: 'Черновик и вывод разделены, поэтому последующие узлы не пересчитываются многократно во время редактирования.'
  },
  notesLi2: {
    zh: '从多行切回单行时，内容中的换行符会被替换为空格并立即提交。',
    en: 'When switching from multiline back to single-line, line breaks in the content are replaced with spaces and committed immediately.',
    ja: '複数行から単一行に戻すと、内容内の改行が空白に置き換えられて即座にコミットされます。',
    ko: '여러 줄에서 한 줄로 되돌리면 내용의 줄바꿈이 공백으로 대체되고 즉시 커밋됩니다.',
    es: 'Al volver de multilínea a una línea, los saltos de línea del contenido se reemplazan por espacios y se confirman de inmediato.',
    ar: 'عند العودة من متعدد الأسطر إلى سطر واحد تُستبدل فواصل الأسطر في المحتوى بمسافات وتُثبَّت فورًا.',
    fr: 'En repassant de multiligne à monoligne, les sauts de ligne du contenu sont remplacés par des espaces et validés immédiatement.',
    pt: 'Ao voltar de multilinha para uma linha, as quebras de linha do conteúdo são substituídas por espaços e confirmadas de imediato.',
    ru: 'При возврате из многострочного режима в однострочный переводы строк в содержимом заменяются пробелами и сразу фиксируются.'
  },
  notesLi3: {
    zh: '内容随工作区一起保存，重新打开工作区时会把内容提交到输出端口。',
    en: 'The content is saved with the workspace; when you reopen the workspace, it is committed to the output port.',
    ja: '内容はワークスペースとともに保存され、ワークスペースを再度開くと出力ポートにコミットされます。',
    ko: '내용은 작업 공간과 함께 저장되며, 작업 공간을 다시 열면 출력 포트에 커밋됩니다.',
    es: 'El contenido se guarda junto con el espacio de trabajo; al reabrirlo, se confirma en el puerto de salida.',
    ar: 'يُحفظ المحتوى مع مساحة العمل؛ وعند إعادة فتحها يُثبَّت المحتوى في منفذ الإخراج.',
    fr: 'Le contenu est enregistré avec l’espace de travail ; à sa réouverture, il est validé sur le port de sortie.',
    pt: 'O conteúdo é guardado com o espaço de trabalho; ao reabri-lo, é confirmado na porta de saída.',
    ru: 'Содержимое сохраняется вместе с рабочим пространством; при его повторном открытии содержимое фиксируется в выходном порте.'
  },

  // —— 示例 ——
  exampleTitle: {
    zh: '示例',
    en: 'Example',
    ja: '例',
    ko: '예시',
    es: 'Ejemplo',
    ar: 'مثال',
    fr: 'Exemple',
    pt: 'Exemplo',
    ru: 'Пример'
  },
  exampleLabel: {
    zh: '例：输入 <code>Hello, world!</code> 并发送后，<code>text</code> 端口输出同一字符串给下游节点。',
    en: 'Example: after typing <code>Hello, world!</code> and sending, the <code>text</code> port outputs the same string to downstream nodes.',
    ja: '例：<code>Hello, world!</code> と入力して送信すると、<code>text</code> ポートから同じ文字列が下流ノードへ出力されます。',
    ko: '예: <code>Hello, world!</code>를 입력하고 전송하면 <code>text</code> 포트에서 같은 문자열이 하위 노드로 출력됩니다.',
    es: 'Ejemplo: tras escribir <code>Hello, world!</code> y enviarlo, el puerto <code>text</code> emite esa misma cadena a los nodos posteriores.',
    ar: 'مثال: بعد كتابة <code>Hello, world!</code> وإرساله، يُخرج منفذ <code>text</code> السلسلة نفسها إلى العقد اللاحقة.',
    fr: 'Exemple : après avoir saisi <code>Hello, world!</code> et envoyé, le port <code>text</code> émet la même chaîne vers les nœuds en aval.',
    pt: 'Exemplo: depois de escrever <code>Hello, world!</code> e enviar, a porta <code>text</code> emite a mesma string aos nós seguintes.',
    ru: 'Пример: после ввода <code>Hello, world!</code> и отправки порт <code>text</code> выводит ту же строку последующим узлам.'
  },
  exampleComment1: {
    zh: '// 输入框（草稿）',
    en: '// Input field (draft)',
    ja: '// 入力欄（下書き）',
    ko: '// 입력란 (초안)',
    es: '// Campo de entrada (borrador)',
    ar: '// حقل الإدخال (مسودة)',
    fr: '// Champ de saisie (brouillon)',
    pt: '// Campo de entrada (rascunho)',
    ru: '// Поле ввода (черновик)'
  },
  exampleComment2: {
    zh: '// 发送后输出',
    en: '// Output after sending',
    ja: '// 送信後の出力',
    ko: '// 전송 후 출력',
    es: '// Salida tras enviar',
    ar: '// الإخراج بعد الإرسال',
    fr: '// Sortie après envoi',
    pt: '// Saída após enviar',
    ru: '// Вывод после отправки'
  }
} satisfies Record<string, LocalizedText>