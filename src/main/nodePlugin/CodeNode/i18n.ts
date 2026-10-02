import type { LocalizedText } from '../../../shared/language'

/**
 * Code 节点卡片（主视图 + 配置弹窗）内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 *
 * 注：代码示例里的 "端口名" / 值 属于展示文案，一并按语言替换为 portName / value。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)',
    ja: 'ノードをドラッグ（ヘッダー全体がドラッグ可能）',
    ko: '노드 드래그 (헤더 전체를 드래그 가능)',
    es: 'Arrastrar nodo (toda la cabecera es arrastrable)',
    ar: 'اسحب العقدة (الترويسة بأكملها قابلة للسحب)',
    fr: 'Glisser le nœud (tout l’en-tête est déplaçable)',
    pt: 'Arrastar nó (o cabeçalho inteiro é arrastável)',
    ru: 'Перетащить узел (перетаскивается весь заголовок)'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  configTitle: {
    zh: '配置端口与代码',
    en: 'Configure ports and code',
    ja: 'ポートとコードを設定',
    ko: '포트와 코드 설정',
    es: 'Configurar puertos y código',
    ar: 'ضبط المنافذ والكود',
    fr: 'Configurer les ports et le code',
    pt: 'Configurar portas e código',
    ru: 'Настроить порты и код'
  },
  configBtn: {
    zh: '配置函数',
    en: 'Configure function',
    ja: '関数を設定',
    ko: '함수 설정',
    es: 'Configurar función',
    ar: 'ضبط الدالة',
    fr: 'Configurer la fonction',
    pt: 'Configurar função',
    ru: 'Настроить функцию'
  },
  running: {
    zh: '执行中…',
    en: 'Running…',
    ja: '実行中…',
    ko: '실행 중…',
    es: 'Ejecutando…',
    ar: 'جارٍ التنفيذ…',
    fr: 'Exécution…',
    pt: 'Executando…',
    ru: 'Выполняется…'
  },
  run: {
    zh: '执行',
    en: 'Run',
    ja: '実行',
    ko: '실행',
    es: 'Ejecutar',
    ar: 'تشغيل',
    fr: 'Exécuter',
    pt: 'Executar',
    ru: 'Выполнить'
  },
  clickToRun: {
    zh: '（点击执行运行代码）',
    en: '(Click Run to execute the code)',
    ja: '（実行をクリックしてコードを実行）',
    ko: '(실행을 클릭하여 코드 실행)',
    es: '(Haz clic en Ejecutar para ejecutar el código)',
    ar: '(انقر على تشغيل لتنفيذ الكود)',
    fr: '(Cliquez sur Exécuter pour lancer le code)',
    pt: '(Clique em Executar para rodar o código)',
    ru: '(Нажмите «Выполнить», чтобы запустить код)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found',
    ja: 'ノードが存在しません',
    ko: '노드를 찾을 수 없음',
    es: 'Nodo no encontrado',
    ar: 'العقدة غير موجودة',
    fr: 'Nœud introuvable',
    pt: 'Nó não encontrado',
    ru: 'Узел не найден'
  },
  statusIdle: {
    zh: '空闲',
    en: 'Idle',
    ja: 'アイドル',
    ko: '대기',
    es: 'Inactivo',
    ar: 'خامل',
    fr: 'Inactif',
    pt: 'Inativo',
    ru: 'Ожидание'
  },
  statusRunning: {
    zh: '执行中',
    en: 'Running',
    ja: '実行中',
    ko: '실행 중',
    es: 'En ejecución',
    ar: 'قيد التنفيذ',
    fr: 'En cours',
    pt: 'Em execução',
    ru: 'Выполняется'
  },
  statusDone: {
    zh: '完成',
    en: 'Done',
    ja: '完了',
    ko: '완료',
    es: 'Completado',
    ar: 'مكتمل',
    fr: 'Terminé',
    pt: 'Concluído',
    ru: 'Готово'
  },
  statusError: {
    zh: '出错',
    en: 'Error',
    ja: 'エラー',
    ko: '오류',
    es: 'Error',
    ar: 'خطأ',
    fr: 'Erreur',
    pt: 'Erro',
    ru: 'Ошибка'
  },
  autoLabel: {
    zh: '自动',
    en: 'Auto',
    ja: '自動',
    ko: '자동',
    es: 'Auto',
    ar: 'تلقائي',
    fr: 'Auto',
    pt: 'Auto',
    ru: 'Авто'
  },
  runHint: {
    zh: '执行代码',
    en: 'Run the code',
    ja: 'コードを実行',
    ko: '코드 실행',
    es: 'Ejecutar el código',
    ar: 'تشغيل الكود',
    fr: 'Exécuter le code',
    pt: 'Executar o código',
    ru: 'Запустить код'
  },
  runHintNoCode: {
    zh: '请先在编辑区写代码',
    en: 'Write some code in the editor first',
    ja: '先に編集エリアにコードを書いてください',
    ko: '먼저 편집 영역에 코드를 작성하세요',
    es: 'Escribe primero algo de código en el editor',
    ar: 'اكتب بعض الكود في المحرر أولًا',
    fr: 'Écrivez d’abord du code dans l’éditeur',
    pt: 'Escreva primeiro algum código no editor',
    ru: 'Сначала напишите код в редакторе'
  },
  helpDialogTitle: {
    zh: '代码节点使用说明',
    en: 'Code node help',
    ja: 'コードノードの使い方',
    ko: '코드 노드 사용 설명',
    es: 'Ayuda del nodo Código',
    ar: 'تعليمات عقدة الكود',
    fr: 'Aide du nœud Code',
    pt: 'Ajuda do nó Código',
    ru: 'Справка по узлу «Код»'
  },
  configDialogTitle: {
    zh: '配置函数',
    en: 'Configure function',
    ja: '関数を設定',
    ko: '함수 설정',
    es: 'Configurar función',
    ar: 'ضبط الدالة',
    fr: 'Configurer la fonction',
    pt: 'Configurar função',
    ru: 'Настроить функцию'
  },
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
  addInputHint: {
    zh: '添加一个输入端口',
    en: 'Add an input port',
    ja: '入力ポートを追加',
    ko: '입력 포트 추가',
    es: 'Añadir un puerto de entrada',
    ar: 'إضافة منفذ إدخال',
    fr: 'Ajouter un port d’entrée',
    pt: 'Adicionar uma porta de entrada',
    ru: 'Добавить входной порт'
  },
  addOutputHint: {
    zh: '添加一个输出端口',
    en: 'Add an output port',
    ja: '出力ポートを追加',
    ko: '출력 포트 추가',
    es: 'Añadir un puerto de salida',
    ar: 'إضافة منفذ إخراج',
    fr: 'Ajouter un port de sortie',
    pt: 'Adicionar uma porta de saída',
    ru: 'Добавить выходной порт'
  },
  inputsEmpty: {
    zh: '点击 + 添加输入端口',
    en: 'Click + to add an input port',
    ja: '＋ をクリックして入力ポートを追加',
    ko: '+를 클릭하여 입력 포트 추가',
    es: 'Haz clic en + para añadir un puerto de entrada',
    ar: 'انقر على + لإضافة منفذ إدخال',
    fr: 'Cliquez sur + pour ajouter un port d’entrée',
    pt: 'Clique em + para adicionar uma porta de entrada',
    ru: 'Нажмите +, чтобы добавить входной порт'
  },
  outputsEmpty: {
    zh: '至少保留一个输出端口',
    en: 'Keep at least one output port',
    ja: '出力ポートを最低1つ保持してください',
    ko: '출력 포트를 최소 1개 유지하세요',
    es: 'Conserva al menos un puerto de salida',
    ar: 'احتفظ بمنفذ إخراج واحد على الأقل',
    fr: 'Gardez au moins un port de sortie',
    pt: 'Mantenha pelo menos uma porta de saída',
    ru: 'Оставьте хотя бы один выходной порт'
  },
  typeLabel: {
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
  varNameLabel: {
    zh: '变量名',
    en: 'Variable name',
    ja: '変数名',
    ko: '변수 이름',
    es: 'Nombre de variable',
    ar: 'اسم المتغير',
    fr: 'Nom de variable',
    pt: 'Nome da variável',
    ru: 'Имя переменной'
  },
  portNameLabel: {
    zh: '端口名',
    en: 'Port name',
    ja: 'ポート名',
    ko: '포트 이름',
    es: 'Nombre del puerto',
    ar: 'اسم المنفذ',
    fr: 'Nom du port',
    pt: 'Nome da porta',
    ru: 'Имя порта'
  },
  inputKindHint: {
    zh: '选择此输入接受的 Value 类型',
    en: 'Choose the Value type this input accepts',
    ja: 'この入力が受け付ける Value 型を選択',
    ko: '이 입력이 받는 Value 유형 선택',
    es: 'Elige el tipo de Value que acepta esta entrada',
    ar: 'اختر نوع Value الذي يقبله هذا الإدخال',
    fr: 'Choisissez le type Value accepté par cette entrée',
    pt: 'Escolha o tipo de Value que esta entrada aceita',
    ru: 'Выберите тип Value, принимаемый этим входом'
  },
  outputKindHint: {
    zh: '选择此输出产出的 Value 类型',
    en: 'Choose the Value type this output produces',
    ja: 'この出力が生成する Value 型を選択',
    ko: '이 출력이 생성하는 Value 유형 선택',
    es: 'Elige el tipo de Value que produce esta salida',
    ar: 'اختر نوع Value الذي ينتجه هذا الإخراج',
    fr: 'Choisissez le type Value produit par cette sortie',
    pt: 'Escolha o tipo de Value que esta saída produz',
    ru: 'Выберите тип Value, создаваемый этим выходом'
  },
  removeInputHint: {
    zh: '删除此输入端口',
    en: 'Remove this input port',
    ja: 'この入力ポートを削除',
    ko: '이 입력 포트 삭제',
    es: 'Eliminar este puerto de entrada',
    ar: 'إزالة منفذ الإدخال هذا',
    fr: 'Supprimer ce port d’entrée',
    pt: 'Remover esta porta de entrada',
    ru: 'Удалить этот входной порт'
  },
  removeOutputHint: {
    zh: '删除此输出端口（至少保留一个）',
    en: 'Remove this output port (keep at least one)',
    ja: 'この出力ポートを削除（最低1つは保持）',
    ko: '이 출력 포트 삭제 (최소 1개 유지)',
    es: 'Eliminar este puerto de salida (conserva al menos uno)',
    ar: 'إزالة منفذ الإخراج هذا (احتفظ بواحد على الأقل)',
    fr: 'Supprimer ce port de sortie (gardez-en au moins un)',
    pt: 'Remover esta porta de saída (mantenha pelo menos uma)',
    ru: 'Удалить этот выходной порт (оставьте хотя бы один)'
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
  snippetCall: {
    zh: 'callOutputPort("端口名", 值)',
    en: 'callOutputPort("portName", value)',
    ja: 'callOutputPort("ポート名", 値)',
    ko: 'callOutputPort("포트명", 값)',
    es: 'callOutputPort("nombrePuerto", valor)',
    ar: 'callOutputPort("اسم المنفذ", قيمة)',
    fr: 'callOutputPort("nomPort", valeur)',
    pt: 'callOutputPort("nomePorto", valor)',
    ru: 'callOutputPort("имяПорта", значение)'
  },
  copyHint: {
    zh: '复制函数签名',
    en: 'Copy the function signature',
    ja: '関数シグネチャをコピー',
    ko: '함수 시그니처 복사',
    es: 'Copiar la firma de la función',
    ar: 'نسخ توقيع الدالة',
    fr: 'Copier la signature de la fonction',
    pt: 'Copiar a assinatura da função',
    ru: 'Скопировать сигнатуру функции'
  },
  copied: {
    zh: '已复制',
    en: 'Copied',
    ja: 'コピーしました',
    ko: '복사됨',
    es: 'Copiado',
    ar: 'تم النسخ',
    fr: 'Copié',
    pt: 'Copiado',
    ru: 'Скопировано'
  },
  availablePorts: {
    zh: '可用端口：',
    en: 'Available ports: ',
    ja: '利用可能なポート：',
    ko: '사용 가능한 포트: ',
    es: 'Puertos disponibles: ',
    ar: 'المنافذ المتاحة: ',
    fr: 'Ports disponibles : ',
    pt: 'Portas disponíveis: ',
    ru: 'Доступные порты: '
  },
  portKindHint: {
    zh: '类型: {kind}',
    en: 'Type: {kind}',
    ja: '型: {kind}',
    ko: '유형: {kind}',
    es: 'Tipo: {kind}',
    ar: 'النوع: {kind}',
    fr: 'Type : {kind}',
    pt: 'Tipo: {kind}',
    ru: 'Тип: {kind}'
  },
  editorPlaceholderWithInputs: {
    zh: "写函数体，通过 callOutputPort('端口名', 值) 提交。\n直接用上方输入的变量名访问，例如：\ncallOutputPort('result', price * qty)\n\nsetTimeout / Promise.then 里的延迟调用也能正常触发",
    en: "Write the function body and submit via callOutputPort('portName', value).\nAccess inputs directly by their variable names, e.g.:\ncallOutputPort('result', price * qty)\n\nDeferred calls inside setTimeout / Promise.then also work",
    ja: "関数本体を書き、callOutputPort('ポート名', 値) で提出します。\n上の入力の変数名をそのまま使ってアクセスできます。例：\ncallOutputPort('result', price * qty)\n\nsetTimeout / Promise.then 内の遅延呼び出しも正常に発火します",
    ko: "함수 본문을 작성하고 callOutputPort('포트명', 값)로 제출합니다.\n위 입력의 변수 이름을 그대로 사용해 접근하세요. 예:\ncallOutputPort('result', price * qty)\n\nsetTimeout / Promise.then 내부의 지연 호출도 정상적으로 실행됩니다",
    es: "Escribe el cuerpo de la función y envíalo con callOutputPort('nombrePuerto', valor).\nAccede a las entradas directamente por sus nombres de variable, p. ej.:\ncallOutputPort('result', price * qty)\n\nLas llamadas diferidas dentro de setTimeout / Promise.then también funcionan",
    ar: "اكتب جسم الدالة وأرسِله عبر callOutputPort('اسم المنفذ', قيمة).\nيمكنك الوصول إلى المدخلات مباشرةً بأسماء متغيراتها، مثل:\ncallOutputPort('result', price * qty)\n\nالاستدعاءات المؤجّلة داخل setTimeout / Promise.then تعمل أيضًا",
    fr: "Écrivez le corps de la fonction et soumettez via callOutputPort('nomPort', valeur).\nAccédez aux entrées directement par leurs noms de variable, par ex. :\ncallOutputPort('result', price * qty)\n\nLes appels différés dans setTimeout / Promise.then fonctionnent aussi",
    pt: "Escreva o corpo da função e envie via callOutputPort('nomePorto', valor).\nAcesse as entradas diretamente pelos nomes das variáveis, por exemplo:\ncallOutputPort('result', price * qty)\n\nChamadas atrasadas dentro de setTimeout / Promise.then também funcionam",
    ru: "Напишите тело функции и отправьте через callOutputPort('имяПорта', значение).\nОбращайтесь к входам напрямую по именам переменных, например:\ncallOutputPort('result', price * qty)\n\nОтложенные вызовы внутри setTimeout / Promise.then тоже срабатывают"
  },
  editorPlaceholderWithoutInputs: {
    zh: "写函数体，通过 callOutputPort('端口名', 值) 提交，例如：\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nsetTimeout / Promise.then 里的延迟调用也能正常触发",
    en: "Write the function body and submit via callOutputPort('portName', value), e.g.:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nDeferred calls inside setTimeout / Promise.then also work",
    ja: "関数本体を書き、callOutputPort('ポート名', 値) で提出します。例：\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nsetTimeout / Promise.then 内の遅延呼び出しも正常に発火します",
    ko: "함수 본문을 작성하고 callOutputPort('포트명', 값)로 제출합니다. 예:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nsetTimeout / Promise.then 내부의 지연 호출도 정상적으로 실행됩니다",
    es: "Escribe el cuerpo de la función y envíalo con callOutputPort('nombrePuerto', valor), p. ej.:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nLas llamadas diferidas dentro de setTimeout / Promise.then también funcionan",
    ar: "اكتب جسم الدالة وأرسِله عبر callOutputPort('اسم المنفذ', قيمة)، مثل:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nالاستدعاءات المؤجّلة داخل setTimeout / Promise.then تعمل أيضًا",
    fr: "Écrivez le corps de la fonction et soumettez via callOutputPort('nomPort', valeur), par ex. :\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nLes appels différés dans setTimeout / Promise.then fonctionnent aussi",
    pt: "Escreva o corpo da função e envie via callOutputPort('nomePorto', valor), por exemplo:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nChamadas atrasadas dentro de setTimeout / Promise.then também funcionam",
    ru: "Напишите тело функции и отправьте через callOutputPort('имяПорта', значение), например:\ncallOutputPort('result', [1,2,3].reduce((a,b)=>a+b,0))\n\nОтложенные вызовы внутри setTimeout / Promise.then тоже срабатывают"
  },
  errNameEmpty: {
    zh: '名称不能为空',
    en: 'Name cannot be empty',
    ja: '名前を空にできません',
    ko: '이름은 비워 둘 수 없습니다',
    es: 'El nombre no puede estar vacío',
    ar: 'لا يمكن أن يكون الاسم فارغًا',
    fr: 'Le nom ne peut pas être vide',
    pt: 'O nome não pode ficar vazio',
    ru: 'Имя не может быть пустым'
  },
  errNameInvalid: {
    zh: '名称必须是合法 JS 标识符（字母/数字/$/_，不能数字开头）',
    en: 'Name must be a valid JS identifier (letters/digits/$/_, cannot start with a digit)',
    ja: '名前は有効な JS 識別子である必要があります（英字/数字/$/_、数字で始められません）',
    ko: '이름은 유효한 JS 식별자여야 합니다 (영문/숫자/$/_, 숫자로 시작 불가)',
    es: 'El nombre debe ser un identificador JS válido (letras/dígitos/$/_, no puede empezar por dígito)',
    ar: 'يجب أن يكون الاسم معرّف JS صالحًا (حروف/أرقام/$/_، ولا يبدأ برقم)',
    fr: 'Le nom doit être un identifiant JS valide (lettres/chiffres/$/_, ne peut pas commencer par un chiffre)',
    pt: 'O nome deve ser um identificador JS válido (letras/dígitos/$/_, não pode começar com dígito)',
    ru: 'Имя должно быть допустимым идентификатором JS (буквы/цифры/$/_, не может начинаться с цифры)'
  },
  errNameReserved: {
    zh: '不能用保留字 "{name}"',
    en: '"{name}" is a reserved word',
    ja: '予約語 "{name}" は使用できません',
    ko: '예약어 "{name}"은(는) 사용할 수 없습니다',
    es: 'No se puede usar la palabra reservada "{name}"',
    ar: 'لا يمكن استخدام الكلمة المحجوزة "{name}"',
    fr: 'Impossible d’utiliser le mot réservé "{name}"',
    pt: 'Não é possível usar a palavra reservada "{name}"',
    ru: 'Нельзя использовать зарезервированное слово "{name}"'
  },
  errNameDuplicateInput: {
    zh: '变量名 "{name}" 已存在',
    en: 'Variable name "{name}" already exists',
    ja: '変数名 "{name}" は既に存在します',
    ko: '변수 이름 "{name}"이(가) 이미 존재합니다',
    es: 'El nombre de variable "{name}" ya existe',
    ar: 'اسم المتغير "{name}" موجود بالفعل',
    fr: 'Le nom de variable "{name}" existe déjà',
    pt: 'O nome da variável "{name}" já existe',
    ru: 'Имя переменной "{name}" уже существует'
  },
  errNameDuplicateOutput: {
    zh: '端口名 "{name}" 已存在',
    en: 'Port name "{name}" already exists',
    ja: 'ポート名 "{name}" は既に存在します',
    ko: '포트명 "{name}"이(가) 이미 존재합니다',
    es: 'El nombre de puerto "{name}" ya existe',
    ar: 'اسم المنفذ "{name}" موجود بالفعل',
    fr: 'Le nom de port "{name}" existe déjà',
    pt: 'O nome da porta "{name}" já existe',
    ru: 'Имя порта "{name}" уже существует'
  },
  errNameConflictInput: {
    zh: '端口名 "{name}" 与输入变量名冲突',
    en: 'Port name "{name}" conflicts with an input variable name',
    ja: 'ポート名 "{name}" が入力の変数名と競合します',
    ko: '포트명 "{name}"이(가) 입력 변수 이름과 충돌합니다',
    es: 'El nombre de puerto "{name}" entra en conflicto con un nombre de variable de entrada',
    ar: 'اسم المنفذ "{name}" يتعارض مع اسم متغير إدخال',
    fr: 'Le nom de port "{name}" entre en conflit avec un nom de variable d’entrée',
    pt: 'O nome da porta "{name}" entra em conflito com um nome de variável de entrada',
    ru: 'Имя порта "{name}" конфликтует с именем входной переменной'
  }
} satisfies Record<string, LocalizedText>
