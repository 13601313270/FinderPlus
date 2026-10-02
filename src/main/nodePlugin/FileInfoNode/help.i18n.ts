import type { LocalizedText } from '../../../shared/language'

/**
 * FileInfo 节点帮助文档（FileInfoHelpDialog）的全部文案，9 种语言全配。
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
    zh: '文件信息节点把上游送来的<b>文件</b>的元信息展示在卡片上，并把文件大小与 MIME 类型派发给下游节点。它不读取也不修改文件内容，只做信息展示与转发。',
    en: 'The File Info node shows the metadata of the <b>file</b> coming from upstream on the card, and dispatches the file size and MIME type to downstream nodes. It neither reads nor modifies the file content—it only displays and forwards information.',
    ja: 'ファイル情報ノードは、上流から渡された<b>ファイル</b>のメタ情報をカードに表示し、ファイルサイズと MIME タイプを下流ノードへ渡します。ファイルの内容は読み書きせず、情報の表示と受け渡しだけを行います。',
    ko: '파일 정보 노드는 상위에서 전달된 <b>파일</b>의 메타 정보를 카드에 표시하고, 파일 크기와 MIME 유형을 하위 노드로 전달합니다. 파일 내용을 읽거나 수정하지 않고 정보 표시와 전달만 합니다.',
    es: 'El nodo Información de archivo muestra en la tarjeta los metadatos del <b>archivo</b> que llega desde aguas arriba y reparte el tamaño y el tipo MIME del archivo a los nodos posteriores. No lee ni modifica el contenido del archivo: solo muestra y reenvía información.',
    ar: 'تعرض عقدة معلومات الملف البيانات الوصفية لـ<b>الملف</b> القادم من المرحلة السابقة على البطاقة، وتُمرّر حجم الملف ونوع MIME إلى العقد اللاحقة. وهي لا تقرأ محتوى الملف ولا تعدّله، بل تعرض المعلومات وتمرّرها فقط.',
    fr: 'Le nœud Informations de fichier affiche sur la carte les métadonnées du <b>fichier</b> reçu en amont, et transmet la taille et le type MIME du fichier aux nœuds en aval. Il ne lit ni ne modifie le contenu du fichier : il ne fait qu’afficher et transmettre des informations.',
    pt: 'O nó Informações do arquivo exibe no cartão os metadados do <b>arquivo</b> recebido de montante e repassa o tamanho e o tipo MIME do arquivo aos nós seguintes. Ele não lê nem modifica o conteúdo do arquivo: apenas exibe e repassa informações.',
    ru: 'Узел «Информация о файле» показывает на карточке метаданные <b>файла</b>, пришедшего из предыдущего узла, и передаёт размер файла и тип MIME последующим узлам. Он не читает и не изменяет содержимое файла — только отображает и передаёт информацию.'
  },

  // —— 输入 / 输出端口 ——
  portsTitle: {
    zh: '输入 / 输出端口',
    en: 'Input / output ports',
    ja: '入力 / 出力ポート',
    ko: '입력 / 출력 포트',
    es: 'Puertos de entrada / salida',
    ar: 'منافذ الإدخال / الإخراج',
    fr: 'Ports d’entrée / sortie',
    pt: 'Portas de entrada / saída',
    ru: 'Входной / выходной порты'
  },
  portsLi1: {
    zh: '左侧 <code>file</code> 输入端口接受 <code>FileValue</code>（含文本文件等子类）',
    en: 'The <code>file</code> input port on the left accepts a <code>FileValue</code> (including subclasses such as text files)',
    ja: '左側の <code>file</code> 入力ポートは <code>FileValue</code>（テキストファイルなどのサブクラスを含む）を受け付けます',
    ko: '왼쪽 <code>file</code> 입력 포트는 <code>FileValue</code>(텍스트 파일 등 하위 클래스 포함)를 받습니다',
    es: 'El puerto de entrada <code>file</code> de la izquierda acepta un <code>FileValue</code> (incluidas subclases como los archivos de texto)',
    ar: 'يقبل منفذ الإدخال <code>file</code> على اليسار قيمة <code>FileValue</code> (بما في ذلك الأصناف الفرعية مثل ملفات النصوص)',
    fr: 'Le port d’entrée <code>file</code> à gauche accepte un <code>FileValue</code> (y compris les sous-classes comme les fichiers texte)',
    pt: 'O porto de entrada <code>file</code> à esquerda aceita um <code>FileValue</code> (incluindo subclasses, como arquivos de texto)',
    ru: 'Входной порт <code>file</code> слева принимает <code>FileValue</code> (включая подклассы, например текстовые файлы)'
  },
  portsLi2: {
    zh: '右侧 <code>number</code> 输出端口派发文件大小，单位为 <b>KB</b>（四舍五入到两位小数）',
    en: 'The <code>number</code> output port on the right dispatches the file size in <b>KB</b> (rounded to two decimals)',
    ja: '右側の <code>number</code> 出力ポートはファイルサイズを <b>KB</b> 単位で渡します（小数第2位に四捨五入）',
    ko: '오른쪽 <code>number</code> 출력 포트는 파일 크기를 <b>KB</b> 단위로 전달합니다 (소수점 둘째 자리로 반올림)',
    es: 'El puerto de salida <code>number</code> de la derecha reparte el tamaño del archivo en <b>KB</b> (redondeado a dos decimales)',
    ar: 'يُمرّر منفذ الإخراج <code>number</code> على اليمين حجم الملف بوحدة <b>KB</b> (مقرَّبًا إلى منزلتين عشريتين)',
    fr: 'Le port de sortie <code>number</code> à droite transmet la taille du fichier en <b>KB</b> (arrondie à deux décimales)',
    pt: 'O porto de saída <code>number</code> à direita repassa o tamanho do arquivo em <b>KB</b> (arredondado para duas casas decimais)',
    ru: 'Выходной порт <code>number</code> справа передаёт размер файла в <b>KB</b> (с округлением до двух знаков после запятой)'
  },
  portsLi3: {
    zh: '右侧 <code>string</code> 输出端口派发文件的 <b>MIME 类型</b>（如 <code>image/png</code>）',
    en: 'The <code>string</code> output port on the right dispatches the file’s <b>MIME type</b> (e.g. <code>image/png</code>)',
    ja: '右側の <code>string</code> 出力ポートはファイルの <b>MIME タイプ</b>（例：<code>image/png</code>）を渡します',
    ko: '오른쪽 <code>string</code> 출력 포트는 파일의 <b>MIME 유형</b>(예: <code>image/png</code>)을 전달합니다',
    es: 'El puerto de salida <code>string</code> de la derecha reparte el <b>tipo MIME</b> del archivo (p. ej. <code>image/png</code>)',
    ar: 'يُمرّر منفذ الإخراج <code>string</code> على اليمين <b>نوع MIME</b> للملف (مثل <code>image/png</code>)',
    fr: 'Le port de sortie <code>string</code> à droite transmet le <b>type MIME</b> du fichier (par ex. <code>image/png</code>)',
    pt: 'O porto de saída <code>string</code> à direita repassa o <b>tipo MIME</b> do arquivo (por ex. <code>image/png</code>)',
    ru: 'Выходной порт <code>string</code> справа передаёт <b>тип MIME</b> файла (например, <code>image/png</code>)'
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
    zh: '卡片依次展示 <b>名称</b>、<b>大小</b>、<b>类型</b> 三行信息；类型为空时不显示该行',
    en: 'The card shows three rows in order: <b>Name</b>, <b>Size</b> and <b>Type</b>; the type row is hidden when the type is empty',
    ja: 'カードには <b>名前</b>・<b>サイズ</b>・<b>タイプ</b> の3行が順に表示されます。タイプが空のときはその行は表示されません',
    ko: '카드에 <b>이름</b>, <b>크기</b>, <b>유형</b> 세 줄이 순서대로 표시되며, 유형이 비어 있으면 해당 줄은 표시되지 않습니다',
    es: 'La tarjeta muestra tres filas en orden: <b>nombre</b>, <b>tamaño</b> y <b>tipo</b>; la fila de tipo se oculta cuando el tipo está vacío',
    ar: 'تعرض البطاقة ثلاثة صفوف بالترتيب: <b>الاسم</b> و<b>الحجم</b> و<b>النوع</b>؛ ويُخفى صف النوع عندما يكون النوع فارغًا',
    fr: 'La carte affiche trois lignes dans l’ordre : <b>nom</b>, <b>taille</b> et <b>type</b> ; la ligne du type est masquée lorsque le type est vide',
    pt: 'O cartão mostra três linhas na ordem: <b>nome</b>, <b>tamanho</b> e <b>tipo</b>; a linha do tipo é ocultada quando o tipo está vazio',
    ru: 'Карточка показывает три строки по порядку: <b>имя</b>, <b>размер</b> и <b>тип</b>; строка типа скрыта, если тип пуст'
  },
  useLi2: {
    zh: '大小按量级自动格式化：小于 1 KB 显示 <code>B</code>，小于 1 MB 显示 <code>KB</code>，否则显示 <code>MB</code>',
    en: 'The size is formatted automatically by magnitude: below 1 KB it shows <code>B</code>, below 1 MB it shows <code>KB</code>, otherwise <code>MB</code>',
    ja: 'サイズは量に応じて自動整形されます。1 KB 未満は <code>B</code>、1 MB 未満は <code>KB</code>、それ以上は <code>MB</code> で表示されます',
    ko: '크기는 크기에 따라 자동으로 형식이 지정됩니다. 1 KB 미만은 <code>B</code>, 1 MB 미만은 <code>KB</code>, 그 이상은 <code>MB</code>로 표시됩니다',
    es: 'El tamaño se formatea automáticamente según su magnitud: menos de 1 KB muestra <code>B</code>, menos de 1 MB muestra <code>KB</code> y, si no, <code>MB</code>',
    ar: 'يُنسَّق الحجم تلقائيًا حسب المقدار: أقل من 1 KB يُعرض بـ<code>B</code>، وأقل من 1 MB بـ<code>KB</code>، وإلا فبـ<code>MB</code>',
    fr: 'La taille est mise en forme automatiquement selon son ordre de grandeur : moins de 1 KB affiche <code>B</code>, moins de 1 MB affiche <code>KB</code>, sinon <code>MB</code>',
    pt: 'O tamanho é formatado automaticamente conforme a ordem de grandeza: menos de 1 KB mostra <code>B</code>, menos de 1 MB mostra <code>KB</code> e, caso contrário, <code>MB</code>',
    ru: 'Размер форматируется автоматически в зависимости от величины: меньше 1 KB — <code>B</code>, меньше 1 MB — <code>KB</code>, иначе <code>MB</code>'
  },
  useLi3: {
    zh: '上游文件变化时卡片<b>立即刷新</b>，同时把新的大小与类型提交到输出端口',
    en: 'When the upstream file changes, the card <b>refreshes immediately</b> and commits the new size and type to the output ports',
    ja: '上流のファイルが変わるとカードは<b>即座に更新</b>され、新しいサイズとタイプが出力ポートに commit されます',
    ko: '상위 파일이 바뀌면 카드가 <b>즉시 갱신</b>되고 새 크기와 유형이 출력 포트에 commit됩니다',
    es: 'Cuando el archivo de aguas arriba cambia, la tarjeta <b>se actualiza al instante</b> y confirma el nuevo tamaño y tipo en los puertos de salida',
    ar: 'عندما يتغيّر الملف في المرحلة السابقة تتحدّث البطاقة <b>فورًا</b> ويُرسل الحجم والنوع الجديدان إلى منافذ الإخراج',
    fr: 'Lorsque le fichier en amont change, la carte <b>se met à jour immédiatement</b> et valide la nouvelle taille et le nouveau type sur les ports de sortie',
    pt: 'Quando o arquivo de montante muda, o cartão <b>atualiza imediatamente</b> e confirma o novo tamanho e tipo nos portos de saída',
    ru: 'Когда файл выше по потоку меняется, карточка <b>сразу обновляется</b> и отправляет новый размер и тип в выходные порты'
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
    zh: '没有接输入、或上游尚未计算时，卡片显示「<b>暂无输入</b>」空状态',
    en: 'When no input is connected, or upstream has not computed yet, the card shows a “<b>No input</b>” empty state',
    ja: '入力が接続されていない、または上流がまだ計算していない場合、カードは「<b>入力なし</b>」の空状態を表示します',
    ko: '입력이 연결되지 않았거나 상위가 아직 계산하지 않으면 카드에 “<b>입력 없음</b>” 빈 상태가 표시됩니다',
    es: 'Si no hay entrada conectada o aguas arriba aún no ha calculado nada, la tarjeta muestra el estado vacío «<b>Sin entrada</b>»',
    ar: 'إذا لم يكن هناك إدخال متصل أو لم تُحسب المرحلة السابقة بعد، تعرض البطاقة حالة فارغة «<b>لا يوجد إدخال</b>»',
    fr: 'Si aucune entrée n’est connectée ou si l’amont n’a pas encore calculé, la carte affiche l’état vide « <b>Aucune entrée</b> »',
    pt: 'Se não houver entrada conectada ou se a montante ainda não tiver calculado, o cartão exibe o estado vazio “<b>Sem entrada</b>”',
    ru: 'Если вход не подключён или предыдущий узел ещё не выполнил расчёт, карточка показывает пустое состояние «<b>Нет входа</b>»'
  },
  notesLi2: {
    zh: '本节点<b>不接收文件拖放</b>，也不读写文件内容，只展示元信息',
    en: 'This node <b>does not accept file drops</b> and does not read or write file content—it only displays metadata',
    ja: '本ノードは<b>ファイルのドラッグ＆ドロップを受け付けず</b>、ファイル内容の読み書きもしません。表示するのはメタ情報だけです',
    ko: '이 노드는 <b>파일 드래그 앤 드롭을 받지 않으며</b> 파일 내용을 읽거나 쓰지 않습니다. 표시하는 것은 메타 정보뿐입니다',
    es: 'Este nodo <b>no acepta arrastrar y soltar archivos</b> ni lee o escribe su contenido: solo muestra metadatos',
    ar: 'لا تقبل هذه العقدة <b>سحب وإفلات الملفات</b> ولا تقرأ محتوى الملف أو تكتبه، بل تعرض البيانات الوصفية فقط',
    fr: 'Ce nœud <b>n’accepte pas le glisser-déposer de fichiers</b> et ne lit ni n’écrit le contenu du fichier : il n’affiche que les métadonnées',
    pt: 'Este nó <b>não aceita arrastar e soltar arquivos</b> e não lê nem grava o conteúdo do arquivo: exibe apenas metadados',
    ru: 'Этот узел <b>не принимает перетаскивание файлов</b> и не читает и не записывает содержимое файла — он показывает только метаданные'
  },
  notesLi3: {
    zh: '信息较多时卡片内部可滚动查看',
    en: 'When there is a lot of information, the card can be scrolled internally',
    ja: '情報が多いときはカード内をスクロールして確認できます',
    ko: '정보가 많을 때는 카드 안을 스크롤하여 확인할 수 있습니다',
    es: 'Cuando hay mucha información, la tarjeta se puede desplazar por dentro',
    ar: 'عند كثرة المعلومات يمكن التمرير داخل البطاقة لاستعراضها',
    fr: 'Lorsqu’il y a beaucoup d’informations, la carte défile en interne',
    pt: 'Quando há muita informação, o cartão pode ser rolado internamente',
    ru: 'При большом объёме информации карточку можно прокручивать изнутри'
  }
} satisfies Record<string, LocalizedText>