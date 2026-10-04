import type { Language } from '../types'

/** Japanese messages */
const ja: Language = {
  app: {
    settings: '設定',
    help: 'ヘルプ',
    fileMenu: 'ファイル'
  },
  settingsDialog: {
    title: '設定',
    close: '閉じる（Esc）',
    language: '言語',
    languageHint: 'インターフェースの言語を選択してください。変更は自動的に保存されます。',
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
    title: 'ヘルプセンター',
    close: '閉じる（Esc）',
    loading: '読み込み中…',
    empty: '表示できるヘルプドキュメントがありません',
    pickNode: '左側からノードを選択してください',
    groupNodes: 'ノードタイプの紹介',
    about: 'Finder+ について'
  },
  helpDialog: {
    title: '使い方',
    close: '閉じる（Esc）'
  },
  minimap: {
    dragToMove: 'ドラッグしてミニマップを移動',
    expand: 'ミニマップを展開',
    collapse: 'ミニマップを折りたたむ',
    zoomIn: '拡大',
    zoomOut: '縮小',
    reset: 'リセット'
  },
  palette: {
    addNode: 'ノードを追加',
    searchPlaceholder: 'ノードを検索…',
    noResult: '一致するノードがありません',
    nodeHelp: 'このノードの説明を見る'
  },
  connection: {
    selfLoop: '同じノードのポート同士は接続できません',
    failed: '接続に失敗しました：{reason}',
    alreadyBound: 'この2つのポートはすでに接続されています',
    kindNotAllowed: '型が一致しません：この入力ポートはこの型を受け付けません',
    singlePortOccupied: 'この入力ポートは1本しか接続できません。先に既存の接続を解除してください'
  },
  valueKind: {
    bool: 'ブール',
    number: '数値',
    string: '文字列',
    json: 'JSON',
    file: 'ファイル',
    'txt-file': 'テキストファイル',
    'img-file': '画像ファイル'
  },
  intro: {
    whatIs: {
      title: 'これは何？',
      body: 'Finder+ は Electron + Vue 3 で構築された {arch} デスクトップアプリです。キャンバスにさまざまなタイプのノードをドラッグして配置し、線でつなぐことでデータフローのパイプラインを形成できます。データは上流のノードから辺に沿って下流のノードへ流れ、各ノードはそれぞれの位置で変換・チェック・生成を行います。',
      arch: 'ノード式 / ボード式'
    },
    concepts: {
      title: '基本概念',
      node: {
        name: 'ノード（Node）',
        desc: 'キャンバス上の機能単位です。各ノードは固有のタイプ（{c1}、{c2}、{c3} など）を持ち、左側に入力ポート、右側に出力ポートがあります。ノードはキャンバスを直接操作せず、「どんな値を受け取り、どんな値を出力するか」だけを扱います。'
      },
      port: {
        name: 'ポート（Port）',
        desc: 'ノードの両側にある小さな円点です。{input}（左側）は上流から値を受け取り、{output}（右側）は下流へ値を送り出します。各ポートには型の制約（{c1}、{c2}、{c3} など）があり、接続時に型が一致するかリアルタイムで検証されます。',
        input: '入力ポート',
        output: '出力ポート'
      },
      edge: {
        name: '辺（Edge）',
        desc: '出力ポートと入力ポートをつなぐ線です。値は辺に沿って左から右へ流れます。出力ポートの円点をドラッグして別のノードの入力ポートの円点へつなぐと、接続を作成できます。'
      },
      scene: {
        name: 'シーン（Scene）',
        desc: 'キャンバス上のすべてのノードと辺のコンテナです。ノードの追加・削除、辺のバインド・解除、および変更を UI 層へブロードキャストして更新する役割を担います。'
      }
    },
    quickStart: {
      title: 'クイックスタート',
      step1: '左上の {plus} をクリックしてノードパレットを開き、ノードを選んでキャンバスにドラッグします',
      step2: 'ファイルをドロップすると自動的にタイプを判別し、対応する File ノードを生成します',
      step3: 'あるノードの出力ポート（右側の円点）から別のノードの入力ポート（左側の円点）へドラッグして線をつなぎます',
      step4: 'ノードをダブルクリックするか、ノード上の歯車アイコンをクリックしてパラメータを設定します',
      step5: 'ノードに {help} が設定されている場合は、疑問符アイコンをクリックするとそのノードの詳しい使い方を確認できます'
    },
    nodeTypes: {
      title: 'ノードタイプの概要',
      category: 'カテゴリ',
      common: '一般的なノード',
      sep: '、',
      input: '入力',
      process: '処理',
      output: '出力 / 表示',
      container: 'コンテナ',
      footer: '左側の「ノードヘルプ」リストには、現在ヘルプドキュメントが登録されているノードが表示されます。クリックすると詳しい使い方を確認できます。'
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
      time: '日時'
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

export default ja