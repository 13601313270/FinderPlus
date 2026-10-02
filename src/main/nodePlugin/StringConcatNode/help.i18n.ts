import type { LocalizedText } from '../../../shared/language'

/**
 * StringConcat 节点帮助文档（StringConcatHelpDialog）的全部文案，9 种语言全配。
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
    zh: '字符串拼接节点把若干字符串输入按<b>模板</b>拼成一条新字符串，结果从右侧 <code>text</code> 端口输出给下游节点。模板里用 <code>$1</code> <code>$2</code> … 引用第 N 个输入端口的值。',
    en: 'The String Concat node joins several string inputs into a new string according to a <b>template</b>, and outputs the result to downstream nodes from the <code>text</code> port on the right. In the template, use <code>$1</code> <code>$2</code> … to reference the value of the Nth input port.',
    ja: '文字列連結ノードは、複数の文字列入力を<b>テンプレート</b>に従って1つの新しい文字列に連結し、結果を右側の <code>text</code> ポートから下流ノードへ出力します。テンプレート内では <code>$1</code> <code>$2</code> … で N 番目の入力ポートの値を参照します。',
    ko: '문자열 연결 노드는 여러 문자열 입력을 <b>템플릿</b>에 따라 하나의 새 문자열로 결합하고, 결과를 오른쪽 <code>text</code> 포트에서 하위 노드로 출력합니다. 템플릿에서는 <code>$1</code> <code>$2</code> … 로 N번째 입력 포트의 값을 참조합니다.',
    es: 'El nodo Concatenar cadenas une varias entradas de cadena en una nueva cadena según una <b>plantilla</b>, y envía el resultado a los nodos posteriores desde el puerto <code>text</code> de la derecha. En la plantilla, usa <code>$1</code> <code>$2</code> … para referenciar el valor del enésimo puerto de entrada.',
    ar: 'تعمل عقدة دمج النصوص على دمج عدة مدخلات نصية في نص جديد وفق <b>قالب</b>، وتُخرج النتيجة إلى العقد اللاحقة من منفذ <code>text</code> على اليمين. في القالب، استخدم <code>$1</code> <code>$2</code> … للإشارة إلى قيمة المنفذ رقم N.',
    fr: 'Le nœud Concaténation de chaînes assemble plusieurs entrées de chaîne en une nouvelle chaîne selon un <b>modèle</b>, et envoie le résultat aux nœuds en aval depuis le port <code>text</code> à droite. Dans le modèle, utilisez <code>$1</code> <code>$2</code> … pour référencer la valeur du Nième port d’entrée.',
    pt: 'O nó Concatenar strings une várias entradas de string em uma nova string segundo um <b>modelo</b>, e envia o resultado aos nós seguintes pelo porto <code>text</code> à direita. No modelo, use <code>$1</code> <code>$2</code> … para referenciar o valor do enésimo porto de entrada.',
    ru: 'Узел «Конкатенация строк» объединяет несколько строковых входов в новую строку по <b>шаблону</b> и выводит результат последующим узлам из порта <code>text</code> справа. В шаблоне используйте <code>$1</code> <code>$2</code> … для ссылки на значение N-го входного порта.'
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
    es: 'Cada puerto de entrada acepta solo <b>cadenas</b>; las etiquetas de los puertos son <code>$1</code>, <code>$2</code>, … en orden',
    ar: 'يقبل كل منفذ إدخال <b>النصوص</b> فقط، وتكون تسميات المنافذ <code>$1</code> و<code>$2</code>… بالترتيب',
    fr: 'Chaque port d’entrée n’accepte que des <b>chaînes</b> ; les libellés des ports sont <code>$1</code>, <code>$2</code>, … dans l’ordre',
    pt: 'Cada porto de entrada aceita apenas <b>strings</b>; os rótulos dos portos são <code>$1</code>, <code>$2</code>, … em ordem',
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
    ar: 'كتابة <code>$N</code> في القالب تأخذ قيمة المنفذ رقم N؛ وإذا لم يكن لهذا المنفذ قيمة أو لم يكن موجودًا، فيُستبدل بـ<b>نص فارغ</b>',
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

  // —— 实时联动 ——
  liveTitle: {
    zh: '实时联动',
    en: 'Live updates',
    ja: 'リアルタイム連動',
    ko: '실시간 연동',
    es: 'Actualización en vivo',
    ar: 'تحديث فوري',
    fr: 'Mise à jour en direct',
    pt: 'Atualização em tempo real',
    ru: 'Обновление в реальном времени'
  },
  liveLi1: {
    zh: '模板或任一输入变化都会<b>立即重新拼接</b>，并把结果提交到输出端口，下游节点跟着刷新',
    en: 'Changing the template or any input <b>re-concatenates immediately</b> and commits the result to the output port, refreshing downstream nodes',
    ja: 'テンプレートまたはいずれかの入力が変わると<b>即座に再連結</b>し、結果を出力ポートに commit して下流ノードが更新されます',
    ko: '템플릿이나 임의의 입력이 바뀌면 <b>즉시 다시 결합</b>하고 결과를 출력 포트에 commit하여 하위 노드가 갱신됩니다',
    es: 'Cambiar la plantilla o cualquier entrada <b>vuelve a concatenar al instante</b> y confirma el resultado en el puerto de salida, actualizando los nodos posteriores',
    ar: 'يؤدي تغيير القالب أو أي مدخل إلى <b>إعادة الدمج فورًا</b> وإرسال النتيجة إلى منفذ الإخراج، فتتحدّث العقد اللاحقة',
    fr: 'Modifier le modèle ou une entrée <b>reconcatène immédiatement</b> et valide le résultat sur le port de sortie, rafraîchissant les nœuds en aval',
    pt: 'Alterar o modelo ou qualquer entrada <b>reconcatena imediatamente</b> e confirma o resultado no porto de saída, atualizando os nós seguintes',
    ru: 'Изменение шаблона или любого входа <b>сразу пересобирает</b> результат и отправляет его в выходной порт, обновляя последующие узлы'
  },
  liveLi2: {
    zh: '卡片底部的结果区实时预览当前拼接结果',
    en: 'The result area at the bottom of the card previews the current concatenated result in real time',
    ja: 'カード下部の結果エリアに現在の連結結果がリアルタイムで表示されます',
    ko: '카드 하단의 결과 영역에서 현재 결합 결과를 실시간으로 미리 봅니다',
    es: 'El área de resultado en la parte inferior de la tarjeta previsualiza el resultado concatenado actual en tiempo real',
    ar: 'تعرض منطقة النتيجة أسفل البطاقة النتيجة المدمجة الحالية في الوقت الفعلي',
    fr: 'La zone de résultat en bas de la carte affiche en temps réel le résultat concaténé actuel',
    pt: 'A área de resultado na parte inferior do cartão pré-visualiza o resultado concatenado atual em tempo real',
    ru: 'Область результата внизу карточки показывает текущий результат в реальном времени'
  },

  // —— 示例 ——
  exampleTitle: {
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
  exampleLabel: {
    zh: '例：模板 <code>https://$1/$2</code>，$1 是域名、$2 是路径',
    en: 'Example: template <code>https://$1/$2</code>, where $1 is the domain and $2 is the path',
    ja: '例：テンプレート <code>https://$1/$2</code>、$1 はドメイン、$2 はパス',
    ko: '예: 템플릿 <code>https://$1/$2</code>, $1은 도메인, $2는 경로',
    es: 'Ejemplo: plantilla <code>https://$1/$2</code>, donde $1 es el dominio y $2 la ruta',
    ar: 'مثال: القالب <code>https://$1/$2</code>، حيث $1 هو النطاق و$2 هو المسار',
    fr: 'Exemple : modèle <code>https://$1/$2</code>, où $1 est le domaine et $2 le chemin',
    pt: 'Exemplo: modelo <code>https://$1/$2</code>, onde $1 é o domínio e $2 o caminho',
    ru: 'Пример: шаблон <code>https://$1/$2</code>, где $1 — домен, $2 — путь'
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
    zh: '// 结果',
    en: '// Result',
    ja: '// 結果',
    ko: '// 결과',
    es: '// Resultado',
    ar: '// النتيجة',
    fr: '// Résultat',
    pt: '// Resultado',
    ru: '// Результат'
  }
} satisfies Record<string, LocalizedText>