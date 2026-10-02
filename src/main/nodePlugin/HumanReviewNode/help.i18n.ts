import type { LocalizedText } from '../../../shared/language'

/**
 * HumanReview 节点帮助文档（HumanReviewHelpDialog）的全部文案，9 种语言全配。
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
    zh: '人工审核节点把上游传来的值排成 <b>FIFO 队列</b>，等待人工逐项处理：点「同意」把当前项从右侧 <code>approve</code> 端口放行给下游，点「拒绝」则从 <code>reject</code> 端口放行。',
    en: 'The Human Review node queues incoming values in a <b>FIFO queue</b> and waits for manual handling: click “Approve” to release the current item to downstream through the <code>approve</code> port on the right, or “Reject” to release it through the <code>reject</code> port.',
    ja: '人によるレビューノードは、上流から届いた値を <b>FIFO キュー</b> に並べ、人が1件ずつ処理するのを待ちます。「承認」を押すと現在の項目を右側の <code>approve</code> ポートから下流へ流し、「却下」を押すと <code>reject</code> ポートから流します。',
    ko: '인간 검토 노드는 상위에서 들어온 값을 <b>FIFO 큐</b>에 넣고 사람이 하나씩 처리하기를 기다립니다. “승인”을 누르면 현재 항목을 오른쪽 <code>approve</code> 포트로 하위에 내보내고, “거부”를 누르면 <code>reject</code> 포트로 내보냅니다.',
    es: 'El nodo Revisión humana pone los valores entrantes en una <b>cola FIFO</b> y espera a que una persona los procese uno a uno: haz clic en “Aprobar” para liberar el elemento actual aguas abajo por el puerto <code>approve</code> de la derecha, o en “Rechazar” para liberarlo por el puerto <code>reject</code>.',
    ar: 'تضع عقدة المراجعة البشرية القيم الواردة في <b>طابور FIFO</b> وتنتظر معالجتها يدويًا عنصرًا عنصرًا: انقر «موافقة» لتمرير العنصر الحالي إلى العقد اللاحقة عبر منفذ <code>approve</code> على اليمين، أو «رفض» لتمريره عبر منفذ <code>reject</code>.',
    fr: 'Le nœud Révision humaine place les valeurs entrantes dans une <b>file FIFO</b> et attend un traitement manuel un par un : cliquez sur « Approuver » pour libérer l’élément courant vers l’aval via le port <code>approve</code> à droite, ou sur « Rejeter » pour le libérer via le port <code>reject</code>.',
    pt: 'O nó Revisão humana coloca os valores recebidos em uma <b>fila FIFO</b> e aguarda o tratamento manual um a um: clique em “Aprovar” para liberar o item atual adiante pelo porto <code>approve</code> à direita, ou em “Rejeitar” para liberá-lo pelo porto <code>reject</code>.',
    ru: 'Узел «Ручная проверка» ставит входящие значения в <b>очередь FIFO</b> и ждёт ручной обработки по одному: нажмите «Одобрить», чтобы пропустить текущий элемент дальше через порт <code>approve</code> справа, или «Отклонить» — через порт <code>reject</code>.'
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
    zh: '左侧 <code>input</code> 输入端口接受数值、字符串和文件（<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>）',
    en: 'The <code>input</code> port on the left accepts numbers, strings and files (<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)',
    ja: '左側の <code>input</code> 入力ポートは数値・文字列・ファイル（<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>）を受け付けます',
    ko: '왼쪽 <code>input</code> 입력 포트는 숫자, 문자열, 파일(<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)을 받습니다',
    es: 'El puerto <code>input</code> de la izquierda acepta números, cadenas y archivos (<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)',
    ar: 'يقبل منفذ <code>input</code> على اليسار الأرقام والنصوص والملفات (<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)',
    fr: 'Le port <code>input</code> à gauche accepte les nombres, les chaînes et les fichiers (<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)',
    pt: 'O porto <code>input</code> à esquerda aceita números, strings e arquivos (<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)',
    ru: 'Входной порт <code>input</code> слева принимает числа, строки и файлы (<code>NumberValue</code> / <code>StringValue</code> / <code>FileValue</code>)'
  },
  portsLi2: {
    zh: '右侧输出端口在<b>上游首次传来值</b>时才动态创建，类型跟随上游：<code>approve</code>（同意）与 <code>reject</code>（拒绝）',
    en: 'The output ports on the right are created dynamically only when the <b>upstream first sends a value</b>, matching its type: <code>approve</code> and <code>reject</code>',
    ja: '右側の出力ポートは<b>上流が最初に値を送ったとき</b>に動的に作成され、型は上流に合わせて <code>approve</code>（承認）と <code>reject</code>（却下）の2つになります',
    ko: '오른쪽 출력 포트는 <b>상위에서 처음 값을 보낼 때</b> 동적으로 생성되며, 타입은 상위를 따라 <code>approve</code>(승인)와 <code>reject</code>(거부)입니다',
    es: 'Los puertos de salida de la derecha se crean dinámicamente solo cuando el <b>origen envía un valor por primera vez</b>, con su mismo tipo: <code>approve</code> (aprobar) y <code>reject</code> (rechazar)',
    ar: 'تُنشأ منافذ الإخراج على اليمين ديناميكيًا فقط عند <b>إرسال المصدر لقيمة لأول مرة</b>، وتتبع نوعه: <code>approve</code> (موافقة) و<code>reject</code> (رفض)',
    fr: 'Les ports de sortie à droite ne sont créés dynamiquement que lorsque <b>l’amont envoie une valeur pour la première fois</b>, avec le même type : <code>approve</code> (approuver) et <code>reject</code> (rejeter)',
    pt: 'Os portos de saída à direita são criados dinamicamente apenas quando a <b>origem envia um valor pela primeira vez</b>, seguindo o tipo dela: <code>approve</code> (aprovar) e <code>reject</code> (rejeitar)',
    ru: 'Выходные порты справа создаются динамически только когда <b>источник впервые присылает значение</b>, повторяя его тип: <code>approve</code> (одобрить) и <code>reject</code> (отклонить)'
  },
  portsLi3: {
    zh: '上游类型变化会重建输出端口（旧端口被删除、相关下游连线断开）；上游断开则输出端口一并移除',
    en: 'If the upstream type changes, the output ports are rebuilt (the old ones are removed and their downstream edges disconnected); if the upstream disconnects, the output ports are removed as well',
    ja: '上流の型が変わると出力ポートが再構築され（古いポートは削除され、関連する下流の接続も切断されます）、上流が切断されると出力ポートも削除されます',
    ko: '상위 타입이 바뀌면 출력 포트가 재구성됩니다(이전 포트는 삭제되고 관련 하위 연결도 끊어짐). 상위가 끊기면 출력 포트도 함께 제거됩니다',
    es: 'Si cambia el tipo del origen, los puertos de salida se reconstruyen (los antiguos se eliminan y sus conexiones salientes se desconectan); si el origen se desconecta, los puertos de salida también se eliminan',
    ar: 'إذا تغيّر نوع المصدر تُعاد بناء منافذ الإخراج (تُحذف القديمة وتُفصل وصلاتها اللاحقة)، وإذا انقطع المصدر تُزال منافذ الإخراج أيضًا',
    fr: 'Si le type de l’amont change, les ports de sortie sont reconstruits (les anciens sont supprimés et leurs liaisons aval déconnectées) ; si l’amont se déconnecte, les ports de sortie sont également retirés',
    pt: 'Se o tipo da origem mudar, os portos de saída são reconstruídos (os antigos são removidos e suas conexões adiante desconectadas); se a origem for desconectada, os portos de saída também são removidos',
    ru: 'При смене типа источника выходные порты пересоздаются (старые удаляются, а их связи вниз разрываются); при отключении источника выходные порты также удаляются'
  },
  portsLi4: {
    zh: '队列与输出端口不持久化：重新打开工作区后，由上游重新送来值自动重建',
    en: 'The queue and output ports are not persisted: after reopening the workspace, the upstream sends values again and they are rebuilt automatically',
    ja: 'キューと出力ポートは永続化されません。ワークスペースを開き直すと、上流が値を再送して自動的に再構築されます',
    ko: '큐와 출력 포트는 저장되지 않습니다. 작업 공간을 다시 열면 상위가 값을 다시 보내 자동으로 재구성됩니다',
    es: 'La cola y los puertos de salida no se persisten: al reabrir el espacio de trabajo, el origen vuelve a enviar valores y se reconstruyen automáticamente',
    ar: 'لا يُحفظ الطابور ومنافذ الإخراج: عند إعادة فتح مساحة العمل، يرسل المصدر القيم من جديد فتُعاد البناء تلقائيًا',
    fr: 'La file et les ports de sortie ne sont pas persistés : à la réouverture de l’espace de travail, l’amont renvoie les valeurs et ils sont reconstruits automatiquement',
    pt: 'A fila e os portos de saída não são persistidos: ao reabrir o espaço de trabalho, a origem reenvia os valores e eles são reconstruídos automaticamente',
    ru: 'Очередь и выходные порты не сохраняются: при повторном открытии рабочей области источник снова присылает значения, и они пересоздаются автоматически'
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
    zh: '卡片中间显示<b>当前正在审核的项</b>（其显示标签）与队列中剩余的数量',
    en: 'The middle of the card shows the <b>item currently under review</b> (its display label) and how many remain in the queue',
    ja: 'カード中央には<b>現在レビュー中の項目</b>（表示ラベル）とキューの残り件数が表示されます',
    ko: '카드 가운데에는 <b>현재 검토 중인 항목</b>(표시 라벨)과 큐에 남은 개수가 표시됩니다',
    es: 'En el centro de la tarjeta se muestra el <b>elemento en revisión actual</b> (su etiqueta) y cuántos quedan en la cola',
    ar: 'يعرض وسط البطاقة <b>العنصر قيد المراجعة حاليًا</b> (تسميته الظاهرة) وعدد المتبقي في الطابور',
    fr: 'Au centre de la carte s’affichent l’<b>élément en cours de révision</b> (son libellé) et le nombre restant dans la file',
    pt: 'No centro do cartão são exibidos o <b>item em revisão no momento</b> (seu rótulo) e quantos restam na fila',
    ru: 'В центре карточки показаны <b>текущий проверяемый элемент</b> (его метка) и сколько осталось в очереди'
  },
  useLi2: {
    zh: '点「同意」把当前项提交到 <code>approve</code> 端口并自动取下一项；点「拒绝」则从 <code>reject</code> 端口放行',
    en: 'Click “Approve” to commit the current item to the <code>approve</code> port and advance to the next; click “Reject” to release it through the <code>reject</code> port',
    ja: '「承認」を押すと現在の項目を <code>approve</code> ポートへ commit し、自動で次の項目へ進みます。「却下」を押すと <code>reject</code> ポートから流します',
    ko: '“승인”을 누르면 현재 항목이 <code>approve</code> 포트로 commit되고 자동으로 다음 항목으로 넘어갑니다. “거부”를 누르면 <code>reject</code> 포트로 내보냅니다',
    es: 'Haz clic en “Aprobar” para confirmar el elemento actual en el puerto <code>approve</code> y pasar automáticamente al siguiente; “Rechazar” lo libera por el puerto <code>reject</code>',
    ar: 'انقر «موافقة» لإرسال العنصر الحالي إلى منفذ <code>approve</code> والانتقال تلقائيًا إلى التالي، أو «رفض» لتمريره عبر منفذ <code>reject</code>',
    fr: 'Cliquez sur « Approuver » pour valider l’élément courant sur le port <code>approve</code> et passer automatiquement au suivant ; « Rejeter » le libère via le port <code>reject</code>',
    pt: 'Clique em “Aprovar” para confirmar o item atual no porto <code>approve</code> e avançar automaticamente para o próximo; “Rejeitar” libera-o pelo porto <code>reject</code>',
    ru: 'Нажмите «Одобрить», чтобы отправить текущий элемент в порт <code>approve</code> и автоматически перейти к следующему; «Отклонить» пропускает его через порт <code>reject</code>'
  },
  useLi3: {
    zh: '没有待审核项时两个按钮都会<b>置灰不可点</b>',
    en: 'When there is no item to review, both buttons are <b>greyed out and unclickable</b>',
    ja: 'レビュー対象がない場合、2つのボタンは<b>灰色になり押せません</b>',
    ko: '검토할 항목이 없으면 두 버튼이 모두 <b>회색으로 비활성화</b>됩니다',
    es: 'Cuando no hay elementos por revisar, ambos botones se <b>atenúan y quedan deshabilitados</b>',
    ar: 'عند عدم وجود عنصر للمراجعة يظهر الزران <b>باهتين وغير قابلين للنقر</b>',
    fr: 'Lorsqu’il n’y a aucun élément à réviser, les deux boutons sont <b>grisés et non cliquables</b>',
    pt: 'Quando não há itens para revisar, os dois botões ficam <b>acinzentados e desabilitados</b>',
    ru: 'Когда нет элементов для проверки, обе кнопки <b>становятся серыми и недоступными</b>'
  },

  // —— 处理流程 ——
  runTitle: {
    zh: '处理流程',
    en: 'Processing flow',
    ja: '処理の流れ',
    ko: '처리 흐름',
    es: 'Flujo de procesamiento',
    ar: 'آلية المعالجة',
    fr: 'Déroulement du traitement',
    pt: 'Fluxo de processamento',
    ru: 'Порядок обработки'
  },
  runLi1: {
    zh: '上游每传来一个值：当前无审核项时它成为当前项，否则<b>追加到队列末尾</b>，严格按先来后到（FIFO）处理',
    en: 'Each incoming value either becomes the current item (if none is under review) or is <b>appended to the end of the queue</b>; items are processed strictly first-in, first-out (FIFO)',
    ja: '上流から値が届くたびに、レビュー中の項目がなければそれが現在の項目になり、そうでなければ<b>キューの末尾に追加</b>されます。厳密に先入れ先出し（FIFO）で処理します',
    ko: '상위에서 값이 들어올 때마다 검토 중인 항목이 없으면 그것이 현재 항목이 되고, 그렇지 않으면 <b>큐 끝에 추가</b>됩니다. 엄격한 선입선출(FIFO)로 처리합니다',
    es: 'Cada valor entrante se convierte en el elemento actual si no hay ninguno en revisión; de lo contrario se <b>añade al final de la cola</b>. El procesamiento es estrictamente FIFO',
    ar: 'كل قيمة واردة تصبح العنصر الحالي إن لم يكن هناك عنصر قيد المراجعة، وإلا <b>تُضاف إلى نهاية الطابور</b>، وتُعالج بترتيب الوارد أولًا يخرج أولًا (FIFO)',
    fr: 'Chaque valeur entrante devient l’élément courant s’il n’y en a aucun en révision, sinon elle est <b>ajoutée à la fin de la file</b>. Le traitement est strictement premier entré, premier sorti (FIFO)',
    pt: 'Cada valor recebido vira o item atual se não houver nenhum em revisão; caso contrário é <b>adicionado ao fim da fila</b>. O processamento é estritamente FIFO',
    ru: 'Каждое входящее значение становится текущим элементом, если ничего не проверяется, иначе <b>добавляется в конец очереди</b>. Обработка строго по принципу «первым пришёл — первым вышел» (FIFO)'
  },
  runLi2: {
    zh: '处理完一项后自动前进到下一项，无需手动刷新',
    en: 'After an item is handled, it automatically advances to the next one—no manual refresh needed',
    ja: '1件を処理すると自動的に次の項目へ進みます。手動での更新は不要です',
    ko: '한 항목을 처리하면 자동으로 다음 항목으로 넘어갑니다. 수동 새로고침이 필요 없습니다',
    es: 'Tras procesar un elemento, avanza automáticamente al siguiente; no hace falta refrescar manualmente',
    ar: 'بعد معالجة عنصر ينتقل تلقائيًا إلى العنصر التالي دون حاجة إلى تحديث يدوي',
    fr: 'Après le traitement d’un élément, on passe automatiquement au suivant, sans actualisation manuelle',
    pt: 'Após processar um item, avança automaticamente para o próximo, sem necessidade de atualizar manualmente',
    ru: 'После обработки элемента автоматически происходит переход к следующему — вручную обновлять не нужно'
  },
  runLi3: {
    zh: '同一时刻只审核一项，保证下游按<b>逐项放行</b>的顺序收到值',
    en: 'Only one item is reviewed at a time, ensuring downstream receives values <b>one item at a time</b> in order',
    ja: '同時にレビューするのは1件のみで、下流には<b>1件ずつ順番に</b>値が届きます',
    ko: '한 번에 한 항목만 검토하여 하위가 <b>한 항목씩 순서대로</b> 값을 받도록 보장합니다',
    es: 'Solo se revisa un elemento a la vez, lo que garantiza que el destino reciba los valores <b>de uno en uno</b> y en orden',
    ar: 'تُراجع مراجعة واحدة فقط في كل مرة، مما يضمن وصول القيم إلى العقد اللاحقة <b>عنصرًا عنصرًا</b> وبالترتيب',
    fr: 'Un seul élément est révisé à la fois, ce qui garantit que l’aval reçoit les valeurs <b>un par un</b> dans l’ordre',
    pt: 'Apenas um item é revisado por vez, garantindo que o destino receba os valores <b>um a um</b> e em ordem',
    ru: 'Одновременно проверяется только один элемент, поэтому дальше значения идут <b>по одному</b> и по порядку'
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
    zh: '节点会<b>阻塞等待人工处理</b>：在点「同意」或「拒绝」之前，当前项不会流向下游',
    en: 'The node <b>blocks until manual handling</b>: the current item will not flow downstream until you click “Approve” or “Reject”',
    ja: 'このノードは<b>人の処理を待ってブロック</b>します。「承認」または「却下」を押すまで、現在の項目は下流へ流れません',
    ko: '이 노드는 <b>사람의 처리를 기다리며 대기</b>합니다. “승인” 또는 “거부”를 누르기 전까지 현재 항목은 하위로 흐르지 않습니다',
    es: 'El nodo <b>se bloquea hasta el tratamiento manual</b>: el elemento actual no fluirá aguas abajo hasta que pulses “Aprobar” o “Rechazar”',
    ar: 'تتوقف العقدة <b>في انتظار المعالجة اليدوية</b>: لن يمرّ العنصر الحالي إلى العقد اللاحقة حتى تنقر «موافقة» أو «رفض»',
    fr: 'Le nœud <b>se bloque jusqu’au traitement manuel</b> : l’élément courant ne passera pas en aval tant que vous n’aurez pas cliqué sur « Approuver » ou « Rejeter »',
    pt: 'O nó <b>bloqueia até o tratamento manual</b>: o item atual não flui adiante enquanto você não clicar em “Aprovar” ou “Rejeitar”',
    ru: 'Узел <b>блокируется в ожидании ручной обработки</b>: текущий элемент не пойдёт дальше, пока вы не нажмёте «Одобрить» или «Отклонить»'
  },
  notesLi2: {
    zh: '队列不写入持久化状态；拖动或重新打开工作区后，由上游重新送来值自动恢复',
    en: 'The queue is not written to persistent state; after dragging or reopening the workspace, it is restored automatically when the upstream sends values again',
    ja: 'キューは永続状態に保存されません。ドラッグやワークスペースの再オープン後は、上流が値を再送することで自動的に復元されます',
    ko: '큐는 영구 상태에 저장되지 않습니다. 드래그하거나 작업 공간을 다시 연 뒤에는 상위가 값을 다시 보내면 자동으로 복원됩니다',
    es: 'La cola no se guarda en el estado persistente; tras arrastrar o reabrir el espacio de trabajo, se restaura automáticamente cuando el origen vuelve a enviar valores',
    ar: 'لا يُكتب الطابور في الحالة المحفوظة؛ بعد السحب أو إعادة فتح مساحة العمل يُستعاد تلقائيًا عندما يرسل المصدر القيم من جديد',
    fr: 'La file n’est pas écrite dans l’état persistant ; après un déplacement ou une réouverture de l’espace de travail, elle est restaurée automatiquement lorsque l’amont renvoie les valeurs',
    pt: 'A fila não é gravada no estado persistente; após arrastar ou reabrir o espaço de trabalho, ela é restaurada automaticamente quando a origem reenvia os valores',
    ru: 'Очередь не сохраняется в постоянном состоянии; после перетаскивания или повторного открытия рабочей области она восстанавливается автоматически, когда источник снова присылает значения'
  },
  notesLi3: {
    zh: '上游类型变化会重建输出端口并<b>断开下游连线</b>，请重新连接后再继续',
    en: 'A change of upstream type rebuilds the output ports and <b>disconnects downstream edges</b>; reconnect them before continuing',
    ja: '上流の型が変わると出力ポートが再構築され、<b>下流の接続が切断されます</b>。再接続してから続けてください',
    ko: '상위 타입이 바뀌면 출력 포트가 재구성되고 <b>하위 연결이 끊어집니다</b>. 다시 연결한 뒤 계속하세요',
    es: 'Un cambio de tipo en el origen reconstruye los puertos de salida y <b>desconecta las conexiones salientes</b>; vuelve a conectarlas para continuar',
    ar: 'يؤدي تغيّر نوع المصدر إلى إعادة بناء منافذ الإخراج و<b>فصل الوصلات اللاحقة</b>؛ أعد توصيلها قبل المتابعة',
    fr: 'Un changement de type en amont reconstruit les ports de sortie et <b>déconnecte les liaisons aval</b> ; reconnectez-les avant de continuer',
    pt: 'Uma mudança no tipo da origem reconstrói os portos de saída e <b>desconecta as conexões adiante</b>; reconecte-as antes de continuar',
    ru: 'Смена типа источника пересоздаёт выходные порты и <b>разрывает связи вниз</b>; подключите их заново, прежде чем продолжать'
  }
} satisfies Record<string, LocalizedText>