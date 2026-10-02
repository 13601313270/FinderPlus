import type { LocalizedText } from '../../../shared/language'

/**
 * LLM 节点帮助文档（LLMHelpDialog）的全部文案，9 种语言全配。
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
    zh: '大模型节点把「系统设定」与「用户提示词」发送给已配置的大模型服务，再把模型返回的文本从右侧 <code>text</code> 端口输出给下游节点。',
    en: 'The LLM node sends a system prompt and a user prompt to the configured model service, then outputs the model’s reply as text from the <code>text</code> port on the right to downstream nodes.',
    ja: '大規模言語モデルノードは、「システム設定」と「ユーザープロンプト」を設定済みのモデルサービスへ送信し、モデルが返したテキストを右側の <code>text</code> ポートから下流ノードへ出力します。',
    ko: '대규모 언어 모델 노드는 「시스템 설정」과 「사용자 프롬프트」를 설정된 모델 서비스로 보내고, 모델이 반환한 텍스트를 오른쪽 <code>text</code> 포트에서 하위 노드로 출력합니다.',
    es: 'El nodo de modelo de lenguaje envía el prompt de sistema y el prompt de usuario al servicio de modelo configurado, y luego envía el texto devuelto por el modelo a los nodos posteriores desde el puerto <code>text</code> de la derecha.',
    ar: 'ترسل عقدة النموذج اللغوي «إعداد النظام» و«مطالبة المستخدم» إلى خدمة النموذج المُهيّأة، ثم تُخرج النص الذي أعاده النموذج إلى العقد اللاحقة من منفذ <code>text</code> على اليمين.',
    fr: 'Le nœud de modèle de langage envoie le prompt système et le prompt utilisateur au service de modèle configuré, puis transmet le texte renvoyé par le modèle aux nœuds en aval depuis le port <code>text</code> à droite.',
    pt: 'O nó de modelo de linguagem envia o prompt de sistema e o prompt de usuário ao serviço de modelo configurado e, em seguida, envia o texto retornado pelo modelo aos nós seguintes pelo porto <code>text</code> à direita.',
    ru: 'Узел языковой модели отправляет системную подсказку и пользовательскую подсказку настроенному сервису модели, а затем выводит полученный от модели текст последующим узлам из порта <code>text</code> справа.'
  },

  // —— 模型与 Provider 配置 ——
  configTitle: {
    zh: '模型与 Provider 配置',
    en: 'Model & provider settings',
    ja: 'モデルと Provider の設定',
    ko: '모델 및 Provider 설정',
    es: 'Ajustes de modelo y proveedor',
    ar: 'إعدادات النموذج والمزوّد',
    fr: 'Réglages du modèle et du fournisseur',
    pt: 'Configurações de modelo e provedor',
    ru: 'Настройки модели и провайдера'
  },
  configLi1: {
    zh: '点标题栏右上角的<b>齿轮</b>图标打开 LLM 设置，选择 Provider、填入 API Key，并按需覆盖模型名',
    en: 'Click the <b>gear</b> icon at the top-right of the header to open LLM settings; pick a provider, enter an API key, and optionally override the model name',
    ja: 'ヘッダー右上の<b>歯車</b>アイコンをクリックして LLM 設定を開き、Provider の選択、API Key の入力、必要に応じてモデル名の上書きを行います',
    ko: '헤더 오른쪽 위의 <b>톱니바퀴</b> 아이콘을 클릭해 LLM 설정을 열고, Provider를 선택하고 API Key를 입력한 뒤 필요 시 모델 이름을 덮어씁니다',
    es: 'Haz clic en el icono de <b>engranaje</b> en la esquina superior derecha de la cabecera para abrir los ajustes de LLM; elige un proveedor, introduce la clave API y, si quieres, sobrescribe el nombre del modelo',
    ar: 'انقر على أيقونة <b>الترس</b> في أعلى يمين الترويسة لفتح إعدادات LLM؛ اختر المزوّد، وأدخل مفتاح API، ويمكنك تجاوز اسم النموذج',
    fr: 'Cliquez sur l’icône <b>engrenage</b> en haut à droite de l’en-tête pour ouvrir les réglages LLM ; choisissez un fournisseur, saisissez la clé API et remplacez éventuellement le nom du modèle',
    pt: 'Clique no ícone de <b>engrenagem</b> no canto superior direito do cabeçalho para abrir as configurações de LLM; escolha um provedor, insira a chave de API e, se quiser, substitua o nome do modelo',
    ru: 'Нажмите значок <b>шестерёнки</b> в правом верхнем углу заголовка, чтобы открыть настройки LLM: выберите провайдера, введите ключ API и при необходимости переопределите имя модели'
  },
  configLi2: {
    zh: '内置 9 个 Provider：<code>DeepSeek</code>、<code>OpenAI</code>、<code>Kimi</code>、<code>通义千问</code>、<code>智谱 GLM</code>、<code>MiniMax</code>、<code>Groq</code>、<code>Mistral</code>、<code>硅基流动</code>',
    en: 'Nine providers are built in: <code>DeepSeek</code>, <code>OpenAI</code>, <code>Kimi</code>, <code>Qwen</code>, <code>Zhipu GLM</code>, <code>MiniMax</code>, <code>Groq</code>, <code>Mistral</code>, <code>SiliconFlow</code>',
    ja: '9 つの Provider を内蔵：<code>DeepSeek</code>、<code>OpenAI</code>、<code>Kimi</code>、<code>Qwen</code>、<code>Zhipu GLM</code>、<code>MiniMax</code>、<code>Groq</code>、<code>Mistral</code>、<code>SiliconFlow</code>',
    ko: '9개의 Provider가 내장되어 있습니다: <code>DeepSeek</code>, <code>OpenAI</code>, <code>Kimi</code>, <code>Qwen</code>, <code>Zhipu GLM</code>, <code>MiniMax</code>, <code>Groq</code>, <code>Mistral</code>, <code>SiliconFlow</code>',
    es: 'Incluye nueve proveedores: <code>DeepSeek</code>, <code>OpenAI</code>, <code>Kimi</code>, <code>Qwen</code>, <code>Zhipu GLM</code>, <code>MiniMax</code>, <code>Groq</code>, <code>Mistral</code>, <code>SiliconFlow</code>',
    ar: 'يتضمّن تسعة مزوّدين: <code>DeepSeek</code> و<code>OpenAI</code> و<code>Kimi</code> و<code>Qwen</code> و<code>Zhipu GLM</code> و<code>MiniMax</code> و<code>Groq</code> و<code>Mistral</code> و<code>SiliconFlow</code>',
    fr: 'Neuf fournisseurs intégrés : <code>DeepSeek</code>, <code>OpenAI</code>, <code>Kimi</code>, <code>Qwen</code>, <code>Zhipu GLM</code>, <code>MiniMax</code>, <code>Groq</code>, <code>Mistral</code>, <code>SiliconFlow</code>',
    pt: 'Nove provedores integrados: <code>DeepSeek</code>, <code>OpenAI</code>, <code>Kimi</code>, <code>Qwen</code>, <code>Zhipu GLM</code>, <code>MiniMax</code>, <code>Groq</code>, <code>Mistral</code>, <code>SiliconFlow</code>',
    ru: 'Встроено девять провайдеров: <code>DeepSeek</code>, <code>OpenAI</code>, <code>Kimi</code>, <code>Qwen</code>, <code>Zhipu GLM</code>, <code>MiniMax</code>, <code>Groq</code>, <code>Mistral</code>, <code>SiliconFlow</code>'
  },
  configLi3: {
    zh: '默认 Provider 为 <code>DeepSeek</code>，默认模型 <code>deepseek-flash</code>；模型名留空即使用该 Provider 的默认模型',
    en: 'The default provider is <code>DeepSeek</code> with model <code>deepseek-flash</code>; leaving the model name empty uses that provider’s default',
    ja: '既定の Provider は <code>DeepSeek</code>、既定のモデルは <code>deepseek-flash</code> です。モデル名を空にするとその Provider の既定モデルを使います',
    ko: '기본 Provider는 <code>DeepSeek</code>, 기본 모델은 <code>deepseek-flash</code>입니다. 모델 이름을 비우면 해당 Provider의 기본 모델을 사용합니다',
    es: 'El proveedor predeterminado es <code>DeepSeek</code> con el modelo <code>deepseek-flash</code>; si dejas el nombre del modelo vacío se usa el predeterminado del proveedor',
    ar: 'المزوّد الافتراضي هو <code>DeepSeek</code> والنموذج الافتراضي <code>deepseek-flash</code>؛ وترك اسم النموذج فارغًا يستخدم النموذج الافتراضي لذلك المزوّد',
    fr: 'Le fournisseur par défaut est <code>DeepSeek</code> avec le modèle <code>deepseek-flash</code> ; laisser le nom du modèle vide utilise le modèle par défaut du fournisseur',
    pt: 'O provedor padrão é <code>DeepSeek</code> com o modelo <code>deepseek-flash</code>; deixar o nome do modelo vazio usa o padrão do provedor',
    ru: 'Провайдер по умолчанию — <code>DeepSeek</code> с моделью <code>deepseek-flash</code>; если оставить имя модели пустым, используется модель по умолчанию для провайдера'
  },
  configLi4: {
    zh: 'API Key 保存在本机 localStorage（键名 <code>canvasdesk.llm.config</code>），所有大模型节点<b>共用同一份</b>，不随节点保存',
    en: 'The API key is stored in local localStorage (key <code>canvasdesk.llm.config</code>) and is <b>shared by all</b> LLM nodes; it is not saved with the node',
    ja: 'API Key はローカルの localStorage（キー名 <code>canvasdesk.llm.config</code>）に保存され、すべての大規模言語モデルノードで<b>共有</b>されます。ノードには保存されません',
    ko: 'API Key는 로컬 localStorage(키 이름 <code>canvasdesk.llm.config</code>)에 저장되며 모든 대규모 언어 모델 노드가 <b>하나를 공유</b>합니다. 노드와 함께 저장되지 않습니다',
    es: 'La clave API se guarda en el localStorage local (clave <code>canvasdesk.llm.config</code>) y la <b>comparten todos</b> los nodos de modelo; no se guarda con el nodo',
    ar: 'يُحفظ مفتاح API في localStorage المحلي (المفتاح <code>canvasdesk.llm.config</code>) و<b>تتشاركه جميع</b> عقد النموذج؛ ولا يُحفظ مع العقدة',
    fr: 'La clé API est stockée dans le localStorage local (clé <code>canvasdesk.llm.config</code>) et est <b>partagée par tous</b> les nœuds de modèle ; elle n’est pas enregistrée avec le nœud',
    pt: 'A chave de API é armazenada no localStorage local (chave <code>canvasdesk.llm.config</code>) e é <b>compartilhada por todos</b> os nós de modelo; não é salva com o nó',
    ru: 'Ключ API хранится в локальном localStorage (ключ <code>canvasdesk.llm.config</code>) и <b>общий для всех</b> узлов модели; он не сохраняется вместе с узлом'
  },

  // —— 端口一览 ——
  portsTitle: {
    zh: '端口一览',
    en: 'Ports',
    ja: 'ポート一覧',
    ko: '포트 목록',
    es: 'Puertos',
    ar: 'نظرة على المنافذ',
    fr: 'Ports',
    pt: 'Portas',
    ru: 'Порты'
  },
  portsLead: {
    zh: '节点左侧为输入端口、右侧为输出端口，端口之间只传递字符串。',
    en: 'Inputs are on the left and outputs are on the right; only strings travel between ports.',
    ja: '入力ポートは左側、出力ポートは右側にあり、ポート間では文字列のみを受け渡します。',
    ko: '입력 포트는 왼쪽, 출력 포트는 오른쪽에 있으며 포트 간에는 문자열만 전달됩니다.',
    es: 'Las entradas están a la izquierda y las salidas a la derecha; entre los puertos solo viajan cadenas.',
    ar: 'تقع منافذ الإدخال على اليسار ومنافذ الإخراج على اليمين، ولا تنتقل بين المنافذ سوى النصوص.',
    fr: 'Les entrées sont à gauche et les sorties à droite ; seules des chaînes circulent entre les ports.',
    pt: 'As entradas ficam à esquerda e as saídas à direita; apenas strings trafegam entre os portos.',
    ru: 'Входы слева, выходы справа; между портами передаются только строки.'
  },
  tblHeaderPort: {
    zh: '端口',
    en: 'Port',
    ja: 'ポート',
    ko: '포트',
    es: 'Puerto',
    ar: 'المنفذ',
    fr: 'Port',
    pt: 'Porta',
    ru: 'Порт'
  },
  tblHeaderDir: {
    zh: '方向',
    en: 'Direction',
    ja: '方向',
    ko: '방향',
    es: 'Dirección',
    ar: 'الاتجاه',
    fr: 'Sens',
    pt: 'Direção',
    ru: 'Направление'
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
  dirIn: {
    zh: '输入',
    en: 'Input',
    ja: '入力',
    ko: '입력',
    es: 'Entrada',
    ar: 'إدخال',
    fr: 'Entrée',
    pt: 'Entrada',
    ru: 'Вход'
  },
  dirOut: {
    zh: '输出',
    en: 'Output',
    ja: '出力',
    ko: '출력',
    es: 'Salida',
    ar: 'إخراج',
    fr: 'Sortie',
    pt: 'Saída',
    ru: 'Выход'
  },
  tblSystemDesc: {
    zh: '系统设定。始终取端口值；端口为空时使用默认 system “You are a helpful assistant.”',
    en: 'System prompt. Always taken from the port; when empty, the default “You are a helpful assistant.” is used',
    ja: 'システム設定。常にポート値を使用し、空の場合は既定の “You are a helpful assistant.” を使います',
    ko: '시스템 설정. 항상 포트 값을 사용하며, 비어 있으면 기본 “You are a helpful assistant.”를 사용합니다',
    es: 'Prompt de sistema. Siempre se toma del puerto; si está vacío se usa el valor predeterminado “You are a helpful assistant.”',
    ar: 'إعداد النظام. يُؤخذ دائمًا من المنفذ، وعند الفراغ يُستخدم الافتراضي “You are a helpful assistant.”',
    fr: 'Prompt système. Toujours pris depuis le port ; s’il est vide, la valeur par défaut « You are a helpful assistant. » est utilisée',
    pt: 'Prompt de sistema. Sempre obtido do porto; quando vazio, usa o padrão “You are a helpful assistant.”',
    ru: 'Системная подсказка. Всегда берётся из порта; если пусто, используется значение по умолчанию “You are a helpful assistant.”'
  },
  tblPromptDesc: {
    zh: '用户提示词。接了连线就用端口值（此时节点内输入框隐藏）；没接连线时用节点底部的输入框',
    en: 'User prompt. If an edge is connected, the port value is used (the in-node text box is hidden); otherwise the text box at the bottom of the node is used',
    ja: 'ユーザープロンプト。接続がある場合はポート値を使用し（ノード内の入力欄は非表示）、ない場合はノード下部の入力欄を使います',
    ko: '사용자 프롬프트. 연결이 있으면 포트 값을 사용하며(노드 내 입력 상자는 숨김), 연결이 없으면 노드 하단의 입력 상자를 사용합니다',
    es: 'Prompt de usuario. Si hay una conexión se usa el valor del puerto (el cuadro de texto del nodo se oculta); si no, se usa el cuadro de la parte inferior',
    ar: 'مطالبة المستخدم. عند وجود اتصال تُستخدم قيمة المنفذ (ويُخفى مربع الإدخال في العقدة)، وإلا يُستخدم المربع أسفل العقدة',
    fr: 'Prompt utilisateur. Si une liaison est connectée, la valeur du port est utilisée (la zone de saisie du nœud est masquée) ; sinon, la zone en bas du nœud est utilisée',
    pt: 'Prompt de usuário. Se houver conexão, usa o valor do porto (a caixa de texto do nó fica oculta); caso contrário, usa a caixa na parte inferior do nó',
    ru: 'Пользовательская подсказка. Если есть связь, берётся значение порта (поле ввода в узле скрывается); иначе используется поле внизу узла'
  },
  tblTextDesc: {
    zh: '模型回复。推理成功后提交到这里，下游节点可取用',
    en: 'Model reply. Committed here after a successful call, available to downstream nodes',
    ja: 'モデルの返信。推論成功後にここに commit され、下流ノードから利用できます',
    ko: '모델 응답. 추론 성공 후 여기에 commit되어 하위 노드에서 사용할 수 있습니다',
    es: 'Respuesta del modelo. Se confirma aquí tras una llamada correcta y queda disponible para los nodos posteriores',
    ar: 'رد النموذج. يُثبَّت هنا بعد نجاح الاستدعاء ويكون متاحًا للعقد اللاحقة',
    fr: 'Réponse du modèle. Validée ici après un appel réussi, disponible pour les nœuds en aval',
    pt: 'Resposta do modelo. Confirmada aqui após uma chamada bem-sucedida, disponível aos nós seguintes',
    ru: 'Ответ модели. Записывается сюда после успешного вызова и доступен последующим узлам'
  },

  // —— 执行与状态 ——
  runTitle: {
    zh: '执行与状态',
    en: 'Running & status',
    ja: '実行と状態',
    ko: '실행 및 상태',
    es: 'Ejecución y estado',
    ar: 'التنفيذ والحالة',
    fr: 'Exécution et état',
    pt: 'Execução e estado',
    ru: 'Запуск и состояние'
  },
  runLi1: {
    zh: '点底部<b>发送</b>按钮手动触发一次推理；推理中按钮禁用并显示「推理中…」',
    en: 'Click the <b>Send</b> button at the bottom to run once manually; while running the button is disabled and shows “Thinking…”',
    ja: '下部の<b>送信</b>ボタンで手動で1回推論を実行します。実行中はボタンが無効になり「推理中…」と表示されます',
    ko: '하단의 <b>보내기</b> 버튼을 클릭해 수동으로 한 번 추론합니다. 추론 중에는 버튼이 비활성화되고 「추론 중…」이 표시됩니다',
    es: 'Haz clic en el botón <b>Enviar</b> de abajo para ejecutar una inferencia manualmente; durante la ejecución el botón se desactiva y muestra «Pensando…»',
    ar: 'انقر على زر <b>إرسال</b> أسفل النافذة لتشغيل الاستدلال يدويًا مرة واحدة؛ وأثناء التنفيذ يُعطَّل الزر وتظهر عبارة «جارٍ التفكير…»',
    fr: 'Cliquez sur le bouton <b>Envoyer</b> en bas pour lancer une inférence manuelle ; pendant l’exécution le bouton est désactivé et affiche « Réflexion… »',
    pt: 'Clique no botão <b>Enviar</b> na parte inferior para executar uma inferência manualmente; durante a execução o botão fica desativado e mostra “Pensando…”',
    ru: 'Нажмите кнопку <b>Отправить</b> внизу, чтобы вручную запустить вывод; во время выполнения кнопка отключена и показывает «Думает…»'
  },
  runLi2: {
    zh: '当 <code>prompt</code> 端口接了连线，底部会出现<b>自动调用</b>开关；打开后上游有值到达会自动触发（关闭时需手动点发送）',
    en: 'When the <code>prompt</code> port is connected, an <b>Auto-call</b> switch appears at the bottom; when on, incoming upstream values trigger automatically (when off, click Send manually)',
    ja: '<code>prompt</code> ポートが接続されると、下部に<b>自動呼び出し</b>スイッチが表示されます。オンにすると上流から値が届くと自動で実行され、オフの場合は手動で送信します',
    ko: '<code>prompt</code> 포트가 연결되면 하단에 <b>자동 호출</b> 스위치가 나타납니다. 켜면 상위에서 값이 도착할 때 자동 실행되고, 끄면 수동으로 보내야 합니다',
    es: 'Cuando el puerto <code>prompt</code> está conectado, aparece abajo un interruptor de <b>llamada automática</b>; si está activado, los valores entrantes se ejecutan solos (si está desactivado, pulsa Enviar)',
    ar: 'عند توصيل منفذ <code>prompt</code> يظهر أسفل النافذة مفتاح <b>الاستدعاء التلقائي</b>؛ وعند تشغيله تُنفَّذ القيم الواردة تلقائيًا (وعند إيقافه يجب النقر على إرسال يدويًا)',
    fr: 'Lorsque le port <code>prompt</code> est connecté, un interrupteur <b>Appel automatique</b> apparaît en bas ; activé, les valeurs entrantes déclenchent l’exécution, désactivé, cliquez sur Envoyer',
    pt: 'Quando o porto <code>prompt</code> está conectado, aparece um interruptor de <b>chamada automática</b> na parte inferior; ligado, os valores recebidos disparam sozinhos (desligado, clique em Enviar)',
    ru: 'Когда порт <code>prompt</code> подключён, внизу появляется переключатель <b>Автовызов</b>; включённый — входящие значения запускают вывод автоматически, выключенный — нажимайте «Отправить» вручную'
  },
  runLi3: {
    zh: '上游输入有 <code>300ms</code> 防抖，短时间内连续到达的输入会合并成一次请求',
    en: 'Upstream input is debounced by <code>300ms</code>, so inputs arriving in quick succession are merged into a single request',
    ja: '上流入力には <code>300ms</code> のデバウンスがあり、短時間に連続して届いた入力は1回のリクエストにまとめられます',
    ko: '상위 입력에는 <code>300ms</code> 디바운스가 있어 짧은 시간에 연속 도착한 입력은 하나의 요청으로 합쳐집니다',
    es: 'La entrada posterior tiene un retardo de <code>300ms</code>, por lo que las entradas que llegan seguidas se combinan en una sola petición',
    ar: 'يوجد تأخير <code>300ms</code> على المدخلات الواردة، فتُدمَج المدخلات المتتابعة في طلب واحد',
    fr: 'L’entrée amont est temporisée de <code>300ms</code> ; les entrées arrivant coup sur coup sont fusionnées en une seule requête',
    pt: 'A entrada de montante tem debounce de <code>300ms</code>, então entradas que chegam em sequência são combinadas em uma única requisição',
    ru: 'Входящие данные имеют задержку <code>300ms</code>, поэтому быстро следующие входы объединяются в один запрос'
  },
  runLi4: {
    zh: '并发请求时只保留<b>最新一次</b>的结果，旧请求的响应返回后会被丢弃，不会覆盖新结果',
    en: 'With concurrent requests only the <b>latest</b> result is kept; responses from older requests are discarded and never overwrite the new one',
    ja: '同時実行時は<b>最新の</b>結果のみを保持し、古いリクエストの応答は破棄され新しい結果を上書きしません',
    ko: '동시 요청 시 <b>가장 최근</b> 결과만 유지되며, 이전 요청의 응답은 폐기되어 새 결과를 덮어쓰지 않습니다',
    es: 'Con peticiones simultáneas solo se conserva el resultado <b>más reciente</b>; las respuestas de peticiones antiguas se descartan y no sobrescriben el nuevo',
    ar: 'عند وجود طلبات متزامنة يُحتفظ بـ<b>أحدث</b> نتيجة فقط، وتُهمَل استجابات الطلبات القديمة ولا تكتب فوق النتيجة الجديدة',
    fr: 'En cas de requêtes simultanées, seul le résultat <b>le plus récent</b> est conservé ; les réponses des anciennes requêtes sont ignorées',
    pt: 'Em requisições simultâneas, apenas o resultado <b>mais recente</b> é mantido; respostas de requisições antigas são descartadas',
    ru: 'При параллельных запросах сохраняется только <b>последний</b> результат; ответы старых запросов отбрасываются'
  },
  runLi5: {
    zh: '输出区随状态切换：等待输入、推理中显示转圈、显示结果，出错时显示红色错误信息',
    en: 'The output area changes with the status: waiting for input, a spinner while running, the result, or a red error message',
    ja: '出力エリアは状態に応じて切り替わります：入力待ち、実行中のスピナー、結果、エラー時の赤いメッセージ',
    ko: '출력 영역은 상태에 따라 바뀝니다: 입력 대기, 실행 중 스피너, 결과, 오류 시 빨간 메시지',
    es: 'El área de salida cambia según el estado: esperando entrada, un indicador mientras se ejecuta, el resultado o un mensaje de error en rojo',
    ar: 'تتغيّر منطقة الإخراج حسب الحالة: انتظار الإدخال، أو مؤشر أثناء التنفيذ، أو النتيجة، أو رسالة خطأ بالأحمر',
    fr: 'La zone de sortie change selon l’état : attente d’entrée, indicateur pendant l’exécution, résultat ou message d’erreur en rouge',
    pt: 'A área de saída muda conforme o estado: aguardando entrada, indicador durante a execução, resultado ou mensagem de erro em vermelho',
    ru: 'Область вывода меняется по состоянию: ожидание ввода, индикатор во время выполнения, результат или сообщение об ошибке красным'
  },

  // —— 注意事项 ——
  notesTitle: {
    zh: '注意事项',
    en: 'Notes',
    ja: '注意事項',
    ko: '주의 사항',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Observações',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '未配置 Key 或 Key 无效时会直接报错并提示先配置，不会产生输出',
    en: 'If no key is configured or the key is invalid, it errors out and asks you to configure first; no output is produced',
    ja: 'Key が未設定または無効な場合はエラーとなり、先に設定するよう促されます。出力は生成されません',
    ko: 'Key가 없거나 유효하지 않으면 오류가 나고 먼저 설정하라는 안내가 표시되며, 출력은 생성되지 않습니다',
    es: 'Si no hay clave o no es válida, se produce un error y se pide configurarla; no se genera salida',
    ar: 'إذا لم يُضبط المفتاح أو كان غير صالح فسيظهر خطأ يطلب ضبطه أولًا، ولن ينتج أي إخراج',
    fr: 'Si aucune clé n’est configurée ou si elle est invalide, une erreur demande de la configurer ; aucune sortie n’est produite',
    pt: 'Se não houver chave ou ela for inválida, ocorre um erro pedindo para configurá-la; nenhuma saída é gerada',
    ru: 'Если ключ не настроен или недействителен, возникает ошибка с просьбой настроить его; вывода не будет'
  },
  notesLi2: {
    zh: '提示词为空（仅含空白字符）时不会发起请求，也不会消耗 token',
    en: 'When the prompt is empty (only whitespace), no request is sent and no tokens are consumed',
    ja: 'プロンプトが空（空白文字のみ）の場合はリクエストを送信せず、token も消費しません',
    ko: '프롬프트가 비어 있으면(공백만 있는 경우) 요청을 보내지 않고 토큰도 소비하지 않습니다',
    es: 'Si el prompt está vacío (solo espacios), no se envía ninguna petición ni se consumen tokens',
    ar: 'عندما تكون المطالبة فارغة (مسافات فقط) لا يُرسَل أي طلب ولا تُستهلك أي رموز',
    fr: 'Si le prompt est vide (uniquement des espaces), aucune requête n’est envoyée et aucun token n’est consommé',
    pt: 'Se o prompt estiver vazio (apenas espaços), nenhuma requisição é enviada e nenhum token é consumido',
    ru: 'Если подсказка пуста (только пробелы), запрос не отправляется и токены не расходуются'
  },
  notesLi3: {
    zh: '请求为<b>非流式</b>（<code>stream: false</code>），回复会一次性返回，而不是逐字输出',
    en: 'Requests are <b>non-streaming</b> (<code>stream: false</code>); the reply is returned all at once rather than token by token',
    ja: 'リクエストは<b>非ストリーミング</b>（<code>stream: false</code>）で、返信は一括で返り、逐次出力ではありません',
    ko: '요청은 <b>비스트리밍</b>(<code>stream: false</code>)이며, 응답은 한 번에 반환되고 글자 단위로 출력되지 않습니다',
    es: 'Las peticiones son <b>sin streaming</b> (<code>stream: false</code>); la respuesta llega de una vez, no palabra por palabra',
    ar: 'الطلبات <b>غير متدفقة</b> (<code>stream: false</code>)، فتُعاد الاستجابة دفعة واحدة وليس حرفًا بحرف',
    fr: 'Les requêtes sont <b>non-streaming</b> (<code>stream: false</code>) ; la réponse arrive d’un coup, pas mot à mot',
    pt: 'As requisições são <b>sem streaming</b> (<code>stream: false</code>); a resposta volta de uma vez, não palavra por palavra',
    ru: 'Запросы <b>без потоковой передачи</b> (<code>stream: false</code>); ответ приходит целиком, а не по словам'
  },
  notesLi4: {
    zh: '本节点不接收文件拖入，拖放文件到节点上不会生效',
    en: 'This node does not accept file drops; dropping a file onto it has no effect',
    ja: 'このノードはファイルのドロップを受け付けません。ファイルをドロップしても何も起きません',
    ko: '이 노드는 파일 드롭을 받지 않습니다. 파일을 드롭해도 아무 효과가 없습니다',
    es: 'Este nodo no acepta archivos arrastrados; soltar un archivo sobre él no hace nada',
    ar: 'لا تقبل هذه العقدة إفلات الملفات؛ وإفلات ملف عليها لا يؤثر',
    fr: 'Ce nœud n’accepte pas le dépôt de fichiers ; déposer un fichier dessus n’a aucun effet',
    pt: 'Este nó não aceita arquivos arrastados; soltar um arquivo sobre ele não faz nada',
    ru: 'Этот узел не принимает перетаскивание файлов; перетаскивание файла на него ничего не делает'
  }
} satisfies Record<string, LocalizedText>