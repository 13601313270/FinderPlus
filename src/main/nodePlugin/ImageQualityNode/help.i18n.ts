import type { LocalizedText } from '../../../shared/language'

/**
 * ImageQuality 节点帮助文档（ImageQualityHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片短文案变化频繁，帮助文档整篇体量大、改动少。
 * 约定：带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。与语言无关的记号（jpeg、png、img-file、WASM 等）
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
    zh: '图片质量节点接收一张图片，按<b>质量</b>与<b>导出格式</b>重新编码后输出，<b>不改变图片尺寸</b>。结果从右侧 <code>image</code> 端口（标签「调整后」）输出给下游节点，底层编码由 Rust → WASM 完成。',
    en: 'The Image Quality node receives an image and re-encodes it according to the <b>quality</b> and the <b>export format</b>, <b>without changing its dimensions</b>. The result is output to downstream nodes from the <code>image</code> port on the right (labelled “Adjusted”); the underlying encoding is done by Rust → WASM.',
    ja: '画像品質ノードは画像1枚を受け取り、<b>品質</b>と<b>エクスポート形式</b>に従って再エンコードして出力します。<b>画像サイズは変更しません</b>。結果は右側の <code>image</code> ポート（ラベル「調整後」）から下流ノードへ出力され、内部のエンコードは Rust → WASM が行います。',
    ko: '이미지 품질 노드는 이미지 한 장을 받아 <b>품질</b>과 <b>내보내기 형식</b>에 따라 다시 인코딩하여 출력하며, <b>이미지 크기는 변경하지 않습니다</b>. 결과는 오른쪽 <code>image</code> 포트(라벨 “조정됨”)에서 하위 노드로 출력되고, 내부 인코딩은 Rust → WASM이 담당합니다.',
    es: 'El nodo Calidad de imagen recibe una imagen y la recodifica según la <b>calidad</b> y el <b>formato de exportación</b>, <b>sin cambiar sus dimensiones</b>. El resultado se envía a los nodos posteriores desde el puerto <code>image</code> de la derecha (etiquetado «Ajustada»); la codificación interna la realiza Rust → WASM.',
    ar: 'تستقبل عقدة جودة الصورة صورة واحدة وتعيد ترميزها وفق <b>الجودة</b> و<b>صيغة التصدير</b>، <b>دون تغيير أبعاد الصورة</b>. تُخرج النتيجة إلى العقد اللاحقة من منفذ <code>image</code> على اليمين (المسمّى «معدّلة»)، ويتم الترميز الداخلي عبر Rust → WASM.',
    fr: 'Le nœud Qualité d’image reçoit une image et la réencode selon la <b>qualité</b> et le <b>format d’export</b>, <b>sans modifier ses dimensions</b>. Le résultat est envoyé aux nœuds en aval depuis le port <code>image</code> à droite (libellé « Ajustée ») ; l’encodage interne est assuré par Rust → WASM.',
    pt: 'O nó Qualidade de imagem recebe uma imagem e recodifica-a segundo a <b>qualidade</b> e o <b>formato de exportação</b>, <b>sem alterar as suas dimensões</b>. O resultado é enviado aos nós seguintes pelo porto <code>image</code> à direita (rotulado “Ajustada”); a codificação interna é feita por Rust → WASM.',
    ru: 'Узел «Качество изображения» принимает изображение и перекодирует его согласно <b>качеству</b> и <b>формату экспорта</b>, <b>не изменяя его размеры</b>. Результат выводится последующим узлам из порта <code>image</code> справа (метка «Скорректировано»); внутреннее кодирование выполняет Rust → WASM.'
  },

  // —— 参数设置（质量滑杆 & 导出格式） ——
  configTitle: {
    zh: '参数设置（质量滑杆 & 导出格式）',
    en: 'Settings (quality slider & export format)',
    ja: '設定（品質スライダー & エクスポート形式）',
    ko: '설정 (품질 슬라이더 & 내보내기 형식)',
    es: 'Ajustes (control de calidad y formato de exportación)',
    ar: 'الإعدادات (شريط الجودة وصيغة التصدير)',
    fr: 'Réglages (curseur de qualité et format d’export)',
    pt: 'Definições (controlo de qualidade e formato de exportação)',
    ru: 'Настройки (ползунок качества и формат экспорта)'
  },
  configLi1: {
    zh: '质量滑杆范围 <code>1–100</code>，默认 <code>80</code>。数值越小，压缩后体积越小、画质越低；越大越清晰、体积越大。',
    en: 'The quality slider ranges from <code>1–100</code>, defaulting to <code>80</code>. The lower the value, the smaller the file and the lower the quality; the higher it is, the sharper the image and the larger the file.',
    ja: '品質スライダーの範囲は <code>1–100</code>、既定値は <code>80</code> です。値が小さいほど圧縮後のサイズは小さく画質は低くなり、大きいほどくっきりしてサイズも大きくなります。',
    ko: '품질 슬라이더 범위는 <code>1–100</code>이며 기본값은 <code>80</code>입니다. 값이 작을수록 압축 후 용량이 작고 화질이 낮아지며, 클수록 선명하고 용량이 커집니다.',
    es: 'El control de calidad va de <code>1–100</code> y su valor predeterminado es <code>80</code>. Cuanto menor sea el valor, menor será el tamaño y la calidad; cuanto mayor, más nítida y más pesada será la imagen.',
    ar: 'يتراوح شريط الجودة بين <code>1–100</code> والقيمة الافتراضية <code>80</code>. كلما صغرت القيمة صغُر الحجم بعد الضغط وانخفضت الجودة، وكلما كبرت زاد الوضوح والحجم.',
    fr: 'Le curseur de qualité va de <code>1–100</code>, avec <code>80</code> par défaut. Plus la valeur est faible, plus le fichier est petit et la qualité basse ; plus elle est élevée, plus l’image est nette et lourde.',
    pt: 'O controlo de qualidade vai de <code>1–100</code>, com <code>80</code> por omissão. Quanto menor o valor, menor o tamanho e a qualidade; quanto maior, mais nítida e mais pesada fica a imagem.',
    ru: 'Ползунок качества имеет диапазон <code>1–100</code>, по умолчанию <code>80</code>. Чем меньше значение, тем меньше размер и ниже качество; чем больше — тем чётче изображение и больше файл.'
  },
  configLi2: {
    zh: '拖动滑杆时只实时显示数值，<b>松手</b>后才重新压缩，避免拖动过程中反复编码卡顿。',
    en: 'While dragging the slider, only the value updates live; re-compression happens only after you <b>release</b> it, avoiding lag from repeated encoding during the drag.',
    ja: 'スライダーをドラッグしている間は数値表示のみが更新され、<b>指を離した後</b>に再圧縮します。ドラッグ中の繰り返しエンコードによる引っかかりを防ぎます。',
    ko: '슬라이더를 드래그하는 동안에는 값만 실시간으로 표시되고, <b>손을 뗀 뒤</b>에 다시 압축하여 드래그 중 반복 인코딩으로 인한 버벅임을 막습니다.',
    es: 'Mientras arrastras el control solo se actualiza el valor en vivo; la recompresión ocurre al <b>soltarlo</b>, evitando tirones por recodificar repetidamente durante el arrastre.',
    ar: 'أثناء سحب الشريط يُحدَّث الرقم فوريًا فقط، ولا يُعاد الضغط إلا بعد <b>إفلاته</b>، لتفادي التقطّع الناتج عن إعادة الترميز المتكرر أثناء السحب.',
    fr: 'Pendant le glissement du curseur, seule la valeur s’actualise en direct ; la recompression n’a lieu qu’au <b>relâchement</b>, évitant les saccades dues aux encodages répétés.',
    pt: 'Ao arrastar o controlo apenas o valor é atualizado em tempo real; a recompressão só acontece ao <b>largar</b>, evitando engasgos por recodificação repetida durante o arrasto.',
    ru: 'При перетаскивании ползунка в реальном времени обновляется только значение; перекодирование выполняется после <b>отпускания</b>, чтобы избежать рывков из-за повторного кодирования.'
  },
  configLi3: {
    zh: '导出格式可选 <code>jpeg</code> 或 <code>png</code>：<code>jpeg</code> 有损、体积小；<code>png</code> 无损、可保留透明通道。默认 <code>jpeg</code>。',
    en: 'The export format can be <code>jpeg</code> or <code>png</code>: <code>jpeg</code> is lossy and smaller; <code>png</code> is lossless and can keep the alpha channel. The default is <code>jpeg</code>.',
    ja: 'エクスポート形式は <code>jpeg</code> または <code>png</code> を選べます。<code>jpeg</code> は非可逆でサイズが小さく、<code>png</code> は可逆でアルファチャンネルを保持できます。既定は <code>jpeg</code> です。',
    ko: '내보내기 형식은 <code>jpeg</code> 또는 <code>png</code>를 선택할 수 있습니다. <code>jpeg</code>는 손실 압축으로 용량이 작고, <code>png</code>는 무손실이며 알파 채널을 유지할 수 있습니다. 기본값은 <code>jpeg</code>입니다.',
    es: 'El formato de exportación puede ser <code>jpeg</code> o <code>png</code>: <code>jpeg</code> es con pérdida y más ligero; <code>png</code> es sin pérdida y puede conservar el canal alfa. Por defecto, <code>jpeg</code>.',
    ar: 'يمكن اختيار صيغة التصدير <code>jpeg</code> أو <code>png</code>: فـ<code>jpeg</code> بفقدان وحجم أصغر، و<code>png</code> بدون فقدان ويحافظ على قناة الشفافية. الافتراضي <code>jpeg</code>.',
    fr: 'Le format d’export peut être <code>jpeg</code> ou <code>png</code> : <code>jpeg</code> est avec perte et plus léger ; <code>png</code> est sans perte et peut conserver le canal alpha. Par défaut : <code>jpeg</code>.',
    pt: 'O formato de exportação pode ser <code>jpeg</code> ou <code>png</code>: <code>jpeg</code> é com perdas e mais leve; <code>png</code> é sem perdas e pode manter o canal alfa. Por omissão, <code>jpeg</code>.',
    ru: 'Формат экспорта — <code>jpeg</code> или <code>png</code>: <code>jpeg</code> с потерями и меньше размером; <code>png</code> без потерь и может сохранять альфа-канал. По умолчанию — <code>jpeg</code>.'
  },
  configLi4: {
    zh: '切换格式后<b>立即重新压缩</b>，结果预览随之更新。',
    en: 'Switching the format <b>re-compresses immediately</b>, and the result preview updates accordingly.',
    ja: '形式を切り替えると<b>即座に再圧縮</b>され、結果のプレビューも更新されます。',
    ko: '형식을 바꾸면 <b>즉시 다시 압축</b>되고 결과 미리보기도 갱신됩니다.',
    es: 'Cambiar el formato <b>recomprime de inmediato</b> y la vista previa del resultado se actualiza.',
    ar: 'يؤدي تغيير الصيغة إلى <b>إعادة الضغط فورًا</b>، وتتحدّث معاينة النتيجة تبعًا لذلك.',
    fr: 'Changer de format <b>recompresse immédiatement</b>, et l’aperçu du résultat est mis à jour.',
    pt: 'Mudar o formato <b>recomprime imediatamente</b> e a pré-visualização do resultado é atualizada.',
    ru: 'Смена формата <b>сразу перекодирует</b> изображение, и предпросмотр результата обновляется.'
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
    ru: 'Входные / выходные порты'
  },
  portsLi1: {
    zh: '左侧 <code>source</code> 端口（标签「图片」）接收一个图片值（<code>img-file</code> 节点或上游图片输出）。',
    en: 'The <code>source</code> port on the left (labelled “Image”) accepts one image value (an <code>img-file</code> node or an upstream image output).',
    ja: '左側の <code>source</code> ポート（ラベル「画像」）は画像値を受け取ります（<code>img-file</code> ノードまたは上流の画像出力）。',
    ko: '왼쪽 <code>source</code> 포트(라벨 “이미지”)는 이미지 값(<code>img-file</code> 노드 또는 상위 이미지 출력)을 받습니다.',
    es: 'El puerto <code>source</code> de la izquierda (etiquetado «Imagen») acepta un valor de imagen (un nodo <code>img-file</code> o una salida de imagen de entrada).',
    ar: 'يستقبل منفذ <code>source</code> على اليسار (المسمّى «صورة») قيمة صورة واحدة (عقدة <code>img-file</code> أو إخراج صورة من المنبع).',
    fr: 'Le port <code>source</code> à gauche (libellé « Image ») reçoit une valeur d’image (un nœud <code>img-file</code> ou une sortie d’image en amont).',
    pt: 'O porto <code>source</code> à esquerda (rotulado “Imagem”) recebe um valor de imagem (um nó <code>img-file</code> ou uma saída de imagem de montante).',
    ru: 'Порт <code>source</code> слева (метка «Изображение») принимает значение изображения (узел <code>img-file</code> или вывод изображения сверху).'
  },
  portsLi2: {
    zh: '右侧 <code>image</code> 端口（标签「调整后」）输出重新编码后的图片，可继续接下游节点。',
    en: 'The <code>image</code> port on the right (labelled “Adjusted”) outputs the re-encoded image for further downstream nodes.',
    ja: '右側の <code>image</code> ポート（ラベル「調整後」）から再エンコード後の画像を出力し、下流ノードへ続けられます。',
    ko: '오른쪽 <code>image</code> 포트(라벨 “조정됨”)에서 다시 인코딩된 이미지를 출력하여 하위 노드로 계속 연결할 수 있습니다.',
    es: 'El puerto <code>image</code> de la derecha (etiquetado «Ajustada») emite la imagen recodificada para seguir conectando hacia abajo.',
    ar: 'يُخرج منفذ <code>image</code> على اليمين (المسمّى «معدّلة») الصورة المعاد ترميزها لمواصلة الربط بالعقد اللاحقة.',
    fr: 'Le port <code>image</code> à droite (libellé « Ajustée ») émet l’image réencodée pour continuer vers l’aval.',
    pt: 'O porto <code>image</code> à direita (rotulado “Ajustada”) emite a imagem recodificada para continuar a jusante.',
    ru: 'Порт <code>image</code> справа (метка «Скорректировано») выводит перекодированное изображение для дальнейшего соединения.'
  },
  portsLi3: {
    zh: '也可以直接把图片节点<b>拖到本节点上</b>做一次性压缩，不建立连线、不持久化关系。',
    en: 'You can also <b>drop an image node onto this node</b> to compress once, without creating a wire or persisting any relationship.',
    ja: '画像ノードを<b>このノードにドラッグ</b>して一度だけ圧縮することもできます。配線は作らず、関係も保存しません。',
    ko: '이미지 노드를 <b>이 노드 위로 끌어다 놓아</b> 한 번만 압축할 수도 있으며, 연결선을 만들지 않고 관계도 저장하지 않습니다.',
    es: 'También puedes <b>arrastrar un nodo de imagen sobre este nodo</b> para comprimir una sola vez, sin crear conexiones ni guardar la relación.',
    ar: 'يمكنك أيضًا <b>سحب عقدة صورة وإفلاتها على هذه العقدة</b> للضغط مرة واحدة، دون إنشاء وصلة أو حفظ أي علاقة.',
    fr: 'Vous pouvez aussi <b>déposer un nœud d’image sur ce nœud</b> pour compresser une seule fois, sans créer de liaison ni enregistrer de relation.',
    pt: 'Também pode <b>arrastar um nó de imagem para cima deste nó</b> para comprimir uma só vez, sem criar ligações nem guardar a relação.',
    ru: 'Можно также <b>перетащить узел изображения на этот узел</b> для однократного сжатия — без создания связи и без сохранения отношения.'
  },

  // —— 压缩时机（两种触发方式） ——
  runTitle: {
    zh: '压缩时机（两种触发方式）',
    en: 'When compression runs (two triggers)',
    ja: '圧縮のタイミング（2つのトリガー）',
    ko: '압축 시점 (두 가지 트리거)',
    es: 'Cuándo se comprime (dos formas de disparo)',
    ar: 'وقت الضغط (طريقتان للتشغيل)',
    fr: 'Quand la compression s’exécute (deux déclencheurs)',
    pt: 'Quando a compressão ocorre (dois acionadores)',
    ru: 'Когда выполняется сжатие (два триггера)'
  },
  runLi1: {
    zh: '端口路径（响应式）：上游图片、<b>质量</b>或<b>格式</b>任一变化都会自动重新压缩，并提交结果刷新下游。',
    en: 'Port path (reactive): a change to the upstream image, the <b>quality</b> or the <b>format</b> automatically re-compresses and commits the result, refreshing downstream nodes.',
    ja: 'ポート経路（リアクティブ）：上流の画像、<b>品質</b>、<b>形式</b>のいずれかが変わると自動で再圧縮し、結果を送信して下流を更新します。',
    ko: '포트 경로(반응형): 상위 이미지, <b>품질</b> 또는 <b>형식</b>이 바뀌면 자동으로 다시 압축하고 결과를 전송하여 하위를 갱신합니다.',
    es: 'Ruta de puerto (reactiva): si cambia la imagen de entrada, la <b>calidad</b> o el <b>formato</b>, se recomprime automáticamente y se confirma el resultado, actualizando los nodos posteriores.',
    ar: 'مسار المنفذ (تفاعلي): أي تغيير في صورة المنبع أو <b>الجودة</b> أو <b>الصيغة</b> يعيد الضغط تلقائيًا ويُرسل النتيجة لتحديث العقد اللاحقة.',
    fr: 'Chemin par port (réactif) : toute modification de l’image en amont, de la <b>qualité</b> ou du <b>format</b> relance automatiquement la compression et valide le résultat, rafraîchissant l’aval.',
    pt: 'Via de porto (reativa): qualquer alteração na imagem de montante, na <b>qualidade</b> ou no <b>formato</b> recompõe automaticamente e confirma o resultado, atualizando a jusante.',
    ru: 'Путь через порт (реактивный): изменение входного изображения, <b>качества</b> или <b>формата</b> автоматически запускает повторное сжатие и отправляет результат, обновляя последующие узлы.'
  },
  runLi2: {
    zh: '拖入路径（一次性）：把图片节点拖进来压缩一次，处理完即结束，之后不会再跟踪该节点。',
    en: 'Drop path (one-shot): dropping an image node compresses once and finishes; the node is not tracked afterwards.',
    ja: 'ドラッグ経路（一回限り）：画像ノードをドラッグして一度だけ圧縮し、処理が終われば以降そのノードは追跡しません。',
    ko: '드롭 경로(일회성): 이미지 노드를 끌어다 놓으면 한 번만 압축하고 끝나며, 이후에는 해당 노드를 추적하지 않습니다.',
    es: 'Ruta de arrastre (única): arrastrar un nodo de imagen comprime una sola vez y termina; después no se sigue ese nodo.',
    ar: 'مسار الإفلات (مرة واحدة): إفلات عقدة صورة يضغط مرة واحدة ثم ينتهي، ولا تتابع العقدة بعد ذلك.',
    fr: 'Chemin par dépôt (unique) : déposer un nœud d’image compresse une seule fois puis s’arrête ; le nœud n’est plus suivi ensuite.',
    pt: 'Via de largar (única): arrastar um nó de imagem comprime uma só vez e termina; o nó não é mais seguido depois.',
    ru: 'Путь через перетаскивание (однократный): перетаскивание узла изображения сжимает один раз и завершается; дальше узел не отслеживается.'
  },
  runLi3: {
    zh: '源文件、质量、格式都没变时，<b>不会重复压缩</b>。',
    en: 'When the source file, quality and format are all unchanged, <b>no re-compression occurs</b>.',
    ja: 'ソースファイル、品質、形式がすべて変わっていなければ<b>再圧縮しません</b>。',
    ko: '원본 파일, 품질, 형식이 모두 그대로면 <b>다시 압축하지 않습니다</b>.',
    es: 'Si el archivo de origen, la calidad y el formato no cambian, <b>no se recompone</b>.',
    ar: 'إذا لم يتغير الملف المصدر ولا الجودة ولا الصيغة، <b>لا يُعاد الضغط</b>.',
    fr: 'Si le fichier source, la qualité et le format restent inchangés, <b>aucune recompression n’a lieu</b>.',
    pt: 'Se o ficheiro de origem, a qualidade e o formato não mudarem, <b>não há recompressão</b>.',
    ru: 'Если исходный файл, качество и формат не изменились, <b>повторное сжатие не выполняется</b>.'
  },

  // —— 结果与体积信息 ——
  outputTitle: {
    zh: '结果与体积信息',
    en: 'Result & size info',
    ja: '結果とサイズ情報',
    ko: '결과 및 용량 정보',
    es: 'Resultado e información de tamaño',
    ar: 'النتيجة ومعلومات الحجم',
    fr: 'Résultat et informations de taille',
    pt: 'Resultado e informações de tamanho',
    ru: 'Результат и сведения о размере'
  },
  outputLi1: {
    zh: '底部信息栏显示 <b>原始体积 → 压缩后体积</b>，例如 <code>1.2 MB → 340.5 KB</code>。',
    en: 'The bottom bar shows the <b>original size → compressed size</b>, for example <code>1.2 MB → 340.5 KB</code>.',
    ja: '下部の情報バーに<b>元のサイズ → 圧縮後のサイズ</b>が表示されます（例：<code>1.2 MB → 340.5 KB</code>）。',
    ko: '하단 정보 표시줄에 <b>원본 용량 → 압축 후 용량</b>이 표시됩니다 (예: <code>1.2 MB → 340.5 KB</code>).',
    es: 'La barra inferior muestra el <b>tamaño original → tamaño comprimido</b>, por ejemplo <code>1.2 MB → 340.5 KB</code>.',
    ar: 'يعرض الشريط السفلي <b>الحجم الأصلي → الحجم بعد الضغط</b>، مثل <code>1.2 MB → 340.5 KB</code>.',
    fr: 'La barre inférieure affiche la <b>taille d’origine → taille compressée</b>, par exemple <code>1.2 MB → 340.5 KB</code>.',
    pt: 'A barra inferior mostra o <b>tamanho original → tamanho comprimido</b>, por exemplo <code>1.2 MB → 340.5 KB</code>.',
    ru: 'Нижняя строка показывает <b>исходный размер → размер после сжатия</b>, например <code>1.2 MB → 340.5 KB</code>.'
  },
  outputLi2: {
    zh: '旁边的压缩比表示体积变化：变小显示 <code>-x%</code>，变大显示 <code>+x%</code>（小图高质量转 jpeg 可能反而变大）。',
    en: 'The ratio beside it indicates the size change: shrinking shows <code>-x%</code>, growing shows <code>+x%</code> (a small image converted to high-quality jpeg may actually grow).',
    ja: '隣の圧縮率はサイズの変化を表し、小さくなれば <code>-x%</code>、大きくなれば <code>+x%</code> と表示されます（小さい画像を高品質 jpeg に変換すると逆に大きくなることがあります）。',
    ko: '옆의 압축률은 용량 변화를 나타내며, 줄면 <code>-x%</code>, 늘면 <code>+x%</code>로 표시됩니다 (작은 이미지를 고품질 jpeg로 변환하면 오히려 커질 수 있습니다).',
    es: 'La proporción contigua indica el cambio de tamaño: si encoge muestra <code>-x%</code>, si crece muestra <code>+x%</code> (una imagen pequeña convertida a jpeg de alta calidad puede aumentar de tamaño).',
    ar: 'تشير النسبة المجاورة إلى تغيّر الحجم: عند التصغير تظهر <code>-x%</code>، وعند التكبير <code>+x%</code> (قد تكبر الصورة الصغيرة عند تحويلها إلى jpeg عالي الجودة).',
    fr: 'Le ratio à côté indique la variation de taille : en baisse il affiche <code>-x%</code>, en hausse <code>+x%</code> (une petite image convertie en jpeg de haute qualité peut au contraire grossir).',
    pt: 'A proporção ao lado indica a variação de tamanho: ao diminuir mostra <code>-x%</code>, ao aumentar mostra <code>+x%</code> (uma imagem pequena convertida para jpeg de alta qualidade pode até crescer).',
    ru: 'Рядом коэффициент сжатия показывает изменение размера: при уменьшении — <code>-x%</code>, при увеличении — <code>+x%</code> (маленькое изображение при переводе в качественный jpeg может даже увеличиться).'
  },
  outputLi3: {
    zh: '点底部「生成图片文件节点」可把压缩结果落成一个 <code>img-file</code> 节点，便于继续串下游。',
    en: 'Click “Generate image file node” at the bottom to turn the compressed result into an <code>img-file</code> node for further downstream use.',
    ja: '下部の「画像ファイルノードを生成」を押すと、圧縮結果を <code>img-file</code> ノードとして出力でき、下流への接続に便利です。',
    ko: '하단의 “이미지 파일 노드 생성”을 클릭하면 압축 결과를 <code>img-file</code> 노드로 만들어 하위로 계속 연결하기 편리합니다.',
    es: 'Pulsa «Generar nodo de archivo de imagen» abajo para convertir el resultado comprimido en un nodo <code>img-file</code> y seguir enlazando hacia abajo.',
    ar: 'انقر على «إنشاء عقدة ملف صورة» في الأسفل لتحويل النتيجة المضغوطة إلى عقدة <code>img-file</code> لتسهيل مواصلة الربط بالعقد اللاحقة.',
    fr: 'Cliquez sur « Générer un nœud de fichier image » en bas pour transformer le résultat compressé en un nœud <code>img-file</code>, facilitant la suite en aval.',
    pt: 'Clique em “Gerar nó de ficheiro de imagem” na parte inferior para transformar o resultado comprimido num nó <code>img-file</code>, facilitando a ligação a jusante.',
    ru: 'Нажмите «Создать узел файла изображения» внизу, чтобы превратить результат сжатия в узел <code>img-file</code> для дальнейшего соединения.'
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
    zh: '本节点<b>不改尺寸</b>。若需要按最长边缩放，请改用「图片压缩」节点。',
    en: 'This node <b>does not change dimensions</b>. To scale by the longest edge, use the “Image Compress” node instead.',
    ja: 'このノードは<b>サイズを変更しません</b>。長辺を基準に縮尺したい場合は「画像圧縮」ノードをお使いください。',
    ko: '이 노드는 <b>크기를 변경하지 않습니다</b>. 가장 긴 변을 기준으로 축소하려면 “이미지 압축” 노드를 사용하세요.',
    es: 'Este nodo <b>no cambia las dimensiones</b>. Para escalar según el lado más largo, usa el nodo «Compresión de imagen».',
    ar: 'هذه العقدة <b>لا تغيّر الأبعاد</b>. إذا أردت التحجيم وفق الضلع الأطول، فاستخدم عقدة «ضغط الصورة».',
    fr: 'Ce nœud <b>ne modifie pas les dimensions</b>. Pour mettre à l’échelle selon le côté le plus long, utilisez le nœud « Compression d’image ».',
    pt: 'Este nó <b>não altera as dimensões</b>. Para escalar segundo o lado mais longo, use o nó “Compressão de imagem”.',
    ru: 'Этот узел <b>не меняет размеры</b>. Для масштабирования по длинной стороне используйте узел «Сжатие изображения».'
  },
  notesLi2: {
    zh: '压缩结果保留在内存中（不自动落盘），输出文件名为 <code>{原名}-q{质量}.{后缀}</code>，例如 <code>photo-q80.jpeg</code>。',
    en: 'The compressed result stays in memory (not saved to disk automatically); the output file name is <code>{name}-q{quality}.{ext}</code>, for example <code>photo-q80.jpeg</code>.',
    ja: '圧縮結果はメモリ上に保持され（自動でディスクに保存されません）、出力ファイル名は <code>{元の名前}-q{品質}.{拡張子}</code>（例：<code>photo-q80.jpeg</code>）です。',
    ko: '압축 결과는 메모리에 유지되며(자동으로 디스크에 저장되지 않음), 출력 파일 이름은 <code>{원본 이름}-q{품질}.{확장자}</code>입니다 (예: <code>photo-q80.jpeg</code>).',
    es: 'El resultado comprimido permanece en memoria (no se guarda en disco automáticamente); el nombre del archivo de salida es <code>{nombre}-q{calidad}.{ext}</code>, por ejemplo <code>photo-q80.jpeg</code>.',
    ar: 'تبقى النتيجة المضغوطة في الذاكرة (لا تُحفظ على القرص تلقائيًا)، ويكون اسم ملف الإخراج <code>{الاسم}-q{الجودة}.{الامتداد}</code>، مثل <code>photo-q80.jpeg</code>.',
    fr: 'Le résultat compressé reste en mémoire (pas d’enregistrement automatique sur disque) ; le nom du fichier de sortie est <code>{nom}-q{qualité}.{ext}</code>, par exemple <code>photo-q80.jpeg</code>.',
    pt: 'O resultado comprimido permanece em memória (não é guardado automaticamente em disco); o nome do ficheiro de saída é <code>{nome}-q{qualidade}.{ext}</code>, por exemplo <code>photo-q80.jpeg</code>.',
    ru: 'Результат сжатия хранится в памяти (автоматически на диск не сохраняется); имя выходного файла — <code>{имя}-q{качество}.{расш}</code>, например <code>photo-q80.jpeg</code>.'
  },
  notesLi3: {
    zh: '质量与格式会<b>随节点保存</b>，下次打开仍沿用；压缩结果本身不持久化。',
    en: 'The quality and format are <b>saved with the node</b> and reused next time; the compressed result itself is not persisted.',
    ja: '品質と形式は<b>ノードとともに保存</b>され、次回も引き継がれます。圧縮結果自体は保存されません。',
    ko: '품질과 형식은 <b>노드와 함께 저장</b>되어 다음에 다시 열어도 유지됩니다. 압축 결과 자체는 저장되지 않습니다.',
    es: 'La calidad y el formato se <b>guardan con el nodo</b> y se reutilizan la próxima vez; el resultado comprimido en sí no se conserva.',
    ar: 'تُحفظ الجودة والصيغة <b>مع العقدة</b> وتُستخدمان مجددًا في المرة القادمة؛ أما النتيجة المضغوطة نفسها فلا تُحفظ.',
    fr: 'La qualité et le format sont <b>enregistrés avec le nœud</b> et réutilisés la prochaine fois ; le résultat compressé lui-même n’est pas conservé.',
    pt: 'A qualidade e o formato são <b>guardados com o nó</b> e reutilizados da próxima vez; o resultado comprimido em si não é persistido.',
    ru: 'Качество и формат <b>сохраняются вместе с узлом</b> и используются в следующий раз; сам результат сжатия не сохраняется.'
  },
  notesLi4: {
    zh: '压缩失败会在底部提示：格式不支持 / 文件损坏，或 WASM 初始化、编码出错。',
    en: 'Compression failures are shown at the bottom: unsupported format / corrupted file, or a WASM init or encoding error.',
    ja: '圧縮に失敗すると下部に表示されます。形式が非対応 / ファイルが破損、または WASM の初期化・エンコードのエラーです。',
    ko: '압축 실패 시 하단에 표시됩니다. 지원하지 않는 형식 / 파일 손상, 또는 WASM 초기화·인코딩 오류입니다.',
    es: 'Los fallos de compresión se muestran abajo: formato no compatible / archivo dañado, o error de inicialización o codificación de WASM.',
    ar: 'تُعرض حالات فشل الضغط في الأسفل: صيغة غير مدعومة / ملف تالف، أو خطأ في تهيئة WASM أو الترميز.',
    fr: 'Les échecs de compression s’affichent en bas : format non pris en charge / fichier corrompu, ou erreur d’initialisation ou d’encodage WASM.',
    pt: 'Falhas de compressão são mostradas na parte inferior: formato não suportado / ficheiro corrompido, ou erro de inicialização ou codificação do WASM.',
    ru: 'Сбои сжатия показываются внизу: неподдерживаемый формат / повреждённый файл либо ошибка инициализации или кодирования WASM.'
  }
} satisfies Record<string, LocalizedText>