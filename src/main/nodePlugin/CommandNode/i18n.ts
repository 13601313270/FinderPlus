import type { LocalizedText } from '../../../shared/language'

/**
 * Command 节点卡片（含齿轮编辑面板）内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
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
  editCommand: {
    zh: '编辑命令',
    en: 'Edit command',
    ja: 'コマンドを編集',
    ko: '명령 편집',
    es: 'Editar comando',
    ar: 'تحرير الأمر',
    fr: 'Modifier la commande',
    pt: 'Editar comando',
    ru: 'Изменить команду'
  },
  namePlaceholder: {
    zh: '命令名称，例如：构建项目',
    en: 'Command name, e.g. Build project',
    ja: 'コマンド名、例：プロジェクトをビルド',
    ko: '명령 이름, 예: 프로젝트 빌드',
    es: 'Nombre del comando, p. ej. Compilar proyecto',
    ar: 'اسم الأمر، مثل: بناء المشروع',
    fr: 'Nom de la commande, ex. Compiler le projet',
    pt: 'Nome do comando, ex. Compilar projeto',
    ru: 'Имя команды, например: Собрать проект'
  },
  clickEditHint: {
    zh: '点击编辑命令模板',
    en: 'Click to edit the command template',
    ja: 'クリックしてコマンドテンプレートを編集',
    ko: '클릭하여 명령 템플릿 편집',
    es: 'Haz clic para editar la plantilla del comando',
    ar: 'انقر لتحرير قالب الأمر',
    fr: 'Cliquez pour modifier le modèle de commande',
    pt: 'Clique para editar o modelo do comando',
    ru: 'Нажмите, чтобы изменить шаблон команды'
  },
  noCommand: {
    zh: '（未设置命令，点击这里或齿轮设置）',
    en: '(No command set — click here or the gear to set one)',
    ja: '（コマンド未設定。ここか歯車をクリックして設定）',
    ko: '(명령이 설정되지 않음 — 여기 또는 톱니바퀴를 클릭하여 설정)',
    es: '(Sin comando — haz clic aquí o en el engranaje para definirlo)',
    ar: '(لا يوجد أمر — انقر هنا أو على الترس لتعيينه)',
    fr: '(Aucune commande — cliquez ici ou sur l’engrenage pour en définir une)',
    pt: '(Nenhum comando — clique aqui ou na engrenagem para definir)',
    ru: '(Команда не задана — нажмите здесь или на шестерёнку, чтобы задать)'
  },
  portsCount: {
    zh: '输入端口：{n} 个（模板里用 $1…$N 引用）',
    en: 'Input ports: {n} (reference as $1…$N in the template)',
    ja: '入力ポート：{n} 個（テンプレートで $1…$N として参照）',
    ko: '입력 포트: {n}개 (템플릿에서 $1…$N으로 참조)',
    es: 'Puertos de entrada: {n} (referencia como $1…$N en la plantilla)',
    ar: 'منافذ الإدخال: {n} (أشِر إليها بـ $1…$N في القالب)',
    fr: 'Ports d’entrée : {n} (référencez-les par $1…$N dans le modèle)',
    pt: 'Portas de entrada: {n} (referencie como $1…$N no modelo)',
    ru: 'Входные порты: {n} (ссылайтесь как $1…$N в шаблоне)'
  },
  removePortHint: {
    zh: '移除末尾输入端口',
    en: 'Remove the last input port',
    ja: '末尾の入力ポートを削除',
    ko: '마지막 입력 포트 제거',
    es: 'Eliminar el último puerto de entrada',
    ar: 'إزالة منفذ الإدخال الأخير',
    fr: 'Supprimer le dernier port d’entrée',
    pt: 'Remover a última porta de entrada',
    ru: 'Удалить последний входной порт'
  },
  addPortHint: {
    zh: '新增输入端口',
    en: 'Add an input port',
    ja: '入力ポートを追加',
    ko: '입력 포트 추가',
    es: 'Añadir un puerto de entrada',
    ar: 'إضافة منفذ إدخال',
    fr: 'Ajouter un port d’entrée',
    pt: 'Adicionar uma porta de entrada',
    ru: 'Добавить входной порт'
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
  noOutput: {
    zh: '（无输出）',
    en: '(No output)',
    ja: '（出力なし）',
    ko: '(출력 없음)',
    es: '(Sin salida)',
    ar: '(لا إخراج)',
    fr: '(Aucune sortie)',
    pt: '(Sem saída)',
    ru: '(Нет вывода)'
  },
  clickToRun: {
    zh: '（点击执行运行已保存的命令）',
    en: '(Click Run to execute the saved command)',
    ja: '（実行をクリックして保存済みのコマンドを実行）',
    ko: '(실행을 클릭하여 저장된 명령 실행)',
    es: '(Haz clic en Ejecutar para ejecutar el comando guardado)',
    ar: '(انقر على تشغيل لتنفيذ الأمر المحفوظ)',
    fr: '(Cliquez sur Exécuter pour lancer la commande enregistrée)',
    pt: '(Clique em Executar para rodar o comando salvo)',
    ru: '(Нажмите «Выполнить», чтобы запустить сохранённую команду)'
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
  runHint: {
    zh: '执行已保存的命令',
    en: 'Run the saved command',
    ja: '保存済みのコマンドを実行',
    ko: '저장된 명령 실행',
    es: 'Ejecutar el comando guardado',
    ar: 'تشغيل الأمر المحفوظ',
    fr: 'Exécuter la commande enregistrée',
    pt: 'Executar o comando salvo',
    ru: 'Выполнить сохранённую команду'
  },
  runHintNoCommand: {
    zh: '请先点击齿轮设置命令',
    en: 'Click the gear to set a command first',
    ja: '先に歯車をクリックしてコマンドを設定してください',
    ko: '먼저 톱니바퀴를 클릭하여 명령을 설정하세요',
    es: 'Haz clic en el engranaje para definir un comando primero',
    ar: 'انقر على الترس لتعيين أمر أولًا',
    fr: 'Cliquez d’abord sur l’engrenage pour définir une commande',
    pt: 'Clique primeiro na engrenagem para definir um comando',
    ru: 'Сначала нажмите на шестерёнку, чтобы задать команду'
  },
  editorTitle: {
    zh: '编辑命令模板',
    en: 'Edit command template',
    ja: 'コマンドテンプレートを編集',
    ko: '명령 템플릿 편집',
    es: 'Editar plantilla del comando',
    ar: 'تحرير قالب الأمر',
    fr: 'Modifier le modèle de commande',
    pt: 'Editar modelo do comando',
    ru: 'Изменить шаблон команды'
  },
  templatePlaceholder: {
    zh: '命令模板，例如：npm run build -- $1',
    en: 'Command template, e.g. npm run build -- $1',
    ja: 'コマンドテンプレート、例：npm run build -- $1',
    ko: '명령 템플릿, 예: npm run build -- $1',
    es: 'Plantilla de comando, p. ej. npm run build -- $1',
    ar: 'قالب الأمر، مثل: npm run build -- $1',
    fr: 'Modèle de commande, ex. npm run build -- $1',
    pt: 'Modelo de comando, ex. npm run build -- $1',
    ru: 'Шаблон команды, например: npm run build -- $1'
  },
  cancel: {
    zh: '取消',
    en: 'Cancel',
    ja: 'キャンセル',
    ko: '취소',
    es: 'Cancelar',
    ar: 'إلغاء',
    fr: 'Annuler',
    pt: 'Cancelar',
    ru: 'Отмена'
  },
  save: {
    zh: '保存',
    en: 'Save',
    ja: '保存',
    ko: '저장',
    es: 'Guardar',
    ar: 'حفظ',
    fr: 'Enregistrer',
    pt: 'Salvar',
    ru: 'Сохранить'
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
  helpDialogTitle: {
    zh: '命令节点使用说明',
    en: 'Command node help',
    ja: 'コマンドノードの使い方',
    ko: '명령 노드 사용 설명',
    es: 'Ayuda del nodo Comando',
    ar: 'تعليمات عقدة الأوامر',
    fr: 'Aide du nœud Commande',
    pt: 'Ajuda do nó Comando',
    ru: 'Справка по узлу «Команда»'
  }
} satisfies Record<string, LocalizedText>
