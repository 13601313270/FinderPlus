import type { LocalizedText } from '../../../shared/language'

/**
 * BoolDisplay 节点帮助文档的全部文案，全部 15 种语言全配。
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
    zh: '布尔值展示节点把上游传入的布尔值用<b>红绿灯</b>视觉呈现：<b>true</b> 亮绿灯，<b>false</b> 亮红灯。它没有输出端口——它的产出就是「视觉展示」这件事本身，常用来直观查看或调试上游节点的布尔状态。',
    en: 'The Bool Display node renders the boolean from upstream as a <b>traffic light</b>: <b>true</b> lights green, <b>false</b> lights red. It has no output port — its output is the act of visual display itself, handy for quickly inspecting or debugging boolean states.',
    ja: 'ブール表示ノードは、上流から渡されたブール値を<b>信号機</b>で視覚化します：<b>true</b> は緑、<b>false</b> は赤に点灯します。出力ポートは持ちません——視覚的に表示すること自体が役割で、上流ノードのブール状態を一目で確認・デバッグするのに便利です。',
    ko: '불리언 표시 노드는 상위에서 전달된 불리언 값을 <b>신호등</b>으로 시각화합니다: <b>true</b>는 녹색, <b>false</b>는 빨간색으로 켜집니다. 출력 포트는 없습니다. 시각적으로 표시하는 것 자체가 역할이며, 상위 노드의 불리언 상태를 한눈에 확인하거나 디버깅할 때 유용합니다.',
    es: 'El nodo Mostrar booleano visualiza el valor booleano de aguas arriba como un <b>semáforo</b>: <b>true</b> enciende luz verde, <b>false</b> enciende luz roja. No tiene puerto de salida — su resultado es el propio acto de visualizar, útil para inspeccionar o depurar estados booleanos de forma intuitiva.',
    ar: 'تعمل عقدة عرض منطقي على تصوير القيمة المنطقية الواردة من العقد السابقة على شكل <b>إشارة ضوئية</b>: <b>true</b> يضيء باللون الأخضر، <b>false</b> يضيء باللون الأحمر. لا يوجد لها منفذ إخراج — فمخرَجها هو فعل العرض البصري نفسه، وهو مفيد لفحص الحالات المنطقية أو تصحيحها بسهولة.',
    fr: 'Le nœud Affichage booléen représente la valeur booléenne en amont comme un <b>feu de circulation</b> : <b>true</b> allume le vert, <b>false</b> allume le rouge. Il n’a pas de port de sortie — son résultat est l’affichage visuel lui-même, pratique pour inspecter ou déboguer rapidement des états booléens.',
    pt: 'O nó Exibir booleano visualiza o valor booleano de montante como um <b>semáforo</b>: <b>true</b> acende verde, <b>false</b> acende vermelho. Ele não tem porto de saída — seu resultado é o próprio ato de exibir, útil para inspecionar ou depurar estados booleanos de forma intuitiva.',
    ru: 'Узел «Отображение логического» визуализирует булево значение от вышестоящих узлов в виде <b>светофора</b>: <b>true</b> загорается зелёным, <b>false</b> — красным. У него нет выходного порта — его результат и есть само визуальное отображение; удобно для быстрого просмотра и отладки булевых состояний.',
    hi: 'बूलियन प्रदर्शन नोड अपस्ट्रीम से आए बूलियन मान को <b>ट्रैफिक लाइट</b> के रूप में दर्शाता है: <b>true</b> हरी बत्ती, <b>false</b> लाल बत्ती। इसमें कोई आउटपुट पोर्ट नहीं है — इसका आउटपुट "दृश्य प्रदर्शन" करना ही है, बूलियन स्थितियों को तुरंत देखने या डिबग करने के लिए उपयोगी।',
    id: 'Node Tampilan boolean menampilkan nilai boolean dari hulu sebagai <b>lampu lalu lintas</b>: <b>true</b> menyala hijau, <b>false</b> menyala merah. Node ini tidak punya port keluaran — keluarannya adalah tindakan menampilkan secara visual, berguna untuk memeriksa atau men-debug status boolean dengan cepat.',
    de: 'Der Knoten „Bool-Anzeige“ stellt den Boolwert aus vorgelagert als <b>Ampel</b> dar: <b>true</b> leuchtet grün, <b>false</b> leuchtet rot. Er hat keinen Ausgangsport — sein Ergebnis ist das visuelle Anzeigen selbst, praktisch zum schnellen Prüfen oder Debuggen von Boolzuständen.',
    vi: 'Nút Hiển thị boolean trực quan hóa giá trị boolean từ thượng nguồn dưới dạng <b>đèn giao thông</b>: <b>true</b> sáng đèn xanh, <b>false</b> sáng đèn đỏ. Nút không có cổng đầu ra — kết quả của nó chính là việc hiển thị trực quan, hữu ích để xem hoặc gỡ lỗi trạng thái boolean một cách nhanh chóng.',
    tr: 'Bool Görüntüleme düğümü, yukarı akıştan gelen boolean değeri bir <b>trafik ışığı</b> olarak görselleştirir: <b>true</b> yeşil ışık, <b>false</b> kırmızı ışık yanar. Çıkış bağlantı noktası yoktur — çıktısı görsel olarak gösterme eyleminin kendisidir, boolean durumlarını hızlıca incelemek veya hata ayıklamak için kullanılır.',
    it: 'Il nodo Visualizzazione booleano rappresenta il valore booleano ricevuto dalla parte a monte come un <b>semaforo</b>: <b>true</b> accende il verde, <b>false</b> accende il rosso. Non ha porte di output — il suo risultato è proprio l’atto di visualizzare, utile per ispezionare o fare debug rapidamente stati booleani.'
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
    zh: '左侧 <code>bool</code> 输入端口只接受布尔值（<code>BoolValue</code>）',
    en: 'The <code>bool</code> input port on the left accepts only booleans (<code>BoolValue</code>)',
    ja: '左側の <code>bool</code> 入力ポートはブール値（<code>BoolValue</code>）のみを受け付けます',
    ko: '왼쪽 <code>bool</code> 입력 포트는 불리언 값(<code>BoolValue</code>)만 받습니다',
    es: 'El puerto de entrada <code>bool</code> de la izquierda acepta solo booleanos (<code>BoolValue</code>)',
    ar: 'يقبل منفذ الإدخال <code>bool</code> على اليسار القيم المنطقية فقط (<code>BoolValue</code>)',
    fr: 'Le port d’entrée <code>bool</code> à gauche n’accepte que des booléens (<code>BoolValue</code>)',
    pt: 'O porto de entrada <code>bool</code> à esquerda aceita apenas booleanos (<code>BoolValue</code>)',
    ru: 'Входной порт <code>bool</code> слева принимает только булевы значения (<code>BoolValue</code>)',
    hi: 'बाईं ओर का <code>bool</code> इनपुट पोर्ट केवल बूलियन मान (<code>BoolValue</code>) स्वीकार करता है',
    id: 'Port masukan <code>bool</code> di kiri hanya menerima nilai boolean (<code>BoolValue</code>)',
    de: 'Der <code>bool</code>-Eingangsport links akzeptiert nur Boolwerte (<code>BoolValue</code>)',
    vi: 'Cổng đầu vào <code>bool</code> bên trái chỉ chấp nhận giá trị boolean (<code>BoolValue</code>)',
    tr: 'Soldaki <code>bool</code> giriş bağlantı noktası yalnızca boolean değer (<code>BoolValue</code>) kabul eder',
    it: 'La porta di input <code>bool</code> a sinistra accetta solo booleani (<code>BoolValue</code>)'
  },
  portsLi2: {
    zh: '没接输入、或上游还没算出结果时，灯显示为灰色「待输入」状态',
    en: 'When nothing is connected or the upstream has not produced a result yet, the lamp shows a gray "Awaiting" state',
    ja: '入力が未接続、または上流がまだ結果を出していない場合、ランプはグレーの「待機中」状態になります',
    ko: '입력이 연결되지 않았거나 상위가 아직 결과를 내지 않은 경우 램프가 회색 "대기 중" 상태로 표시됩니다',
    es: 'Cuando no hay nada conectado o el nodo anterior aún no ha producido un resultado, la lámpara muestra un estado gris "En espera"',
    ar: 'عند عدم توصيل أي مدخل أو عدم إنتاج العقدة السابقة نتيجة بعد، تظهر المصباح بحالة رمادية «في انتظار»',
    fr: 'Si rien n’est connecté ou que l’amont n’a pas encore produit de résultat, la lampe affiche un état gris « En attente »',
    pt: 'Quando nada está conectado ou o nó anterior ainda não produziu um resultado, a lâmpada mostra um estado cinza "Aguardando"',
    ru: 'Если ничего не подключено или вышестоящий узел ещё не выдал результат, лампа показывает серое состояние «Ожидание»',
    hi: 'जब कोई इनपुट जुड़ा न हो, या अपस्ट्रीम ने अभी परिणाम न निकाला हो, तो लैंप की "प्रतीक्षा" स्थिति धूसर रंग में दिखाता है',
    id: 'Saat tidak ada masukan yang tersambung, atau hulu belum menghasilkan hasil, lampu menampilkan keadaan abu-abu "Menunggu"',
    de: 'Wenn nichts angeschlossen ist oder die vorgelagerten Knoten noch kein Ergebnis geliefert haben, zeigt die Lampe einen grauen „Warten“-Zustand',
    vi: 'Khi chưa nối đầu vào, hoặc thượng nguồn chưa tính ra kết quả, đèn hiển thị trạng thái xám "Đang chờ"',
    tr: 'Giriş bağlı değilse veya yukarı akış henüz bir sonuç üretmediyse, lamba gri "Bekleniyor" durumunu gösterir',
    it: 'Se non è collegato nulla o la parte a monte non ha ancora prodotto un risultato, la lampada mostra uno stato grigio "In attesa"'
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
    zh: '把 BoolInput 节点的输出端口接到本节点的输入端口，拨动开关即可看到灯的颜色变化',
    en: 'Connect the output port of a Bool Input node to this node’s input port — flip the switch and watch the lamp change color',
    ja: 'BoolInput ノードの出力ポートをこのノードの入力ポートに接続し、スイッチを切り替えるとランプの色が変わります',
    ko: 'BoolInput 노드의 출력 포트를 이 노드의 입력 포트에 연결하고 스위치를 켜거나 끄면 램프 색이 변합니다',
    es: 'Conecta el puerto de salida de un nodo Bool Input al puerto de entrada de este nodo — mueve el interruptor y verás cómo cambia el color de la lámpara',
    ar: 'قم بتوصيل منفذ إخراج عقدة إدخال منطقي بمنفذ إدخال هذه العقدة — اقلب المفتاح وشاهد المصباح يغير لونه',
    fr: 'Connectez le port de sortie d’un nœud Booléen en entrée au port d’entrée de ce nœud — basculez l’interrupteur et voyez la lampe changer de couleur',
    pt: 'Conecte o porto de saída de um nó Bool Input ao porto de entrada deste nó — flip o interruptor e veja a lâmpada mudar de cor',
    ru: 'Подключите выходной порт узла «布尔输入» к входному порту этого узла — щёлкайте переключателем и наблюдайте, как лампа меняет цвет',
    hi: 'BoolInput नोड के आउटपुट पोर्ट को इस नोड के इनपुट पोर्ट से जोड़ें — स्विच पलटें और देखें लैंप कैसे रंग बदलता है',
    id: 'Hubungkan port keluaran node BoolInput ke port masukan node ini — balikkan sakelar dan lihat lampu berubah warna',
    de: 'Verbinden Sie den Ausgangsport eines BoolInput-Knotens mit dem Eingangsport dieses Knotens — kippen Sie den Schalter und beobachten Sie, wie sich die Lampenfarbe ändert',
    vi: 'Nối cổng đầu ra của nút BoolInput vào cổng đầu vào của nút này — bật/tắt công tắc và xem đèn thay đổi màu',
    tr: 'BoolInput düğümünün çıkış bağlantı noktasını bu düğümün giriş bağlantı noktasına bağlayın — anahtarı çevirin ve lambanın renk değiştirdiğini izleyin',
    it: 'Collega la porta di output di un nodo Bool Input alla porta di input di questo nodo — capovolgi l’interruttore e guarda la lampada cambiare colore'
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
    zh: '本节点没有输出端口，<b>不会向下游传递数据</b>，只把上游送来的布尔值用红绿灯视觉展示出来',
    en: 'This node has no output port and <b>passes no data downstream</b>; it merely displays the boolean from upstream as a traffic light',
    ja: 'このノードには出力ポートがなく、<b>下流へデータを渡しません</b>。上流から送られたブール値を信号機として表示するだけです',
    ko: '이 노드에는 출력 포트가 없어 <b>하위로 데이터를 전달하지 않으며</b>, 상위에서 보낸 불리언 값을 신호등으로 표시할 뿐입니다',
    es: 'Este nodo no tiene puerto de salida y <b>no pasa datos aguas abajo</b>; solo muestra el booleano de aguas arriba como un semáforo',
    ar: 'لا يوجد لهذه العقدة منفذ إخراج و<b>لا تمرّر أي بيانات إلى العقد اللاحقة</b>، بل تعرض فقط القيمة المنطقية الواردة من العقد السابقة كإشارة ضوئية',
    fr: 'Ce nœud n’a pas de port de sortie et <b>ne transmet aucune donnée en aval</b> ; il ne fait qu’afficher le booléen en amont comme un feu de circulation',
    pt: 'Este nó não tem porto de saída e <b>não passa dados adiante</b>; apenas exibe o booleano de montante como um semáforo',
    ru: 'У этого узла нет выходного порта, и он <b>не передаёт данные дальше</b> — он лишь показывает булево значение от вышестоящих узлов в виде светофора',
    hi: 'इस नोड में कोई आउटपुट पोर्ट नहीं है, यह <b>डाउनस्ट्रीम को कोई डेटा नहीं भेजता</b>, केवल अपस्ट्रीम से आए बूलियन मान को ट्रैफिक लाइट के रूप में दिखाता है',
    id: 'Node ini tidak punya port keluaran dan <b>tidak meneruskan data ke hilir</b>; node hanya menampilkan boolean dari hulu sebagai lampu lalu lintas',
    de: 'Dieser Knoten hat keinen Ausgangsport und <b>gibt keine Daten an nachgelagerte Knoten weiter</b>; er zeigt lediglich den Boolwert aus vorgelagert als Ampel an',
    vi: 'Nút này không có cổng đầu ra và <b>không truyền dữ liệu đến hạ nguồn</b>, chỉ hiển thị giá trị boolean do thượng nguồn gửi đến dưới dạng đèn giao thông',
    tr: 'Bu düğümün çıkış bağlantı noktası yoktur ve <b>aşağı akışa veri aktarmaz</b>; yalnızca yukarı akıştan gelen boolean değeri trafik ışığı olarak görüntüler',
    it: 'Questo nodo non ha porte di output e <b>non trasmette dati a valle</b>; mostra soltanto il booleano ricevuto dalla parte a monte come un semaforo'
  },
  notesLi2: {
    zh: '灯的颜色语义固定：绿色恒表示 true、红色恒表示 false，不受用户或系统主题影响',
    en: 'The lamp colors are semantically fixed: green always means true, red always means false, unaffected by user or system theme',
    ja: 'ランプの色の意味は固定です：緑は常に true、赤は常に false を示し、ユーザーやシステムのテーマの影響を受けません',
    ko: '램프 색상의 의미는 고정되어 있습니다: 녹색은 항상 true, 빨간색은 항상 false를 의미하며 사용자나 시스템 테마의 영향을 받지 않습니다',
    es: 'Los colores de la lámpara están semánticamente fijos: verde siempre significa true, rojo siempre significa false, sin verse afectados por el tema del usuario o del sistema',
    ar: 'ألوان المصباح ذات دلالة ثابتة: الأخضر يعني دائمًا true، والأحمر يعني دائمًا false، ولا تتأثر بموضوع المستخدم أو النظام',
    fr: 'Les couleurs de la lampe sont sémantiquement fixes : le vert signifie toujours true, le rouge toujours false, sans être affectées par le thème utilisateur ou système',
    pt: 'As cores da lâmpada são semanticamente fixas: verde sempre significa true, vermelho sempre significa false, sem serem afetadas pelo tema do usuário ou do sistema',
    ru: 'Цвета лампы семантически фиксированы: зелёный всегда означает true, красный — false, не зависят от темы пользователя или системы',
    hi: 'लैंप के रंग शब्दार्थ रूप से निश्चित हैं: हरा हमेशा true का मतलब है, लाल हमेशा false का, उपयोगकर्ता या सिस्टम थीम से अप्रभावित',
    id: 'Warna lampu secara semantik tetap: hijau selalu berarti true, merah selalu berarti false, tidak dipengaruhi oleh tema pengguna atau sistem',
    de: 'Die Lampenfarben sind semantisch festgelegt: Grün bedeutet immer true, Rot immer false, unabhängig vom Benutzer- oder Systemthema',
    vi: 'Màu đèn có ý nghĩa cố định: xanh luôn nghĩa là true, đỏ luôn nghĩa là false, không bị ảnh hưởng bởi chủ đề người dùng hoặc hệ thống',
    tr: 'Lamba renkleri anlamsal olarak sabittir: yeşil her zaman true, kırmızı her zaman false anlamına gelir; kullanıcı veya sistem temasından etkilenmez',
    it: 'I colori della lampada sono semanticamente fissi: verde significa sempre true, rosso sempre false, non influenzati dal tema utente o di sistema'
  }
} satisfies Record<string, LocalizedText>
