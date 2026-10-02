import type { LocalizedText } from '../../../shared/language'

/**
 * NumberInput 节点帮助文档（NumberInputHelpDialog）的全部文案，9 种语言全配。
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
    zh: '数字输入节点是一个<b>源头节点</b>：框里写几，就往外送几。它没有输入端口，只有一个 <code>number</code> 输出端口，把框内的数字提交给下游节点。',
    en: 'The Number Input node is a <b>source node</b>: whatever number you type in the box is what it sends out. It has no input ports and a single <code>number</code> output port that commits the value in the box to downstream nodes.',
    ja: '数値入力ノードは<b>ソースノード</b>です。ボックスに書いた数値がそのまま出力されます。入力ポートはなく、<code>number</code> 出力ポートが1つだけあり、ボックス内の数値を下流ノードへ送信します。',
    ko: '숫자 입력 노드는 <b>소스 노드</b>입니다. 상자에 적은 숫자가 그대로 출력됩니다. 입력 포트는 없고 <code>number</code> 출력 포트 하나가 있어, 상자 안의 숫자를 하위 노드로 전달합니다.',
    es: 'El nodo Entrada numérica es un <b>nodo fuente</b>: el número que escribas en la caja es el que se envía. No tiene puertos de entrada y sí un único puerto de salida <code>number</code> que confirma el valor de la caja a los nodos posteriores.',
    ar: 'عقدة إدخال الأرقام هي <b>عقدة مصدر</b>: الرقم الذي تكتبه في المربع هو ما يُرسَل. ليس لها منافذ إدخال، بل منفذ إخراج واحد <code>number</code> يرسل القيمة الموجودة في المربع إلى العقد اللاحقة.',
    fr: 'Le nœud Entrée numérique est un <b>nœud source</b> : le nombre saisi dans le champ est celui qui est émis. Il n’a aucun port d’entrée, mais un unique port de sortie <code>number</code> qui valide la valeur du champ vers les nœuds en aval.',
    pt: 'O nó Entrada numérica é um <b>nó de origem</b>: o número digitado na caixa é o que é enviado. Ele não tem portas de entrada, apenas uma porta de saída <code>number</code> que envia o valor da caixa aos nós seguintes.',
    ru: 'Узел «Числовой ввод» — это <b>узел-источник</b>: какое число введёте в поле, такое и будет отправлено. У него нет входных портов, только один выходной порт <code>number</code>, который передаёт значение из поля последующим узлам.'
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
    zh: '标题下方的输入框接受<b>任意数字</b>：整数、小数、负数都行。步进设为「任意」（<code>step="any"</code>），不限制小数位数',
    en: 'The box below the title accepts <b>any number</b>: integers, decimals and negatives alike. Its step is set to “any” (<code>step="any"</code>), so the number of decimal places is not restricted',
    ja: 'タイトルの下の入力ボックスは<b>任意の数値</b>を受け付けます。整数・小数・負数いずれも可。ステップは「任意」（<code>step="any"</code>）で、小数点以下の桁数も制限しません',
    ko: '제목 아래 입력 상자는 <b>모든 숫자</b>를 받습니다. 정수, 소수, 음수 모두 가능합니다. 스텝은 “임의”(<code>step="any"</code>)로 설정되어 소수 자릿수 제한이 없습니다',
    es: 'La caja bajo el título acepta <b>cualquier número</b>: enteros, decimales y negativos. Su paso está en “cualquiera” (<code>step="any"</code>), así que no limita los decimales',
    ar: 'يقبل المربع أسفل العنوان <b>أي رقم</b>: صحيحًا أو عشريًا أو سالبًا. الخطوة مضبوطة على «أي» (<code>step="any"</code>)، فلا يوجد حد لعدد المنازل العشرية',
    fr: 'Le champ sous le titre accepte <b>n’importe quel nombre</b> : entiers, décimaux et négatifs. Le pas est réglé sur « quelconque » (<code>step="any"</code>), sans limite de décimales',
    pt: 'A caixa sob o título aceita <b>qualquer número</b>: inteiros, decimais e negativos. O passo está definido como “qualquer” (<code>step="any"</code>), sem limite de casas decimais',
    ru: 'Поле под заголовком принимает <b>любое число</b>: целые, дробные и отрицательные. Шаг установлен как «любой» (<code>step="any"</code>), число знаков после запятой не ограничено'
  },
  useLi2: {
    zh: '该节点<b>不设最小值 / 最大值</b>，也不对输入做 clamp 截断：输入多少就输出多少，负数、超大值原样保留',
    en: 'The node sets <b>no minimum or maximum</b> and does not clamp the input: whatever you enter is emitted as-is, including negatives and very large values',
    ja: 'このノードは<b>最小値・最大値を設けず</b>、入力を clamp（丸め）しません。入力した値がそのまま出力され、負数や巨大な値も保持されます',
    ko: '이 노드는 <b>최솟값/최댓값을 두지 않으며</b> 입력을 clamp하지 않습니다. 입력한 값이 그대로 출력되어 음수나 매우 큰 값도 유지됩니다',
    es: 'El nodo <b>no define mínimo ni máximo</b> y no recorta (clamp) la entrada: lo que escribas se emite tal cual, incluidos negativos y valores muy grandes',
    ar: 'لا تضع هذه العقدة <b>حدًا أدنى أو أعلى</b> ولا تقوم بقصّ (clamp) الإدخال: يُخرَج ما تُدخله كما هو، بما في ذلك الأعداد السالبة والقيم الضخمة',
    fr: 'Le nœud <b>n’impose ni minimum ni maximum</b> et ne borne pas (clamp) l’entrée : la valeur saisie est émise telle quelle, y compris les négatifs et les très grandes valeurs',
    pt: 'O nó <b>não define mínimo nem máximo</b> e não limita (clamp) a entrada: o que você digitar é emitido como está, incluindo negativos e valores muito grandes',
    ru: 'Узел <b>не задаёт минимум и максимум</b> и не ограничивает (clamp) ввод: значение выводится как есть, включая отрицательные и очень большие числа'
  },
  useLi3: {
    zh: '空值处理：空串、<code>-</code>、<code>1.</code> 这类「还没敲完」的内容不会立即提交，只有成为一个完整且有限的数字后才生效；非数字文本一律忽略',
    en: 'Handling empty/incomplete input: an empty string, <code>-</code>, <code>1.</code> and other “half-typed” content is not committed immediately — only a complete, finite number takes effect; non-numeric text is ignored',
    ja: '空・未入力の扱い：空文字列、<code>-</code>、<code>1.</code> など「入力途中」の内容はすぐには送信されず、完全で有限な数値になって初めて反映されます。数値以外のテキストは無視されます',
    ko: '빈 값 처리: 빈 문자열, <code>-</code>, <code>1.</code>처럼 “아직 입력 중”인 내용은 즉시 전송되지 않고, 완전하고 유한한 숫자가 되어야 반영됩니다. 숫자가 아닌 텍스트는 무시됩니다',
    es: 'Entrada vacía o incompleta: una cadena vacía, <code>-</code>, <code>1.</code> y otros contenidos «a medio escribir» no se confirman de inmediato; solo un número completo y finito surte efecto. El texto no numérico se ignora',
    ar: 'التعامل مع القيم الفارغة: النص الفارغ و<code>-</code> و<code>1.</code> وما شابه من محتوى «قيد الكتابة» لا يُرسَل فورًا، ولا يسري إلا رقم كامل ومنتهٍ؛ ويُتجاهل أي نص غير رقمي',
    fr: 'Valeurs vides : une chaîne vide, <code>-</code>, <code>1.</code> ou tout contenu « en cours de saisie » n’est pas validé immédiatement ; seul un nombre complet et fini prend effet. Tout texte non numérique est ignoré',
    pt: 'Entrada vazia: uma string vazia, <code>-</code>, <code>1.</code> e outros conteúdos “em digitação” não são confirmados de imediato; só um número completo e finito passa a valer. Texto não numérico é ignorado',
    ru: 'Пустой ввод: пустая строка, <code>-</code>, <code>1.</code> и прочее «недопечатанное» содержимое не отправляется сразу — в силу вступает только полное конечное число; любой нечисловой текст игнорируется'
  },

  // —— 输出端口 ——
  portsTitle: {
    zh: '输出端口',
    en: 'Output port',
    ja: '出力ポート',
    ko: '출력 포트',
    es: 'Puerto de salida',
    ar: 'منفذ الإخراج',
    fr: 'Port de sortie',
    pt: 'Porta de saída',
    ru: 'Выходной порт'
  },
  portsLi1: {
    zh: '右侧 <code>number</code> 端口输出框内的数字，类型为 <code>NumberValue</code>，供下游按数字类型连接使用',
    en: 'The <code>number</code> port on the right outputs the value in the box as a <code>NumberValue</code>, ready for downstream nodes to consume as a number',
    ja: '右側の <code>number</code> ポートはボックス内の数値を <code>NumberValue</code> として出力し、下流ノードが数値として受け取れます',
    ko: '오른쪽 <code>number</code> 포트는 상자 안의 숫자를 <code>NumberValue</code>로 출력하여 하위 노드가 숫자로 사용할 수 있습니다',
    es: 'El puerto <code>number</code> de la derecha emite el valor de la caja como <code>NumberValue</code>, listo para que los nodos posteriores lo usen como número',
    ar: 'يُخرج منفذ <code>number</code> على اليمين القيمة الموجودة في المربع بصيغة <code>NumberValue</code>، لتستخدمها العقد اللاحقة كرقم',
    fr: 'Le port <code>number</code> à droite émet la valeur du champ sous forme de <code>NumberValue</code>, prête à être utilisée comme nombre en aval',
    pt: 'A porta <code>number</code> à direita emite o valor da caixa como <code>NumberValue</code>, pronto para os nós seguintes usarem como número',
    ru: 'Порт <code>number</code> справа выводит значение из поля как <code>NumberValue</code>, готовое к использованию последующими узлами как число'
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
    zh: '为避免连续敲击时向下游刷大量中间值，输入停止约 <b>500ms</b>（防抖）后才提交新值',
    en: 'To avoid flooding downstream with intermediate values while you type, a new value is committed only after typing stops for about <b>500 ms</b> (debounce)',
    ja: '連続入力中に下流へ大量の中間値を送らないよう、入力が約 <b>500ms</b> 止まってから新しい値を送信します（デバウンス）',
    ko: '연속 입력 중 하위 노드로 많은 중간값이 쏟아지는 것을 막기 위해, 입력이 약 <b>500ms</b> 멈춘 뒤에야 새 값이 전송됩니다(디바운스)',
    es: 'Para no inundar a los nodos posteriores con valores intermedios mientras escribes, el nuevo valor se confirma solo tras unos <b>500 ms</b> sin teclear (debounce)',
    ar: 'لتجنّب إغراق العقد اللاحقة بقيم وسيطة أثناء الكتابة، لا تُرسَل القيمة الجديدة إلا بعد توقف الكتابة نحو <b>500ms</b> (تأخير)',
    fr: 'Pour éviter d’inonder les nœuds en aval de valeurs intermédiaires pendant la saisie, la nouvelle valeur n’est validée qu’après environ <b>500 ms</b> sans frappe (debounce)',
    pt: 'Para não inundar os nós seguintes com valores intermediários enquanto você digita, o novo valor só é confirmado após cerca de <b>500 ms</b> sem digitação (debounce)',
    ru: 'Чтобы не заваливать последующие узлы промежуточными значениями во время набора, новое значение отправляется лишь после паузы около <b>500ms</b> (debounce)'
  },
  notesLi2: {
    zh: '这是纯源头节点：没有输入端口，接收不到上游，数值只能从框里输入',
    en: 'This is a pure source node: it has no input port and receives nothing from upstream — the value can only come from the box',
    ja: 'これは純粋なソースノードです。入力ポートがなく上流を受け取れず、値はボックスから入力するしかありません',
    ko: '이것은 순수 소스 노드입니다. 입력 포트가 없어 상위에서 아무것도 받지 못하며, 값은 상자에서만 입력할 수 있습니다',
    es: 'Es un nodo fuente puro: no tiene puerto de entrada ni recibe nada aguas arriba; el valor solo puede introducirse en la caja',
    ar: 'هذه عقدة مصدر خالصة: ليس لها منفذ إدخال ولا تستقبل شيئًا من العقد السابقة، ويمكن إدخال القيمة من المربع فقط',
    fr: 'C’est un nœud source pur : sans port d’entrée, il ne reçoit rien de l’amont et la valeur ne peut venir que du champ',
    pt: 'É um nó de origem puro: sem porta de entrada, não recebe nada de montante e o valor só pode vir da caixa',
    ru: 'Это чистый узел-источник: у него нет входного порта, он ничего не получает сверху, и значение можно задать только в поле'
  },
  notesLi3: {
    zh: '框内的数字会随项目一起保存（<code>saveState</code>），重新打开时自动恢复并重新提交给下游；未保存过时默认为 <code>0</code>',
    en: 'The number in the box is saved with the project (<code>saveState</code>) and restored and re-committed downstream when reopened; if nothing was saved it defaults to <code>0</code>',
    ja: 'ボックス内の数値はプロジェクトと一緒に保存され（<code>saveState</code>）、再度開くと自動的に復元され下流へ再送信されます。未保存の場合は既定値 <code>0</code> になります',
    ko: '상자 안의 숫자는 프로젝트와 함께 저장되어(<code>saveState</code>) 다시 열 때 자동으로 복원되어 하위로 재전송됩니다. 저장된 값이 없으면 기본값 <code>0</code>입니다',
    es: 'El número de la caja se guarda con el proyecto (<code>saveState</code>) y, al reabrir, se restaura y se vuelve a confirmar aguas abajo; si no se guardó nada, el valor predeterminado es <code>0</code>',
    ar: 'يُحفَظ الرقم الموجود في المربع مع المشروع (<code>saveState</code>)، ويُستعاد ويُعاد إرساله إلى العقد اللاحقة عند إعادة الفتح؛ وإذا لم يُحفَظ شيء فالقيمة الافتراضية <code>0</code>',
    fr: 'Le nombre du champ est enregistré avec le projet (<code>saveState</code>) et, à la réouverture, restauré puis revalidé vers l’aval ; sans valeur enregistrée, la valeur par défaut est <code>0</code>',
    pt: 'O número da caixa é salvo junto com o projeto (<code>saveState</code>) e, ao reabrir, é restaurado e reenviado adiante; se nada foi salvo, o padrão é <code>0</code>',
    ru: 'Число в поле сохраняется вместе с проектом (<code>saveState</code>) и при повторном открытии восстанавливается и снова отправляется дальше; если ничего не сохранено, значение по умолчанию — <code>0</code>'
  }
} satisfies Record<string, LocalizedText>