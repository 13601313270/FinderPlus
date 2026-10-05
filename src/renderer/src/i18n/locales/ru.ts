import type { Language } from '../types'

/** Russian messages */
const ru: Language = {
  app: {
    settings: 'Настройки',
    help: 'Справка',
    fileMenu: 'Файл'
  },
  settingsDialog: {
    title: 'Настройки',
    close: 'Закрыть (Esc)',
    language: 'Язык',
    languageHint: 'Выберите язык интерфейса. Изменения сохраняются автоматически.',
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
    onboardingRestart: 'Show tutorial again',
    clearSection: 'Canvas',
    clearHint: 'Remove all nodes and edges from the canvas. Files in the canvas directory will NOT be deleted.',
    clearButton: 'Clear Canvas',
    clearConfirmTitle: 'Clear the canvas?',
    clearConfirmBody: 'This will remove all nodes and edges from the canvas and cannot be undone. Files in the canvas directory will NOT be deleted. Continue?',
    clearSuccess: 'Canvas cleared.',
    clearAlreadyEmpty: 'The canvas is already empty'
  },
  helpCenter: {
    title: 'Центр справки',
    close: 'Закрыть (Esc)',
    loading: 'Загрузка…',
    empty: 'Нет доступных справочных документов',
    pickNode: 'Выберите узел слева',
    groupNodes: 'Обзор типов узлов',
    about: 'О Finder+'
  },
  helpDialog: {
    title: 'Инструкция',
    close: 'Закрыть (Esc)'
  },
  minimap: {
    dragToMove: 'Перетащите, чтобы переместить миникарту',
    expand: 'Развернуть миникарту',
    collapse: 'Свернуть миникарту',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    reset: 'Сбросить'
  },
  palette: {
    addNode: 'Добавить узел',
    searchPlaceholder: 'Поиск узлов…',
    noResult: 'Нет подходящих узлов',
    nodeHelp: 'Открыть справку по узлу'
  },
  connection: {
    selfLoop: 'Порты одного узла нельзя соединить между собой',
    failed: 'Не удалось подключиться: {reason}',
    alreadyBound: 'Эти два порта уже соединены',
    kindNotAllowed: 'Несовпадение типов: этот входной порт не принимает данный тип',
    singlePortOccupied: 'Этот входной порт принимает только одно соединение. Сначала отключите существующее'
  },
  valueKind: {
    bool: 'Логический',
    number: 'Число',
    string: 'Строка',
    json: 'JSON',
    file: 'Файл',
    'txt-file': 'Текстовый файл',
    'img-file': 'Файл изображения'
  },
  intro: {
    whatIs: {
      title: 'Что это?',
      body: 'Finder+ — это {arch} десктопное приложение на Electron + Vue 3. Вы можете перетаскивать на холст узлы разных типов и соединять их линиями, образуя конвейер потока данных: данные идут от узлов-источников по рёбрам к узлам-приёмникам, а каждый узел выполняет преобразование, проверку или вывод на своей позиции.',
      arch: 'узловое / доскообразное'
    },
    concepts: {
      title: 'Основные понятия',
      node: {
        name: 'Узел (Node)',
        desc: 'Функциональная единица на холсте. У каждого узла есть свой тип (например, {c1}, {c2}, {c3}), слева — входные порты, справа — выходные. Узлы не управляют холстом напрямую, а лишь отвечают за то, какие значения получают и какие выдают.'
      },
      port: {
        name: 'Порт (Port)',
        desc: 'Небольшие точки по обе стороны узла. {input} (слева) принимают значения от источника, {output} (справа) передают значения дальше. У каждого порта есть ограничение по типу ({c1}, {c2}, {c3} и т. д.), и при соединении тип проверяется в реальном времени.',
        input: 'Входные порты',
        output: 'Выходные порты'
      },
      edge: {
        name: 'Ребро (Edge)',
        desc: 'Линия, соединяющая выходной порт с входным. Значения текут по рёбрам слева направо. Перетащите точку выходного порта к точке входного порта другого узла, чтобы создать соединение.'
      },
      scene: {
        name: 'Сцена (Scene)',
        desc: 'Контейнер для всех узлов и рёбер на холсте. Он отвечает за добавление и удаление узлов, привязку и отвязку рёбер, а также за передачу изменений в слой UI для обновления.'
      }
    },
    quickStart: {
      title: 'Быстрый старт',
      step1: 'Нажмите {plus} в левом верхнем углу, чтобы открыть палитру узлов, и перетащите узел на холст',
      step2: 'При перетаскивании файла его тип определяется автоматически и создаётся соответствующий узел File',
      step3: 'Перетащите от выходного порта узла (правая точка) к входному порту другого узла (левая точка), чтобы провести соединение',
      step4: 'Дважды щёлкните по узлу или нажмите значок шестерёнки на узле, чтобы настроить его параметры',
      step5: 'Если у узла настроена {help}, нажмите значок вопроса, чтобы посмотреть подробное описание работы этого узла'
    },
    nodeTypes: {
      title: 'Обзор типов узлов',
      category: 'Категория',
      common: 'Обычные узлы',
      sep: ', ',
      input: 'Вход',
      process: 'Обработка',
      output: 'Вывод / Отображение',
      container: 'Контейнер',
      footer: 'В списке «Справка по узлам» слева перечислены узлы, для которых зарегистрированы справочные документы. Нажмите на любой, чтобы посмотреть подробное описание.'
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
      time: 'Дата',
      date: 'Дата'
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

export default ru