import type { LocalizedText } from '../../../shared/language'

/**
 * Command 节点帮助文档（CommandHelpDialog）的全部文案，9 种语言全配。
 *
 * 与节点自身的 i18n.ts 分开：卡片短文案变化频繁，帮助文档整篇体量大、改动少。
 * 约定：带行内 <code> / <b> 的句子，值里直接写 HTML，模板用 v-html 渲染；
 * 纯文字句子用 {{ }} 插值。代码块结构留在模板里，只把注释抽成词条。
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
    zh: '命令行节点把一条常用 <b>shell 命令</b>保存在节点里，之后点「执行」即可重复运行。命令是<b>模板</b>：用 <code>$1</code> <code>$2</code> … 引用第 N 个输入端口的值，拼出最终命令后在主进程<b>真实执行</b>，结果从右侧 <code>text</code> 端口输出给下游节点。',
    en: 'The Command node <b>saves</b> a frequently used shell command so you can re-run it with a single “Run” click. The command is a <b>template</b>: use <code>$1</code> <code>$2</code> … to reference the value of the Nth input port. The final command is then <b>really executed</b> in the main process, and the result is output to downstream nodes from the <code>text</code> port on the right.',
    ja: 'コマンドノードはよく使う <b>shell コマンド</b>を保存し、「実行」をクリックするだけで繰り返し実行できます。コマンドは<b>テンプレート</b>で、<code>$1</code> <code>$2</code> … で N 番目の入力ポートの値を参照し、最終コマンドを組み立ててメインプロセスで<b>実際に実行</b>します。結果は右側の <code>text</code> ポートから下流ノードへ出力されます。',
    ko: '명령 노드는 자주 쓰는 <b>shell 명령</b>을 저장해 두고 “실행”을 클릭하면 반복 실행할 수 있습니다. 명령은 <b>템플릿</b>으로, <code>$1</code> <code>$2</code> … 로 N번째 입력 포트의 값을 참조해 최종 명령을 만들고 메인 프로세스에서 <b>실제로 실행</b>합니다. 결과는 오른쪽 <code>text</code> 포트에서 하위 노드로 출력됩니다.',
    es: 'El nodo Comando <b>guarda</b> un comando de shell de uso frecuente para poder reejecutarlo con un solo clic en «Ejecutar». El comando es una <b>plantilla</b>: usa <code>$1</code> <code>$2</code> … para referenciar el valor del enésimo puerto de entrada. El comando final se <b>ejecuta de verdad</b> en el proceso principal y el resultado se envía a los nodos posteriores desde el puerto <code>text</code> de la derecha.',
    ar: 'تحفظ عقدة الأوامر <b>أمر shell</b> شائع الاستخدام، ثم يمكنك إعادة تشغيله بنقرة واحدة على «تشغيل». الأمر عبارة عن <b>قالب</b>: استخدم <code>$1</code> <code>$2</code> … للإشارة إلى قيمة المنفذ رقم N. يُنفَّذ الأمر النهائي <b>فعليًا</b> في العملية الرئيسية، وتُخرَج النتيجة إلى العقد اللاحقة من منفذ <code>text</code> على اليمين.',
    fr: 'Le nœud Commande <b>enregistre</b> une commande <b>shell</b> fréquemment utilisée pour la relancer d’un simple clic sur « Exécuter ». La commande est un <b>modèle</b> : utilisez <code>$1</code> <code>$2</code> … pour référencer la valeur du Nième port d’entrée. La commande finale est <b>réellement exécutée</b> dans le processus principal, et le résultat est envoyé aux nœuds en aval depuis le port <code>text</code> à droite.',
    pt: 'O nó Comando <b>salva</b> um comando de shell de uso frequente para reexecutá-lo com um único clique em “Executar”. O comando é um <b>modelo</b>: use <code>$1</code> <code>$2</code> … para referenciar o valor do enésimo porto de entrada. O comando final é <b>executado de verdade</b> no processo principal, e o resultado é enviado aos nós seguintes pelo porto <code>text</code> à direita.',
    ru: 'Узел «Команда» <b>сохраняет</b> часто используемую <b>shell-команду</b>, чтобы запускать её повторно одним нажатием «Выполнить». Команда — это <b>шаблон</b>: используйте <code>$1</code> <code>$2</code> … для ссылки на значение N-го входного порта. Итоговая команда <b>реально выполняется</b> в главном процессе, а результат выводится последующим узлам из порта <code>text</code> справа.'
  },

  // —— 配置项 ——
  configTitle: {
    zh: '配置项',
    en: 'Settings',
    ja: '設定項目',
    ko: '설정 항목',
    es: 'Configuración',
    ar: 'الإعدادات',
    fr: 'Paramètres',
    pt: 'Configurações',
    ru: 'Настройки'
  },
  configLi1: {
    zh: '顶部的<b>名称输入框</b>用于辨识这条命令（例如「构建项目」），只作显示，不参与执行',
    en: 'The <b>name field</b> at the top identifies the command (e.g. “Build project”); it is display-only and not part of execution',
    ja: '上部の<b>名前入力欄</b>はこのコマンドを識別するためのもの（例：「ビルド」）で、表示専用であり実行には関与しません',
    ko: '상단의 <b>이름 입력란</b>은 이 명령을 식별하기 위한 것(예: “프로젝트 빌드”)이며, 표시용일 뿐 실행에는 사용되지 않습니다',
    es: 'El <b>campo de nombre</b> de arriba identifica el comando (p. ej. «Compilar proyecto»); es solo informativo y no afecta a la ejecución',
    ar: 'حقل <b>الاسم</b> في الأعلى يُستخدم لتمييز هذا الأمر (مثل «بناء المشروع»)، وهو للعرض فقط ولا يشارك في التنفيذ',
    fr: 'Le <b>champ de nom</b> en haut sert à identifier la commande (p. ex. « Compiler le projet ») ; il est purement indicatif et n’intervient pas dans l’exécution',
    pt: 'O <b>campo de nome</b> no topo identifica o comando (ex.: “Compilar projeto”); é apenas informativo e não participa da execução',
    ru: '<b>Поле имени</b> сверху служит для опознавания команды (например, «Собрать проект»); оно только отображается и не участвует в выполнении'
  },
  configLi2: {
    zh: '点命令预览区或右上角<b>齿轮</b>打开编辑面板，修改命令模板后点「保存」写回节点',
    en: 'Click the command preview area or the <b>gear</b> at the top right to open the editor; edit the template and click “Save” to write it back',
    ja: 'コマンドプレビューまたは右上の<b>歯車</b>をクリックして編集パネルを開き、テンプレートを編集して「保存」でノードに書き戻します',
    ko: '명령 미리보기 영역이나 오른쪽 위 <b>톱니바퀴</b>를 클릭해 편집 패널을 열고, 템플릿을 수정한 뒤 “저장”을 눌러 노드에 반영합니다',
    es: 'Haz clic en la vista previa del comando o en el <b>engranaje</b> de arriba a la derecha para abrir el editor; edita la plantilla y pulsa «Guardar» para escribirla en el nodo',
    ar: 'انقر على منطقة معاينة الأمر أو على <b>الترس</b> في الأعلى يمينًا لفتح لوحة التحرير، ثم عدّل القالب واضغط «حفظ» لتثبيته في العقدة',
    fr: 'Cliquez sur l’aperçu de la commande ou sur l’<b>engrenage</b> en haut à droite pour ouvrir l’éditeur ; modifiez le modèle puis cliquez sur « Enregistrer » pour l’appliquer au nœud',
    pt: 'Clique na pré-visualização do comando ou na <b>engrenagem</b> no canto superior direito para abrir o editor; edite o modelo e clique em “Salvar” para aplicá-lo ao nó',
    ru: 'Нажмите на область предпросмотра команды или на <b>шестерёнку</b> справа вверху, чтобы открыть редактор; измените шаблон и нажмите «Сохранить», чтобы записать его в узел'
  },

  // —— 输入端口 & $N ——
  portsTitle: {
    zh: '输入端口 & $N 模板',
    en: 'Input ports & the $N template',
    ja: '入力ポート & $N テンプレート',
    ko: '입력 포트 & $N 템플릿',
    es: 'Puertos de entrada y la plantilla $N',
    ar: 'منافذ الإدخال وقالب $N',
    fr: 'Ports d’entrée et modèle $N',
    pt: 'Portas de entrada e o modelo $N',
    ru: 'Входные порты и шаблон $N'
  },
  portsLi1: {
    zh: '每个输入端口只接受<b>字符串</b>，端口标签依次是 <code>$1</code>、<code>$2</code>…',
    en: 'Each input port accepts only <b>strings</b>; the port labels are <code>$1</code>, <code>$2</code>, … in order',
    ja: '各入力ポートは<b>文字列</b>のみを受け付け、ポートラベルは順に <code>$1</code>、<code>$2</code>… となります',
    ko: '각 입력 포트는 <b>문자열</b>만 받으며, 포트 라벨은 순서대로 <code>$1</code>, <code>$2</code>… 입니다',
    es: 'Cada puerto de entrada acepta solo <b>cadenas</b>; las etiquetas son <code>$1</code>, <code>$2</code>, … en orden',
    ar: 'يقبل كل منفذ إدخال <b>النصوص</b> فقط، وتكون التسميات <code>$1</code> و<code>$2</code>… بالترتيب',
    fr: 'Chaque port d’entrée n’accepte que des <b>chaînes</b> ; les libellés sont <code>$1</code>, <code>$2</code>, … dans l’ordre',
    pt: 'Cada porto de entrada aceita apenas <b>strings</b>; os rótulos são <code>$1</code>, <code>$2</code>, … em ordem',
    ru: 'Каждый входной порт принимает только <b>строки</b>; метки портов по порядку — <code>$1</code>, <code>$2</code>, …'
  },
  portsLi2: {
    zh: '点「<code>＋</code>」追加一个端口，点「<code>－</code>」移除<b>末尾</b>端口（至少保留 1 个）',
    en: 'Click “<code>＋</code>” to add a port, and “<code>－</code>” to remove the <b>last</b> port (keep at least one)',
    ja: '「<code>＋</code>」でポートを追加し、「<code>－</code>」で<b>末尾</b>のポートを削除します（最低1つは保持）',
    ko: '“<code>＋</code>”를 클릭하면 포트가 추가되고, “<code>－</code>”를 클릭하면 <b>마지막</b> 포트가 제거됩니다 (최소 1개 유지)',
    es: 'Haz clic en “<code>＋</code>” para añadir un puerto y en “<code>－</code>” para quitar el <b>último</b> (conserva al menos uno)',
    ar: 'انقر على «<code>＋</code>» لإضافة منفذ، وعلى «<code>－</code>» لإزالة المنفذ <b>الأخير</b> (احتفظ بمنفذ واحد على الأقل)',
    fr: 'Cliquez sur « <code>＋</code> » pour ajouter un port, et sur « <code>－</code> » pour supprimer le <b>dernier</b> (gardez-en au moins un)',
    pt: 'Clique em “<code>＋</code>” para adicionar um porto e em “<code>－</code>” para remover o <b>último</b> (mantenha pelo menos um)',
    ru: 'Нажмите «<code>＋</code>», чтобы добавить порт, и «<code>－</code>», чтобы удалить <b>последний</b> (оставьте хотя бы один)'
  },
  portsLi3: {
    zh: '模板里写 <code>$N</code> 就取第 N 个端口的值；该端口没值或不存在时替换为<b>空串</b>',
    en: 'Writing <code>$N</code> in the template takes the value of the Nth port; if that port has no value or does not exist, it is replaced with an <b>empty string</b>',
    ja: 'テンプレートに <code>$N</code> と書くと N 番目のポートの値になります。そのポートに値がない、または存在しない場合は<b>空文字列</b>に置換されます',
    ko: '템플릿에 <code>$N</code>을 쓰면 N번째 포트의 값을 가져옵니다. 해당 포트에 값이 없거나 존재하지 않으면 <b>빈 문자열</b>로 대체됩니다',
    es: 'Escribir <code>$N</code> en la plantilla toma el valor del enésimo puerto; si ese puerto no tiene valor o no existe, se reemplaza por una <b>cadena vacía</b>',
    ar: 'كتابة <code>$N</code> في القالب تأخذ قيمة المنفذ رقم N؛ وإذا لم يكن له قيمة أو لم يكن موجودًا، فيُستبدل بـ<b>نص فارغ</b>',
    fr: 'Écrire <code>$N</code> dans le modèle prend la valeur du Nième port ; si ce port n’a pas de valeur ou n’existe pas, il est remplacé par une <b>chaîne vide</b>',
    pt: 'Escrever <code>$N</code> no modelo usa o valor do enésimo porto; se esse porto não tiver valor ou não existir, é substituído por uma <b>string vazia</b>',
    ru: 'Запись <code>$N</code> в шаблоне берёт значение N-го порта; если у порта нет значения или он не существует, подставляется <b>пустая строка</b>'
  },
  portsLi4: {
    zh: '想输出字面量的 <code>$</code>，写成 <code>$$</code>',
    en: 'To output a literal <code>$</code>, write <code>$$</code>',
    ja: 'リテラルの <code>$</code> を出力したい場合は <code>$$</code> と書きます',
    ko: '리터럴 <code>$</code>를 출력하려면 <code>$$</code>로 작성합니다',
    es: 'Para mostrar un <code>$</code> literal, escribe <code>$$</code>',
    ar: 'لإخراج <code>$</code> حرفيًا، اكتب <code>$$</code>',
    fr: 'Pour afficher un <code>$</code> littéral, écrivez <code>$$</code>',
    pt: 'Para exibir um <code>$</code> literal, escreva <code>$$</code>',
    ru: 'Чтобы вывести литерал <code>$</code>, напишите <code>$$</code>'
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
    ru: 'Выполнение и статус'
  },
  runLi1: {
    zh: '点底部「执行」按钮，用生成的最终命令<b>真实运行</b>；输入值变化会即时重算命令，但只有点执行时才真正跑',
    en: 'Click the “Run” button at the bottom to <b>really execute</b> the generated command; changing inputs re-generates it instantly, but it only runs when you click Run',
    ja: '下部の「実行」ボタンで生成された最終コマンドを<b>実際に実行</b>します。入力値の変化は即時に再計算されますが、実行されるのはボタンを押したときだけです',
    ko: '하단 “실행” 버튼을 클릭하면 생성된 최종 명령을 <b>실제로 실행</b>합니다. 입력값이 바뀌면 즉시 재계산되지만, 명령은 실행을 누를 때만 수행됩니다',
    es: 'Pulsa el botón «Ejecutar» de abajo para <b>ejecutar de verdad</b> el comando generado; cambiar las entradas lo regenera al instante, pero solo se ejecuta al pulsar Ejecutar',
    ar: 'انقر على زر «تشغيل» في الأسفل <b>لتنفيذ</b> الأمر النهائي فعليًا؛ يؤدي تغيير المدخلات إلى إعادة توليده فورًا، لكنه لا يعمل إلا عند الضغط على تشغيل',
    fr: 'Cliquez sur « Exécuter » en bas pour <b>exécuter réellement</b> la commande générée ; modifier les entrées la régénère aussitôt, mais elle ne s’exécute qu’au clic sur Exécuter',
    pt: 'Clique no botão “Executar” na parte inferior para <b>executar de verdade</b> o comando gerado; alterar as entradas o regenera na hora, mas ele só roda ao clicar em Executar',
    ru: 'Нажмите «Выполнить» внизу, чтобы <b>реально запустить</b> сформированную команду; при изменении входов она сразу пересчитывается, но выполняется только по нажатию кнопки'
  },
  runLi2: {
    zh: '执行期间状态显示「执行中…」（转圈）且按钮禁用；一次执行完成前<b>无法重复触发或取消</b>',
    en: 'While running, the status shows “Running…” with a spinner and the button is disabled; you <b>cannot re-trigger or cancel</b> it until it finishes',
    ja: '実行中は「実行中…」（スピナー）と表示されボタンは無効になります。完了するまで<b>再実行もキャンセルもできません</b>',
    ko: '실행 중에는 “실행 중…” (스피너)이 표시되고 버튼이 비활성화됩니다. 완료되기 전까지는 <b>다시 실행하거나 취소할 수 없습니다</b>',
    es: 'Durante la ejecución se muestra «Ejecutando…» (con spinner) y el botón se desactiva; no se puede <b>volver a lanzar ni cancelar</b> hasta que termina',
    ar: 'أثناء التنفيذ تظهر الحالة «جارٍ التنفيذ…» (مع مؤشر دوّار) ويُعطَّل الزر؛ ولا يمكن <b>إعادة التشغيل أو الإلغاء</b> حتى ينتهي',
    fr: 'Pendant l’exécution, l’état affiche « Exécution… » (avec un indicateur) et le bouton est désactivé ; impossible de <b>relancer ou d’annuler</b> avant la fin',
    pt: 'Durante a execução, o estado mostra “Executando…” (com spinner) e o botão fica desativado; não é possível <b>reexecutar nem cancelar</b> até terminar',
    ru: 'Во время выполнения статус показывает «Выполняется…» (со спиннером), а кнопка отключена; до завершения <b>нельзя запустить повторно или отменить</b>'
  },
  runLi3: {
    zh: '命令为空（模板为空或占位符都解析成空串）时不会执行',
    en: 'If the command is empty (empty template or all placeholders resolve to empty), nothing is executed',
    ja: 'コマンドが空（テンプレートが空、またはすべてのプレースホルダーが空文字列）の場合は実行されません',
    ko: '명령이 비어 있으면(템플릿이 비었거나 모든 자리 표시자가 빈 문자열) 실행되지 않습니다',
    es: 'Si el comando está vacío (plantilla vacía o todos los marcadores resueltos como vacío), no se ejecuta nada',
    ar: 'إذا كان الأمر فارغًا (قالب فارغ أو كل العناصر تُحلّ إلى نص فارغ)، فلن يُنفَّذ شيء',
    fr: 'Si la commande est vide (modèle vide ou tous les espaces résolus vides), rien n’est exécuté',
    pt: 'Se o comando estiver vazio (modelo vazio ou todos os marcadores resolvidos como vazio), nada é executado',
    ru: 'Если команда пуста (пустой шаблон или все подстановки пусты), ничего не выполняется'
  },

  // —— 输出端口 ——
  outputTitle: {
    zh: '输出端口',
    en: 'Output port',
    ja: '出力ポート',
    ko: '출력 포트',
    es: 'Puerto de salida',
    ar: 'منفذ الإخراج',
    fr: 'Port de sortie',
    pt: 'Porto de saída',
    ru: 'Выходной порт'
  },
  outputLi1: {
    zh: '右侧 <code>text</code> 端口把本次执行结果发往下游：执行成功发 <b>stdout</b>，失败发 <b>stderr</b>',
    en: 'The <code>text</code> port on the right sends the latest result downstream: <b>stdout</b> on success, <b>stderr</b> on failure',
    ja: '右側の <code>text</code> ポートは今回の実行結果を下流へ送ります。成功時は <b>stdout</b>、失敗時は <b>stderr</b> です',
    ko: '오른쪽 <code>text</code> 포트는 이번 실행 결과를 하위로 보냅니다. 성공 시 <b>stdout</b>, 실패 시 <b>stderr</b>입니다',
    es: 'El puerto <code>text</code> de la derecha envía el resultado a los nodos posteriores: <b>stdout</b> si tiene éxito y <b>stderr</b> si falla',
    ar: 'يُرسل منفذ <code>text</code> على اليمين نتيجة التنفيذ إلى العقد اللاحقة: <b>stdout</b> عند النجاح، و<b>stderr</b> عند الفشل',
    fr: 'Le port <code>text</code> à droite envoie le résultat aux nœuds en aval : <b>stdout</b> en cas de succès, <b>stderr</b> en cas d’échec',
    pt: 'O porto <code>text</code> à direita envia o resultado aos nós seguintes: <b>stdout</b> em caso de sucesso e <b>stderr</b> em caso de falha',
    ru: 'Порт <code>text</code> справа передаёт результат последующим узлам: <b>stdout</b> при успехе и <b>stderr</b> при ошибке'
  },
  outputLi2: {
    zh: '卡片中的结果区显示最近一次输出：出错时以<b>红色</b>显示 <b>stderr</b> 内容',
    en: 'The result area in the card shows the most recent output; on error it displays <b>stderr</b> in <b>red</b>',
    ja: 'カード内の結果エリアには直近の出力が表示されます。エラー時は <b>stderr</b> を<b>赤色</b>で表示します',
    ko: '카드의 결과 영역에는 최근 출력이 표시됩니다. 오류 시 <b>stderr</b> 내용을 <b>빨간색</b>으로 보여줍니다',
    es: 'El área de resultado de la tarjeta muestra la última salida; en caso de error, muestra el contenido de <b>stderr</b> en <b>rojo</b>',
    ar: 'تعرض منطقة النتيجة في البطاقة آخر مخرجات؛ وعند الخطأ تظهر محتوى <b>stderr</b> باللون <b>الأحمر</b>',
    fr: 'La zone de résultat de la carte affiche la dernière sortie ; en cas d’erreur, elle montre le contenu de <b>stderr</b> en <b>rouge</b>',
    pt: 'A área de resultado do cartão mostra a última saída; em caso de erro, exibe o conteúdo de <b>stderr</b> em <b>vermelho</b>',
    ru: 'Область результата в карточке показывает последний вывод; при ошибке <b>stderr</b> отображается <b>красным</b>'
  },

  // —— 注意事项 ——
  noticeTitle: {
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
  noticeLi1: {
    zh: '命令通过主进程 <code>child_process.exec</code> 以你当前的系统权限<b>真实执行</b>，请只运行可信的命令',
    en: 'Commands are <b>really executed</b> in the main process via <code>child_process.exec</code> with your current system permissions — only run trusted commands',
    ja: 'コマンドはメインプロセスの <code>child_process.exec</code> により、あなたの現在のシステム権限で<b>実際に実行</b>されます。信頼できるコマンドのみ実行してください',
    ko: '명령은 메인 프로세스의 <code>child_process.exec</code>를 통해 현재 시스템 권한으로 <b>실제 실행</b>됩니다. 신뢰할 수 있는 명령만 실행하세요',
    es: 'Los comandos se <b>ejecutan de verdad</b> en el proceso principal mediante <code>child_process.exec</code> con tus permisos actuales del sistema; ejecuta solo comandos de confianza',
    ar: 'تُنفَّذ الأوامر <b>فعليًا</b> في العملية الرئيسية عبر <code>child_process.exec</code> بصلاحيات نظامك الحالية — شغّل أوامر موثوقة فقط',
    fr: 'Les commandes sont <b>réellement exécutées</b> dans le processus principal via <code>child_process.exec</code> avec vos permissions système actuelles — n’exécutez que des commandes de confiance',
    pt: 'Os comandos são <b>executados de verdade</b> no processo principal via <code>child_process.exec</code> com as suas permissões atuais do sistema — execute apenas comandos confiáveis',
    ru: 'Команды <b>реально выполняются</b> в главном процессе через <code>child_process.exec</code> с вашими текущими системными правами — запускайте только доверенные команды'
  },
  noticeLi2: {
    zh: '命令可能有副作用（改文件、装依赖、联网等），执行前请确认影响范围',
    en: 'Commands may have side effects (modifying files, installing dependencies, network access, etc.); confirm the impact before running',
    ja: 'コマンドには副作用（ファイル変更、依存関係のインストール、ネットワーク通信など）がある場合があります。実行前に影響範囲を確認してください',
    ko: '명령은 부작용(파일 변경, 의존성 설치, 네트워크 접속 등)이 있을 수 있으니 실행 전에 영향을 확인하세요',
    es: 'Los comandos pueden tener efectos secundarios (modificar archivos, instalar dependencias, acceder a la red, etc.); confirma el impacto antes de ejecutar',
    ar: 'قد يكون للأوامر آثار جانبية (تعديل الملفات، تثبيت الاعتماديات، الاتصال بالشبكة وغيرها)؛ تأكد من نطاق التأثير قبل التشغيل',
    fr: 'Les commandes peuvent avoir des effets de bord (modifier des fichiers, installer des dépendances, accéder au réseau, etc.) ; vérifiez l’impact avant d’exécuter',
    pt: 'Os comandos podem ter efeitos colaterais (alterar arquivos, instalar dependências, acessar a rede, etc.); confirme o impacto antes de executar',
    ru: 'Команды могут иметь побочные эффекты (изменение файлов, установка зависимостей, доступ к сети и т. п.) — проверьте последствия перед запуском'
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
    zh: '例：模板 <code>npm run build -- $1</code>，$1 是构建目标',
    en: 'Example: template <code>npm run build -- $1</code>, where $1 is the build target',
    ja: '例：テンプレート <code>npm run build -- $1</code>、$1 はビルド対象',
    ko: '예: 템플릿 <code>npm run build -- $1</code>, $1은 빌드 대상',
    es: 'Ejemplo: plantilla <code>npm run build -- $1</code>, donde $1 es el objetivo de compilación',
    ar: 'مثال: القالب <code>npm run build -- $1</code>، حيث $1 هو هدف البناء',
    fr: 'Exemple : modèle <code>npm run build -- $1</code>, où $1 est la cible de compilation',
    pt: 'Exemplo: modelo <code>npm run build -- $1</code>, onde $1 é o alvo de compilação',
    ru: 'Пример: шаблон <code>npm run build -- $1</code>, где $1 — цель сборки'
  },
  exampleComment1: {
    zh: '// 模板',
    en: '// Template',
    ja: '// テンプレート',
    ko: '// 템플릿',
    es: '// Plantilla',
    ar: '// القالب',
    fr: '// Modèle',
    pt: '// Modelo',
    ru: '// Шаблон'
  },
  exampleComment2: {
    zh: '// 生成的命令',
    en: '// Generated command',
    ja: '// 生成されたコマンド',
    ko: '// 생성된 명령',
    es: '// Comando generado',
    ar: '// الأمر الناتج',
    fr: '// Commande générée',
    pt: '// Comando gerado',
    ru: '// Итоговая команда'
  }
} satisfies Record<string, LocalizedText>