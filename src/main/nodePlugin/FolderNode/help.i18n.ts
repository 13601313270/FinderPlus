import type { LocalizedText } from '../../../shared/language'

/**
 * Folder 节点帮助文档（FolderHelpDialog）的全部文案，9 种语言全配。
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
    zh: '文件夹节点是一个容器，用来把画布上的文件节点收纳、分组到同一个框里。收纳只是建立归属关系——子节点仍是画布上的真实节点，位置改为相对文件夹的<b>局部坐标</b>，原有连线保持不变。',
    en: 'The Folder node is a container that groups file nodes on the canvas into one frame. Adopting only establishes ownership — child nodes stay real nodes on the canvas, their positions become <b>local coordinates</b> relative to the folder, and existing connections stay intact.',
    ja: 'フォルダノードは、キャンバス上のファイルノードを1つの枠にまとめて分類するコンテナです。収納はあくまで所属関係を作るだけで、子ノードはキャンバス上の実在ノードのまま、位置がフォルダに対する<b>ローカル座標</b>に変わり、既存の接続はそのまま保たれます。',
    ko: '폴더 노드는 캔버스의 파일 노드를 하나의 프레임으로 모아 그룹화하는 컨테이너입니다. 수납은 소속 관계를 만들 뿐이며, 자식 노드는 여전히 캔버스의 실제 노드이고 위치만 폴더 기준 <b>로컬 좌표</b>로 바뀌며 기존 연결은 그대로 유지됩니다.',
    es: 'El nodo Carpeta es un contenedor que agrupa los nodos de archivo del lienzo en un mismo marco. Adoptar solo establece una relación de pertenencia: los nodos hijos siguen siendo nodos reales del lienzo, sus posiciones pasan a ser <b>coordenadas locales</b> relativas a la carpeta y las conexiones existentes se mantienen intactas.',
    ar: 'عقدة المجلد وعاء يجمع عقد الملفات على اللوحة في إطار واحد. لا ينشئ الاستقبال سوى علاقة انتماء؛ فالعقد التابعة تبقى عقدًا حقيقية على اللوحة، وتتحول مواضعها إلى <b>إحداثيات محلية</b> نسبةً إلى المجلد، وتبقى الوصلات الموجودة سليمة.',
    fr: 'Le nœud Dossier est un conteneur qui regroupe les nœuds de fichier du canevas dans un même cadre. L’adoption ne fait qu’établir une appartenance : les nœuds enfants restent de vrais nœuds du canevas, leurs positions deviennent des <b>coordonnées locales</b> relatives au dossier, et les connexions existantes restent intactes.',
    pt: 'O nó Pasta é um contêiner que agrupa os nós de arquivo do canvas em um mesmo quadro. A adoção apenas cria uma relação de pertencimento — os nós filhos continuam sendo nós reais do canvas, as posições passam a ser <b>coordenadas locais</b> relativas à pasta, e as conexões existentes permanecem intactas.',
    ru: 'Узел «Папка» — это контейнер, который группирует файловые узлы холста в одной рамке. Приём лишь устанавливает принадлежность: дочерние узлы остаются настоящими узлами холста, их позиции становятся <b>локальными координатами</b> относительно папки, а существующие связи сохраняются.'
  },

  // —— 基本用法 ——
  useTitle: {
    zh: '基本用法',
    en: 'How to use it',
    ja: '基本的な使い方',
    ko: '기본 사용법',
    es: 'Cómo se usa',
    ar: 'طريقة الاستخدام',
    fr: 'Utilisation',
    pt: 'Como usar',
    ru: 'Как пользоваться'
  },
  useLi1: {
    zh: '按住顶部横栏拖动，可连同里面的子节点一起移动整个文件夹。',
    en: 'Drag the top bar to move the whole folder together with the child nodes inside it.',
    ja: '上部のバーを押したままドラッグすると、中の子ノードごとフォルダ全体を移動できます。',
    ko: '상단 막대를 눌러 끌면 안에 있는 자식 노드까지 함께 폴더 전체가 이동합니다.',
    es: 'Arrastra la barra superior para mover toda la carpeta junto con los nodos hijos que contiene.',
    ar: 'اسحب الشريط العلوي لتحريك المجلد بأكمله مع العقد التابعة بداخله.',
    fr: 'Faites glisser la barre supérieure pour déplacer tout le dossier avec les nœuds enfants qu’il contient.',
    pt: 'Arraste a barra superior para mover a pasta inteira junto com os nós filhos dentro dela.',
    ru: 'Потяните за верхнюю панель, чтобы переместить всю папку вместе с дочерними узлами.'
  },
  useLi2: {
    zh: '把文件从系统里拖进内容区，会自动复制文件并在文件夹内新建对应的文件子节点。',
    en: 'Drop a file from your system into the content area: it is copied automatically and a matching file child node is created inside the folder.',
    ja: 'システムからファイルを内容エリアにドロップすると、自動的にコピーされ、フォルダ内に対応するファイル子ノードが作成されます。',
    ko: '시스템에서 파일을 내용 영역으로 끌어다 놓으면 자동으로 복사되고 폴더 안에 해당 파일 자식 노드가 생성됩니다.',
    es: 'Arrastra un archivo del sistema al área de contenido: se copia automáticamente y se crea dentro de la carpeta un nodo hijo de archivo correspondiente.',
    ar: 'أفلت ملفًا من نظامك في منطقة المحتوى، فيُنسخ تلقائيًا وتُنشأ داخل المجلد عقدة ملف تابعة مقابلة.',
    fr: 'Déposez un fichier de votre système dans la zone de contenu : il est copié automatiquement et un nœud de fichier enfant correspondant est créé dans le dossier.',
    pt: 'Solte um arquivo do sistema na área de conteúdo: ele é copiado automaticamente e um nó filho de arquivo correspondente é criado dentro da pasta.',
    ru: 'Перетащите файл из системы в область содержимого — он скопируется автоматически, и внутри папки появится соответствующий дочерний файловый узел.'
  },
  useLi3: {
    zh: '把画布上已有的文件节点拖进内容区即可收纳；只有尚未被收纳的文件节点能被收进来。',
    en: 'Drag an existing file node from the canvas into the content area to adopt it; only file nodes that are not already adopted can be taken in.',
    ja: 'キャンバス上の既存ファイルノードを内容エリアにドラッグすると収納できます。収納できるのはまだ収納されていないファイルノードだけです。',
    ko: '캔버스에 있는 기존 파일 노드를 내용 영역으로 끌어다 놓으면 수납됩니다. 아직 수납되지 않은 파일 노드만 넣을 수 있습니다.',
    es: 'Arrastra un nodo de archivo existente del lienzo al área de contenido para adoptarlo; solo se pueden añadir nodos de archivo que aún no estén adoptados.',
    ar: 'اسحب عقدة ملف موجودة من اللوحة إلى منطقة المحتوى لاستقبالها؛ ولا يمكن إدخال إلا عقد الملفات غير المستقبَلة بعد.',
    fr: 'Faites glisser un nœud de fichier existant du canevas vers la zone de contenu pour l’adopter ; seuls les nœuds de fichier non encore adoptés peuvent être accueillis.',
    pt: 'Arraste um nó de arquivo existente do canvas para a área de conteúdo para adotá-lo; apenas nós de arquivo ainda não adotados podem ser incluídos.',
    ru: 'Перетащите существующий файловый узел с холста в область содержимого, чтобы принять его; принимаются только ещё не принятые файловые узлы.'
  },
  useLi4: {
    zh: '左侧 <code>file</code> 端口同样接收文件值：会自动落盘并在文件夹内新建对应的文件子节点。',
    en: 'The <code>file</code> port on the left also accepts a file value: it is written to disk automatically and a matching file child node is created inside the folder.',
    ja: '左側の <code>file</code> ポートでもファイル値を受け取れます。自動的に保存され、フォルダ内に対応するファイル子ノードが作成されます。',
    ko: '왼쪽 <code>file</code> 포트도 파일 값을 받습니다. 자동으로 디스크에 저장되고 폴더 안에 해당 파일 자식 노드가 생성됩니다.',
    es: 'El puerto <code>file</code> de la izquierda también acepta un valor de archivo: se guarda en disco automáticamente y se crea un nodo hijo de archivo correspondiente dentro de la carpeta.',
    ar: 'يقبل منفذ <code>file</code> على اليسار أيضًا قيمة ملف: فيُحفظ على القرص تلقائيًا وتُنشأ داخل المجلد عقدة ملف تابعة مقابلة.',
    fr: 'Le port <code>file</code> à gauche accepte aussi une valeur de fichier : elle est enregistrée sur le disque automatiquement et un nœud de fichier enfant correspondant est créé dans le dossier.',
    pt: 'O porto <code>file</code> à esquerda também aceita um valor de arquivo: ele é gravado em disco automaticamente e um nó filho de arquivo correspondente é criado dentro da pasta.',
    ru: 'Порт <code>file</code> слева тоже принимает файловое значение: оно автоматически сохраняется на диск, и внутри папки создаётся соответствующий дочерний файловый узел.'
  },
  useLi5: {
    zh: '拖右下角的手柄调整文件夹大小（最小 100×80）。',
    en: 'Drag the handle at the bottom-right corner to resize the folder (minimum 100×80).',
    ja: '右下のハンドルをドラッグしてフォルダのサイズを変更します（最小 100×80）。',
    ko: '오른쪽 아래 핸들을 끌어 폴더 크기를 조절합니다 (최소 100×80).',
    es: 'Arrastra el tirador de la esquina inferior derecha para cambiar el tamaño de la carpeta (mínimo 100×80).',
    ar: 'اسحب المقبض في الزاوية اليمنى السفلى لتغيير حجم المجلد (الحد الأدنى 100×80).',
    fr: 'Faites glisser la poignée en bas à droite pour redimensionner le dossier (minimum 100×80).',
    pt: 'Arraste a alça no canto inferior direito para redimensionar a pasta (mínimo 100×80).',
    ru: 'Потяните за маркер в правом нижнем углу, чтобы изменить размер папки (минимум 100×80).'
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
    zh: '只有顶部横栏能拖动整个文件夹；在内容区里拖动某个子节点只会移动那个子节点，不会误拖整个文件夹。',
    en: 'Only the top bar moves the whole folder; dragging a child node inside the content area moves just that child, never the whole folder by accident.',
    ja: 'フォルダ全体を移動できるのは上部のバーだけです。内容エリアで子ノードをドラッグしても、その子ノードだけが動き、フォルダ全体を誤って動かすことはありません。',
    ko: '폴더 전체를 이동할 수 있는 것은 상단 막대뿐입니다. 내용 영역에서 자식 노드를 끌면 그 자식만 이동하고 폴더 전체가 실수로 끌리지 않습니다.',
    es: 'Solo la barra superior mueve toda la carpeta; arrastrar un nodo hijo dentro del área de contenido mueve únicamente ese hijo, sin mover la carpeta por error.',
    ar: 'الشريط العلوي وحده يحرّك المجلد بأكمله؛ وسحب عقدة تابعة داخل منطقة المحتوى يحرّك تلك العقدة فقط دون تحريك المجلد كله عن طريق الخطأ.',
    fr: 'Seule la barre supérieure déplace tout le dossier ; faire glisser un nœud enfant dans la zone de contenu ne déplace que cet enfant, sans risquer de déplacer tout le dossier.',
    pt: 'Apenas a barra superior move a pasta inteira; arrastar um nó filho dentro da área de conteúdo move somente esse filho, sem mover a pasta inteira por engano.',
    ru: 'Только верхняя панель перемещает всю папку; перетаскивание дочернего узла в области содержимого двигает лишь этот узел и не сдвинет папку по ошибке.'
  },
  notesLi2: {
    zh: '删除文件夹不会删除子节点——它们会回到原来的世界位置并保留原有连线。',
    en: 'Deleting the folder does not delete the child nodes — they return to their original world positions and keep their existing connections.',
    ja: 'フォルダを削除しても子ノードは削除されません。元のワールド座標に戻り、既存の接続も保たれます。',
    ko: '폴더를 삭제해도 자식 노드는 삭제되지 않습니다. 원래 월드 위치로 돌아가고 기존 연결도 유지됩니다.',
    es: 'Eliminar la carpeta no elimina los nodos hijos: vuelven a su posición mundial original y conservan sus conexiones.',
    ar: 'حذف المجلد لا يحذف العقد التابعة؛ فهي تعود إلى مواضعها العالمية الأصلية وتحتفظ بوصلاتها.',
    fr: 'Supprimer le dossier ne supprime pas les nœuds enfants : ils reviennent à leur position mondiale d’origine et conservent leurs connexions.',
    pt: 'Excluir a pasta não exclui os nós filhos — eles voltam à posição mundial original e mantêm as conexões existentes.',
    ru: 'Удаление папки не удаляет дочерние узлы — они возвращаются на прежние мировые позиции и сохраняют свои связи.'
  },
  notesLi3: {
    zh: '子节点在文件夹内的位置是局部坐标；移动文件夹时它们自动跟随，不需要单独重新摆位。',
    en: 'Child positions inside the folder are local coordinates; they follow automatically when the folder moves, so there is no need to reposition them.',
    ja: 'フォルダ内の子ノードの位置はローカル座標です。フォルダを移動すると自動的に追従するので、個別に配置し直す必要はありません。',
    ko: '폴더 안 자식 노드의 위치는 로컬 좌표입니다. 폴더를 옮기면 자동으로 따라오므로 따로 다시 배치할 필요가 없습니다.',
    es: 'Las posiciones de los hijos dentro de la carpeta son coordenadas locales; siguen automáticamente al mover la carpeta, sin necesidad de recolocarlos.',
    ar: 'مواضع العقد التابعة داخل المجلد إحداثيات محلية؛ وهي تتبع تلقائيًا عند تحريك المجلد دون حاجة إلى إعادة وضعها.',
    fr: 'Les positions des enfants dans le dossier sont des coordonnées locales ; elles suivent automatiquement le dossier, sans repositionnement manuel.',
    pt: 'As posições dos filhos dentro da pasta são coordenadas locais; eles acompanham automaticamente quando a pasta se move, sem precisar reposicioná-los.',
    ru: 'Позиции дочерних узлов внутри папки — локальные координаты; при перемещении папки они следуют автоматически, вручную расставлять их не нужно.'
  },
  notesLi4: {
    zh: '文件夹不能收纳自己的祖先（会成环）；同一文件经端口重复进入也会自动去重。',
    en: 'A folder cannot adopt its own ancestors (that would create a cycle), and the same file arriving again through the port is de-duplicated automatically.',
    ja: 'フォルダは自身の祖先を収納できません（循環になるため）。また、同じファイルがポートから再び入っても自動的に重複排除されます。',
    ko: '폴더는 자신의 조상을 수납할 수 없습니다 (순환이 되기 때문). 같은 파일이 포트로 다시 들어와도 자동으로 중복 제거됩니다.',
    es: 'Una carpeta no puede adoptar a sus propios ancestros (crearía un ciclo), y el mismo archivo que vuelve a entrar por el puerto se deduplica automáticamente.',
    ar: 'لا يمكن للمجلد استقبال أسلافه (فذلك ينشئ حلقة)، كما يُستبعد الملف نفسه تلقائيًا عند دخوله مجددًا عبر المنفذ.',
    fr: 'Un dossier ne peut pas adopter ses propres ancêtres (cela créerait un cycle), et un même fichier entrant à nouveau par le port est automatiquement dédupliqué.',
    pt: 'Uma pasta não pode adotar seus próprios ancestrais (isso criaria um ciclo), e o mesmo arquivo que entra de novo pelo porto é deduplicado automaticamente.',
    ru: 'Папка не может принять своих предков (это создало бы цикл), а один и тот же файл, снова пришедший через порт, автоматически отбрасывается как дубликат.'
  }
} satisfies Record<string, LocalizedText>