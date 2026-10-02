import type { LocalizedText } from '../../../shared/language'

/**
 * BoolInput 节点帮助文档（BoolInputHelpDialog）的全部文案，9 种语言全配。
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
    zh: '布尔输入节点是一个<b>源头节点</b>：卡片上的开关拨到哪边，就通过右侧 <code>bool</code> 端口向下游送出对应的布尔值（<code>true</code> 或 <code>false</code>）。它没有输入端口，取值完全由你手动切换。',
    en: 'The Boolean Input node is a <b>source node</b>: whichever way the switch on the card is set, it sends the corresponding boolean (<code>true</code> or <code>false</code>) to downstream nodes from the <code>bool</code> port on the right. It has no input ports, so the value is entirely controlled by your clicks.',
    ja: 'ブール入力ノードは<b>ソースノード</b>です。カード上のスイッチをどちら側に倒したかによって、対応するブール値（<code>true</code> または <code>false</code>）を右側の <code>bool</code> ポートから下流ノードへ送出します。入力ポートはなく、値はすべて手動で切り替えます。',
    ko: '불리언 입력 노드는 <b>소스 노드</b>입니다. 카드의 스위치를 어느 쪽으로 두었는지에 따라 해당 불리언 값(<code>true</code> 또는 <code>false</code>)을 오른쪽 <code>bool</code> 포트에서 하위 노드로 보냅니다. 입력 포트가 없으며 값은 전적으로 직접 전환합니다.',
    es: 'El nodo Entrada booleana es un <b>nodo de origen</b>: según cómo esté puesto el interruptor de la tarjeta, envía el booleano correspondiente (<code>true</code> o <code>false</code>) a los nodos posteriores desde el puerto <code>bool</code> de la derecha. No tiene puertos de entrada, por lo que el valor lo controlas por completo tú.',
    ar: 'عقدة الإدخال المنطقي هي <b>عقدة مصدر</b>: فبغضّ النظر عن موضع المفتاح في البطاقة، ترسل القيمة المنطقية المقابلة (<code>true</code> أو <code>false</code>) إلى العقد اللاحقة من منفذ <code>bool</code> على اليمين. ليس لها منافذ إدخال، وتتحكم أنت بالقيمة كليًا.',
    fr: 'Le nœud Entrée booléenne est un <b>nœud source</b> : selon la position de l’interrupteur sur la carte, il envoie le booléen correspondant (<code>true</code> ou <code>false</code>) aux nœuds en aval depuis le port <code>bool</code> à droite. Il n’a pas de port d’entrée : la valeur est entièrement contrôlée par vos clics.',
    pt: 'O nó Entrada booleana é um <b>nó de origem</b>: conforme a posição do interruptor no cartão, envia o booleano correspondente (<code>true</code> ou <code>false</code>) aos nós seguintes pelo porto <code>bool</code> à direita. Ele não tem portas de entrada, então o valor é totalmente controlado por você.',
    ru: 'Узел «Логический ввод» — это <b>узел-источник</b>: в зависимости от положения переключателя на карточке он отправляет соответствующее логическое значение (<code>true</code> или <code>false</code>) последующим узлам из порта <code>bool</code> справа. Входных портов у него нет, и значение полностью задаётся вручную.'
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
    zh: '点击卡片上的开关即可切换：开启（开关靠右）提交 <code>true</code>，关闭（开关靠左）提交 <code>false</code>，旁边的文字会同步显示当前值',
    en: 'Click the switch on the card to toggle: on (knob to the right) commits <code>true</code>, off (knob to the left) commits <code>false</code>, and the text beside it shows the current value',
    ja: 'カード上のスイッチをクリックして切り替えます。オン（つまみが右）で <code>true</code>、オフ（つまみが左）で <code>false</code> を commit し、隣のテキストに現在値が表示されます',
    ko: '카드의 스위치를 클릭해 전환합니다. 켜짐(손잡이가 오른쪽)이면 <code>true</code>, 꺼짐(손잡이가 왼쪽)이면 <code>false</code>를 commit하며, 옆의 텍스트가 현재 값을 함께 보여줍니다',
    es: 'Haz clic en el interruptor de la tarjeta para alternar: activado (botón a la derecha) confirma <code>true</code>, desactivado (botón a la izquierda) confirma <code>false</code>, y el texto de al lado muestra el valor actual',
    ar: 'انقر على المفتاح في البطاقة للتبديل: التشغيل (المقبض إلى اليمين) يرسل <code>true</code>، والإيقاف (المقبض إلى اليسار) يرسل <code>false</code>، ويعرض النص المجاور القيمة الحالية',
    fr: 'Cliquez sur l’interrupteur de la carte pour basculer : activé (bouton à droite) valide <code>true</code>, désactivé (bouton à gauche) valide <code>false</code>, et le texte à côté affiche la valeur actuelle',
    pt: 'Clique no interruptor do cartão para alternar: ligado (botão à direita) confirma <code>true</code>, desligado (botão à esquerda) confirma <code>false</code>, e o texto ao lado mostra o valor atual',
    ru: 'Нажмите переключатель на карточке, чтобы изменить состояние: включено (бегунок справа) отправляет <code>true</code>, выключено (бегунок слева) — <code>false</code>, а текст рядом показывает текущее значение'
  },
  useLi2: {
    zh: '每次切换都会<b>立即</b>把新值提交到输出端口，下游节点随之刷新',
    en: 'Each toggle <b>immediately</b> commits the new value to the output port, refreshing downstream nodes',
    ja: '切り替えるたびに新しい値が<b>即座に</b>出力ポートへ commit され、下流ノードが更新されます',
    ko: '전환할 때마다 새 값이 <b>즉시</b> 출력 포트에 commit되어 하위 노드가 갱신됩니다',
    es: 'Cada cambio confirma el nuevo valor <b>al instante</b> en el puerto de salida, actualizando los nodos posteriores',
    ar: 'كل تبديل يقوم <b>فورًا</b> بإرسال القيمة الجديدة إلى منفذ الإخراج، فتتحدّث العقد اللاحقة',
    fr: 'Chaque basculement valide <b>immédiatement</b> la nouvelle valeur sur le port de sortie, rafraîchissant les nœuds en aval',
    pt: 'Cada alternância confirma <b>imediatamente</b> o novo valor no porto de saída, atualizando os nós seguintes',
    ru: 'Каждое переключение <b>сразу</b> отправляет новое значение в выходной порт, обновляя последующие узлы'
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
    zh: '右侧只有一个 <code>bool</code> 输出端口，送出的是布尔值（<code>true</code> 或 <code>false</code>）',
    en: 'There is a single <code>bool</code> output port on the right, carrying a boolean value (<code>true</code> or <code>false</code>)',
    ja: '右側には <code>bool</code> 出力ポートが1つだけあり、ブール値（<code>true</code> または <code>false</code>）を送出します',
    ko: '오른쪽에는 <code>bool</code> 출력 포트가 하나뿐이며, 불리언 값(<code>true</code> 또는 <code>false</code>)을 보냅니다',
    es: 'A la derecha hay un único puerto de salida <code>bool</code>, que lleva un valor booleano (<code>true</code> o <code>false</code>)',
    ar: 'يوجد منفذ إخراج واحد <code>bool</code> على اليمين، ويحمل قيمة منطقية (<code>true</code> أو <code>false</code>)',
    fr: 'Il n’y a qu’un seul port de sortie <code>bool</code> à droite, transportant une valeur booléenne (<code>true</code> ou <code>false</code>)',
    pt: 'Há apenas uma porta de saída <code>bool</code> à direita, transportando um valor booleano (<code>true</code> ou <code>false</code>)',
    ru: 'Справа есть единственный выходной порт <code>bool</code>, передающий логическое значение (<code>true</code> или <code>false</code>)'
  },
  portsLi2: {
    zh: '本节点<b>没有输入端口</b>，值只由卡片上的开关决定；下游节点能否接入由引擎按类型判定',
    en: 'This node has <b>no input ports</b>; the value is determined solely by the switch on the card, and whether a downstream node can connect is decided by the engine based on type',
    ja: 'このノードには<b>入力ポートがありません</b>。値はカード上のスイッチだけで決まり、下流ノードが接続できるかはエンジンが型で判定します',
    ko: '이 노드에는 <b>입력 포트가 없습니다</b>. 값은 카드의 스위치로만 결정되며, 하위 노드의 연결 가능 여부는 엔진이 타입으로 판정합니다',
    es: 'Este nodo <b>no tiene puertos de entrada</b>; el valor lo determina solo el interruptor de la tarjeta, y si un nodo posterior puede conectarse lo decide el motor según el tipo',
    ar: 'لا تحتوي هذه العقدة على <b>منافذ إدخال</b>؛ تُحدَّد القيمة فقط بالمفتاح في البطاقة، ويقرّر المحرك إمكانية اتصال العقدة اللاحقة بناءً على النوع',
    fr: 'Ce nœud n’a <b>aucun port d’entrée</b> ; la valeur dépend uniquement de l’interrupteur sur la carte, et la possibilité de connexion d’un nœud en aval est décidée par le moteur selon le type',
    pt: 'Este nó <b>não tem portas de entrada</b>; o valor é determinado apenas pelo interruptor no cartão, e se um nó seguinte pode conectar é decidido pelo motor com base no tipo',
    ru: 'У этого узла <b>нет входных портов</b>; значение определяется только переключателем на карточке, а возможность подключения последующего узла движок решает по типу'
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
    zh: '开关状态会随工作区<b>一同保存</b>；重新打开工作区时自动恢复，并把恢复后的值重新提交给下游节点',
    en: 'The switch state is <b>saved with the workspace</b>; when the workspace is reopened it is restored automatically and the restored value is re-committed to downstream nodes',
    ja: 'スイッチの状態はワークスペースと<b>一緒に保存</b>されます。ワークスペースを開き直すと自動的に復元され、復元後の値が下流ノードへ再び commit されます',
    ko: '스위치 상태는 작업 공간과 <b>함께 저장</b>됩니다. 작업 공간을 다시 열면 자동으로 복원되고, 복원된 값이 하위 노드로 다시 commit됩니다',
    es: 'El estado del interruptor se <b>guarda junto con el espacio de trabajo</b>; al reabrirlo se restaura automáticamente y el valor restaurado se vuelve a confirmar en los nodos posteriores',
    ar: 'تُحفَظ حالة المفتاح <b>مع مساحة العمل</b>؛ وعند إعادة فتحها تُستعاد تلقائيًا وتُرسَل القيمة المُستعادة مرة أخرى إلى العقد اللاحقة',
    fr: 'L’état de l’interrupteur est <b>enregistré avec l’espace de travail</b> ; à sa réouverture, il est restauré automatiquement et la valeur restaurée est de nouveau validée sur les nœuds en aval',
    pt: 'O estado do interruptor é <b>salvo junto com o workspace</b>; ao reabri-lo, ele é restaurado automaticamente e o valor restaurado é novamente confirmado nos nós seguintes',
    ru: 'Состояние переключателя <b>сохраняется вместе с рабочим пространством</b>; при повторном открытии оно восстанавливается автоматически, а восстановленное значение заново отправляется последующим узлам'
  },
  notesLi2: {
    zh: '只有值真正变化时才会提交新值；但从保存状态恢复时，即使与默认值相同也会提交一次，确保下游拿到正确结果',
    en: 'A new value is committed only when it actually changes; however, when restoring from a saved state it is committed once even if it equals the default, so downstream gets the correct result',
    ja: '新しい値は実際に変化したときだけ commit されます。ただし保存状態からの復元時は、既定値と同じでも一度 commit され、下流が正しい結果を受け取れます',
    ko: '값이 실제로 바뀔 때만 새 값이 commit됩니다. 다만 저장된 상태에서 복원할 때는 기본값과 같아도 한 번 commit되어 하위가 올바른 결과를 받습니다',
    es: 'Un valor nuevo solo se confirma cuando cambia de verdad; sin embargo, al restaurar desde un estado guardado se confirma una vez aunque coincida con el valor por defecto, para que los nodos posteriores reciban el resultado correcto',
    ar: 'لا تُرسَل قيمة جديدة إلا عند تغيّرها فعليًا؛ لكن عند الاستعادة من حالة محفوظة تُرسَل مرة واحدة حتى لو طابقت القيمة الافتراضية، لضمان حصول العقد اللاحقة على النتيجة الصحيحة',
    fr: 'Une nouvelle valeur n’est validée que lorsqu’elle change réellement ; toutefois, lors d’une restauration depuis un état enregistré, elle est validée une fois même si elle égale la valeur par défaut, afin que les nœuds en aval reçoivent le bon résultat',
    pt: 'Um novo valor só é confirmado quando muda de fato; porém, ao restaurar de um estado salvo ele é confirmado uma vez mesmo que seja igual ao valor padrão, para que os nós seguintes recebam o resultado correto',
    ru: 'Новое значение отправляется только при его фактическом изменении; однако при восстановлении из сохранённого состояния оно отправляется один раз, даже если совпадает со значением по умолчанию, чтобы последующие узлы получили верный результат'
  }
} satisfies Record<string, LocalizedText>