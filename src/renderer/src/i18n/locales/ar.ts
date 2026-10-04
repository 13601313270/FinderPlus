import type { Language } from '../types'

/** Arabic messages */
const ar: Language = {
  app: {
    settings: 'الإعدادات',
    help: 'المساعدة',
    fileMenu: 'ملف'
  },
  settingsDialog: {
    title: 'الإعدادات',
    close: 'إغلاق (Esc)',
    language: 'اللغة',
    languageHint: 'اختر لغة الواجهة، وسيتم حفظ التغييرات تلقائيًا.',
    transferTitle: 'Data Migration',
    transferHint: 'Export your current canvas and all files as a zip, or import from a backup on a new computer.',
    export: 'Export…',
    import: 'Import…',
    exportSuccess: 'Export completed successfully.',
    importSuccess: 'Import completed successfully. Please restart the app to reload your canvas.',
    exportKeyHint: 'API keys are not included in the export for security reasons. You will need to re-enter them on the new computer.',
    importConfirmTitle: 'Import will replace all data',
    importConfirmBody: 'Importing will overwrite your current canvas, files and settings with the backup. This cannot be undone. Continue?',
    onboardingSection: 'Onboarding tutorial',
    onboardingHint: 'Watch the Finder+ quick start again: drag in a file and connect nodes.',
    onboardingRestart: 'Show tutorial again'
  },
  helpCenter: {
    title: 'مركز المساعدة',
    close: 'إغلاق (Esc)',
    loading: 'جارٍ التحميل…',
    empty: 'لا توجد مستندات مساعدة متاحة',
    pickNode: 'الرجاء اختيار عقدة من اليسار',
    groupNodes: 'التعريف بأنواع العقد',
    about: 'حول Finder+'
  },
  helpDialog: {
    title: 'دليل الاستخدام',
    close: 'إغلاق (Esc)'
  },
  minimap: {
    dragToMove: 'اسحب لتحريك الخريطة المصغّرة',
    expand: 'توسيع الخريطة المصغّرة',
    collapse: 'طي الخريطة المصغّرة',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    reset: 'إعادة التهيئة'
  },
  palette: {
    addNode: 'إضافة عقدة',
    searchPlaceholder: 'ابحث عن العقد…',
    noResult: 'لا توجد عقد مطابقة',
    nodeHelp: 'عرض وثائق العقدة'
  },
  connection: {
    selfLoop: 'لا يمكن ربط المنافذ ضمن العقدة نفسها',
    failed: 'فشل الاتصال: {reason}',
    alreadyBound: 'هذان المنفذان متصلان بالفعل',
    kindNotAllowed: 'عدم توافق النوع: منفذ الإدخال هذا لا يقبل هذا النوع',
    singlePortOccupied: 'منفذ الإدخال هذا يقبل اتصالًا واحدًا فقط، افصل الاتصال الحالي أولًا'
  },
  valueKind: {
    bool: 'منطقي',
    number: 'رقم',
    string: 'نص',
    json: 'JSON',
    file: 'ملف',
    'txt-file': 'ملف نصي',
    'img-file': 'ملف صورة'
  },
  intro: {
    whatIs: {
      title: 'ما هذا؟',
      body: 'Finder+ تطبيق سطح مكتب {arch} مبني باستخدام Electron + Vue 3. يمكنك سحب أنواع مختلفة من العقد إلى اللوحة وربطها بخطوط لتشكيل مسار لتدفق البيانات، تتدفق البيانات من العقد المصدر عبر الحواف إلى العقد الهدف، وتقوم كل عقدة بالتحويل أو الفحص أو الإنتاج في موضعها.',
      arch: 'قائم على العقد / اللوحات'
    },
    concepts: {
      title: 'المفاهيم الأساسية',
      node: {
        name: 'العقدة (Node)',
        desc: 'وحدة وظيفية على اللوحة. لكل عقدة نوع خاص بها (مثل {c1} و{c2} و{c3})، مع منافذ إدخال على اليسار ومنافذ إخراج على اليمين. لا تتعامل العقد مع اللوحة مباشرة، بل تهتم فقط بما تستقبله من قيم وما تنتجه منها.'
      },
      port: {
        name: 'المنفذ (Port)',
        desc: 'النقاط الصغيرة على جانبي العقدة. {input} (على اليسار) تستقبل القيم من المنبع، و{output} (على اليمين) تدفع القيم نحو المصب. لكل منفذ قيد نوع ({c1} و{c2} و{c3} وغيرها)، ويتم التحقق من تطابق النوع لحظيًا عند الربط.',
        input: 'منافذ الإدخال',
        output: 'منافذ الإخراج'
      },
      edge: {
        name: 'الحافة (Edge)',
        desc: 'خط يربط منفذ إخراج بمنفذ إدخال. تتدفق القيم على طول الحواف من اليسار إلى اليمين. اسحب من نقطة منفذ الإخراج إلى نقطة منفذ الإدخال في عقدة أخرى لإنشاء اتصال.'
      },
      scene: {
        name: 'المشهد (Scene)',
        desc: 'الحاوية لجميع العقد والحواف على اللوحة. تتولى إضافة العقد وحذفها، وربط الحواف وفكّها، وبث التغييرات إلى طبقة الواجهة لتحديثها.'
      }
    },
    quickStart: {
      title: 'البدء السريع',
      step1: 'انقر على {plus} في أعلى اليسار لفتح لوحة العقد، ثم اسحب عقدة إلى اللوحة',
      step2: 'عند إسقاط ملف يتم التعرف على نوعه تلقائيًا وإنشاء عقدة File المناسبة',
      step3: 'اسحب من منفذ الإخراج لأحد العقد (النقطة اليمنى) إلى منفذ الإدخال لعقدة أخرى (النقطة اليسرى) لرسم الاتصال',
      step4: 'انقر نقرًا مزدوجًا على عقدة أو انقر على أيقونة الترس عليها لضبط معاملاتها',
      step5: 'إذا كانت العقدة تحتوي على {help} مُهيَّأة، فانقر على أيقونة علامة الاستفهام لعرض الاستخدام التفصيلي لتلك العقدة'
    },
    nodeTypes: {
      title: 'نظرة عامة على أنواع العقد',
      category: 'الفئة',
      common: 'العقد الشائعة',
      sep: '، ',
      input: 'الإدخال',
      process: 'المعالجة',
      output: 'الإخراج / العرض',
      container: 'الحاوية',
      footer: 'تسرد قائمة «مساعدة العقد» على اليسار العقد التي تحتوي حاليًا على مستندات مساعدة مسجّلة. انقر على أحدها لعرض استخدامه التفصيلي.'
    }
  },
  fileDragGuide: {
    title: 'File nodes',
    whatIs: {
      title: 'What are file nodes?',
      body: 'File nodes are a special category of nodes in Finder+, including {txt}, {img}, {any}, and the container nodes {folder}, {imgfolder}. They are backed by real files — bring a file from disk onto the canvas, then pipe its contents through output ports to downstream nodes.'
    },
    palette: {
      title: 'Why aren\'t they in the palette?',
      body: 'File nodes are not listed in the {plus} palette in the top-left corner — because they are created differently from regular nodes. Regular nodes are "empty shells" that you fill with data manually; file nodes are bound directly to real files, so "drag file onto canvas" creates the node and imports the data in one step.'
    },
    howTo: {
      title: 'How to create them',
      step1: 'Open your system file manager (Finder on macOS, File Explorer on Windows)',
      step2: 'Select a file (or folder), then drag it into the Finder+ canvas while holding the left mouse button',
      step3: 'Release the mouse button — Finder+ automatically detects the file type and creates the matching node at the drop location',
      noteTitle: 'Tip',
      noteBody: 'You can drag multiple files at once; Finder+ creates an independent node for each one. If you drag a folder, a folder or img-folder container node is created automatically.'
    },
    mapping: {
      title: 'File type mapping',
      category: 'Category',
      fileType: 'File extension',
      nodeType: 'Created node type',
      txt: '.txt (plain text)',
      img: '.jpg / .jpeg / .png / .gif / .webp / .bmp',
      any: 'All other file types',
      folder: 'Regular folder',
      imgfolder: 'Image folder (folder containing images)',
      footer: 'Matching priority is top to bottom — specific types (txt, images) are matched first, anything else falls through to the any-file generic node.'
    },
    intoFolder: {
      title: 'Dropping into a folder container',
      body: 'If a {folder} or img-folder container node already exists on the canvas, drop the file inside its content area instead of the blank canvas. The file will not create a new top-level node — it will be "adopted" by the folder as a child node, with the correct file-node type determined automatically by its extension.'
    }
  },
  onboarding: {
    title: 'Welcome to Finder+',
    step1: {
      title: 'Step 1: Drag in a file',
      hint: 'Open Finder, pick any file, and drag it onto the canvas. Finder+ will automatically create a file node matching its type.',
      canvasLabel: 'Drop your file here'
    },
    step2a: {
      title: 'Step 2: Add a File Info node',
      hint: 'Click ＋ in the top-left to open the palette, then pick the highlighted File Info tile.',
      paletteLabel: 'Open the palette and search File Info'
    },
    step2b: {
      title: 'Step 3: Place the node',
      hint: 'Move the mouse to an empty spot on the canvas and click — File Info will snap into place.',
      placeLabel: 'Click anywhere on the canvas to place it'
    },
    step3: {
      title: 'Step 4: Connect the nodes',
      hint: 'Press and hold on the dot on the right side of the file node (output port), drag a line to the dot on the left side of File Info (input port), and release.',
      connectLabel: 'Drag from the right dot of the file node to the left dot of File Info'
    },
    skip: 'Skip tutorial',
    celebration: {
      title: 'Tutorial complete!',
      desc: 'By combining different nodes and connecting them, you can build all kinds of automated workflows. Happy exploring!',
      start: 'Start exploring'
    }
  }

,
  table: {
    columnSettings: 'Column settings',
    sqlPort: '+ SQL port',
    sqlPortTitle: 'Add a pair of SQL query ports. Upstream StringValue writes a SELECT statement; use {table} in the SQL for the physical table name (e.g. SELECT * FROM {table})',
    addRow: '+ Add',
    search: 'Search',
    reset: 'Reset',
    headerOperations: 'Actions',
    emptyHint: 'No data yet — click "+ Add" at the top right to create the first row',
    loading: 'Loading…',
    totalRows: '{total} rows total',
    rowId: 'ID',
    edit: 'Edit',
    delete: 'Delete',
    submitFailed: 'Operation failed',
    deleteFailed: 'Delete failed',
    confirmDeleteRow: 'Delete row {id}?',
    confirmDeleteColumn: 'Delete column "{name}"? All data in this column will be permanently removed.',
    businessType: {
      text: 'Text',
      textarea: 'Long text',
      number: 'Number',
      boolean: 'Boolean',
      color: 'Color',
      time: 'وقت',
      date: 'تاريخ'
    },
    dialogTitleAdd: 'Add',
    dialogTitleEdit: 'Edit',
    dialogCancel: 'Cancel',
    dialogConfirm: 'OK',
    colSectionTitle: 'Current columns',
    colEmpty: 'No custom columns',
    colHeaderName: 'Name',
    colHeaderType: 'Type',
    colHeaderTitle: 'Title',
    colHeaderDefault: 'Default',
    colHeaderList: 'List',
    colHeaderSearch: 'Search',
    colHeaderCanUpdate: 'Editable',
    colHeaderCanSort: 'Sortable',
    colHeaderOperations: 'Actions',
    titlePlaceholder: 'Optional',
    colVisible: 'Visible in table',
    colHidden: 'Hidden in table',
    searchVisible: 'Visible in search',
    searchHidden: 'Hidden in search',
    canEditEnabled: 'Editable in edit dialog',
    canEditDisabled: 'Disabled in edit dialog',
    sortEnabled: 'Clickable sort',
    sortDisabled: 'Not sortable',
    addColumnTrigger: '+ Add column',
    close: 'Close',
    noCustomColumns: '(no custom columns)',
    addColTitle: 'Add column',
    addColNameLabel: 'Column name (SQL)',
    addColNamePlaceholder: 'e.g. email',
    addColTitleLabel: 'Display title',
    addColTitlePlaceholder: 'Optional, defaults to column name',
    addColBusinessTypeLabel: 'Business type',
    addColDefaultLabel: 'Default value',
    addColShowInListLabel: 'Show in list',
    addColShowInListTitle: 'Show this column in the table',
    addColShowInSearchLabel: 'Enable search',
    addColShowInSearchTitle: 'Show this column in the search bar',
    addColCanUpdateLabel: 'Editable',
    addColCanUpdateTitle: 'Allow editing in the edit dialog',
    addColCanSortLabel: 'Sortable',
    addColCanSortTitle: 'Allow clicking header to sort',
    addColCancel: 'Cancel',
    addColConfirm: 'Add',
    errorEmptyName: 'Please enter a column name',
    errorInvalidName: 'Column name must start with a letter or underscore, followed by letters, digits or underscores',
    errorDuplicateName: 'Column "{name}" already exists',
    resizeTooltip: 'Drag to resize',
    nodeFallback: 'Table'
  }
}

export default ar