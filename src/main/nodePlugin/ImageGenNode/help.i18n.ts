import type { LocalizedText } from '../../../shared/language'

/**
 * ImageGen 节点帮助文档（ImageGenHelpDialog）的全部文案，9 种语言全配。
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
    zh: '图片生成节点把上游 <code>prompt</code> 端口传入的提示词发送给已配置的图像模型，按选定尺寸生成一张图片，并从右侧 <code>image</code> 端口输出成图片文件，供下游的图片预览、压缩、文件夹等节点使用。',
    en: 'The Image Generation node sends the prompt received from the upstream <code>prompt</code> port to the configured image model, generates an image at the selected size, and outputs it as an image file from the <code>image</code> port on the right, ready for downstream nodes such as image preview, compress, or folder.',
    ja: '画像生成ノードは、上流の <code>prompt</code> ポートから渡されたプロンプトを設定済みの画像モデルへ送信し、選んだサイズで画像を生成して、右側の <code>image</code> ポートから画像ファイルとして出力します。下流の画像プレビュー・圧縮・フォルダなどのノードで利用できます。',
    ko: '이미지 생성 노드는 상위 <code>prompt</code> 포트에서 들어온 프롬프트를 설정된 이미지 모델로 보내고, 선택한 크기로 이미지를 생성하여 오른쪽 <code>image</code> 포트에서 이미지 파일로 출력합니다. 하위의 이미지 미리보기·압축·폴더 등의 노드에서 사용할 수 있습니다.',
    es: 'El nodo de generación de imágenes envía el prompt recibido del puerto <code>prompt</code> de entrada al modelo de imágenes configurado, genera una imagen con el tamaño elegido y la entrega como archivo de imagen desde el puerto <code>image</code> de la derecha, lista para nodos posteriores como vista previa, compresión o carpeta.',
    ar: 'ترسل عقدة توليد الصور المطالبة الواردة من منفذ <code>prompt</code> العلوي إلى نموذج الصور المُهيّأ، وتولّد صورة بالحجم المختار، ثم تُخرجها كملف صورة من منفذ <code>image</code> على اليمين، لتستخدمها العقد اللاحقة كمعاينة الصور أو الضغط أو المجلد.',
    fr: 'Le nœud de génération d’images envoie le prompt reçu du port <code>prompt</code> en amont au modèle d’images configuré, génère une image à la taille choisie et la fournit sous forme de fichier image depuis le port <code>image</code> à droite, pour les nœuds en aval tels que aperçu d’image, compression ou dossier.',
    pt: 'O nó de geração de imagens envia o prompt recebido do porto <code>prompt</code> de montante ao modelo de imagens configurado, gera uma imagem no tamanho escolhido e a entrega como arquivo de imagem pelo porto <code>image</code> à direita, pronta para nós seguintes como pré-visualização, compressão ou pasta.',
    ru: 'Узел генерации изображений отправляет подсказку, полученную из входного порта <code>prompt</code>, настроенной модели изображений, генерирует изображение выбранного размера и выводит его как файл изображения из порта <code>image</code> справа — для последующих узлов вроде предпросмотра, сжатия или папки.'
  },

  // —— 配置 API Key 与模型 ——
  configTitle: {
    zh: '配置 API Key 与模型',
    en: 'Configuring the API key & model',
    ja: 'API Key とモデルの設定',
    ko: 'API Key 및 모델 설정',
    es: 'Configurar la clave API y el modelo',
    ar: 'ضبط مفتاح API والنموذج',
    fr: 'Configurer la clé API et le modèle',
    pt: 'Configurar a chave de API e o modelo',
    ru: 'Настройка ключа API и модели'
  },
  configLi1: {
    zh: '点标题栏右上角的<b>齿轮</b>图标打开图像设置，选择 Provider、填入 API Key，并按需覆盖模型名',
    en: 'Click the <b>gear</b> icon at the top-right of the header to open image settings; pick a provider, enter an API key, and optionally override the model name',
    ja: 'ヘッダー右上の<b>歯車</b>アイコンをクリックして画像設定を開き、Provider の選択、API Key の入力、必要に応じてモデル名の上書きを行います',
    ko: '헤더 오른쪽 위의 <b>톱니바퀴</b> 아이콘을 클릭해 이미지 설정을 열고, Provider를 선택하고 API Key를 입력한 뒤 필요 시 모델 이름을 덮어씁니다',
    es: 'Haz clic en el icono de <b>engranaje</b> en la esquina superior derecha de la cabecera para abrir los ajustes de imagen; elige un proveedor, introduce la clave API y, si quieres, sobrescribe el nombre del modelo',
    ar: 'انقر على أيقونة <b>الترس</b> في أعلى يمين الترويسة لفتح إعدادات الصور؛ اختر المزوّد، وأدخل مفتاح API، ويمكنك تجاوز اسم النموذج',
    fr: 'Cliquez sur l’icône <b>engrenage</b> en haut à droite de l’en-tête pour ouvrir les réglages d’image ; choisissez un fournisseur, saisissez la clé API et remplacez éventuellement le nom du modèle',
    pt: 'Clique no ícone de <b>engrenagem</b> no canto superior direito do cabeçalho para abrir as configurações de imagem; escolha um provedor, insira a chave de API e, se quiser, substitua o nome do modelo',
    ru: 'Нажмите значок <b>шестерёнки</b> в правом верхнем углу заголовка, чтобы открыть настройки изображений: выберите провайдера, введите ключ API и при необходимости переопределите имя модели'
  },
  configLi2: {
    zh: '内置 4 个 Provider：<code>硅基流动 (SiliconFlow)</code>、<code>OpenAI (DALL·E / GPT-Image)</code>、<code>智谱 (CogView)</code>、<code>阿里云百炼 (通义千问 / 万相)</code>',
    en: 'Four providers are built in: <code>SiliconFlow</code>, <code>OpenAI (DALL·E / GPT-Image)</code>, <code>Zhipu (CogView)</code>, <code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    ja: '4 つの Provider を内蔵：<code>SiliconFlow</code>、<code>OpenAI (DALL·E / GPT-Image)</code>、<code>Zhipu (CogView)</code>、<code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    ko: '4개의 Provider가 내장되어 있습니다: <code>SiliconFlow</code>, <code>OpenAI (DALL·E / GPT-Image)</code>, <code>Zhipu (CogView)</code>, <code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    es: 'Incluye cuatro proveedores: <code>SiliconFlow</code>, <code>OpenAI (DALL·E / GPT-Image)</code>, <code>Zhipu (CogView)</code>, <code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    ar: 'يتضمّن أربعة مزوّدين: <code>SiliconFlow</code> و<code>OpenAI (DALL·E / GPT-Image)</code> و<code>Zhipu (CogView)</code> و<code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    fr: 'Quatre fournisseurs intégrés : <code>SiliconFlow</code>, <code>OpenAI (DALL·E / GPT-Image)</code>, <code>Zhipu (CogView)</code>, <code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    pt: 'Quatro provedores integrados: <code>SiliconFlow</code>, <code>OpenAI (DALL·E / GPT-Image)</code>, <code>Zhipu (CogView)</code>, <code>Alibaba Cloud Model Studio (Qwen / Wan)</code>',
    ru: 'Встроено четыре провайдера: <code>SiliconFlow</code>, <code>OpenAI (DALL·E / GPT-Image)</code>, <code>Zhipu (CogView)</code>, <code>Alibaba Cloud Model Studio (Qwen / Wan)</code>'
  },
  configLi3: {
    zh: 'API Key 保存在本机 localStorage（键名 <code>canvasdesk.image.config</code>），与 LLM 节点的 Key <b>分开存放</b>，不随节点保存',
    en: 'The API key is stored in the local localStorage (key <code>canvasdesk.image.config</code>), kept <b>separately</b> from the LLM node key and not saved with the node',
    ja: 'API Key はローカルの localStorage（キー名 <code>canvasdesk.image.config</code>）に保存され、LLM ノードの Key とは<b>別々に</b>保管され、ノードには保存されません',
    ko: 'API Key는 로컬 localStorage(키 이름 <code>canvasdesk.image.config</code>)에 저장되며, LLM 노드의 Key와 <b>따로 보관</b>되고 노드와 함께 저장되지 않습니다',
    es: 'La clave API se guarda en el localStorage local (clave <code>canvasdesk.image.config</code>), <b>por separado</b> de la del nodo LLM y no se guarda con el nodo',
    ar: 'يُحفظ مفتاح API في localStorage المحلي (المفتاح <code>canvasdesk.image.config</code>) <b>بشكل منفصل</b> عن مفتاح عقدة LLM، ولا يُحفظ مع العقدة',
    fr: 'La clé API est stockée dans le localStorage local (clé <code>canvasdesk.image.config</code>), <b>séparément</b> de celle du nœud LLM, et n’est pas enregistrée avec le nœud',
    pt: 'A chave de API é armazenada no localStorage local (chave <code>canvasdesk.image.config</code>), <b>separada</b> da chave do nó LLM, e não é salva com o nó',
    ru: 'Ключ API хранится в локальном localStorage (ключ <code>canvasdesk.image.config</code>), <b>отдельно</b> от ключа узла LLM, и не сохраняется вместе с узлом'
  },
  configLi4: {
    zh: '不同 Provider / 模型支持的尺寸不同；每个模型列表里的<b>第一个尺寸</b>即默认尺寸，切换模型后尺寸选项与默认值随之变化',
    en: 'Different providers and models support different sizes; the <b>first size</b> in a model’s list is its default, so the size options and the default change when you switch models',
    ja: 'Provider / モデルによって対応サイズは異なります。各モデルの一覧の<b>先頭のサイズ</b>が既定値で、モデルを切り替えるとサイズ候補と既定値も変わります',
    ko: 'Provider/모델마다 지원하는 크기가 다릅니다. 각 모델 목록의 <b>첫 번째 크기</b>가 기본값이며, 모델을 바꾸면 크기 옵션과 기본값도 함께 바뀝니다',
    es: 'Cada proveedor y modelo admite tamaños distintos; el <b>primer tamaño</b> de la lista del modelo es su valor predeterminado, así que al cambiar de modelo cambian las opciones y el valor por defecto',
    ar: 'يختلف دعم الأحجام بين المزوّدين والنماذج؛ و<b>أول حجم</b> في قائمة النموذج هو الحجم الافتراضي، لذا تتغيّر خيارات الحجم والقيمة الافتراضية عند تبديل النموذج',
    fr: 'Le support des tailles varie selon le fournisseur et le modèle ; la <b>première taille</b> de la liste d’un modèle est sa valeur par défaut, donc les options et la valeur par défaut changent quand vous changez de modèle',
    pt: 'Cada provedor e modelo aceita tamanhos diferentes; o <b>primeiro tamanho</b> da lista do modelo é o padrão, então as opções e o valor padrão mudam ao trocar de modelo',
    ru: 'Разные провайдеры и модели поддерживают разные размеры; <b>первый размер</b> в списке модели — значение по умолчанию, поэтому при смене модели меняются и варианты, и значение по умолчанию'
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
  portsLi1: {
    zh: '<code>prompt</code>（输入，字符串）：提示词。本节点<b>没有内部输入框</b>，必须从上游节点连接提供，例如把提示词节点的 <code>text</code> 接过来',
    en: '<code>prompt</code> (input, string): the prompt. This node has <b>no built-in text box</b>, so it must be supplied by an upstream connection — for example, wire a prompt node’s <code>text</code> into it',
    ja: '<code>prompt</code>（入力、文字列）：プロンプト。本ノードには<b>入力欄がなく</b>、上流ノードから接続して渡す必要があります（例：プロンプトノードの <code>text</code> をつなぐ）',
    ko: '<code>prompt</code>(입력, 문자열): 프롬프트. 이 노드에는 <b>입력 상자가 없으므로</b> 상위 노드에서 연결해 제공해야 합니다 (예: 프롬프트 노드의 <code>text</code> 연결)',
    es: '<code>prompt</code> (entrada, cadena): el prompt. Este nodo <b>no tiene cuadro de texto</b>, así que debe llegar por una conexión desde un nodo anterior; por ejemplo, conecta el <code>text</code> de un nodo de prompt',
    ar: '<code>prompt</code> (إدخال، نص): المطالبة. لا يوجد في هذه العقدة <b>مربع إدخال داخلي</b>، لذا يجب توفيرها عبر اتصال من عقدة سابقة، مثل توصيل <code>text</code> من عقدة المطالبة',
    fr: '<code>prompt</code> (entrée, chaîne) : le prompt. Ce nœud <b>n’a pas de zone de saisie</b>, il doit donc être fourni par une connexion amont — par exemple en reliant le <code>text</code> d’un nœud de prompt',
    pt: '<code>prompt</code> (entrada, string): o prompt. Este nó <b>não tem caixa de texto</b>, então precisa vir de uma conexão de montante — por exemplo, ligue o <code>text</code> de um nó de prompt',
    ru: '<code>prompt</code> (вход, строка): подсказка. У этого узла <b>нет поля ввода</b>, поэтому её нужно подавать соединением от предыдущего узла — например, подключите <code>text</code> узла подсказки'
  },
  portsLi2: {
    zh: '<code>size</code>（输入，字符串）：尺寸，如 <code>1024x1024</code>。接了连线时以端口值为准（节点内下拉置灰），未接线时用节点内下拉，仍为空则用当前模型的默认尺寸',
    en: '<code>size</code> (input, string): the size, e.g. <code>1024x1024</code>. When connected the port value wins (the in-node dropdown is greyed out); otherwise the in-node dropdown is used, and if it is still empty the current model’s default size applies',
    ja: '<code>size</code>（入力、文字列）：サイズ（例：<code>1024x1024</code>）。接続がある場合はポート値が優先され（ノード内のプルダウンは無効化）、ない場合はノード内のプルダウンを使い、それも空なら現在のモデルの既定サイズになります',
    ko: '<code>size</code>(입력, 문자열): 크기, 예: <code>1024x1024</code>. 연결되어 있으면 포트 값이 우선하며(노드 내 드롭다운은 비활성화), 연결이 없으면 노드 내 드롭다운을 사용하고 그래도 비어 있으면 현재 모델의 기본 크기를 씁니다',
    es: '<code>size</code> (entrada, cadena): el tamaño, p. ej. <code>1024x1024</code>. Si hay conexión manda el valor del puerto (el desplegable del nodo se atenúa); si no, se usa el desplegable y, si sigue vacío, el tamaño predeterminado del modelo actual',
    ar: '<code>size</code> (إدخال، نص): الحجم، مثل <code>1024x1024</code>. عند وجود اتصال تكون الأولوية لقيمة المنفذ (وتُعطَّل القائمة المنسدلة داخل العقدة)، وإلا تُستخدم القائمة، وإن بقيت فارغة يُطبَّق الحجم الافتراضي للنموذج الحالي',
    fr: '<code>size</code> (entrée, chaîne) : la taille, p. ex. <code>1024x1024</code>. Si une liaison est connectée, la valeur du port prime (la liste du nœud est grisée) ; sinon la liste du nœud est utilisée et, si elle reste vide, la taille par défaut du modèle actuel s’applique',
    pt: '<code>size</code> (entrada, string): o tamanho, p. ex. <code>1024x1024</code>. Com conexão, o valor do porto prevalece (a lista do nó fica esmaecida); sem conexão, usa-se a lista do nó e, se ainda estiver vazia, o tamanho padrão do modelo atual',
    ru: '<code>size</code> (вход, строка): размер, например <code>1024x1024</code>. При наличии соединения приоритет у значения порта (список в узле блокируется); иначе используется список в узле, а если он пуст — размер по умолчанию текущей модели'
  },
  portsLi3: {
    zh: '<code>image</code>（输出，图片文件）：生成成功后提交到这里，下游可接图片预览、压缩、文件夹等节点',
    en: '<code>image</code> (output, image file): committed here after a successful generation; downstream nodes such as image preview, compress, or folder can connect to it',
    ja: '<code>image</code>（出力、画像ファイル）：生成成功後にここへ commit され、下流の画像プレビュー・圧縮・フォルダなどのノードを接続できます',
    ko: '<code>image</code>(출력, 이미지 파일): 생성 성공 후 여기에 commit되며, 하위의 이미지 미리보기·압축·폴더 등의 노드를 연결할 수 있습니다',
    es: '<code>image</code> (salida, archivo de imagen): se confirma aquí tras una generación correcta; pueden conectarse nodos posteriores como vista previa, compresión o carpeta',
    ar: '<code>image</code> (إخراج، ملف صورة): يُثبَّت هنا بعد نجاح التوليد، ويمكن توصيل العقد اللاحقة كمعاينة الصور أو الضغط أو المجلد',
    fr: '<code>image</code> (sortie, fichier image) : validé ici après une génération réussie ; les nœuds en aval comme aperçu d’image, compression ou dossier peuvent s’y connecter',
    pt: '<code>image</code> (saída, arquivo de imagem): confirmado aqui após uma geração bem-sucedida; nós seguintes como pré-visualização, compressão ou pasta podem conectar-se',
    ru: '<code>image</code> (выход, файл изображения): записывается сюда после успешной генерации; к нему можно подключать последующие узлы вроде предпросмотра, сжатия или папки'
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
    zh: '点底部<b>生成</b>按钮手动触发一次生成；生成中按钮禁用并显示「生成中…」',
    en: 'Click the <b>Generate</b> button at the bottom to run once manually; while generating the button is disabled and shows “Generating…”',
    ja: '下部の<b>生成</b>ボタンで手動で1回生成します。生成中はボタンが無効になり「生成中…」と表示されます',
    ko: '하단의 <b>생성</b> 버튼을 클릭해 한 번 수동으로 생성합니다. 생성 중에는 버튼이 비활성화되고 「생성 중…」이 표시됩니다',
    es: 'Haz clic en el botón <b>Generar</b> de abajo para generar una vez manualmente; durante la generación el botón se desactiva y muestra «Generando…»',
    ar: 'انقر على زر <b>توليد</b> أسفل النافذة لتشغيل عملية توليد واحدة يدويًا؛ وأثناء التوليد يُعطَّل الزر وتظهر عبارة «جارٍ التوليد…»',
    fr: 'Cliquez sur le bouton <b>Générer</b> en bas pour lancer une génération manuelle ; pendant la génération le bouton est désactivé et affiche « Génération… »',
    pt: 'Clique no botão <b>Gerar</b> na parte inferior para gerar uma vez manualmente; durante a geração o botão fica desativado e mostra “Gerando…”',
    ru: 'Нажмите кнопку <b>Создать</b> внизу, чтобы вручную запустить генерацию; во время генерации кнопка отключена и показывает «Создание…»'
  },
  runLi2: {
    zh: '图像按张计费，本节点<b>不会自动重算</b>——上游提示词变化只刷新界面，需手动点生成',
    en: 'Images are billed per image, so this node <b>never re-runs automatically</b> — changing the upstream prompt only refreshes the UI; click Generate manually',
    ja: '画像は1枚ごとの課金なので、本ノードは<b>自動で再生成しません</b>。上流のプロンプトが変わっても画面表示が更新されるだけで、手動で生成をクリックします',
    ko: '이미지는 장당 과금되므로 이 노드는 <b>자동으로 다시 생성하지 않습니다</b>. 상위 프롬프트가 바뀌어도 화면만 갱신되며, 직접 생성을 클릭해야 합니다',
    es: 'Las imágenes se facturan por unidad, así que este nodo <b>no se vuelve a ejecutar solo</b>: cambiar el prompt de entrada solo actualiza la interfaz; hay que pulsar Generar',
    ar: 'تُحتسب الصور لكل صورة، لذا <b>لا تُعيد هذه العقدة التوليد تلقائيًا</b> — فتغيير المطالبة الواردة يحدّث الواجهة فقط، وعليك النقر على توليد يدويًا',
    fr: 'Les images sont facturées à l’unité, donc ce nœud <b>ne relance jamais automatiquement</b> — modifier le prompt amont ne fait que rafraîchir l’interface ; cliquez sur Générer',
    pt: 'As imagens são cobradas por unidade, então este nó <b>não reexecuta automaticamente</b> — alterar o prompt de montante apenas atualiza a interface; clique em Gerar',
    ru: 'Изображения тарифицируются поштучно, поэтому узел <b>не перезапускается автоматически</b> — изменение подсказки сверху лишь обновляет интерфейс; нажмите «Создать» вручную'
  },
  runLi3: {
    zh: '提示词为空（仅空白字符）时不发起请求、不消耗额度，界面回到「请连接上游提示词」的等待状态',
    en: 'When the prompt is empty (only whitespace) no request is sent and no quota is used; the UI returns to the “Connect an upstream prompt” waiting state',
    ja: 'プロンプトが空（空白文字のみ）の場合はリクエストを送信せず、課金も発生しません。画面は「上流のプロンプトを接続してください」の待機状態に戻ります',
    ko: '프롬프트가 비어 있으면(공백만 있는 경우) 요청을 보내지 않고 크레딧도 소모하지 않으며, 화면은 「상위 프롬프트를 연결하세요」 대기 상태로 돌아갑니다',
    es: 'Si el prompt está vacío (solo espacios) no se envía ninguna petición ni se consume cuota; la interfaz vuelve al estado de espera «Conecta un prompt de entrada»',
    ar: 'عندما تكون المطالبة فارغة (مسافات فقط) لا يُرسَل أي طلب ولا تُستهلك أي حصة، وتعود الواجهة إلى حالة الانتظار «صِل مطالبة من عقدة سابقة»',
    fr: 'Si le prompt est vide (uniquement des espaces), aucune requête n’est envoyée et aucun quota n’est consommé ; l’interface revient à l’état d’attente « Connectez un prompt amont »',
    pt: 'Se o prompt estiver vazio (apenas espaços), nenhuma requisição é enviada e nenhuma cota é consumida; a interface volta ao estado de espera “Conecte um prompt de montante”',
    ru: 'Если подсказка пуста (только пробелы), запрос не отправляется и квота не расходуется; интерфейс возвращается в состояние ожидания «Подключите подсказку сверху»'
  },
  runLi4: {
    zh: '百炼的异步模型（如万相部分版本）先提交任务再轮询：每 <code>2.5s</code> 查一次，总超时 <code>120s</code>；超时后任务仍在后台执行，可稍后在控制台查看',
    en: 'Alibaba Cloud’s async models (some Wan versions) submit a task then poll: every <code>2.5s</code>, with a <code>120s</code> overall timeout; after a timeout the task keeps running in the background and can be checked later in the console',
    ja: '百錬（Alibaba Cloud）の非同期モデル（一部の Wan 版）はタスクを送信してからポーリングします：<code>2.5s</code> ごとに照会し、全体のタイムアウトは <code>120s</code>。タイムアウト後もタスクはバックグラウンドで継続し、後でコンソールから確認できます',
    ko: 'Alibaba Cloud의 비동기 모델(일부 Wan 버전)은 작업을 제출한 뒤 폴링합니다: <code>2.5s</code>마다 조회하고 전체 타임아웃은 <code>120s</code>입니다. 타임아웃 후에도 작업은 백그라운드에서 계속되며 나중에 콘솔에서 확인할 수 있습니다',
    es: 'Los modelos asíncronos de Alibaba Cloud (algunas versiones de Wan) envían una tarea y luego consultan cada <code>2.5s</code>, con un tiempo límite total de <code>120s</code>; tras el tiempo límite la tarea sigue en segundo plano y puede revisarse luego en la consola',
    ar: 'تُرسل النماذج غير المتزامنة من Alibaba Cloud (بعض إصدارات Wan) مهمة ثم تستعلم دوريًا كل <code>2.5s</code>، بمهلة إجمالية <code>120s</code>؛ وبعد انتهاء المهلة تستمر المهمة في الخلفية ويمكن مراجعتها لاحقًا في لوحة التحكم',
    fr: 'Les modèles asynchrones d’Alibaba Cloud (certaines versions de Wan) soumettent une tâche puis interrogent toutes les <code>2.5s</code>, avec un délai global de <code>120s</code> ; après expiration, la tâche continue en arrière-plan et reste consultable dans la console',
    pt: 'Os modelos assíncronos da Alibaba Cloud (algumas versões do Wan) enviam uma tarefa e depois consultam a cada <code>2.5s</code>, com tempo limite total de <code>120s</code>; após o limite, a tarefa continua em segundo plano e pode ser vista depois no console',
    ru: 'Асинхронные модели Alibaba Cloud (некоторые версии Wan) сначала отправляют задачу, затем опрашивают её каждые <code>2.5s</code> с общим лимитом <code>120s</code>; после тайм-аута задача продолжает выполняться в фоне и доступна в консоли позже'
  },
  runLi5: {
    zh: '并发生成时只保留<b>最新一次</b>的结果，旧请求返回后会被丢弃，不会覆盖新结果',
    en: 'With concurrent generations only the <b>latest</b> result is kept; older responses are discarded and never overwrite the new one',
    ja: '同時生成時は<b>最新の</b>結果のみを保持し、古いリクエストの応答は破棄され新しい結果を上書きしません',
    ko: '동시 생성 시 <b>가장 최근</b> 결과만 유지되며, 이전 요청의 응답은 폐기되어 새 결과를 덮어쓰지 않습니다',
    es: 'Con generaciones simultáneas solo se conserva el resultado <b>más reciente</b>; las respuestas antiguas se descartan y no sobrescriben el nuevo',
    ar: 'عند التوليد المتزامن يُحتفظ بـ<b>أحدث</b> نتيجة فقط، وتُهمَل استجابات الطلبات القديمة ولا تكتب فوق النتيجة الجديدة',
    fr: 'En cas de générations simultanées, seul le résultat <b>le plus récent</b> est conservé ; les anciennes réponses sont ignorées et n’écrasent pas la nouvelle',
    pt: 'Em gerações simultâneas, apenas o resultado <b>mais recente</b> é mantido; respostas antigas são descartadas e não sobrescrevem o novo',
    ru: 'При параллельных генерациях сохраняется только <b>последний</b> результат; ответы старых запросов отбрасываются и не перезаписывают новый'
  },

  // —— 输出与预览 ——
  outputTitle: {
    zh: '输出与预览',
    en: 'Output & preview',
    ja: '出力とプレビュー',
    ko: '출력 및 미리보기',
    es: 'Salida y vista previa',
    ar: 'الإخراج والمعاينة',
    fr: 'Sortie et aperçu',
    pt: 'Saída e pré-visualização',
    ru: 'Вывод и предпросмотр'
  },
  outputLi1: {
    zh: '生成成功后，预览区直接内联显示缩略图，同时从 <code>image</code> 端口把文件提交给下游',
    en: 'After a successful generation the preview area shows the thumbnail inline and the file is committed to downstream nodes from the <code>image</code> port',
    ja: '生成に成功すると、プレビューエリアにサムネイルがインライン表示され、同時に <code>image</code> ポートから下流ノードへファイルが commit されます',
    ko: '생성에 성공하면 미리보기 영역에 썸네일이 인라인으로 표시되고, 동시에 <code>image</code> 포트에서 하위 노드로 파일이 commit됩니다',
    es: 'Tras una generación correcta, la vista previa muestra la miniatura en línea y el archivo se confirma a los nodos posteriores desde el puerto <code>image</code>',
    ar: 'بعد نجاح التوليد تعرض منطقة المعاينة الصورة المصغّرة مباشرة، ويُثبَّت الملف للعقد اللاحقة من منفذ <code>image</code>',
    fr: 'Après une génération réussie, l’aperçu affiche la miniature en ligne et le fichier est validé vers les nœuds en aval depuis le port <code>image</code>',
    pt: 'Após uma geração bem-sucedida, a pré-visualização mostra a miniatura embutida e o arquivo é confirmado aos nós seguintes pelo porto <code>image</code>',
    ru: 'После успешной генерации область предпросмотра показывает миниатюру, а файл передаётся последующим узлам из порта <code>image</code>'
  },
  outputLi2: {
    zh: '各家接口可能返回 base64 或临时 URL；URL 有效期有限，节点会<b>立即下载</b>成文件再提交，不依赖外链',
    en: 'Providers may return base64 or a temporary URL; since URLs expire, the node <b>downloads immediately</b> and commits a local file rather than relying on the external link',
    ja: '各社の API は base64 または一時 URL を返すことがあります。URL は有効期限があるため、ノードは<b>その場でダウンロード</b>してファイル化してから commit し、外部リンクに依存しません',
    ko: '업체 API는 base64 또는 임시 URL을 반환할 수 있습니다. URL은 유효 기간이 짧아 노드가 <b>즉시 다운로드</b>해 파일로 만든 뒤 commit하며, 외부 링크에 의존하지 않습니다',
    es: 'Cada API puede devolver base64 o una URL temporal; como las URL caducan, el nodo <b>descarga de inmediato</b> y confirma un archivo local en vez de depender del enlace externo',
    ar: 'قد تُعيد واجهات المزوّدين base64 أو رابطًا مؤقتًا؛ ولأن صلاحية الروابط محدودة، <b>تُنزّل العقدة الملف فورًا</b> ثم تثبّته، دون الاعتماد على رابط خارجي',
    fr: 'Les API peuvent renvoyer du base64 ou une URL temporaire ; les URL expirant, le nœud <b>télécharge immédiatement</b> pour créer un fichier local au lieu de dépendre du lien externe',
    pt: 'As APIs podem retornar base64 ou uma URL temporária; como as URLs expiram, o nó <b>baixa imediatamente</b> e confirma um arquivo local em vez de depender do link externo',
    ru: 'API могут вернуть base64 или временную ссылку; поскольку ссылки истекают, узел <b>сразу скачивает</b> данные в локальный файл, не полагаясь на внешний URL'
  },
  outputLi3: {
    zh: '失败时预览区转为红色并显示错误信息（如未配置 Key、请求失败、生成超时）',
    en: 'On failure the preview area turns red and shows the error (e.g. missing key, request failed, generation timed out)',
    ja: '失敗するとプレビューエリアが赤くなり、エラー情報（Key 未設定、リクエスト失敗、生成タイムアウトなど）を表示します',
    ko: '실패하면 미리보기 영역이 빨갛게 변하고 오류 정보(Key 미설정, 요청 실패, 생성 시간 초과 등)를 표시합니다',
    es: 'Si falla, la vista previa se pone en rojo y muestra el error (p. ej. clave no configurada, fallo de la petición, tiempo de generación agotado)',
    ar: 'عند الفشل تتحوّل منطقة المعاينة إلى الأحمر وتعرض رسالة الخطأ (مثل عدم ضبط المفتاح، أو فشل الطلب، أو انتهاء مهلة التوليد)',
    fr: 'En cas d’échec, l’aperçu passe au rouge et affiche l’erreur (clé non configurée, échec de la requête, délai de génération dépassé, etc.)',
    pt: 'Em caso de falha, a pré-visualização fica vermelha e mostra o erro (ex.: chave não configurada, falha na requisição, tempo de geração esgotado)',
    ru: 'При ошибке область предпросмотра становится красной и показывает сообщение (например, ключ не настроен, запрос не удался, превышено время генерации)'
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
    en: 'If no key is configured or the key is invalid, it errors out and asks you to configure one first; no output is produced',
    ja: 'Key が未設定または無効な場合はエラーとなり、先に設定するよう促されます。出力は生成されません',
    ko: 'Key가 없거나 유효하지 않으면 오류가 나고 먼저 설정하라는 안내가 표시되며, 출력은 생성되지 않습니다',
    es: 'Si no hay clave o no es válida, se produce un error y se pide configurarla; no se genera salida',
    ar: 'إذا لم يُضبط المفتاح أو كان غير صالح فسيظهر خطأ يطلب ضبطه أولًا، ولن ينتج أي إخراج',
    fr: 'Si aucune clé n’est configurée ou si elle est invalide, une erreur demande de la configurer ; aucune sortie n’est produite',
    pt: 'Se não houver chave ou ela for inválida, ocorre um erro pedindo para configurá-la; nenhuma saída é gerada',
    ru: 'Если ключ не настроен или недействителен, возникает ошибка с просьбой настроить его; вывода не будет'
  },
  notesLi2: {
    zh: '本节点不接收文件拖入，拖放文件到节点上不会生效',
    en: 'This node does not accept file drops; dropping a file onto it has no effect',
    ja: 'このノードはファイルのドロップを受け付けません。ファイルをドロップしても何も起きません',
    ko: '이 노드는 파일 드롭을 받지 않습니다. 파일을 드롭해도 아무 효과가 없습니다',
    es: 'Este nodo no acepta archivos arrastrados; soltar un archivo sobre él no hace nada',
    ar: 'لا تقبل هذه العقدة إفلات الملفات؛ وإفلات ملف عليها لا يؤثر',
    fr: 'Ce nœud n’accepte pas le dépôt de fichiers ; déposer un fichier dessus n’a aucun effet',
    pt: 'Este nó não aceita arquivos arrastados; soltar um arquivo sobre ele não faz nada',
    ru: 'Этот узел не принимает перетаскивание файлов; перетаскивание файла на него ничего не делает'
  },
  notesLi3: {
    zh: '生成结果是<b>本地文件对象</b>，不会随节点状态保存；重新打开工程后需再次点击生成',
    en: 'The result is a <b>local file object</b> and is not saved with the node state; you must generate again after reopening the project',
    ja: '生成結果は<b>ローカルのファイルオブジェクト</b>で、ノードの状態として保存されません。プロジェクトを開き直したら再度生成が必要です',
    ko: '생성 결과는 <b>로컬 파일 객체</b>이며 노드 상태로 저장되지 않습니다. 프로젝트를 다시 열면 생성 버튼을 다시 눌러야 합니다',
    es: 'El resultado es un <b>objeto de archivo local</b> y no se guarda con el estado del nodo; hay que volver a generar al reabrir el proyecto',
    ar: 'النتيجة <b>كائن ملف محلي</b> ولا تُحفظ مع حالة العقدة؛ وعليك التوليد من جديد بعد إعادة فتح المشروع',
    fr: 'Le résultat est un <b>objet fichier local</b> qui n’est pas enregistré avec l’état du nœud ; il faut régénérer après avoir rouvert le projet',
    pt: 'O resultado é um <b>objeto de arquivo local</b> e não é salvo com o estado do nó; é preciso gerar de novo ao reabrir o projeto',
    ru: 'Результат — это <b>локальный файловый объект</b>, он не сохраняется вместе с состоянием узла; после повторного открытия проекта нужно сгенерировать снова'
  },
  notesLi4: {
    zh: '输出的是图片文件类型，可直接连接到图片预览、压缩、文件夹等下游节点',
    en: 'The output is an image-file value that can be connected directly to downstream nodes such as image preview, compress, or folder',
    ja: '出力は画像ファイル型で、画像プレビュー・圧縮・フォルダなどの下流ノードへ直接接続できます',
    ko: '출력은 이미지 파일 타입이므로 이미지 미리보기·압축·폴더 등 하위 노드에 바로 연결할 수 있습니다',
    es: 'La salida es un valor de tipo archivo de imagen y puede conectarse directamente a nodos posteriores como vista previa, compresión o carpeta',
    ar: 'الإخراج من نوع ملف صورة، ويمكن توصيله مباشرة بالعقد اللاحقة كمعاينة الصور أو الضغط أو المجلد',
    fr: 'La sortie est une valeur de type fichier image, connectable directement aux nœuds en aval comme aperçu d’image, compression ou dossier',
    pt: 'A saída é um valor do tipo arquivo de imagem e pode ser conectada diretamente a nós seguintes como pré-visualização, compressão ou pasta',
    ru: 'Выход — значение типа «файл изображения», его можно напрямую подключать к последующим узлам вроде предпросмотра, сжатия или папки'
  }
} satisfies Record<string, LocalizedText>