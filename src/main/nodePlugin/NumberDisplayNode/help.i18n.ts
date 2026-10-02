import type { LocalizedText } from '../../../shared/language'

/**
 * NumberDisplay 节点帮助文档（NumberDisplayHelpDialog）的全部文案，全部 15 种语言全配。
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
    ru: 'Что это?',
    hi: 'यह क्या है?',
    id: 'Apa ini?',
    de: 'Was ist das?',
    vi: 'Đây là gì?',
    tr: 'Bu nedir?',
    it: 'Che cos’è?'
  },
  whatBody: {
    zh: '数字展示节点把上游传入的数字<b>原样显示</b>在卡片里。它没有输出端口——它的产出就是「展示」这件事本身，常用来查看或调试上游节点的结果。',
    en: 'The Number Display node <b>shows</b> the number sent from upstream right in the card. It has no output port — its output is the act of displaying itself, handy for inspecting or debugging the results of upstream nodes.',
    ja: '数値表示ノードは、上流から渡された数値をカード内に<b>そのまま表示</b>します。出力ポートは持ちません——表示すること自体が役割で、上流ノードの結果の確認やデバッグに便利です。',
    ko: '숫자 표시 노드는 상위에서 전달된 숫자를 카드 안에 <b>그대로 표시</b>합니다. 출력 포트는 없습니다. 표시하는 것 자체가 역할이며, 상위 노드의 결과를 확인하거나 디버깅할 때 유용합니다.',
    es: 'El nodo Mostrar número <b>muestra</b> directamente en la tarjeta el número que llega desde aguas arriba. No tiene puerto de salida: su resultado es el propio hecho de mostrar, útil para inspeccionar o depurar los resultados de los nodos anteriores.',
    ar: 'تعمل عقدة عرض الرقم على <b>عرض</b> الرقم الوارد من العقد السابقة مباشرةً داخل البطاقة. لا يوجد لها منفذ إخراج — فمخرَجها هو فعل العرض نفسه، وهو مفيد لفحص نتائج العقد السابقة أو تصحيحها.',
    fr: 'Le nœud Affichage nombre <b>affiche</b> directement dans la carte le nombre envoyé en amont. Il n’a pas de port de sortie : son résultat est l’affichage lui-même, pratique pour inspecter ou déboguer les résultats des nœuds en amont.',
    pt: 'O nó Exibir número <b>mostra</b> o número que chega de montante diretamente no cartão. Ele não tem porto de saída: seu resultado é o próprio ato de exibir, útil para inspecionar ou depurar os resultados dos nós anteriores.',
    ru: 'Узел «Отображение числа» <b>показывает</b> число, пришедшее от вышестоящих узлов, прямо в карточке. У него нет выходного порта — его результат и есть само отображение; это удобно для просмотра и отладки результатов вышестоящих узлов.',
    hi: 'संख्या प्रदर्शन नोड अपस्ट्रीम से आई संख्या को कार्ड में <b>जैसी है वैसी प्रदर्शित</b> करता है। इसमें कोई आउटपुट पोर्ट नहीं है — इसका आउटपुट "प्रदर्शन" करना ही है, और इसका उपयोग अपस्ट्रीम नोड के परिणाम देखने या डिबग करने के लिए किया जाता है।',
    id: 'Node Tampilan angka <b>menampilkan apa adanya</b> angka yang masuk dari hulu di dalam kartu. Node ini tidak punya port keluaran — keluarannya adalah tindakan menampilkan itu sendiri, sering dipakai untuk memeriksa atau men-debug hasil node hulu.',
    de: 'Der Knoten „Zahlenanzeige“ <b>zeigt</b> die von vorgelagert übergebene Zahl direkt in der Karte an. Er hat keinen Ausgangsport — sein Ergebnis ist das Anzeigen selbst und wird häufig zum Ansehen oder Debuggen der Ergebnisse vorgelagerter Knoten verwendet.',
    vi: 'Nút Hiển thị số <b>hiển thị nguyên vẹn</b> số nhận từ thượng nguồn trong thẻ. Nút không có cổng đầu ra — kết quả của nó chính là việc hiển thị, thường dùng để xem hoặc gỡ lỗi kết quả của các nút thượng nguồn.',
    tr: 'Sayı Görüntüleme düğümü, yukarı akıştan gelen sayıyı kartın içinde <b>olduğu gibi görüntüler</b>. Çıkış bağlantı noktası yoktur — çıktısı görüntüleme eyleminin kendisidir ve genellikle yukarı akış düğümlerinin sonuçlarını incelemek veya hata ayıklamak için kullanılır.',
    it: 'Il nodo Visualizzazione numero <b>mostra così com’è</b> il numero ricevuto dalla parte a monte all’interno della scheda. Non ha porte di output — il suo risultato è proprio l’atto di mostrare, spesso usato per ispezionare o fare debug dei risultati dei nodi a monte.'
  },

  // —— 输入端口 ——
  portsTitle: {
    zh: '输入端口',
    en: 'Input port',
    ja: '入力ポート',
    ko: '입력 포트',
    es: 'Puerto de entrada',
    ar: 'منفذ الإدخال',
    fr: 'Port d’entrée',
    pt: 'Porto de entrada',
    ru: 'Входной порт',
    hi: 'इनपुट पोर्ट',
    id: 'Port masukan',
    de: 'Eingangsport',
    vi: 'Cổng đầu vào',
    tr: 'Giriş bağlantı noktası',
    it: 'Porta di input'
  },
  portsLi1: {
    zh: '左侧 <code>number</code> 输入端口只接受数字（<code>NumberValue</code>）',
    en: 'The <code>number</code> input port on the left accepts only numbers (<code>NumberValue</code>)',
    ja: '左側の <code>number</code> 入力ポートは数値（<code>NumberValue</code>）のみを受け付けます',
    ko: '왼쪽 <code>number</code> 입력 포트는 숫자(<code>NumberValue</code>)만 받습니다',
    es: 'El puerto de entrada <code>number</code> de la izquierda acepta solo números (<code>NumberValue</code>)',
    ar: 'يقبل منفذ الإدخال <code>number</code> على اليسار الأرقام فقط (<code>NumberValue</code>)',
    fr: 'Le port d’entrée <code>number</code> à gauche n’accepte que des nombres (<code>NumberValue</code>)',
    pt: 'O porto de entrada <code>number</code> à esquerda aceita apenas números (<code>NumberValue</code>)',
    ru: 'Входной порт <code>number</code> слева принимает только числа (<code>NumberValue</code>)',
    hi: 'बाईं ओर का <code>number</code> इनपुट पोर्ट केवल संख्याएँ (<code>NumberValue</code>) स्वीकार करता है',
    id: 'Port masukan <code>number</code> di kiri hanya menerima angka (<code>NumberValue</code>)',
    de: 'Der <code>number</code>-Eingangsport links akzeptiert nur Zahlen (<code>NumberValue</code>)',
    vi: 'Cổng đầu vào <code>number</code> bên trái chỉ chấp nhận số (<code>NumberValue</code>)',
    tr: 'Soldaki <code>number</code> giriş bağlantı noktası yalnızca sayı (<code>NumberValue</code>) kabul eder',
    it: 'La porta di input <code>number</code> a sinistra accetta solo numeri (<code>NumberValue</code>)'
  },
  portsLi2: {
    zh: '没接输入、或上游还没算出结果时，正文显示「暂无输出」占位提示；引擎里找不到该节点时显示「节点不存在」',
    en: 'When nothing is connected or the upstream has not produced a result yet, the body shows a “No output” placeholder; if the node cannot be found in the engine, it shows “Node not found”',
    ja: '入力が未接続、または上流がまだ結果を出していない場合、本文に「出力なし」のプレースホルダーが表示されます。エンジン内にノードが見つからない場合は「ノードが存在しません」と表示されます',
    ko: '입력이 연결되지 않았거나 상위가 아직 결과를 내지 않은 경우 본문에 “출력 없음” 자리 표시가 나타납니다. 엔진에서 노드를 찾을 수 없으면 “노드 없음”이 표시됩니다',
    es: 'Cuando no hay nada conectado o el nodo anterior aún no ha producido un resultado, el cuerpo muestra el marcador “Sin salida”; si el nodo no se encuentra en el motor, muestra “Nodo no encontrado”',
    ar: 'عند عدم توصيل أي مدخل أو عدم إنتاج العقدة السابقة نتيجة بعد، يعرض المتن العنصر النائب «لا يوجد إخراج»؛ وإذا تعذّر العثور على العقدة في المحرك، يعرض «العقدة غير موجودة»',
    fr: 'Si rien n’est connecté ou que l’amont n’a pas encore produit de résultat, le corps affiche le texte indicatif « Aucune sortie » ; si le nœud est introuvable dans le moteur, il affiche « Nœud introuvable »',
    pt: 'Quando nada está conectado ou o nó anterior ainda não produziu um resultado, o corpo exibe o marcador “Sem saída”; se o nó não for encontrado no motor, exibe “Nó não encontrado”',
    ru: 'Если ничего не подключено или вышестоящий узел ещё не выдал результат, в теле отображается подсказка «Нет вывода»; если узел не найден в движке — «Узел не найден»',
    hi: 'जब कोई इनपुट जुड़ा न हो, या अपस्ट्रीम ने अभी परिणाम न निकाला हो, तो मुख्य भाग में "कोई आउटपुट नहीं" का प्लेसहोल्डर दिखाई देता है; इंजन में नोड न मिलने पर "नोड मौजूद नहीं है" दिखाई देता है',
    id: 'Saat tidak ada masukan yang tersambung, atau hulu belum menghasilkan hasil, isi kartu menampilkan placeholder “Tidak ada keluaran”; jika node tidak ditemukan di mesin, ditampilkan “Node tidak ditemukan”',
    de: 'Wenn nichts angeschlossen ist oder die vorgelagerten Knoten noch kein Ergebnis geliefert haben, zeigt der Textkörper den Platzhalter „Keine Ausgabe“; wird der Knoten in der Engine nicht gefunden, erscheint „Knoten nicht gefunden“',
    vi: 'Khi chưa nối đầu vào, hoặc thượng nguồn chưa tính ra kết quả, phần nội dung hiển thị gợi ý “Không có đầu ra”; khi không tìm thấy nút trong engine, hiển thị “Không tìm thấy nút”',
    tr: 'Giriş bağlı değilse veya yukarı akış henüz bir sonuç üretmediyse, gövdede “Çıkış yok” yer tutucusu gösterilir; düğüm motorda bulunamazsa “Düğüm bulunamadı” gösterilir',
    it: 'Se non è collegato nulla o la parte a monte non ha ancora prodotto un risultato, il corpo mostra il segnaposto “Nessun output”; se il nodo non viene trovato nel motore, mostra “Nodo non trovato”'
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
    ru: 'Как использовать',
    hi: 'इस्तेमाल कैसे करें',
    id: 'Cara menggunakan',
    de: 'Verwendung',
    vi: 'Cách sử dụng',
    tr: 'Nasıl kullanılır',
    it: 'Come si usa'
  },
  useLi1: {
    zh: '拖拽卡片<b>右下角</b>的手柄可调整节点尺寸（宽 160–800、高 80–600）',
    en: 'Drag the handle at the <b>bottom-right</b> corner of the card to resize the node (width 160–800, height 80–600)',
    ja: 'カード<b>右下</b>のハンドルをドラッグするとノードのサイズを変更できます（幅 160–800、高さ 80–600）',
    ko: '카드 <b>오른쪽 아래</b> 모서리의 핸들을 드래그하면 노드 크기를 조절할 수 있습니다 (너비 160–800, 높이 80–600)',
    es: 'Arrastra el tirador de la esquina <b>inferior derecha</b> de la tarjeta para cambiar el tamaño del nodo (ancho 160–800, alto 80–600)',
    ar: 'اسحب المقبض في الزاوية <b>السفلى اليمنى</b> للبطاقة لتغيير حجم العقدة (العرض 160–800، الارتفاع 80–600)',
    fr: 'Faites glisser la poignée en <b>bas à droite</b> de la carte pour redimensionner le nœud (largeur 160–800, hauteur 80–600)',
    pt: 'Arraste a alça no canto <b>inferior direito</b> do cartão para redimensionar o nó (largura 160–800, altura 80–600)',
    ru: 'Перетаскивайте маркер в <b>правом нижнем</b> углу карточки, чтобы изменить размер узла (ширина 160–800, высота 80–600)',
    hi: 'कार्ड के <b>नीचे दाएँ कोने</b> के हैंडल को खींचकर नोड का आकार बदलें (चौड़ाई 160–800, ऊँचाई 80–600)',
    id: 'Seret gagang di sudut <b>bawah kanan</b> kartu untuk mengubah ukuran node (lebar 160–800, tinggi 80–600)',
    de: 'Ziehen Sie den Griff in der <b>unteren rechten</b> Ecke der Karte, um die Knotengröße zu ändern (Breite 160–800, Höhe 80–600)',
    vi: 'Kéo tay nắm ở góc <b>dưới bên phải</b> của thẻ để thay đổi kích thước nút (rộng 160–800, cao 80–600)',
    tr: 'Düğüm boyutunu değiştirmek için kartın <b>sağ alt</b> köşesindeki tutamacı sürükleyin (genişlik 160–800, yükseklik 80–600)',
    it: 'Trascina la maniglia nell’angolo <b>in basso a destra</b> della scheda per ridimensionare il nodo (larghezza 160–800, altezza 80–600)'
  },
  useLi2: {
    zh: '拖拽标题栏可移动节点位置',
    en: 'Drag the title bar to move the node',
    ja: 'タイトルバーをドラッグするとノードを移動できます',
    ko: '제목 표시줄을 드래그하면 노드를 이동할 수 있습니다',
    es: 'Arrastra la barra de título para mover el nodo',
    ar: 'اسحب شريط العنوان لنقل العقدة',
    fr: 'Faites glisser la barre de titre pour déplacer le nœud',
    pt: 'Arraste a barra de título para mover o nó',
    ru: 'Перетаскивайте заголовок, чтобы переместить узел',
    hi: 'शीर्षक पट्टी को खींचकर नोड को स्थानांतरित करें',
    id: 'Seret bilah judul untuk memindahkan node',
    de: 'Ziehen Sie die Titelleiste, um den Knoten zu verschieben',
    vi: 'Kéo thanh tiêu đề để di chuyển nút',
    tr: 'Düğümü taşımak için başlık çubuğunu sürükleyin',
    it: 'Trascina la barra del titolo per spostare il nodo'
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
    ru: 'Примечания',
    hi: 'ध्यान देने योग्य बातें',
    id: 'Catatan',
    de: 'Hinweise',
    vi: 'Lưu ý',
    tr: 'Notlar',
    it: 'Note'
  },
  notesLi1: {
    zh: '本节点没有输出端口，<b>不会向下游传递数据</b>，只把上游送来的数字显示出来',
    en: 'This node has no output port and <b>passes no data downstream</b>; it merely displays the number sent from upstream',
    ja: 'このノードには出力ポートがなく、<b>下流へデータを渡しません</b>。上流から送られた数値を表示するだけです',
    ko: '이 노드에는 출력 포트가 없어 <b>하위로 데이터를 전달하지 않으며</b>, 상위에서 보낸 숫자를 표시할 뿐입니다',
    es: 'Este nodo no tiene puerto de salida y <b>no pasa datos aguas abajo</b>; solo muestra el número enviado desde aguas arriba',
    ar: 'لا يوجد لهذه العقدة منفذ إخراج و<b>لا تمرّر أي بيانات إلى العقد اللاحقة</b>، بل تعرض فقط الرقم الوارد من العقد السابقة',
    fr: 'Ce nœud n’a pas de port de sortie et <b>ne transmet aucune donnée en aval</b> ; il ne fait qu’afficher le nombre envoyé en amont',
    pt: 'Este nó não tem porto de saída e <b>não passa dados adiante</b>; apenas exibe o número enviado de montante',
    ru: 'У этого узла нет выходного порта, и он <b>не передаёт данные дальше</b> — он лишь показывает число, пришедшее от вышестоящих узлов',
    hi: 'इस नोड में कोई आउटपुट पोर्ट नहीं है, यह <b>डाउनस्ट्रीम को कोई डेटा नहीं भेजता</b>, केवल अपस्ट्रीम से आई संख्या को दिखाता है',
    id: 'Node ini tidak punya port keluaran dan <b>tidak meneruskan data ke hilir</b>; node hanya menampilkan angka yang dikirim dari hulu',
    de: 'Dieser Knoten hat keinen Ausgangsport und <b>gibt keine Daten an nachgelagerte Knoten weiter</b>; er zeigt lediglich die von vorgelagert gesendete Zahl an',
    vi: 'Nút này không có cổng đầu ra và <b>không truyền dữ liệu đến hạ nguồn</b>, chỉ hiển thị số do thượng nguồn gửi đến',
    tr: 'Bu düğümün çıkış bağlantı noktası yoktur ve <b>aşağı akışa veri aktarmaz</b>; yalnızca yukarı akıştan gönderilen sayıyı görüntüler',
    it: 'Questo nodo non ha porte di output e <b>non trasmette dati a valle</b>; mostra soltanto il numero inviato dalla parte a monte'
  },
  notesLi2: {
    zh: '展示的数值由上游派生而来，本节点不保存自身状态；画布重新载入时，要等上游重新计算后才会自动刷新回来',
    en: 'The displayed number is derived from upstream, and this node keeps no state of its own; when the canvas reloads, it refreshes automatically only after upstream recomputes',
    ja: '表示される数値は上流から派生したもので、このノードは自身の状態を保存しません。キャンバスを再読み込みした際は、上流が再計算してから自動的に更新されます',
    ko: '표시되는 숫자는 상위에서 파생된 것이며, 이 노드는 자체 상태를 저장하지 않습니다. 캔버스를 다시 불러오면 상위가 다시 계산한 뒤에야 자동으로 갱신됩니다',
    es: 'El número mostrado se deriva de aguas arriba y este nodo no guarda estado propio; al recargar el lienzo, solo se refresca automáticamente después de que el nodo anterior vuelva a calcular',
    ar: 'الرقم المعروض مشتق من العقد السابقة، وهذه العقدة لا تحفظ حالتها؛ وعند إعادة تحميل اللوحة لا يُحدَّث تلقائيًا إلا بعد إعادة حساب العقد السابقة',
    fr: 'Le nombre affiché est dérivé de l’amont et ce nœud ne conserve aucun état propre ; au rechargement du canevas, il ne se rafraîchit automatiquement qu’après le recalcul de l’amont',
    pt: 'O número exibido é derivado de montante e este nó não guarda estado próprio; ao recarregar a tela, ele só é atualizado automaticamente após o nó anterior recalcular',
    ru: 'Отображаемое число является производным от вышестоящих узлов, и этот узел не хранит собственного состояния; при перезагрузке холста оно обновится автоматически только после повторного расчёта вышестоящего узла',
    hi: 'प्रदर्शित संख्या अपस्ट्रीम से प्राप्त होती है, यह नोड अपनी स्थिति नहीं सहेजता; कैनवास दोबारा लोड होने पर, अपस्ट्रीम की पुनः गणना के बाद ही यह अपने आप ताज़ा होती है',
    id: 'Angka yang ditampilkan berasal dari hulu, node ini tidak menyimpan statusnya sendiri; saat kanvas dimuat ulang, angka baru tersegarkan otomatis setelah hulu menghitung ulang',
    de: 'Die angezeigte Zahl leitet sich von vorgelagert ab, und dieser Knoten speichert keinen eigenen Zustand; beim erneuten Laden der Arbeitsfläche wird sie erst nach der Neuberechnung durch die vorgelagerten Knoten automatisch aktualisiert',
    vi: 'Số hiển thị được dẫn xuất từ thượng nguồn, nút này không lưu trạng thái của chính nó; khi tải lại canvas, phải đợi thượng nguồn tính lại thì nó mới tự động làm mới trở lại',
    tr: 'Görüntülenen sayı yukarı akıştan türetilir, bu düğüm kendi durumunu kaydetmez; tuval yeniden yüklendiğinde ancak yukarı akış yeniden hesapladıktan sonra otomatik olarak yenilenir',
    it: 'Il numero mostrato deriva dalla parte a monte e questo nodo non salva un proprio stato; al ricaricamento del canvas si aggiorna automaticamente solo dopo che la parte a monte ha ricalcolato'
  }
} satisfies Record<string, LocalizedText>
