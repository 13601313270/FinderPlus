import type { LocalizedText } from '../../../shared/language'

/**
 * Switch（条件分支）节点帮助文档（SwitchHelpDialog）的全部文案，9 种语言全配。
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
    zh: '条件分支节点按一个<b>布尔条件</b>把一条数据流分流到两路之一：条件为真走 <code>pass</code>，为假走 <code>fail</code>。它是 100×70 的紧凑卡片，卡片上直接用绿色/红色标签标出当前命中的分支。',
    en: 'The Switch node routes one data stream to one of two branches according to a <b>boolean condition</b>: true goes to <code>pass</code>, false goes to <code>fail</code>. It is a compact 100×70 card that marks the current branch directly with a green or red label.',
    ja: '条件分岐ノードは、<b>真偽値の条件</b>に従って 1 本のデータフローを 2 つの経路のいずれかへ振り分けます。真なら <code>pass</code>、偽なら <code>fail</code> です。100×70 のコンパクトなカードで、現在有効な分岐を緑／赤のラベルで直接示します。',
    ko: '조건 분기 노드는 <b>불리언 조건</b>에 따라 하나의 데이터 흐름을 두 경로 중 하나로 보냅니다. 참이면 <code>pass</code>, 거짓이면 <code>fail</code>로 갑니다. 100×70 크기의 콤팩트한 카드로, 현재 적용된 분기를 카드에 초록/빨강 라벨로 바로 표시합니다.',
    es: 'El nodo Rama condicional dirige un flujo de datos a una de dos ramas según una <b>condición booleana</b>: si es verdadera va a <code>pass</code> y si es falsa a <code>fail</code>. Es una tarjeta compacta de 100×70 que marca la rama activa directamente con una etiqueta verde o roja.',
    ar: 'تُوجِّه عقدة التفريع الشرطي تدفُّق بيانات واحد إلى أحد مسارين وفق <b>شرط منطقي</b>: إذا كان صحيحًا فيسلك <code>pass</code>، وإذا كان خاطئًا فيسلك <code>fail</code>. وهي بطاقة مدمجة بمقاس 100×70 تُبيِّن الفرع النشط مباشرةً بوسم أخضر أو أحمر.',
    fr: 'Le nœud Branche conditionnelle achemine un flux de données vers l’une de deux branches selon une <b>condition booléenne</b> : vrai va vers <code>pass</code>, faux vers <code>fail</code>. C’est une carte compacte de 100×70 qui indique directement la branche active par une étiquette verte ou rouge.',
    pt: 'O nó Ramo condicional encaminha um fluxo de dados para uma de duas ramificações conforme uma <b>condição booleana</b>: verdadeiro vai para <code>pass</code>, falso vai para <code>fail</code>. É um cartão compacto de 100×70 que assinala diretamente o ramo ativo com uma etiqueta verde ou vermelha.',
    ru: 'Узел «Условное ветвление» направляет один поток данных в одну из двух ветвей по <b>логическому условию</b>: истина идёт в <code>pass</code>, ложь — в <code>fail</code>. Это компактная карточка 100×70, на которой текущая ветвь помечается прямо на ней зелёной или красной меткой.'
  },

  // —— 端口 ——
  portsTitle: {
    zh: '端口',
    en: 'Ports',
    ja: 'ポート',
    ko: '포트',
    es: 'Puertos',
    ar: 'المنافذ',
    fr: 'Ports',
    pt: 'Portas',
    ru: 'Порты'
  },
  portsLi1: {
    zh: '输入 <code>cond</code>：<b>布尔条件</b>，只接受 Bool 类型；它决定数据走哪一路。',
    en: 'Input <code>cond</code>: the <b>boolean condition</b>; accepts only Bool. It decides which branch the data takes.',
    ja: '入力 <code>cond</code>：<b>真偽値の条件</b>で、Bool 型のみを受け付けます。データがどちらの経路へ行くかを決めます。',
    ko: '입력 <code>cond</code>: <b>불리언 조건</b>으로 Bool 타입만 받습니다. 데이터가 어느 경로로 갈지 결정합니다.',
    es: 'Entrada <code>cond</code>: la <b>condición booleana</b>; solo acepta Bool. Decide por qué rama va el dato.',
    ar: 'منفذ الإدخال <code>cond</code>: <b>الشرط المنطقي</b>، ويقبل النوع Bool فقط. وهو الذي يحدد المسار الذي يسلكه البيان.',
    fr: 'Entrée <code>cond</code> : la <b>condition booléenne</b> ; n’accepte que le type Bool. Elle détermine la branche empruntée par la donnée.',
    pt: 'Entrada <code>cond</code>: a <b>condição booleana</b>; aceita apenas o tipo Bool. É ela que decide por que ramo o dado segue.',
    ru: 'Вход <code>cond</code>: <b>логическое условие</b>; принимает только тип Bool. Именно оно решает, в какую ветвь пойдут данные.'
  },
  portsLi2: {
    zh: '输入 <code>data</code>：被分流的数据，接受 String / Number / Bool / File 等具体类型；它就是会被原样送到命中一路的那份值。',
    en: 'Input <code>data</code>: the data to route; accepts concrete types such as String / Number / Bool / File. This is the value sent unchanged to the branch that matches.',
    ja: '入力 <code>data</code>：振り分けられるデータで、String / Number / Bool / File などの具象型を受け付けます。これがそのまま命中した経路へ送られる値です。',
    ko: '입력 <code>data</code>: 분기 대상 데이터로 String / Number / Bool / File 등 구체 타입을 받습니다. 이 값이 그대로 해당 경로로 전달됩니다.',
    es: 'Entrada <code>data</code>: el dato que se va a encaminar; acepta tipos concretos como String / Number / Bool / File. Es el valor que se envía sin cambios a la rama que corresponda.',
    ar: 'منفذ الإدخال <code>data</code>: البيان المراد تفريعه، ويقبل أنواعًا محددة مثل String / Number / Bool / File. وهو القيمة التي تُرسَل كما هي إلى المسار المطابق.',
    fr: 'Entrée <code>data</code> : la donnée à aiguiller ; accepte les types concrets tels que String / Number / Bool / File. C’est la valeur transmise telle quelle à la branche correspondante.',
    pt: 'Entrada <code>data</code>: o dado a encaminhar; aceita tipos concretos como String / Number / Bool / File. É o valor enviado tal e qual para o ramo correspondente.',
    ru: 'Вход <code>data</code>: данные для маршрутизации; принимает конкретные типы, такие как String / Number / Bool / File. Именно это значение без изменений уходит в подходящую ветвь.'
  },
  portsLi3: {
    zh: '输出 <code>pass</code>：条件为<b>真</b>时拿到 <code>data</code>（类型跟随上游数据）。',
    en: 'Output <code>pass</code>: receives <code>data</code> when the condition is <b>true</b> (its type follows the upstream data).',
    ja: '出力 <code>pass</code>：条件が<b>真</b>のとき <code>data</code> を受け取ります（型は上流のデータに追随）。',
    ko: '출력 <code>pass</code>: 조건이 <b>참</b>일 때 <code>data</code>를 받습니다(타입은 상위 데이터를 따릅니다).',
    es: 'Salida <code>pass</code>: recibe <code>data</code> cuando la condición es <b>verdadera</b> (su tipo sigue al dato de entrada).',
    ar: 'منفذ الإخراج <code>pass</code>: يستلم <code>data</code> عندما يكون الشرط <b>صحيحًا</b> (ويتبع نوعه نوع البيانات الواردة).',
    fr: 'Sortie <code>pass</code> : reçoit <code>data</code> lorsque la condition est <b>vraie</b> (son type suit celui de la donnée en amont).',
    pt: 'Saída <code>pass</code>: recebe <code>data</code> quando a condição é <b>verdadeira</b> (o tipo segue o dado de montante).',
    ru: 'Выход <code>pass</code>: получает <code>data</code>, когда условие <b>истинно</b> (тип следует за входными данными).'
  },
  portsLi4: {
    zh: '输出 <code>fail</code>：条件为<b>假</b>时拿到 <code>data</code>（类型同样跟随上游数据）。',
    en: 'Output <code>fail</code>: receives <code>data</code> when the condition is <b>false</b> (its type likewise follows the upstream data).',
    ja: '出力 <code>fail</code>：条件が<b>偽</b>のとき <code>data</code> を受け取ります（型は同じく上流のデータに追随）。',
    ko: '출력 <code>fail</code>: 조건이 <b>거짓</b>일 때 <code>data</code>를 받습니다(타입 역시 상위 데이터를 따릅니다).',
    es: 'Salida <code>fail</code>: recibe <code>data</code> cuando la condición es <b>falsa</b> (su tipo también sigue al dato de entrada).',
    ar: 'منفذ الإخراج <code>fail</code>: يستلم <code>data</code> عندما يكون الشرط <b>خاطئًا</b> (ونوعه أيضًا يتبع نوع البيانات الواردة).',
    fr: 'Sortie <code>fail</code> : reçoit <code>data</code> lorsque la condition est <b>fausse</b> (son type suit également la donnée en amont).',
    pt: 'Saída <code>fail</code>: recebe <code>data</code> quando a condição é <b>falsa</b> (o tipo também segue o dado de montante).',
    ru: 'Выход <code>fail</code>: получает <code>data</code>, когда условие <b>ложно</b> (тип также следует за входными данными).'
  },

  // —— 运行方式 ——
  runTitle: {
    zh: '运行方式',
    en: 'How it runs',
    ja: '動作の仕組み',
    ko: '동작 방식',
    es: 'Cómo funciona',
    ar: 'كيفية العمل',
    fr: 'Fonctionnement',
    pt: 'Como funciona',
    ru: 'Как это работает'
  },
  runLi1: {
    zh: '任一侧输入变化（条件改了、数据改了、或某条边断开清值）都会触发<b>重新计算</b>。',
    en: 'Any change on either input — the condition changes, the data changes, or an edge disconnects and clears its value — triggers a <b>recomputation</b>.',
    ja: 'どちらか一方の入力の変化（条件の変更、データの変更、辺の切断による値のクリア）が<b>再計算</b>を引き起こします。',
    ko: '어느 한쪽 입력이 바뀌면(조건 변경, 데이터 변경, 연결이 끊겨 값이 비워진 경우) <b>재계산</b>이 일어납니다.',
    es: 'Cualquier cambio en cualquiera de las entradas —cambia la condición, cambia el dato o se desconecta una arista y se borra su valor— provoca un <b>recálculo</b>.',
    ar: 'أي تغيُّر في أحد الإدخالين (تغيُّر الشرط أو تغيُّر البيان أو انقطاع حافة تُفرِّغ قيمتها) يؤدي إلى <b>إعادة الحساب</b>.',
    fr: 'Toute modification sur l’une des entrées — changement de condition, changement de donnée, ou déconnexion d’une arête qui efface sa valeur — déclenche un <b>recalcul</b>.',
    pt: 'Qualquer alteração numa das entradas — a condição muda, o dado muda, ou uma ligação se desfaz e limpa o seu valor — provoca um <b>recálculo</b>.',
    ru: 'Любое изменение на одном из входов — смена условия, смена данных или разрыв связи, очищающий значение, — запускает <b>пересчёт</b>.'
  },
  runLi2: {
    zh: '每次计算前会先把 <code>pass</code> 和 <code>fail</code> <b>两路输出都清空</b>，避免上一次的旧值残留在下游。',
    en: 'Before each computation both <code>pass</code> and <code>fail</code> outputs are <b>cleared first</b>, so the previous value never lingers downstream.',
    ja: '計算の前に <code>pass</code> と <code>fail</code> の<b>両方の出力を先にクリア</b>し、前回の古い値が下流に残らないようにします。',
    ko: '계산 전에 <code>pass</code>와 <code>fail</code> <b>양쪽 출력을 먼저 비워</b> 이전 값이 하위에 남지 않게 합니다.',
    es: 'Antes de cada cálculo se <b>vacían primero ambas salidas</b> <code>pass</code> y <code>fail</code>, para que el valor anterior no quede en los nodos posteriores.',
    ar: 'قبل كل عملية حساب تُفرَّغ <b>مخرجات المسارين معًا</b> <code>pass</code> و<code>fail</code> أولًا، حتى لا تبقى القيمة السابقة في العقد اللاحقة.',
    fr: 'Avant chaque calcul, <b>les deux sorties</b> <code>pass</code> et <code>fail</code> sont <b>vidées d’abord</b>, afin que l’ancienne valeur ne subsiste pas en aval.',
    pt: 'Antes de cada cálculo, <b>ambas as saídas</b> <code>pass</code> e <code>fail</code> são <b>limpas primeiro</b>, para que o valor anterior não permaneça a jusante.',
    ru: 'Перед каждым вычислением <b>оба выхода</b> <code>pass</code> и <code>fail</code> <b>сначала очищаются</b>, чтобы старое значение не осталось у последующих узлов.'
  },
  runLi3: {
    zh: '条件或数据<b>还没到齐</b>时，两路输出都为空，节点处于<b>等待</b>状态，卡片上画灰色虚线。',
    en: 'While the condition or the data is <b>not yet ready</b>, both outputs stay empty, the node <b>waits</b>, and the card draws a grey dashed line.',
    ja: '条件またはデータが<b>まだ揃っていない</b>間は、両方の出力が空のままノードは<b>待機</b>し、カードには灰色の破線が描かれます。',
    ko: '조건이나 데이터가 <b>아직 다 도착하지 않으면</b> 두 출력 모두 비어 있고 노드는 <b>대기</b> 상태이며 카드에 회색 점선이 그려집니다.',
    es: 'Mientras la condición o el dato <b>aún no estén completos</b>, ambas salidas permanecen vacías, el nodo <b>espera</b> y la tarjeta dibuja una línea gris discontinua.',
    ar: 'ما دام الشرط أو البيان <b>لم يكتمل بعد</b>، يبقى المخرَجان فارغين وتكون العقدة في حالة <b>انتظار</b>، مع رسم خط رمادي متقطع على البطاقة.',
    fr: 'Tant que la condition ou la donnée <b>n’est pas encore disponible</b>, les deux sorties restent vides, le nœud <b>attend</b> et la carte affiche une ligne grise en pointillés.',
    pt: 'Enquanto a condição ou o dado <b>ainda não estiverem prontos</b>, ambas as saídas ficam vazias, o nó <b>aguarda</b> e o cartão desenha uma linha cinzenta tracejada.',
    ru: 'Пока условие или данные <b>ещё не готовы</b>, оба выхода остаются пустыми, узел <b>ждёт</b>, а на карточке рисуется серая пунктирная линия.'
  },
  runLi4: {
    zh: '数据只送往<b>命中的那一路</b>，另一路保持为空。',
    en: 'The data is sent to <b>only the matching branch</b>; the other stays empty.',
    ja: 'データは<b>命中した経路にだけ</b>送られ、もう一方は空のままです。',
    ko: '데이터는 <b>해당되는 한 경로로만</b> 전달되고 다른 경로는 비어 있습니다.',
    es: 'El dato se envía <b>solo a la rama que corresponde</b>; la otra permanece vacía.',
    ar: 'يُرسَل البيان إلى <b>المسار المطابق فقط</b>، ويبقى المسار الآخر فارغًا.',
    fr: 'La donnée n’est envoyée <b>qu’à la branche correspondante</b> ; l’autre reste vide.',
    pt: 'O dado é enviado <b>apenas para o ramo correspondente</b>; o outro permanece vazio.',
    ru: 'Данные отправляются <b>только в подходящую ветвь</b>, а другая остаётся пустой.'
  },

  // —— 注意事项 ——
  notesTitle: {
    zh: '注意事项',
    en: 'Notes',
    ja: '注意事項',
    ko: '유의 사항',
    es: 'Notas',
    ar: 'ملاحظات',
    fr: 'Remarques',
    pt: 'Notas',
    ru: 'Примечания'
  },
  notesLi1: {
    zh: '卡片右侧绿色 <code>✓通过</code> / 红色 <code>✗驳回</code> 标签分别代表条件为真 / 假，灰色虚线表示<b>待定</b>（条件还没到）。',
    en: 'The green <code>✓ Pass</code> / red <code>✗ Reject</code> labels on the card’s right stand for a true / false condition, while the grey dashed line means <b>pending</b> (no condition yet).',
    ja: 'カード右側の緑 <code>✓通過</code> / 赤 <code>✗却下</code> ラベルはそれぞれ条件が真／偽を表し、灰色の破線は<b>保留</b>（条件未到）を意味します。',
    ko: '카드 오른쪽의 초록 <code>✓ 통과</code> / 빨강 <code>✗ 반려</code> 라벨은 각각 조건이 참/거짓임을 나타내고, 회색 점선은 <b>보류</b>(조건 미도착)를 뜻합니다.',
    es: 'Las etiquetas verde <code>✓ Pasa</code> / roja <code>✗ Rechaza</code> a la derecha de la tarjeta indican condición verdadera / falsa, y la línea gris discontinua significa <b>pendiente</b> (sin condición todavía).',
    ar: 'يشير الوسمان الأخضر <code>✓ يمر</code> / الأحمر <code>✗ يُرفض</code> على يمين البطاقة إلى شرط صحيح / خاطئ، أما الخط الرمادي المتقطع فيعني <b>معلَّق</b> (لم يصل الشرط بعد).',
    fr: 'Les étiquettes verte <code>✓ Pass</code> / rouge <code>✗ Rejet</code> à droite de la carte indiquent une condition vraie / fausse, et la ligne grise en pointillés signifie <b>en attente</b> (condition non reçue).',
    pt: 'As etiquetas verde <code>✓ Passa</code> / vermelha <code>✗ Rejeita</code> à direita do cartão indicam condição verdadeira / falsa, e a linha cinzenta tracejada significa <b>pendente</b> (condição ainda não recebida).',
    ru: 'Зелёная метка <code>✓ Пропустить</code> / красная <code>✗ Отклонить</code> справа на карточке означают истинное / ложное условие, а серая пунктирная линия — <b>ожидание</b> (условие ещё не пришло).'
  },
  notesLi2: {
    zh: '输出 <code>pass</code> / <code>fail</code> 的<b>类型跟随上游数据类型动态重建</b>：上游数据类型一旦改变，端口会拆旧建新，<b>原来连到旧端口的下游连线会断开</b>（与代码节点切换返回类型同理）。换数据类型前请留意已连好的下游。',
    en: 'The <code>pass</code> / <code>fail</code> outputs are <b>rebuilt dynamically to match the upstream data type</b>: once that type changes, the ports are torn down and recreated, and <b>any downstream edges attached to the old ports are disconnected</b> (the same as a code node switching its return type). Watch the downstream you have already wired up before changing the data type.',
    ja: '出力 <code>pass</code> / <code>fail</code> の<b>型は上流のデータ型に追随して動的に再構築</b>されます。上流のデータ型が変わるとポートは作り直され、<b>旧ポートに接続していた下流の辺は切断されます</b>（コードノードの戻り値の型切り替えと同じ）。データ型を変える前に、接続済みの下流にご注意ください。',
    ko: '출력 <code>pass</code> / <code>fail</code>의 <b>타입은 상위 데이터 타입을 따라 동적으로 재구성</b>됩니다. 상위 데이터 타입이 바뀌면 포트는 헐고 다시 만들며, <b>기존 포트에 연결해 둔 하위 연결은 끊어집니다</b>(코드 노드의 반환 타입 전환과 동일). 데이터 타입을 바꾸기 전에 이미 연결한 하위를 확인하세요.',
    es: 'Las salidas <code>pass</code> / <code>fail</code> se <b>reconstruyen dinámicamente según el tipo del dato de entrada</b>: en cuanto ese tipo cambia, los puertos se eliminan y se crean de nuevo, y <b>las conexiones posteriores enganchadas a los puertos antiguos se desconectan</b> (igual que un nodo de código al cambiar su tipo de retorno). Revisa lo que ya está conectado antes de cambiar el tipo del dato.',
    ar: 'يُعاد <b>بناء</b> مخرجَي <code>pass</code> / <code>fail</code> <b>ديناميكيًا وفق نوع البيانات الواردة</b>: فبمجرد تغيُّر ذلك النوع يُهدَم المنفذان ويُعاد إنشاؤهما، و<b>تنقطع الوصلات اللاحقة المرتبطة بالمنفذين القديمين</b> (تمامًا كما تفعل عقدة الكود عند تبديل نوع الإرجاع). انتبه إلى ما وصَّلته مسبقًا قبل تغيير نوع البيانات.',
    fr: 'Les sorties <code>pass</code> / <code>fail</code> sont <b>reconstruites dynamiquement selon le type de la donnée en amont</b> : dès que ce type change, les ports sont détruits puis recréés, et <b>les connexions en aval attachées aux anciens ports sont rompues</b> (comme un nœud de code qui change son type de retour). Vérifiez ce qui est déjà connecté avant de changer le type de la donnée.',
    pt: 'As saídas <code>pass</code> / <code>fail</code> são <b>reconstruídas dinamicamente conforme o tipo do dado de montante</b>: assim que esse tipo muda, as portas são desfeitas e recriadas, e <b>as ligações a jusante presas às portas antigas são desligadas</b> (tal como um nó de código ao mudar o tipo de retorno). Verifique o que já está ligado antes de mudar o tipo do dado.',
    ru: 'Выходы <code>pass</code> / <code>fail</code> <b>пересоздаются динамически под тип входных данных</b>: как только этот тип меняется, порты удаляются и создаются заново, а <b>связи у последующих узлов, привязанные к старым портам, разрываются</b> (так же, как у узла кода при смене типа возврата). Проверьте, что уже подключено, прежде чем менять тип данных.'
  },
  notesLi3: {
    zh: '节点本身<b>没有可配置项</b>，也<b>不保存状态</b>；重启后上游一变就会重新计算填上结果。它也不接收文件拖入。',
    en: 'The node itself has <b>no configurable options</b> and <b>saves no state</b>; after a restart it simply recomputes once the upstream changes. It also does not accept dragged-in files.',
    ja: 'ノード自体に<b>設定項目はなく</b>、<b>状態も保存しません</b>。再起動後は上流が変われば再計算して結果を埋めます。ファイルのドロップも受け付けません。',
    ko: '노드 자체에는 <b>설정 항목이 없고</b> <b>상태도 저장하지 않습니다</b>. 재시작 후 상위가 바뀌면 다시 계산해 결과를 채웁니다. 파일 끌어오기도 받지 않습니다.',
    es: 'El nodo no tiene <b>opciones configurables</b> ni <b>guarda estado</b>; tras reiniciar, se recalcula en cuanto cambia la entrada. Tampoco acepta archivos arrastrados.',
    ar: 'لا يملك العقد نفسه <b>أي خيارات قابلة للضبط</b> ولا <b>يحفظ أي حالة</b>؛ فبعد إعادة التشغيل يُعاد الحساب بمجرد تغيُّر المدخلات. كما لا يقبل إفلات الملفات عليه.',
    fr: 'Le nœud lui-même n’a <b>aucune option configurable</b> et <b>ne conserve aucun état</b> ; après un redémarrage, il recalcule dès que l’amont change. Il n’accepte pas non plus le dépôt de fichiers.',
    pt: 'O nó em si <b>não tem opções configuráveis</b> nem <b>guarda estado</b>; após reiniciar, recalcula assim que a montante muda. Também não aceita ficheiros arrastados.',
    ru: 'У самого узла <b>нет настраиваемых параметров</b> и он <b>не сохраняет состояние</b>; после перезапуска он просто пересчитывает результат при изменении входов. Он также не принимает перетаскиваемые в него файлы.'
  }
} satisfies Record<string, LocalizedText>