import type { LocalizedText } from '../../../shared/language'

/**
 * JsonDisplay 节点帮助文档（JsonDisplayHelpDialog）的全部文案，9 种语言全配。
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
    zh: 'JSON 展示节点把传入的 JSON <b>解析</b>后以折叠树形式可视化，同时把解析结果从右侧 <code>json</code> 端口透传给下游节点。既可以直接喂结构化 JSON，也可以喂 JSON 文本。',
    en: 'The JSON Display node <b>parses</b> the incoming JSON and visualizes it as a collapsible tree, while passing the parsed result to downstream nodes from the <code>json</code> port on the right. You can feed it either structured JSON or JSON text.',
    ja: 'JSON 表示ノードは受け取った JSON を<b>解析</b>して折りたたみツリーで可視化し、解析結果を右側の <code>json</code> ポートから下流ノードへ渡します。構造化 JSON でも JSON テキストでも入力できます。',
    ko: 'JSON 표시 노드는 들어온 JSON을 <b>파싱</b>하여 접이식 트리로 시각화하고, 파싱 결과를 오른쪽 <code>json</code> 포트에서 하위 노드로 전달합니다. 구조화된 JSON과 JSON 텍스트 모두 입력할 수 있습니다.',
    es: 'El nodo Mostrar JSON <b>analiza</b> el JSON entrante y lo visualiza como un árbol plegable, a la vez que pasa el resultado analizado a los nodos posteriores desde el puerto <code>json</code> de la derecha. Puedes darle JSON estructurado o texto JSON.',
    ar: 'تعمل عقدة عرض JSON على <b>تحليل</b> الـ JSON الوارد وعرضه على شكل شجرة قابلة للطي، مع تمرير النتيجة المحلَّلة إلى العقد اللاحقة من منفذ <code>json</code> على اليمين. يمكنك تغذيتها بـ JSON مُهيكل أو نص JSON.',
    fr: 'Le nœud Affichage JSON <b>analyse</b> le JSON entrant et le visualise sous forme d’arbre repliable, tout en transmettant le résultat analysé aux nœuds en aval depuis le port <code>json</code> à droite. Vous pouvez lui fournir du JSON structuré ou du texte JSON.',
    pt: 'O nó Exibir JSON <b>analisa</b> o JSON recebido e o visualiza como uma árvore recolhível, ao mesmo tempo que passa o resultado analisado aos nós seguintes pelo porto <code>json</code> à direita. Você pode alimentá-lo com JSON estruturado ou texto JSON.',
    ru: 'Узел «Отображение JSON» <b>разбирает</b> входящий JSON и показывает его в виде сворачиваемого дерева, а также передаёт результат разбора последующим узлам из порта <code>json</code> справа. На вход можно подавать как структурированный JSON, так и текст JSON.'
  },

  // —— 端口 ——
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
    zh: '左侧 <code>json</code> 输入端口既接受 JSON 文本（<code>StringValue</code>），也接受结构化的 <code>JsonValue</code>',
    en: 'The <code>json</code> input port on the left accepts both JSON text (<code>StringValue</code>) and structured <code>JsonValue</code>',
    ja: '左側の <code>json</code> 入力ポートは、JSON テキスト（<code>StringValue</code>）と構造化された <code>JsonValue</code> の両方を受け付けます',
    ko: '왼쪽 <code>json</code> 입력 포트는 JSON 텍스트(<code>StringValue</code>)와 구조화된 <code>JsonValue</code>를 모두 받습니다',
    es: 'El puerto de entrada <code>json</code> de la izquierda acepta tanto texto JSON (<code>StringValue</code>) como <code>JsonValue</code> estructurado',
    ar: 'يقبل منفذ الإدخال <code>json</code> على اليسار كلاً من نص JSON (<code>StringValue</code>) و<code>JsonValue</code> المُهيكل',
    fr: 'Le port d’entrée <code>json</code> à gauche accepte à la fois du texte JSON (<code>StringValue</code>) et du <code>JsonValue</code> structuré',
    pt: 'O porto de entrada <code>json</code> à esquerda aceita tanto texto JSON (<code>StringValue</code>) quanto <code>JsonValue</code> estruturado',
    ru: 'Входной порт <code>json</code> слева принимает как текст JSON (<code>StringValue</code>), так и структурированный <code>JsonValue</code>'
  },
  portsLi2: {
    zh: '右侧 <code>json</code> 输出端口在解析成功后透传解析得到的 <code>JsonValue</code>，供下游继续处理',
    en: 'After a successful parse, the <code>json</code> output port on the right passes through the resulting <code>JsonValue</code> for downstream processing',
    ja: '解析に成功すると、右側の <code>json</code> 出力ポートは解析結果の <code>JsonValue</code> をそのまま下流へ渡します',
    ko: '파싱에 성공하면 오른쪽 <code>json</code> 출력 포트가 파싱된 <code>JsonValue</code>를 그대로 하위로 전달합니다',
    es: 'Tras un análisis correcto, el puerto de salida <code>json</code> de la derecha pasa el <code>JsonValue</code> resultante para su uso posterior',
    ar: 'بعد نجاح التحليل، يمرّر منفذ الإخراج <code>json</code> على اليمين قيمة <code>JsonValue</code> الناتجة إلى العقد اللاحقة',
    fr: 'Après une analyse réussie, le port de sortie <code>json</code> à droite transmet le <code>JsonValue</code> obtenu aux nœuds en aval',
    pt: 'Após uma análise bem-sucedida, o porto de saída <code>json</code> à direita passa o <code>JsonValue</code> resultante para processamento posterior',
    ru: 'После успешного разбора выходной порт <code>json</code> справа передаёт полученный <code>JsonValue</code> дальше'
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
    zh: '解析结果以<b>折叠树</b>展示：点对象或数组前的 <code>▼</code> / <code>▶</code> 可折叠、展开，逐层查看键值',
    en: 'The result is shown as a <b>collapsible tree</b>: click <code>▼</code> / <code>▶</code> before an object or array to collapse or expand it and inspect the keys level by level',
    ja: '解析結果は<b>折りたたみツリー</b>で表示されます。オブジェクトや配列の前の <code>▼</code> / <code>▶</code> をクリックすると折りたたみ・展開でき、階層ごとにキーと値を確認できます',
    ko: '결과는 <b>접이식 트리</b>로 표시됩니다. 객체나 배열 앞의 <code>▼</code> / <code>▶</code>를 클릭하면 접거나 펼쳐서 단계별로 키와 값을 확인할 수 있습니다',
    es: 'El resultado se muestra como un <b>árbol plegable</b>: haz clic en <code>▼</code> / <code>▶</code> delante de un objeto o arreglo para contraerlo o expandirlo y revisar las claves nivel por nivel',
    ar: 'تُعرض النتيجة كـ<b>شجرة قابلة للطي</b>: انقر على <code>▼</code> / <code>▶</code> قبل كائن أو مصفوفة لطيّه أو توسيعه وفحص المفاتيح طبقةً بطبقة',
    fr: 'Le résultat s’affiche sous forme d’<b>arbre repliable</b> : cliquez sur <code>▼</code> / <code>▶</code> devant un objet ou un tableau pour le replier ou le déplier et parcourir les clés niveau par niveau',
    pt: 'O resultado é exibido como uma <b>árvore recolhível</b>: clique em <code>▼</code> / <code>▶</code> antes de um objeto ou array para recolher ou expandir e inspecionar as chaves nível a nível',
    ru: 'Результат показывается в виде <b>сворачиваемого дерева</b>: нажмите <code>▼</code> / <code>▶</code> перед объектом или массивом, чтобы свернуть или развернуть его и просмотреть ключи по уровням'
  },
  useLi2: {
    zh: '若 JSON 文本无法解析，卡片正文会显示<b>解析失败</b>及具体错误信息，方便定位问题',
    en: 'If the JSON text cannot be parsed, the card body shows a <b>parse failure</b> message along with the specific error to help locate the problem',
    ja: 'JSON テキストを解析できない場合、カード本文に<b>解析失敗</b>と具体的なエラーメッセージが表示され、原因の特定に役立ちます',
    ko: 'JSON 텍스트를 파싱할 수 없으면 카드 본문에 <b>파싱 실패</b>와 구체적인 오류 메시지가 표시되어 원인을 찾는 데 도움이 됩니다',
    es: 'Si el texto JSON no se puede analizar, el cuerpo de la tarjeta muestra un mensaje de <b>fallo de análisis</b> junto con el error concreto para ayudar a localizar el problema',
    ar: 'إذا تعذّر تحليل نص JSON، يعرض متن البطاقة رسالة <b>فشل التحليل</b> مع الخطأ المحدد للمساعدة في تحديد المشكلة',
    fr: 'Si le texte JSON ne peut pas être analysé, le corps de la carte affiche un message d’<b>échec d’analyse</b> avec l’erreur précise pour vous aider à localiser le problème',
    pt: 'Se o texto JSON não puder ser analisado, o corpo do cartão exibe uma mensagem de <b>falha na análise</b> junto com o erro específico para ajudar a localizar o problema',
    ru: 'Если текст JSON не удаётся разобрать, в теле карточки отображается сообщение об <b>ошибке разбора</b> и конкретная ошибка, что помогает найти причину'
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
    zh: '解析失败时输出端口执行 <code>clear()</code>，<b>不向下游传递任何值</b>，避免错误数据扩散',
    en: 'On a parse failure the output port calls <code>clear()</code> and <b>passes no value downstream</b>, preventing bad data from spreading',
    ja: '解析に失敗すると出力ポートは <code>clear()</code> を実行し、<b>下流へ値を渡しません</b>。誤ったデータの拡散を防ぎます',
    ko: '파싱에 실패하면 출력 포트가 <code>clear()</code>를 실행하여 <b>하위로 값을 전달하지 않습니다</b>. 잘못된 데이터가 퍼지는 것을 막습니다',
    es: 'Si el análisis falla, el puerto de salida ejecuta <code>clear()</code> y <b>no pasa ningún valor aguas abajo</b>, evitando que se propague información errónea',
    ar: 'عند فشل التحليل ينفّذ منفذ الإخراج <code>clear()</code> و<b>لا يمرّر أي قيمة إلى العقد اللاحقة</b>، مما يمنع انتشار البيانات الخاطئة',
    fr: 'En cas d’échec d’analyse, le port de sortie exécute <code>clear()</code> et <b>ne transmet aucune valeur en aval</b>, évitant la propagation de données erronées',
    pt: 'Se a análise falhar, o porto de saída executa <code>clear()</code> e <b>não passa nenhum valor adiante</b>, evitando a propagação de dados incorretos',
    ru: 'При ошибке разбора выходной порт вызывает <code>clear()</code> и <b>не передаёт никакого значения дальше</b>, предотвращая распространение неверных данных'
  },
  notesLi2: {
    zh: '输入为空（收到空字符串或空输入）时同样输出 <code>clear()</code>，卡片显示「暂无输入」或「空输入」提示',
    en: 'When the input is empty (an empty string or no input at all), it also calls <code>clear()</code>, and the card shows a “No input yet” or “Empty input” hint',
    ja: '入力が空（空文字列または入力なし）の場合も同様に <code>clear()</code> を実行し、カードに「入力なし」または「空の入力」と表示します',
    ko: '입력이 비어 있으면(빈 문자열이거나 입력 없음) 마찬가지로 <code>clear()</code>를 실행하고, 카드에 “입력 없음” 또는 “빈 입력” 안내가 표시됩니다',
    es: 'Cuando la entrada está vacía (una cadena vacía o ninguna entrada), también se ejecuta <code>clear()</code> y la tarjeta muestra “Sin entrada” o “Entrada vacía”',
    ar: 'عندما يكون الإدخال فارغًا (نص فارغ أو لا يوجد إدخال)، يُنفَّذ <code>clear()</code> أيضًا، وتعرض البطاقة تلميح «لا يوجد إدخال» أو «إدخال فارغ»',
    fr: 'Lorsque l’entrée est vide (chaîne vide ou aucune entrée), <code>clear()</code> est également appelé, et la carte affiche « Aucune entrée » ou « Entrée vide »',
    pt: 'Quando a entrada está vazia (string vazia ou nenhuma entrada), <code>clear()</code> também é executado, e o cartão exibe “Sem entrada” ou “Entrada vazia”',
    ru: 'Если вход пуст (пустая строка или отсутствие входа), также вызывается <code>clear()</code>, и карточка показывает подсказку «Нет входа» или «Пустой ввод»'
  }
} satisfies Record<string, LocalizedText>