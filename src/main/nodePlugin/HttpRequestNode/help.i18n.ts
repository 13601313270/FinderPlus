import type { LocalizedText } from '../../../shared/language'

/**
 * HTTP 请求节点帮助文档（HttpRequestHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片/配置弹窗的短文案变化频繁，帮助文档整篇
 * 体量大且改动少，拆开后两边互不干扰。跟随节点文件夹一起搬运，保持插件自包含。
 *
 * 约定：凡带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。代码块本身（结构、语法高亮 span）留在模板里，
 * 只有其中的注释抽成词条；与语言无关的 HTTP 方法列表、URL 示例、端口标签
 * 也留在模板里。
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
    zh: 'HTTP 请求节点把一条常发的 HTTP / HTTPS 请求<b>保存</b>在节点里，点「发送」执行一次，响应体（字符串）从右侧 <code>text</code> 端口发给下游节点。请求在主进程发出，因此<b>不受渲染进程 CORS 限制</b>，内网服务、自签证书的地址也能访问。',
    en: 'The HTTP Request node <b>saves</b> a frequently used HTTP / HTTPS request in the node. Click “Send” to run it once, and the response body (a string) is sent to downstream nodes from the <code>text</code> port on the right. Requests are issued in the main process, so they are <b>not subject to renderer-process CORS restrictions</b>, and intranet services and self-signed certificate addresses can be accessed too.',
    ja: 'HTTP リクエストノードは、よく使う HTTP / HTTPS リクエストをノード内に<b>保存</b>します。「送信」をクリックすると1回実行され、レスポンス本文（文字列）が右側の <code>text</code> ポートから下流ノードへ送信されます。リクエストはメインプロセスで発行されるため、<b>レンダラープロセスの CORS 制限を受けず</b>、イントラネットのサービスや自己署名証明書のアドレスにもアクセスできます。',
    ko: 'HTTP 요청 노드는 자주 쓰는 HTTP / HTTPS 요청을 노드에 <b>저장</b>합니다. “전송”을 클릭하면 한 번 실행되고, 응답 본문(문자열)이 오른쪽 <code>text</code> 포트에서 하위 노드로 전송됩니다. 요청은 메인 프로세스에서 발송되므로 <b>렌더러 프로세스의 CORS 제약을 받지 않으며</b>, 내부망 서비스나 자체 서명 인증서 주소에도 접근할 수 있습니다.',
    es: 'El nodo Solicitud HTTP <b>guarda</b> una solicitud HTTP / HTTPS frecuente en el nodo. Haz clic en “Enviar” para ejecutarla una vez, y el cuerpo de la respuesta (una cadena) se envía a los nodos posteriores desde el puerto <code>text</code> de la derecha. Las solicitudes se emiten en el proceso principal, por lo que <b>no están sujetas a las restricciones CORS del proceso de renderizado</b>, y también se puede acceder a servicios de intranet y direcciones con certificados autofirmados.',
    ar: 'تحفظ عقدة طلب HTTP طلب HTTP / HTTPS متكررًا داخل العقدة. انقر على «إرسال» لتنفيذه مرة واحدة، ويُرسَل جسم الاستجابة (نص) إلى العقد اللاحقة من منفذ <code>text</code> على اليمين. تُرسَل الطلبات من العملية الرئيسية، لذا فهي <b>غير خاضعة لقيود CORS الخاصة بعملية العرض</b>، ويمكن الوصول أيضًا إلى خدمات الشبكة الداخلية والعناوين ذات الشهادات الموقّعة ذاتيًا.',
    fr: 'Le nœud Requête HTTP <b>enregistre</b> une requête HTTP / HTTPS fréquente dans le nœud. Cliquez sur « Envoyer » pour l’exécuter une fois, et le corps de la réponse (une chaîne) est envoyé aux nœuds en aval depuis le port <code>text</code> à droite. Les requêtes sont émises dans le processus principal, elles ne sont donc <b>pas soumises aux restrictions CORS du processus de rendu</b>, et les services intranet ainsi que les adresses à certificat auto-signé restent accessibles.',
    pt: 'O nó Requisição HTTP <b>salva</b> uma requisição HTTP / HTTPS frequente no nó. Clique em “Enviar” para executá-la uma vez, e o corpo da resposta (uma string) é enviado aos nós seguintes pelo porto <code>text</code> à direita. As requisições são emitidas no processo principal, portanto <b>não estão sujeitas às restrições CORS do processo de renderização</b>, e serviços de intranet e endereços com certificados autoassinados também podem ser acessados.',
    ru: 'Узел «HTTP-запрос» <b>сохраняет</b> часто используемый HTTP / HTTPS-запрос в узле. Нажмите «Отправить», чтобы выполнить его один раз, и тело ответа (строка) отправляется последующим узлам из порта <code>text</code> справа. Запросы выполняются в главном процессе, поэтому <b>не подпадают под ограничения CORS процесса отрисовки</b>, а также доступны сервисы внутренней сети и адреса с самоподписанными сертификатами.'
  },

  // —— 展开 / 收起 ——
  expandTitle: {
    zh: '展开 / 收起',
    en: 'Expand / collapse',
    ja: '展開 / 折りたたみ',
    ko: '펼치기 / 접기',
    es: 'Expandir / contraer',
    ar: 'توسيع / طيّ',
    fr: 'Développer / réduire',
    pt: 'Expandir / recolher',
    ru: 'Развернуть / свернуть'
  },
  expandLi1: {
    zh: '<b>折叠态</b>：只显示「方法 + URL」预览、headers/body 摘要、结果区、发送按钮',
    en: '<b>Collapsed</b>: only shows the “method + URL” preview, a headers/body summary, the result area, and the Send button',
    ja: '<b>折りたたみ状態</b>：「メソッド + URL」のプレビュー、headers/body の概要、結果エリア、送信ボタンのみを表示',
    ko: '<b>접힌 상태</b>: “메서드 + URL” 미리보기, headers/body 요약, 결과 영역, 전송 버튼만 표시',
    es: '<b>Contraído</b>: solo muestra la vista previa de “método + URL”, un resumen de headers/body, el área de resultados y el botón Enviar',
    ar: '<b>الحالة المطويّة</b>: تعرض فقط معاينة «الطريقة + URL»، وملخص headers/body، ومنطقة النتائج، وزر الإرسال',
    fr: '<b>Réduit</b> : affiche uniquement l’aperçu « méthode + URL », un résumé headers/body, la zone de résultat et le bouton Envoyer',
    pt: '<b>Recolhido</b>: mostra apenas a pré-visualização de “método + URL”, um resumo de headers/body, a área de resultado e o botão Enviar',
    ru: '<b>Свёрнутое состояние</b>: отображаются только предпросмотр «метод + URL», сводка headers/body, область результата и кнопка «Отправить»'
  },
  expandLi2: {
    zh: '<b>展开态</b>：点头部的「展开」，额外显示方法下拉、URL 输入、Headers、Body、超时、端口增删',
    en: '<b>Expanded</b>: click “Expand” in the header to additionally show the method dropdown, URL input, Headers, Body, timeout, and port add/remove controls',
    ja: '<b>展開状態</b>：ヘッダーの「展開」をクリックすると、メソッドのドロップダウン、URL 入力、Headers、Body、タイムアウト、ポートの追加/削除が追加で表示されます',
    ko: '<b>펼친 상태</b>: 헤더의 “펼치기”를 클릭하면 메서드 드롭다운, URL 입력, Headers, Body, 타임아웃, 포트 추가/삭제가 추가로 표시됩니다',
    es: '<b>Expandido</b>: haz clic en “Expandir” en el encabezado para mostrar además el desplegable de método, la entrada de URL, Headers, Body, el tiempo de espera y el alta/baja de puertos',
    ar: '<b>الحالة الموسّعة</b>: انقر على «توسيع» في الرأس لعرض قائمة الطريقة المنسدلة، وإدخال URL، وHeaders، وBody، والمهلة، وإضافة/حذف المنافذ',
    fr: '<b>Développé</b> : cliquez sur « Développer » dans l’en-tête pour afficher en plus la liste déroulante de méthode, le champ URL, les Headers, le Body, le délai d’expiration et l’ajout/suppression de ports',
    pt: '<b>Expandido</b>: clique em “Expandir” no cabeçalho para mostrar também a lista suspensa de método, o campo de URL, Headers, Body, o tempo limite e a adição/remoção de portos',
    ru: '<b>Развёрнутое состояние</b>: нажмите «Развернуть» в заголовке, чтобы дополнительно показать раскрывающийся список методов, поле URL, Headers, Body, тайм-аут и добавление/удаление портов'
  },
  expandLi3: {
    zh: '所有编辑控件都是<b>改了直接写回节点</b>，没有草稿态，也不需要额外的保存动作',
    en: 'All editing controls <b>write back to the node immediately</b>; there is no draft state and no extra save action',
    ja: 'すべての編集コントロールは<b>変更がそのままノードに書き戻され</b>、下書き状態も追加の保存操作もありません',
    ko: '모든 편집 컨트롤은 <b>변경 즉시 노드에 기록되며</b>, 초안 상태나 별도의 저장 동작이 없습니다',
    es: 'Todos los controles de edición <b>escriben de inmediato en el nodo</b>; no hay estado de borrador ni una acción de guardado adicional',
    ar: 'تُكتب جميع عناصر التحرير <b>مباشرةً في العقدة عند التغيير</b>، فلا توجد مسودة ولا حاجة إلى إجراء حفظ إضافي',
    fr: 'Tous les contrôles d’édition <b>réécrivent directement dans le nœud</b> ; il n’y a ni brouillon ni action d’enregistrement supplémentaire',
    pt: 'Todos os controles de edição <b>gravam diretamente no nó</b>; não há estado de rascunho nem ação extra de salvar',
    ru: 'Все элементы редактирования <b>записываются в узел сразу при изменении</b>; черновика нет, и дополнительное сохранение не требуется'
  },
  expandLi4: {
    zh: '折叠状态会随场景一起保存，重新打开时保持原样',
    en: 'The collapsed state is saved along with the scene and is preserved when you reopen it',
    ja: '折りたたみ状態はシーンと一緒に保存され、再度開いたときもそのまま保たれます',
    ko: '접힘 상태는 씬과 함께 저장되어 다시 열어도 그대로 유지됩니다',
    es: 'El estado contraído se guarda junto con la escena y se conserva al volver a abrirla',
    ar: 'تُحفَظ حالة الطيّ مع المشهد وتبقى كما هي عند إعادة فتحه',
    fr: 'L’état réduit est enregistré avec la scène et conservé à la réouverture',
    pt: 'O estado recolhido é salvo junto com a cena e permanece igual ao reabri-la',
    ru: 'Свёрнутое состояние сохраняется вместе со сценой и остаётся прежним при повторном открытии'
  },

  // —— 输入端口 & $N 模板 ——
  portsTitle: {
    zh: '输入端口 & $N 模板',
    en: 'Input ports & $N templates',
    ja: '入力ポート & $N テンプレート',
    ko: '입력 포트 & $N 템플릿',
    es: 'Puertos de entrada y plantillas $N',
    ar: 'منافذ الإدخال وقالب $N',
    fr: 'Ports d’entrée et gabarits $N',
    pt: 'Portas de entrada e modelos $N',
    ru: 'Входные порты и шаблоны $N'
  },
  portsLead: {
    zh: 'URL、Headers 的 key / value、Body 都是<b>模板</b>：用 <code>$1</code> <code>$2</code> <code>$3</code> … 引用第 N 个字符串输入端口的值，执行时拼成最终内容。',
    en: 'The URL, the key / value of Headers, and the Body are all <b>templates</b>: use <code>$1</code> <code>$2</code> <code>$3</code> … to reference the value of the Nth string input port, and they are combined into the final content at execution time.',
    ja: 'URL、Headers の key / value、Body はすべて<b>テンプレート</b>です。<code>$1</code> <code>$2</code> <code>$3</code> … で N 番目の文字列入力ポートの値を参照し、実行時に最終的な内容へ組み立てられます。',
    ko: 'URL, Headers의 key / value, Body는 모두 <b>템플릿</b>입니다. <code>$1</code> <code>$2</code> <code>$3</code> … 로 N번째 문자열 입력 포트의 값을 참조하며, 실행 시 최종 내용으로 조합됩니다.',
    es: 'La URL, la key / value de los Headers y el Body son todos <b>plantillas</b>: usa <code>$1</code> <code>$2</code> <code>$3</code> … para referenciar el valor del enésimo puerto de entrada de tipo string, y al ejecutar se combinan en el contenido final.',
    ar: 'إن URL و key / value الخاصة بـ Headers و Body كلها <b>قوالب</b>: استخدم <code>$1</code> <code>$2</code> <code>$3</code> … للإشارة إلى قيمة منفذ الإدخال النصي رقم N، وتُدمج معًا لتكوين المحتوى النهائي عند التنفيذ.',
    fr: 'L’URL, la key / value des Headers et le Body sont tous des <b>gabarits</b> : utilisez <code>$1</code> <code>$2</code> <code>$3</code> … pour référencer la valeur du Nième port d’entrée de type chaîne ; ils sont assemblés en contenu final au moment de l’exécution.',
    pt: 'A URL, a key / value dos Headers e o Body são todos <b>modelos</b>: use <code>$1</code> <code>$2</code> <code>$3</code> … para referenciar o valor do enésimo porto de entrada de string, e eles são combinados no conteúdo final na execução.',
    ru: 'URL, key / value в Headers и Body — это <b>шаблоны</b>: используйте <code>$1</code> <code>$2</code> <code>$3</code> … чтобы сослаться на значение N-го строкового входного порта; при выполнении они собираются в итоговое содержимое.'
  },
  portsLi1: {
    zh: '端口默认 1 个，标签就是 <code>$1</code>、<code>$2</code>…；只接受<b>字符串</b>类型的值',
    en: 'There is 1 port by default, labeled <code>$1</code>, <code>$2</code>…; only <b>string</b> values are accepted',
    ja: 'ポートは既定で1つで、ラベルは <code>$1</code>、<code>$2</code>… です。<b>文字列</b>型の値のみ受け付けます',
    ko: '포트는 기본 1개이며 레이블은 <code>$1</code>, <code>$2</code>… 입니다. <b>문자열</b> 유형의 값만 허용됩니다',
    es: 'Por defecto hay 1 puerto, con la etiqueta <code>$1</code>, <code>$2</code>…; solo se aceptan valores de tipo <b>string</b>',
    ar: 'يوجد منفذ واحد افتراضيًا، وتسميته <code>$1</code> و<code>$2</code>…؛ وتُقبل قيم من نوع <b>نص</b> فقط',
    fr: 'Un seul port par défaut, étiqueté <code>$1</code>, <code>$2</code>… ; seules les valeurs de type <b>chaîne</b> sont acceptées',
    pt: 'Há 1 porto por padrão, rotulado <code>$1</code>, <code>$2</code>…; apenas valores do tipo <b>string</b> são aceitos',
    ru: 'По умолчанию один порт с меткой <code>$1</code>, <code>$2</code>…; принимаются только значения типа <b>строка</b>'
  },
  portsLi2: {
    zh: '所有端口都被占满时会<b>自动新增</b>一个端口；也可以点展开态里的 <code>＋</code> / <code>－</code> 手动增删',
    en: 'When all ports are occupied, a new port is <b>added automatically</b>; you can also use <code>＋</code> / <code>－</code> in the expanded state to add or remove them manually',
    ja: 'すべてのポートが埋まると、ポートが<b>自動的に追加</b>されます。展開状態の <code>＋</code> / <code>－</code> をクリックして手動で増減することもできます',
    ko: '모든 포트가 사용 중이면 포트가 <b>자동으로 추가</b>됩니다. 펼친 상태의 <code>＋</code> / <code>－</code>를 눌러 수동으로 추가/삭제할 수도 있습니다',
    es: 'Cuando todos los puertos están ocupados, se <b>añade uno automáticamente</b>; también puedes usar <code>＋</code> / <code>－</code> en el estado expandido para añadirlos o quitarlos manualmente',
    ar: 'عند امتلاء جميع المنافذ يُضاف منفذ <b>تلقائيًا</b>؛ ويمكنك أيضًا النقر على <code>＋</code> / <code>－</code> في الحالة الموسّعة لإضافة المنافذ أو حذفها يدويًا',
    fr: 'Lorsque tous les ports sont occupés, un port est <b>ajouté automatiquement</b> ; vous pouvez aussi utiliser <code>＋</code> / <code>－</code> dans l’état développé pour les ajouter ou les supprimer manuellement',
    pt: 'Quando todos os portos estiverem ocupados, um porto é <b>adicionado automaticamente</b>; você também pode usar <code>＋</code> / <code>－</code> no estado expandido para adicionar ou remover manualmente',
    ru: 'Когда все порты заняты, порт <b>добавляется автоматически</b>; также можно нажимать <code>＋</code> / <code>－</code> в развёрнутом состоянии, чтобы добавлять и удалять их вручную'
  },
  portsLi3: {
    zh: '只能删<b>末尾</b>端口，且至少保留 1 个',
    en: 'Only the <b>last</b> port can be removed, and at least 1 must remain',
    ja: '<b>末尾</b>のポートのみ削除でき、最低1つは保持する必要があります',
    ko: '<b>마지막</b> 포트만 삭제할 수 있으며 최소 1개는 유지해야 합니다',
    es: 'Solo se puede eliminar el <b>último</b> puerto, y debe quedar al menos 1',
    ar: 'يمكن حذف المنفذ <b>الأخير</b> فقط، مع الإبقاء على منفذ واحد على الأقل',
    fr: 'Seul le port <b>final</b> peut être supprimé, et au moins 1 doit rester',
    pt: 'Apenas o porto <b>final</b> pode ser removido, e pelo menos 1 deve permanecer',
    ru: 'Удалить можно только <b>последний</b> порт, и хотя бы один должен остаться'
  },
  portsLi4: {
    zh: '占位符没有对应端口、或该端口当前没值时，替换为<b>空串</b>',
    en: 'If a placeholder has no matching port, or that port has no value, it is replaced with an <b>empty string</b>',
    ja: 'プレースホルダーに対応するポートがない、またはそのポートに現在値がない場合は<b>空文字列</b>に置き換えられます',
    ko: '자리 표시자에 대응하는 포트가 없거나 해당 포트에 현재 값이 없으면 <b>빈 문자열</b>로 대체됩니다',
    es: 'Si un marcador no tiene un puerto correspondiente, o ese puerto no tiene valor actualmente, se sustituye por una <b>cadena vacía</b>',
    ar: 'إذا لم يكن للعنصر النائب منفذ مقابل، أو لم تكن لذلك المنفذ قيمة حاليًا، فيُستبدل بـ<b>نص فارغ</b>',
    fr: 'Si un espace réservé n’a pas de port correspondant, ou si ce port n’a pas de valeur, il est remplacé par une <b>chaîne vide</b>',
    pt: 'Se um marcador não tiver um porto correspondente, ou esse porto não tiver valor no momento, ele é substituído por uma <b>string vazia</b>',
    ru: 'Если у плейсхолдера нет соответствующего порта или у этого порта сейчас нет значения, он заменяется на <b>пустую строку</b>'
  },
  portsLi5: {
    zh: '想输出字面量的 <code>$</code>，写成 <code>$$</code>',
    en: 'To output a literal <code>$</code>, write <code>$$</code>',
    ja: 'リテラルの <code>$</code> を出力したい場合は <code>$$</code> と書きます',
    ko: '리터럴 <code>$</code>를 출력하려면 <code>$$</code>로 작성하세요',
    es: 'Para generar un <code>$</code> literal, escribe <code>$$</code>',
    ar: 'لإخراج <code>$</code> حرفي، اكتب <code>$$</code>',
    fr: 'Pour produire un <code>$</code> littéral, écrivez <code>$$</code>',
    pt: 'Para gerar um <code>$</code> literal, escreva <code>$$</code>',
    ru: 'Чтобы вывести литерал <code>$</code>, напишите <code>$$</code>'
  },
  portsExampleLabel: {
    zh: '例：$1 是用户 id，$2 是 token',
    en: 'Example: $1 is the user id, $2 is the token',
    ja: '例：$1 はユーザー id、$2 は token',
    ko: '예: $1은 사용자 id, $2는 token',
    es: 'Ejemplo: $1 es el id de usuario, $2 es el token',
    ar: 'مثال: $1 هو معرّف المستخدم، و$2 هو الرمز token',
    fr: 'Exemple : $1 est l’id utilisateur, $2 est le token',
    pt: 'Exemplo: $1 é o id do usuário, $2 é o token',
    ru: 'Пример: $1 — идентификатор пользователя, $2 — токен'
  },
  portsComment1: {
    zh: '// URL 模板',
    en: '// URL template',
    ja: '// URL テンプレート',
    ko: '// URL 템플릿',
    es: '// Plantilla de URL',
    ar: '// قالب URL',
    fr: '// Gabarit d’URL',
    pt: '// Modelo de URL',
    ru: '// Шаблон URL'
  },
  portsComment2: {
    zh: '// Headers 里的一条',
    en: '// One entry in Headers',
    ja: '// Headers の1項目',
    ko: '// Headers의 항목 하나',
    es: '// Una entrada de Headers',
    ar: '// عنصر واحد في Headers',
    fr: '// Une entrée dans Headers',
    pt: '// Uma entrada em Headers',
    ru: '// Одна запись в Headers'
  },

  // —— 请求配置 ——
  configTitle: {
    zh: '请求配置',
    en: 'Request settings',
    ja: 'リクエスト設定',
    ko: '요청 설정',
    es: 'Configuración de la solicitud',
    ar: 'إعدادات الطلب',
    fr: 'Configuration de la requête',
    pt: 'Configurações da requisição',
    ru: 'Настройки запроса'
  },
  tblHeaderItem: {
    zh: '项',
    en: 'Item',
    ja: '項目',
    ko: '항목',
    es: 'Elemento',
    ar: 'العنصر',
    fr: 'Élément',
    pt: 'Item',
    ru: 'Пункт'
  },
  tblHeaderDesc: {
    zh: '说明',
    en: 'Description',
    ja: '説明',
    ko: '설명',
    es: 'Descripción',
    ar: 'الوصف',
    fr: 'Description',
    pt: 'Descrição',
    ru: 'Описание'
  },
  tblMethodLabel: {
    zh: '<b>方法</b>',
    en: '<b>Method</b>',
    ja: '<b>メソッド</b>',
    ko: '<b>메서드</b>',
    es: '<b>Método</b>',
    ar: '<b>الطريقة</b>',
    fr: '<b>Méthode</b>',
    pt: '<b>Método</b>',
    ru: '<b>Метод</b>'
  },
  tblHeadersLabel: {
    zh: '<b>Headers</b>',
    en: '<b>Headers</b>',
    ja: '<b>Headers</b>',
    ko: '<b>Headers</b>',
    es: '<b>Headers</b>',
    ar: '<b>Headers</b>',
    fr: '<b>Headers</b>',
    pt: '<b>Headers</b>',
    ru: '<b>Headers</b>'
  },
  tblHeadersDesc: {
    zh: 'KV 列表逐条编辑；<b>key 为空</b>的条目会被跳过，value 允许空串',
    en: 'Edit the KV list entry by entry; entries with an <b>empty key</b> are skipped, and the value may be an empty string',
    ja: 'KV リストを1件ずつ編集します。<b>key が空</b>の項目はスキップされ、value は空文字列を許可します',
    ko: 'KV 목록을 항목별로 편집합니다. <b>key가 비어 있는</b> 항목은 건너뛰며, value는 빈 문자열을 허용합니다',
    es: 'Edita la lista KV entrada por entrada; las entradas con <b>key vacía</b> se omiten, y el value puede ser una cadena vacía',
    ar: 'حرّر قائمة KV عنصرًا بعنصر؛ وتُتجاهل العناصر ذات <b>key الفارغ</b>، ويُسمح بأن يكون value نصًا فارغًا',
    fr: 'Modifiez la liste KV entrée par entrée ; les entrées dont la <b>key est vide</b> sont ignorées, et la value peut être une chaîne vide',
    pt: 'Edite a lista KV entrada por entrada; entradas com <b>key vazia</b> são ignoradas, e o value pode ser uma string vazia',
    ru: 'Редактируйте список KV запись за записью; записи с <b>пустым key</b> пропускаются, а value может быть пустой строкой'
  },
  tblBodyLabel: {
    zh: '<b>Body</b>',
    en: '<b>Body</b>',
    ja: '<b>Body</b>',
    ko: '<b>Body</b>',
    es: '<b>Body</b>',
    ar: '<b>Body</b>',
    fr: '<b>Body</b>',
    pt: '<b>Body</b>',
    ru: '<b>Body</b>'
  },
  tblBodyDesc: {
    zh: '<code>GET</code> / <code>HEAD</code> 不带 body（输入框置灰，执行时也跳过）；其余方法原样发送',
    en: '<code>GET</code> / <code>HEAD</code> carry no body (the input is grayed out and skipped at execution); other methods send it as-is',
    ja: '<code>GET</code> / <code>HEAD</code> は body を持ちません（入力欄はグレー表示になり、実行時もスキップされます）。その他のメソッドはそのまま送信します',
    ko: '<code>GET</code> / <code>HEAD</code>는 body를 사용하지 않습니다 (입력란이 회색으로 표시되고 실행 시에도 건너뜁니다). 나머지 메서드는 그대로 전송합니다',
    es: '<code>GET</code> / <code>HEAD</code> no llevan body (el campo se muestra atenuado y se omite al ejecutar); los demás métodos lo envían tal cual',
    ar: 'لا تحمل <code>GET</code> / <code>HEAD</code> جسمًا (يُعطّل حقل الإدخال ويُتخطى عند التنفيذ)؛ أما بقية الطرق فترسله كما هو',
    fr: '<code>GET</code> / <code>HEAD</code> n’ont pas de body (le champ est grisé et ignoré à l’exécution) ; les autres méthodes l’envoient tel quel',
    pt: '<code>GET</code> / <code>HEAD</code> não têm body (o campo fica esmaecido e é ignorado na execução); os demais métodos o enviam como está',
    ru: '<code>GET</code> / <code>HEAD</code> не передают body (поле неактивно и пропускается при выполнении); остальные методы отправляют его как есть'
  },
  tblTimeoutLabel: {
    zh: '<b>超时</b>',
    en: '<b>Timeout</b>',
    ja: '<b>タイムアウト</b>',
    ko: '<b>타임아웃</b>',
    es: '<b>Tiempo de espera</b>',
    ar: '<b>المهلة</b>',
    fr: '<b>Délai d’expiration</b>',
    pt: '<b>Tempo limite</b>',
    ru: '<b>Тайм-аут</b>'
  },
  tblTimeoutDesc: {
    zh: '毫秒，取值会被夹到 <code>1000</code>–<code>60000</code>，默认 <code>15000</code>',
    en: 'Milliseconds; the value is clamped to <code>1000</code>–<code>60000</code>, default <code>15000</code>',
    ja: 'ミリ秒。値は <code>1000</code>–<code>60000</code> に丸められ、既定値は <code>15000</code> です',
    ko: '밀리초이며, 값은 <code>1000</code>–<code>60000</code>으로 제한되고 기본값은 <code>15000</code>입니다',
    es: 'Milisegundos; el valor se ajusta a <code>1000</code>–<code>60000</code>, por defecto <code>15000</code>',
    ar: 'بالميلي ثانية، وتُقيَّد القيمة بين <code>1000</code> و<code>60000</code>، والقيمة الافتراضية <code>15000</code>',
    fr: 'Millisecondes ; la valeur est limitée à <code>1000</code>–<code>60000</code>, par défaut <code>15000</code>',
    pt: 'Milissegundos; o valor é limitado a <code>1000</code>–<code>60000</code>, padrão <code>15000</code>',
    ru: 'Миллисекунды; значение ограничивается диапазоном <code>1000</code>–<code>60000</code>, по умолчанию <code>15000</code>'
  },

  // —— 执行与结果 ——
  execTitle: {
    zh: '执行与结果',
    en: 'Execution and results',
    ja: '実行と結果',
    ko: '실행과 결과',
    es: 'Ejecución y resultados',
    ar: 'التنفيذ والنتائج',
    fr: 'Exécution et résultats',
    pt: 'Execução e resultados',
    ru: 'Выполнение и результат'
  },
  execLi1: {
    zh: '点「发送」执行，URL 为空时按钮不可点',
    en: 'Click “Send” to run; the button is disabled when the URL is empty',
    ja: '「送信」をクリックして実行します。URL が空のときはボタンを押せません',
    ko: '“전송”을 클릭하여 실행하며, URL이 비어 있으면 버튼을 누를 수 없습니다',
    es: 'Haz clic en “Enviar” para ejecutar; el botón se desactiva cuando la URL está vacía',
    ar: 'انقر على «إرسال» للتنفيذ، ويكون الزر معطّلًا عندما يكون URL فارغًا',
    fr: 'Cliquez sur « Envoyer » pour exécuter ; le bouton est désactivé si l’URL est vide',
    pt: 'Clique em “Enviar” para executar; o botão fica desativado quando a URL está vazia',
    ru: 'Нажмите «Отправить» для выполнения; кнопка недоступна, если URL пуст'
  },
  execLi2: {
    zh: '执行中按钮显示「发送中…」，同一个节点不会并发重复触发',
    en: 'While running, the button shows “Sending…”, and the same node will not be triggered concurrently',
    ja: '実行中はボタンに「送信中…」と表示され、同じノードが同時に重複して発火することはありません',
    ko: '실행 중에는 버튼에 “전송 중…”이 표시되며, 같은 노드가 동시에 중복 실행되지 않습니다',
    es: 'Durante la ejecución, el botón muestra “Enviando…”, y el mismo nodo no se dispara de forma concurrente',
    ar: 'أثناء التنفيذ يعرض الزر «جارٍ الإرسال…»، ولن تُشغَّل العقدة نفسها بشكل متزامن ومتكرر',
    fr: 'Pendant l’exécution, le bouton affiche « Envoi… », et un même nœud ne sera pas déclenché de façon concurrente',
    pt: 'Durante a execução, o botão mostra “Enviando…”, e o mesmo nó não é disparado de forma concorrente',
    ru: 'Во время выполнения кнопка показывает «Отправка…», и один и тот же узел не запускается параллельно повторно'
  },
  execLi3: {
    zh: '返回后结果区显示<b>状态码 + 响应体</b>，并同时把响应体提交到输出端口',
    en: 'After it returns, the result area shows the <b>status code + response body</b>, and the response body is also submitted to the output port',
    ja: '戻ると結果エリアに<b>ステータスコード + レスポンス本文</b>が表示され、同時にレスポンス本文が出力ポートへ提出されます',
    ko: '반환되면 결과 영역에 <b>상태 코드 + 응답 본문</b>이 표시되고, 동시에 응답 본문이 출력 포트로 제출됩니다',
    es: 'Al volver, el área de resultados muestra el <b>código de estado + el cuerpo de la respuesta</b>, y el cuerpo de la respuesta se envía también al puerto de salida',
    ar: 'بعد العودة تعرض منطقة النتائج <b>رمز الحالة + جسم الاستجابة</b>، ويُرسَل جسم الاستجابة أيضًا إلى منفذ الإخراج',
    fr: 'Au retour, la zone de résultat affiche le <b>code d’état + le corps de la réponse</b>, et le corps de la réponse est aussi soumis au port de sortie',
    pt: 'Ao retornar, a área de resultado mostra o <b>código de status + o corpo da resposta</b>, e o corpo da resposta também é enviado ao porto de saída',
    ru: 'После возврата в области результата отображаются <b>код состояния + тело ответа</b>, и тело ответа также передаётся в выходной порт'
  },
  execLi4: {
    zh: 'HTTP <b>4xx / 5xx 也算请求完成</b>：状态码用告警色显示，响应体照样发给下游',
    en: 'HTTP <b>4xx / 5xx also count as a completed request</b>: the status code is shown in a warning color, and the response body is still sent downstream',
    ja: 'HTTP <b>4xx / 5xx もリクエスト完了とみなします</b>。ステータスコードは警告色で表示され、レスポンス本文はそのまま下流へ送られます',
    ko: 'HTTP <b>4xx / 5xx도 요청 완료로 간주합니다</b>. 상태 코드는 경고색으로 표시되고, 응답 본문은 그대로 하위로 전송됩니다',
    es: 'HTTP <b>4xx / 5xx también cuentan como solicitud completada</b>: el código de estado se muestra en color de advertencia y el cuerpo de la respuesta se envía igualmente a los nodos posteriores',
    ar: 'تُعدّ <b>4xx / 5xx أيضًا طلبًا مكتملًا</b>: يُعرض رمز الحالة بلون تحذيري، ويُرسَل جسم الاستجابة إلى العقد اللاحقة كما هو',
    fr: 'Les <b>4xx / 5xx comptent aussi comme requête terminée</b> : le code d’état s’affiche dans une couleur d’avertissement et le corps de la réponse est tout de même envoyé en aval',
    pt: 'Os <b>4xx / 5xx também contam como requisição concluída</b>: o código de status é exibido em cor de alerta e o corpo da resposta é enviado aos nós seguintes mesmo assim',
    ru: '<b>4xx / 5xx также считаются завершённым запросом</b>: код состояния отображается предупреждающим цветом, а тело ответа всё равно отправляется далее'
  },
  execLi5: {
    zh: '只有网络层失败（DNS 解析失败、超时、断网等）才标红为「网络错误」，此时<b>不提交</b>输出值',
    en: 'Only network-layer failures (DNS resolution failure, timeout, no connectivity, etc.) are highlighted in red as a “network error”; in that case the output value is <b>not submitted</b>',
    ja: 'ネットワーク層の失敗（DNS 解決失敗、タイムアウト、切断など）のみが「ネットワークエラー」として赤く表示され、その場合は出力値が<b>提出されません</b>',
    ko: '네트워크 계층 실패(DNS 확인 실패, 타임아웃, 연결 끊김 등)만 “네트워크 오류”로 빨갛게 표시되며, 이때는 출력 값이 <b>제출되지 않습니다</b>',
    es: 'Solo los fallos de la capa de red (error de resolución DNS, tiempo de espera, falta de conexión, etc.) se marcan en rojo como “error de red”; en ese caso el valor de salida <b>no se envía</b>',
    ar: 'تُعلَّم بالإطار الأحمر حالات «خطأ الشبكة» فقط عند فشل طبقة الشبكة (فشل تحليل DNS، أو المهلة، أو انقطاع الاتصال، إلخ)؛ وفي هذه الحالة <b>لا تُرسَل</b> قيمة الإخراج',
    fr: 'Seules les défaillances de la couche réseau (échec de résolution DNS, délai d’expiration, absence de connexion, etc.) sont signalées en rouge comme « erreur réseau » ; dans ce cas la valeur de sortie <b>n’est pas soumise</b>',
    pt: 'Somente falhas da camada de rede (falha na resolução de DNS, tempo limite, falta de conexão etc.) são marcadas em vermelho como “erro de rede”; nesse caso o valor de saída <b>não é enviado</b>',
    ru: 'Только сбои сетевого уровня (ошибка разрешения DNS, тайм-аут, отсутствие подключения и т. п.) выделяются красным как «сетевая ошибка»; в этом случае выходное значение <b>не передаётся</b>'
  },
  execWarn: {
    zh: '每点一次「发送」就是一次<b>真实的网络请求</b>，节点不做任何缓存或去重。对接会产生副作用的接口（下单、发消息等）时注意。',
    en: 'Each click on “Send” is a <b>real network request</b>, and the node does no caching or deduplication. Be careful when integrating with endpoints that have side effects (placing orders, sending messages, etc.).',
    ja: '「送信」を1回クリックするたびに<b>実際のネットワークリクエスト</b>が発生し、ノードはキャッシュや重複排除を行いません。副作用を伴う API（注文、メッセージ送信など）と連携する際は注意してください。',
    ko: '“전송”을 한 번 누를 때마다 <b>실제 네트워크 요청</b>이 발생하며, 노드는 어떤 캐싱이나 중복 제거도 하지 않습니다. 부작용이 있는 API(주문, 메시지 발송 등)와 연동할 때 주의하세요.',
    es: 'Cada clic en “Enviar” es una <b>solicitud de red real</b>, y el nodo no hace ningún almacenamiento en caché ni deduplicación. Ten cuidado al integrarte con API que producen efectos secundarios (realizar pedidos, enviar mensajes, etc.).',
    ar: 'كل نقرة على «إرسال» هي <b>طلب شبكة حقيقي</b>، ولا تُجري العقدة أي تخزين مؤقت أو إزالة تكرار. احترس عند التكامل مع واجهات تُحدث آثارًا جانبية (إنشاء طلبات، إرسال رسائل، إلخ).',
    fr: 'Chaque clic sur « Envoyer » est une <b>véritable requête réseau</b>, et le nœud ne fait aucune mise en cache ni déduplication. Soyez prudent lorsque vous vous connectez à des API ayant des effets de bord (passer commande, envoyer des messages, etc.).',
    pt: 'Cada clique em “Enviar” é uma <b>requisição de rede real</b>, e o nó não faz nenhum cache ou deduplicação. Tenha cuidado ao integrar com APIs que causam efeitos colaterais (fazer pedidos, enviar mensagens etc.).',
    ru: 'Каждое нажатие «Отправить» — это <b>реальный сетевой запрос</b>, и узел не выполняет кэширование или дедупликацию. Будьте осторожны при интеграции с интерфейсами, вызывающими побочные эффекты (оформление заказа, отправка сообщений и т. п.).'
  }
} satisfies Record<string, LocalizedText>