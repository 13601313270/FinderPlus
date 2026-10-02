import type { LocalizedText } from '../../../shared/language'

/**
 * Code 节点帮助文档（CodeHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片/配置弹窗的短文案变化频繁，帮助文档整篇
 * 体量大且改动少，拆开后两边互不干扰。跟随节点文件夹一起搬运，保持插件自包含。
 *
 * 约定：凡带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。代码块本身（结构、语法高亮 span）留在模板里，
 * 只有其中的注释/占位符抽成词条。
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
    zh: '代码节点让你在画布上写一段 JavaScript 函数体，点击「执行」跑一次，通过 <code>callOutputPort</code> 把结果发给下游节点。输入端口的变量名在函数体里可以直接当变量用。',
    en: 'The Code node lets you write a JavaScript function body on the canvas. Click “Run” to execute it once, and send results to downstream nodes via <code>callOutputPort</code>. Input port variables can be used directly as variables in the function body.',
    ja: 'コードノードでは、キャンバス上に JavaScript の関数本体を書けます。「実行」をクリックすると1回実行され、<code>callOutputPort</code> を通じて結果を下流ノードに送信します。入力ポートの変数名は、関数本体の中でそのまま変数として使えます。',
    ko: '코드 노드를 사용하면 캔버스에 JavaScript 함수 본문을 작성할 수 있습니다. “실행”을 클릭하면 한 번 실행되고, <code>callOutputPort</code>를 통해 결과를 하위 노드로 전송합니다. 입력 포트의 변수 이름은 함수 본문에서 그대로 변수로 사용할 수 있습니다.',
    es: 'El nodo Código te permite escribir un cuerpo de función JavaScript en el lienzo. Haz clic en “Ejecutar” para ejecutarlo una vez y envía los resultados a los nodos posteriores mediante <code>callOutputPort</code>. Los nombres de las variables de los puertos de entrada se pueden usar directamente como variables en el cuerpo de la función.',
    ar: 'تتيح لك عقدة الكود كتابة جسم دالة JavaScript على لوحة الرسم. انقر على «تنفيذ» لتشغيله مرة واحدة، وأرسل النتائج إلى العقد اللاحقة عبر <code>callOutputPort</code>. يمكن استخدام أسماء متغيرات منافذ الإدخال مباشرةً كمتغيرات داخل جسم الدالة.',
    fr: 'Le nœud Code vous permet d’écrire un corps de fonction JavaScript sur le canevas. Cliquez sur « Exécuter » pour l’exécuter une fois, puis envoyez le résultat aux nœuds en aval via <code>callOutputPort</code>. Les noms des variables des ports d’entrée peuvent être utilisés directement comme variables dans le corps de la fonction.',
    pt: 'O nó Código permite escrever um corpo de função JavaScript no canvas. Clique em “Executar” para executá-lo uma vez e envie o resultado aos nós seguintes através de <code>callOutputPort</code>. Os nomes das variáveis dos portos de entrada podem ser usados diretamente como variáveis no corpo da função.',
    ru: 'Узел «Код» позволяет написать тело функции JavaScript на холсте. Нажмите «Выполнить», чтобы запустить его один раз, и отправьте результат последующим узлам через <code>callOutputPort</code>. Имена переменных входных портов можно использовать в теле функции напрямую как переменные.'
  },

  // —— 输入端口 ——
  inputsTitle: {
    zh: '输入端口',
    en: 'Input ports',
    ja: '入力ポート',
    ko: '입력 포트',
    es: 'Puertos de entrada',
    ar: 'منافذ الإدخال',
    fr: 'Ports d’entrée',
    pt: 'Portas de entrada',
    ru: 'Входные порты'
  },
  inputsLead: {
    zh: '点「输入」右侧的 <code>+</code> 添加端口，每个端口配置：',
    en: 'Click the <code>+</code> to the right of “Input” to add a port. Each port is configured with:',
    ja: '「入力」の右側にある <code>+</code> をクリックしてポートを追加します。各ポートの設定項目：',
    ko: '“입력” 오른쪽의 <code>+</code>를 클릭하여 포트를 추가합니다. 각 포트 설정 항목:',
    es: 'Haz clic en <code>+</code> a la derecha de “Entrada” para añadir un puerto. Cada puerto se configura con:',
    ar: 'انقر على <code>+</code> على يمين «إدخال» لإضافة منفذ. يتم ضبط كل منفذ بما يلي:',
    fr: 'Cliquez sur <code>+</code> à droite de « Entrée » pour ajouter un port. Chaque port se configure avec :',
    pt: 'Clique no <code>+</code> à direita de “Entrada” para adicionar um porto. Cada porto é configurado com:',
    ru: 'Нажмите <code>+</code> справа от «Вход», чтобы добавить порт. Каждый порт настраивается так:'
  },
  inputsLiVarName: {
    zh: '<b>变量名</b>：函数体里直接用的标识符，例如 <code>price</code>、<code>items</code>',
    en: '<b>Variable name</b>: the identifier used directly in the function body, e.g. <code>price</code>, <code>items</code>',
    ja: '<b>変数名</b>：関数本体でそのまま使う識別子。例：<code>price</code>、<code>items</code>',
    ko: '<b>변수 이름</b>: 함수 본문에서 그대로 사용하는 식별자입니다. 예: <code>price</code>, <code>items</code>',
    es: '<b>Nombre de variable</b>: el identificador que se usa directamente en el cuerpo de la función, p. ej. <code>price</code>, <code>items</code>',
    ar: '<b>اسم المتغير</b>: المعرّف المستخدم مباشرةً في جسم الدالة، مثل <code>price</code> و<code>items</code>',
    fr: '<b>Nom de variable</b> : l’identifiant utilisé directement dans le corps de la fonction, par ex. <code>price</code>, <code>items</code>',
    pt: '<b>Nome da variável</b>: o identificador usado diretamente no corpo da função, por exemplo <code>price</code>, <code>items</code>',
    ru: '<b>Имя переменной</b>: идентификатор, используемый прямо в теле функции, например <code>price</code>, <code>items</code>'
  },
  inputsLiType: {
    zh: '<b>类型</b>：决定接受上游哪种值，代码里拿到的是原始 JS 值',
    en: '<b>Type</b>: determines which upstream value is accepted; the code receives the raw JS value',
    ja: '<b>型</b>：上流から受け取る値の種類を決めます。コード内では生の JS 値が渡されます',
    ko: '<b>유형</b>: 상위에서 받을 값의 종류를 결정합니다. 코드에서는 원시 JS 값을 받습니다',
    es: '<b>Tipo</b>: determina qué valor de entrada se acepta; el código recibe el valor JS sin procesar',
    ar: '<b>النوع</b>: يحدد نوع القيمة الواردة من المنبع، ويتلقى الكود قيمة JS الخام',
    fr: '<b>Type</b> : détermine le type de valeur amont accepté ; le code reçoit la valeur JS brute',
    pt: '<b>Tipo</b>: determina qual valor de entrada é aceito; o código recebe o valor JS bruto',
    ru: '<b>Тип</b>: определяет, какое значение сверху принимается; код получает исходное значение JS'
  },
  tblHeaderType: {
    zh: '类型',
    en: 'Type',
    ja: '型',
    ko: '유형',
    es: 'Tipo',
    ar: 'النوع',
    fr: 'Type',
    pt: 'Tipo',
    ru: 'Тип'
  },
  tblHeaderGot: {
    zh: '代码里拿到什么',
    en: 'What the code receives',
    ja: 'コードが受け取る値',
    ko: '코드에서 받는 값',
    es: 'Qué recibe el código',
    ar: 'ما الذي يتلقاه الكود',
    fr: 'Ce que le code reçoit',
    pt: 'O que o código recebe',
    ru: 'Что получает код'
  },
  tblNumber: {
    zh: '原始数字，如 <code>42</code>',
    en: 'Raw number, e.g. <code>42</code>',
    ja: '生の数値。例：<code>42</code>',
    ko: '원시 숫자입니다. 예: <code>42</code>',
    es: 'Número sin procesar, p. ej. <code>42</code>',
    ar: 'رقم خام، مثل <code>42</code>',
    fr: 'Nombre brut, par ex. <code>42</code>',
    pt: 'Número bruto, por exemplo <code>42</code>',
    ru: 'Исходное число, например <code>42</code>'
  },
  tblString: {
    zh: '原始字符串，如 <code>"hello"</code>',
    en: 'Raw string, e.g. <code>"hello"</code>',
    ja: '生の文字列。例：<code>"hello"</code>',
    ko: '원시 문자열입니다. 예: <code>"hello"</code>',
    es: 'Cadena sin procesar, p. ej. <code>"hello"</code>',
    ar: 'نص خام، مثل <code>"hello"</code>',
    fr: 'Chaîne brute, par ex. <code>"hello"</code>',
    pt: 'String bruta, por exemplo <code>"hello"</code>',
    ru: 'Исходная строка, например <code>"hello"</code>'
  },
  tblBool: {
    zh: '原始布尔值，如 <code>true</code>',
    en: 'Raw boolean, e.g. <code>true</code>',
    ja: '生のブール値。例：<code>true</code>',
    ko: '원시 불리언 값입니다. 예: <code>true</code>',
    es: 'Booleano sin procesar, p. ej. <code>true</code>',
    ar: 'قيمة منطقية خام، مثل <code>true</code>',
    fr: 'Booléen brut, par ex. <code>true</code>',
    pt: 'Booleano bruto, por exemplo <code>true</code>',
    ru: 'Исходное логическое значение, например <code>true</code>'
  },
  tblFile: {
    zh: '浏览器 <code>File</code> 对象（可读 <code>.name</code>、<code>.size</code>）',
    en: 'Browser <code>File</code> object (you can read <code>.name</code>, <code>.size</code>)',
    ja: 'ブラウザの <code>File</code> オブジェクト（<code>.name</code>、<code>.size</code> を読み取れます）',
    ko: '브라우저 <code>File</code> 객체입니다 (<code>.name</code>, <code>.size</code> 읽기 가능)',
    es: 'Objeto <code>File</code> del navegador (puedes leer <code>.name</code>, <code>.size</code>)',
    ar: 'كائن <code>File</code> الخاص بالمتصفح (يمكنك قراءة <code>.name</code> و<code>.size</code>)',
    fr: 'Objet <code>File</code> du navigateur (vous pouvez lire <code>.name</code>, <code>.size</code>)',
    pt: 'Objeto <code>File</code> do navegador (é possível ler <code>.name</code>, <code>.size</code>)',
    ru: 'Объект <code>File</code> браузера (можно читать <code>.name</code>, <code>.size</code>)'
  },

  // —— 输出端口 ——
  outputsTitle: {
    zh: '输出端口',
    en: 'Output ports',
    ja: '出力ポート',
    ko: '출력 포트',
    es: 'Puertos de salida',
    ar: 'منافذ الإخراج',
    fr: 'Ports de sortie',
    pt: 'Portas de saída',
    ru: 'Выходные порты'
  },
  outputsLead: {
    zh: '点「输出」右侧的 <code>+</code> 添加端口（至少保留一个），每个端口配置：',
    en: 'Click the <code>+</code> to the right of “Output” to add a port (keep at least one). Each port is configured with:',
    ja: '「出力」の右側にある <code>+</code> をクリックしてポートを追加します（最低1つは保持）。各ポートの設定項目：',
    ko: '“출력” 오른쪽의 <code>+</code>를 클릭하여 포트를 추가합니다 (최소 1개 유지). 각 포트 설정 항목:',
    es: 'Haz clic en <code>+</code> a la derecha de “Salida” para añadir un puerto (conserva al menos uno). Cada puerto se configura con:',
    ar: 'انقر على <code>+</code> على يمين «إخراج» لإضافة منفذ (احتفظ بمنفذ واحد على الأقل). يتم ضبط كل منفذ بما يلي:',
    fr: 'Cliquez sur <code>+</code> à droite de « Sortie » pour ajouter un port (gardez-en au moins un). Chaque port se configure avec :',
    pt: 'Clique no <code>+</code> à direita de “Saída” para adicionar um porto (mantenha pelo menos um). Cada porto é configurado com:',
    ru: 'Нажмите <code>+</code> справа от «Выход», чтобы добавить порт (оставьте хотя бы один). Каждый порт настраивается так:'
  },
  outputsLiPortName: {
    zh: '<b>端口名</b>：<code>callOutputPort</code> 里用的第一个参数，如 <code>"result"</code>',
    en: '<b>Port name</b>: the first argument used in <code>callOutputPort</code>, e.g. <code>"result"</code>',
    ja: '<b>ポート名</b>：<code>callOutputPort</code> の第1引数。例：<code>"result"</code>',
    ko: '<b>포트 이름</b>: <code>callOutputPort</code>에서 사용하는 첫 번째 인수입니다. 예: <code>"result"</code>',
    es: '<b>Nombre del puerto</b>: el primer argumento que se usa en <code>callOutputPort</code>, p. ej. <code>"result"</code>',
    ar: '<b>اسم المنفذ</b>: الوسيط الأول المستخدم في <code>callOutputPort</code>، مثل <code>"result"</code>',
    fr: '<b>Nom du port</b> : le premier argument utilisé dans <code>callOutputPort</code>, par ex. <code>"result"</code>',
    pt: '<b>Nome do porto</b>: o primeiro argumento usado em <code>callOutputPort</code>, por exemplo <code>"result"</code>',
    ru: '<b>Имя порта</b>: первый аргумент в <code>callOutputPort</code>, например <code>"result"</code>'
  },
  outputsLiType: {
    zh: '<b>类型</b>：决定接受的输出值类型，会自动做校验和转换',
    en: '<b>Type</b>: determines the accepted output value type; validation and conversion are automatic',
    ja: '<b>型</b>：受け付ける出力値の型を決めます。検証と変換は自動で行われます',
    ko: '<b>유형</b>: 받을 출력 값 유형을 결정하며 검증과 변환이 자동으로 수행됩니다',
    es: '<b>Tipo</b>: determina el tipo de valor de salida aceptado; la validación y la conversión son automáticas',
    ar: '<b>النوع</b>: يحدد نوع قيمة الإخراج المقبولة، ويتم التحقق والتحويل تلقائيًا',
    fr: '<b>Type</b> : détermine le type de valeur de sortie accepté ; la validation et la conversion sont automatiques',
    pt: '<b>Tipo</b>: determina o tipo de valor de saída aceito; a validação e a conversão são automáticas',
    ru: '<b>Тип</b>: определяет принимаемый тип выходного значения; проверка и преобразование выполняются автоматически'
  },

  // —— callOutputPort 语法 ——
  callTitle: {
    zh: 'callOutputPort 语法',
    en: 'callOutputPort syntax',
    ja: 'callOutputPort の構文',
    ko: 'callOutputPort 구문',
    es: 'Sintaxis de callOutputPort',
    ar: 'بنية callOutputPort',
    fr: 'Syntaxe de callOutputPort',
    pt: 'Sintaxe de callOutputPort',
    ru: 'Синтаксис callOutputPort'
  },
  snippetPortName: {
    zh: '"端口名"',
    en: '"portName"',
    ja: '"ポート名"',
    ko: '"포트명"',
    es: '"nombrePuerto"',
    ar: '"اسم المنفذ"',
    fr: '"nomPort"',
    pt: '"nomePorto"',
    ru: '"имяПорта"'
  },
  snippetValue: {
    zh: '值',
    en: 'value',
    ja: '値',
    ko: '값',
    es: 'valor',
    ar: 'قيمة',
    fr: 'valeur',
    pt: 'valor',
    ru: 'значение'
  },
  callNote: {
    zh: '一次执行里可以调多次，向不同端口各提一次，也可以向同一端口连续提多次（后一次覆盖前一次）。',
    en: 'You can call it multiple times in one execution: submit once to different ports, or submit repeatedly to the same port (the later call overwrites the earlier one).',
    ja: '1回の実行で複数回呼び出せます。異なるポートへそれぞれ提出することも、同じポートへ連続して提出することもできます（後の呼び出しが前のものを上書きします）。',
    ko: '한 번의 실행에서 여러 번 호출할 수 있습니다. 서로 다른 포트에 각각 제출하거나, 같은 포트에 연속으로 여러 번 제출할 수 있습니다 (나중 호출이 이전 것을 덮어씁니다).',
    es: 'Puedes llamarlo varias veces en una misma ejecución: enviar una vez a puertos distintos o enviar repetidamente al mismo puerto (la llamada posterior sobrescribe la anterior).',
    ar: 'يمكنك استدعاؤه عدة مرات في تنفيذ واحد: الإرسال مرة واحدة إلى منافذ مختلفة، أو الإرسال بشكل متكرر إلى المنفذ نفسه (الاستدعاء اللاحق يستبدل السابق).',
    fr: 'Vous pouvez l’appeler plusieurs fois dans une même exécution : soumettre une fois vers différents ports, ou soumettre de façon répétée vers le même port (l’appel suivant écrase le précédent).',
    pt: 'Você pode chamá-lo várias vezes em uma execução: enviar uma vez para portos diferentes ou enviar repetidamente para o mesmo porto (a chamada posterior sobrescreve a anterior).',
    ru: 'Его можно вызывать несколько раз за одно выполнение: отправить по одному разу в разные порты или многократно в один и тот же порт (последующий вызов перезаписывает предыдущий).'
  },

  // —— 示例 ——
  examplesTitle: {
    zh: '示例',
    en: 'Examples',
    ja: '例',
    ko: '예시',
    es: 'Ejemplos',
    ar: 'أمثلة',
    fr: 'Exemples',
    pt: 'Exemplos',
    ru: 'Примеры'
  },
  ex1Label: {
    zh: '例 1：两个 number 输入 → 一个乘积输出',
    en: 'Example 1: two number inputs → one product output',
    ja: '例1：2つの number 入力 → 1つの積出力',
    ko: '예 1: number 입력 2개 → 곱셈 결과 출력 1개',
    es: 'Ejemplo 1: dos entradas number → una salida de producto',
    ar: 'مثال 1: مدخلان number → مخرج حاصل الضرب واحد',
    fr: 'Exemple 1 : deux entrées number → une sortie produit',
    pt: 'Exemplo 1: duas entradas number → uma saída de produto',
    ru: 'Пример 1: два входа number → один выход произведения'
  },
  ex1Comment1: {
    zh: '// 输入端口: price (number), qty (number)',
    en: '// Input ports: price (number), qty (number)',
    ja: '// 入力ポート: price (number), qty (number)',
    ko: '// 입력 포트: price (number), qty (number)',
    es: '// Puertos de entrada: price (number), qty (number)',
    ar: '// منافذ الإدخال: price (number), qty (number)',
    fr: '// Ports d’entrée : price (number), qty (number)',
    pt: '// Portas de entrada: price (number), qty (number)',
    ru: '// Входные порты: price (number), qty (number)'
  },
  ex1Comment2: {
    zh: '// 输出端口: result (number)',
    en: '// Output ports: result (number)',
    ja: '// 出力ポート: result (number)',
    ko: '// 출력 포트: result (number)',
    es: '// Puertos de salida: result (number)',
    ar: '// منافذ الإخراج: result (number)',
    fr: '// Ports de sortie : result (number)',
    pt: '// Portas de saída: result (number)',
    ru: '// Выходные порты: result (number)'
  },
  ex2Label: {
    zh: '例 2：一次执行向多个输出端口提交',
    en: 'Example 2: submit to multiple output ports in one execution',
    ja: '例2：1回の実行で複数の出力ポートへ提出',
    ko: '예 2: 한 번의 실행에서 여러 출력 포트에 제출',
    es: 'Ejemplo 2: enviar a varios puertos de salida en una ejecución',
    ar: 'مثال 2: الإرسال إلى عدة منافذ إخراج في تنفيذ واحد',
    fr: 'Exemple 2 : soumettre vers plusieurs ports de sortie en une exécution',
    pt: 'Exemplo 2: enviar para vários portos de saída em uma execução',
    ru: 'Пример 2: отправка в несколько выходных портов за одно выполнение'
  },
  ex3Label: {
    zh: '例 3：兼容旧写法——直接 return（只提交到第一个输出端口）',
    en: 'Example 3: legacy style — plain return (submits only to the first output port)',
    ja: '例3：旧記法との互換——直接 return（最初の出力ポートにのみ提出）',
    ko: '예 3: 이전 방식 호환 — 직접 return (첫 번째 출력 포트에만 제출)',
    es: 'Ejemplo 3: estilo heredado — return directo (solo envía al primer puerto de salida)',
    ar: 'مثال 3: الأسلوب القديم — return مباشر (يُرسل إلى منفذ الإخراج الأول فقط)',
    fr: 'Exemple 3 : ancien style — return direct (soumet uniquement au premier port de sortie)',
    pt: 'Exemplo 3: estilo antigo — return direto (envia apenas para o primeiro porto de saída)',
    ru: 'Пример 3: старый стиль — прямой return (отправляет только в первый выходной порт)'
  },
  ex4Label: {
    zh: '例 4：读取 File 对象属性',
    en: 'Example 4: read File object properties',
    ja: '例4：File オブジェクトのプロパティを読み取る',
    ko: '예 4: File 객체 속성 읽기',
    es: 'Ejemplo 4: leer propiedades del objeto File',
    ar: 'مثال 4: قراءة خصائص كائن File',
    fr: 'Exemple 4 : lire les propriétés de l’objet File',
    pt: 'Exemplo 4: ler propriedades do objeto File',
    ru: 'Пример 4: чтение свойств объекта File'
  },
  ex4Comment1: {
    zh: '// 输入端口: f (file)',
    en: '// Input ports: f (file)',
    ja: '// 入力ポート: f (file)',
    ko: '// 입력 포트: f (file)',
    es: '// Puertos de entrada: f (file)',
    ar: '// منافذ الإدخال: f (file)',
    fr: '// Ports d’entrée : f (file)',
    pt: '// Portas de entrada: f (file)',
    ru: '// Входные порты: f (file)'
  },
  ex4Comment2: {
    zh: '// 输出端口: name (string), size (number)',
    en: '// Output ports: name (string), size (number)',
    ja: '// 出力ポート: name (string), size (number)',
    ko: '// 출력 포트: name (string), size (number)',
    es: '// Puertos de salida: name (string), size (number)',
    ar: '// منافذ الإخراج: name (string), size (number)',
    fr: '// Ports de sortie : name (string), size (number)',
    pt: '// Portas de saída: name (string), size (number)',
    ru: '// Выходные порты: name (string), size (number)'
  },

  // —— 异步 & await ——
  asyncTitle: {
    zh: '异步 & await 都能 work',
    en: 'Async & await both work',
    ja: '非同期 & await の両方に対応',
    ko: '비동기 & await 모두 지원',
    es: 'Async y await funcionan',
    ar: 'كلٌّ من async و await يعمل',
    fr: 'Async et await fonctionnent tous les deux',
    pt: 'Async e await funcionam',
    ru: 'Асинхронность и await работают'
  },
  asyncBody: {
    zh: '代码节点用 <code>AsyncFunction</code> 构造函数体，所以可以<b>直接写 <code>await</code></b>，也可以用 <code>setTimeout</code> / <code>setInterval</code> 做延迟输出。<code>callOutputPort</code> 的回调引用一直活着，<b>任何时机</b>的调用都能正常触发下游端口 commit。',
    en: 'The Code node builds the function body with <code>AsyncFunction</code>, so you can <b>write <code>await</code> directly</b> and use <code>setTimeout</code> / <code>setInterval</code> for deferred output. The callback reference for <code>callOutputPort</code> stays alive, so calls at <b>any time</b> correctly trigger a downstream port commit.',
    ja: 'コードノードは <code>AsyncFunction</code> で関数本体を構築するため、<b>そのまま <code>await</code> を書けます</b>。また <code>setTimeout</code> / <code>setInterval</code> で遅延出力もできます。<code>callOutputPort</code> のコールバック参照は生き続けるので、<b>どのタイミング</b>の呼び出しでも下流ポートへの commit が正常に発火します。',
    ko: '코드 노드는 <code>AsyncFunction</code>으로 함수 본문을 구성하므로 <b><code>await</code>를 그대로 작성할 수 있고</b>, <code>setTimeout</code> / <code>setInterval</code>로 지연 출력도 할 수 있습니다. <code>callOutputPort</code>의 콜백 참조는 계속 유지되므로 <b>어느 시점</b>의 호출이든 하위 포트 commit이 정상적으로 발생합니다.',
    es: 'El nodo Código construye el cuerpo de la función con <code>AsyncFunction</code>, así que puedes <b>escribir <code>await</code> directamente</b> y usar <code>setTimeout</code> / <code>setInterval</code> para salidas diferidas. La referencia de callback de <code>callOutputPort</code> permanece viva, por lo que las llamadas en <b>cualquier momento</b> disparan correctamente el commit del puerto posterior.',
    ar: 'تبني عقدة الكود جسم الدالة عبر <code>AsyncFunction</code>، لذا يمكنك <b>كتابة <code>await</code> مباشرةً</b>، واستخدام <code>setTimeout</code> / <code>setInterval</code> لإخراج مؤجّل. يظل مرجع الاستدعاء الخاص بـ <code>callOutputPort</code> حيًّا، لذا فإن الاستدعاء في <b>أي وقت</b> يُفعّل commit المنفذ اللاحق بشكل صحيح.',
    fr: 'Le nœud Code construit le corps de la fonction avec <code>AsyncFunction</code>, vous pouvez donc <b>écrire <code>await</code> directement</b> et utiliser <code>setTimeout</code> / <code>setInterval</code> pour une sortie différée. La référence de rappel de <code>callOutputPort</code> reste active, donc les appels à <b>tout moment</b> déclenchent correctement le commit du port en aval.',
    pt: 'O nó Código constrói o corpo da função com <code>AsyncFunction</code>, então você pode <b>escrever <code>await</code> diretamente</b> e usar <code>setTimeout</code> / <code>setInterval</code> para saída atrasada. A referência de callback de <code>callOutputPort</code> permanece ativa, então chamadas em <b>qualquer momento</b> disparam corretamente o commit do porto seguinte.',
    ru: 'Узел «Код» строит тело функции через <code>AsyncFunction</code>, поэтому можно <b>писать <code>await</code> напрямую</b> и использовать <code>setTimeout</code> / <code>setInterval</code> для отложенного вывода. Ссылка на колбэк <code>callOutputPort</code> остаётся живой, поэтому вызовы в <b>любой момент</b> корректно запускают commit последующего порта.'
  },
  asyncEx1Label: {
    zh: '用 await 串行等待',
    en: 'Sequential waiting with await',
    ja: 'await で順次待機',
    ko: 'await로 순차 대기',
    es: 'Espera secuencial con await',
    ar: 'انتظار متسلسل باستخدام await',
    fr: 'Attente séquentielle avec await',
    pt: 'Espera sequencial com await',
    ru: 'Последовательное ожидание через await'
  },
  asyncEx1Comment: {
    zh: '// 等 1 秒后才 commit',
    en: '// commits only after a 1-second wait',
    ja: '// 1秒待ってから commit',
    ko: '// 1초 후에 commit',
    es: '// hace commit tras esperar 1 segundo',
    ar: '// commit بعد انتظار ثانية واحدة',
    fr: '// commit seulement après 1 seconde d’attente',
    pt: '// faz commit após 1 segundo',
    ru: '// commit только через 1 секунду'
  },
  asyncEx2Label: {
    zh: '用 setTimeout 延迟（不阻塞同步代码）',
    en: 'Defer with setTimeout (does not block synchronous code)',
    ja: 'setTimeout で遅延（同期コードをブロックしない）',
    ko: 'setTimeout으로 지연 (동기 코드를 차단하지 않음)',
    es: 'Diferir con setTimeout (no bloquea el código síncrono)',
    ar: 'التأجيل باستخدام setTimeout (لا يحجب الكود المتزامن)',
    fr: 'Différer avec setTimeout (ne bloque pas le code synchrone)',
    pt: 'Adiar com setTimeout (não bloqueia o código síncrono)',
    ru: 'Отложить через setTimeout (не блокирует синхронный код)'
  },
  asyncEx2Comment1: {
    zh: '// 1 秒后 commit，不阻塞下面这行',
    en: '// commits after 1 second, without blocking the next line',
    ja: '// 1秒後に commit。次の行をブロックしない',
    ko: '// 1초 후 commit, 다음 줄을 차단하지 않음',
    es: '// hace commit tras 1 segundo, sin bloquear la siguiente línea',
    ar: '// commit بعد ثانية واحدة، دون حجب السطر التالي',
    fr: '// commit après 1 seconde, sans bloquer la ligne suivante',
    pt: '// faz commit após 1 segundo, sem bloquear a linha seguinte',
    ru: '// commit через 1 секунду, не блокируя следующую строку'
  },
  asyncEx2Comment2: {
    zh: '// 先 commit port2=22，1 秒后被 33 覆盖',
    en: '// commits port2=22 first, then overwritten by 33 after 1 second',
    ja: '// まず port2=22 を commit、1秒後に 33 で上書き',
    ko: '// 먼저 port2=22를 commit, 1초 후 33으로 덮어씀',
    es: '// primero hace commit de port2=22, luego lo sobrescribe 33 tras 1 segundo',
    ar: '// commit لـ port2=22 أولًا، ثم يُستبدل بـ 33 بعد ثانية',
    fr: '// commit d’abord port2=22, puis écrasé par 33 après 1 seconde',
    pt: '// faz commit de port2=22 primeiro, depois sobrescrito por 33 após 1 segundo',
    ru: '// сначала commit port2=22, затем через 1 секунду перезаписывается на 33'
  },
  asyncWarn: {
    zh: '同一个端口被多次 <code>callOutputPort</code> 调用时，后一次会覆盖前一次（端口值按指纹比对）。下游节点会跟着最新值刷新。',
    en: 'When the same port is called by <code>callOutputPort</code> multiple times, the later call overwrites the earlier one (port values are compared by fingerprint). Downstream nodes refresh with the latest value.',
    ja: '同じポートが <code>callOutputPort</code> で複数回呼ばれると、後の呼び出しが前のものを上書きします（ポート値はフィンガープリントで比較されます）。下流ノードは最新値に追随して更新されます。',
    ko: '같은 포트가 <code>callOutputPort</code>로 여러 번 호출되면 나중 호출이 이전 것을 덮어씁니다 (포트 값은 지문으로 비교됩니다). 하위 노드는 최신 값으로 갱신됩니다.',
    es: 'Cuando se llama al mismo puerto varias veces con <code>callOutputPort</code>, la llamada posterior sobrescribe la anterior (los valores de puerto se comparan por huella). Los nodos posteriores se actualizan con el valor más reciente.',
    ar: 'عند استدعاء المنفذ نفسه عدة مرات عبر <code>callOutputPort</code>، يستبدل الاستدعاء اللاحق السابق (تُقارَن قيم المنافذ بالبصمة). تتحدّث العقد اللاحقة بأحدث قيمة.',
    fr: 'Lorsque le même port est appelé plusieurs fois par <code>callOutputPort</code>, l’appel suivant écrase le précédent (les valeurs de port sont comparées par empreinte). Les nœuds en aval se rafraîchissent avec la valeur la plus récente.',
    pt: 'Quando o mesmo porto é chamado várias vezes por <code>callOutputPort</code>, a chamada posterior sobrescreve a anterior (os valores de porto são comparados por impressão digital). Os nós seguintes atualizam com o valor mais recente.',
    ru: 'Когда один и тот же порт вызывается через <code>callOutputPort</code> несколько раз, последующий вызов перезаписывает предыдущий (значения портов сравниваются по отпечатку). Последующие узлы обновляются по последнему значению.'
  }
} satisfies Record<string, LocalizedText>