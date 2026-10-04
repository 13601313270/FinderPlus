import type { Language } from '../types'

/** Korean messages */
const ko: Language = {
  app: {
    settings: '설정',
    help: '도움말',
    fileMenu: '파일'
  },
  settingsDialog: {
    title: '설정',
    close: '닫기(Esc)',
    language: '언어',
    languageHint: '인터페이스 언어를 선택하세요. 변경 사항은 자동으로 저장됩니다.',
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
    title: '도움말 센터',
    close: '닫기(Esc)',
    loading: '불러오는 중…',
    empty: '볼 수 있는 도움말 문서가 없습니다',
    pickNode: '왼쪽에서 노드를 선택하세요',
    groupNodes: '노드 유형 소개',
    about: 'Finder+ 정보'
  },
  helpDialog: {
    title: '사용 설명',
    close: '닫기(Esc)'
  },
  minimap: {
    dragToMove: '드래그하여 미니맵 이동',
    expand: '미니맵 펼치기',
    collapse: '미니맵 접기',
    zoomIn: '확대',
    zoomOut: '축소',
    reset: '초기화'
  },
  palette: {
    addNode: '노드 추가',
    searchPlaceholder: '노드 검색…',
    noResult: '일치하는 노드가 없습니다',
    nodeHelp: '노드 설명 보기'
  },
  connection: {
    selfLoop: '같은 노드의 포트끼리는 연결할 수 없습니다',
    failed: '연결 실패: {reason}',
    alreadyBound: '이 두 포트는 이미 연결되어 있습니다',
    kindNotAllowed: '유형이 일치하지 않습니다: 이 입력 포트는 해당 유형을 받지 않습니다',
    singlePortOccupied: '이 입력 포트는 하나만 연결할 수 있습니다. 먼저 기존 연결을 끊으세요'
  },
  valueKind: {
    bool: '불리언',
    number: '숫자',
    string: '문자열',
    json: 'JSON',
    file: '파일',
    'txt-file': '텍스트 파일',
    'img-file': '이미지 파일'
  },
  intro: {
    whatIs: {
      title: '이것은 무엇인가요?',
      body: 'Finder+는 Electron + Vue 3로 만든 {arch} 데스크톱 앱입니다. 캔버스에 다양한 유형의 노드를 끌어다 놓고 선으로 연결하면 데이터 흐름 파이프라인을 만들 수 있습니다. 데이터는 상위 노드에서 엣지를 따라 하위 노드로 흐르고, 각 노드는 자신의 위치에서 변환, 검사, 생성 작업을 수행합니다.',
      arch: '노드 기반 / 보드 기반'
    },
    concepts: {
      title: '핵심 개념',
      node: {
        name: '노드(Node)',
        desc: '캔버스 위의 기능 단위입니다. 각 노드는 고유한 유형(예: {c1}, {c2}, {c3})을 가지며 왼쪽에 입력 포트, 오른쪽에 출력 포트가 있습니다. 노드는 캔버스를 직접 조작하지 않고 "어떤 값을 받아 어떤 값을 내보내는가"만 담당합니다.'
      },
      port: {
        name: '포트(Port)',
        desc: '노드 양쪽의 작은 원형 점입니다. {input}(왼쪽)은 상위에서 값을 받고, {output}(오른쪽)은 하위로 값을 보냅니다. 각 포트에는 유형 제약({c1}, {c2}, {c3} 등)이 있어 연결할 때 유형이 맞는지 실시간으로 검사합니다.',
        input: '입력 포트',
        output: '출력 포트'
      },
      edge: {
        name: '엣지(Edge)',
        desc: '출력 포트와 입력 포트를 잇는 선입니다. 값은 엣지를 따라 왼쪽에서 오른쪽으로 흐릅니다. 출력 포트의 점을 다른 노드의 입력 포트 점으로 끌어다 놓으면 연결이 만들어집니다.'
      },
      scene: {
        name: '씬(Scene)',
        desc: '캔버스 위의 모든 노드와 엣지를 담는 컨테이너입니다. 노드 추가/삭제, 엣지 바인딩/해제, 그리고 변경 사항을 UI 계층에 브로드캐스트하여 갱신하는 역할을 합니다.'
      }
    },
    quickStart: {
      title: '빠른 시작',
      step1: '왼쪽 상단의 {plus}를 클릭해 노드 팔레트를 열고 노드를 골라 캔버스로 끌어다 놓으세요',
      step2: '파일을 끌어다 놓으면 유형을 자동으로 인식해 해당 File 노드를 생성합니다',
      step3: '어떤 노드의 출력 포트(오른쪽 점)에서 다른 노드의 입력 포트(왼쪽 점)로 끌어 연결하세요',
      step4: '노드를 더블 클릭하거나 노드의 톱니바퀴 아이콘을 클릭해 매개변수를 설정하세요',
      step5: '노드에 {help}가 설정되어 있다면 물음표 아이콘을 클릭해 해당 노드의 자세한 사용법을 확인하세요'
    },
    nodeTypes: {
      title: '노드 유형 개요',
      category: '분류',
      common: '일반 노드',
      sep: ', ',
      input: '입력',
      process: '처리',
      output: '출력 / 표시',
      container: '컨테이너',
      footer: '왼쪽의 "노드 도움말" 목록에는 현재 도움말 문서가 등록된 노드가 나옵니다. 클릭하면 자세한 사용법을 볼 수 있습니다.'
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
      time: '시간'
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

export default ko