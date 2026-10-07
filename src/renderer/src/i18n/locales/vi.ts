import type { Language } from '../types'

/** Vietnamese messages */
const vi: Language = {
  app: {
    settings: 'Cài đặt',
    help: 'Trợ giúp',
    fileMenu: 'Tệp'
  },
  settingsDialog: {
    title: 'Cài đặt',
    close: 'Đóng (Esc)',
    language: 'Ngôn ngữ',
    languageHint: 'Chọn ngôn ngữ giao diện. Các thay đổi được lưu tự động.',
    transferTitle: 'Chuyển dữ liệu',
    transferHint: 'Xuất khung vẽ hiện tại và tất cả tệp của bạn dưới dạng zip, hoặc nhập từ bản sao lưu trên máy tính mới.',
    export: 'Xuất…',
    import: 'Nhập…',
    exportSuccess: 'Xuất hoàn thành thành công.',
    importSuccess: 'Nhập hoàn thành thành công. Vui lòng khởi động lại ứng dụng để tải lại khung vẽ.',
    exportKeyHint: 'Khóa API không được bao gồm trong xuất vì lý do bảo mật. Bạn sẽ cần nhập lại chúng trên máy tính mới.',
    importConfirmTitle: 'Nhập sẽ thay thế tất cả dữ liệu',
    importConfirmBody: 'Nhập sẽ ghi đè khung vẽ, tệp và cài đặt hiện tại của bạn bằng bản sao lưu. Không thể hoàn tác việc này. Tiếp tục?',
    onboardingSection: 'Hướng dẫn giới thiệu',
    onboardingHint: 'Xem lại cách bắt đầu nhanh của Finder+: kéo một tệp và kết nối các nút.',
    onboardingRestart: 'Hiển thị lại hướng dẫn',
    clearSection: 'Khung vẽ',
    clearHint: 'Xóa tất cả các nút và cạnh khỏi khung vẽ. Các tệp trong thư mục khung vẽ sẽ KHÔNG bị xóa.',
    clearButton: 'Xóa khung vẽ',
    clearConfirmTitle: 'Xóa khung vẽ?',
    clearConfirmBody: 'Thao tác này sẽ xóa tất cả các nút và cạnh khỏi khung vẽ và không thể hoàn tác. Các tệp trong thư mục khung vẽ sẽ KHÔNG bị xóa. Tiếp tục?',
    clearSuccess: 'Khung vẽ đã được xóa.',
    clearAlreadyEmpty: 'Khung vẽ đã trống',

    groupGeneral: 'Chung',
    groupLLM: 'Cài đặt LLM',
    groupImage: 'Tạo ảnh',

    groupCanvases: "Canvas của tôi",
    llmTitle: 'Khóa API LLM',
    llmHint: 'Cấu hình khóa API cho từng nhà cung cấp tại đây. Mỗi nút LLM có thể chọn độc lập nhà cung cấp và mô hình nào để sử dụng.',
    imageTitle: 'Khóa API tạo ảnh',
    imageHint: 'Cấu hình khóa API cho từng nhà cung cấp tạo ảnh tại đây. Mỗi nút ảnh có thể chọn độc lập nhà cung cấp và mô hình nào để sử dụng.',
    save: 'Lưu',
    clear: 'Xóa',
    saved: 'Đã lưu',
    canvasesTitle: "Canvas của tôi",
    canvasesHint: "Tất cả canvas và thông tin cơ bản của chúng được liệt kê ở đây. Nhấp vào \"Mở\" để mở một canvas trong cửa sổ mới; nhiều cửa sổ có thể hoạt động song song.",
    canvasesLoading: "Đang tải…",
    canvasesEmpty: "Chưa có canvas nào. Sử dụng trình chọn canvas ở trên để tạo một canvas mới.",
    canvasBadgeDefault: "Mặc định",
    canvasBadgeCurrent: "Hiện tại",
    canvasNodeStat: "nút",
    canvasEdgeStat: "dây nối",
    canvasFileStat: "tệp",
    canvasLastModified: "Sửa lần cuối",
    canvasBtnOpen: "Mở",
    canvasBtnOpenFolder: "Mở thư mục",
    canvasBtnRename: "Đổi tên",
    canvasBtnDelete: "Xóa",
    canvasRenamePrompt: "Đổi tên canvas:",
    canvasRenameFailed: "Đổi tên thất bại",
    canvasOnlyOneTitle: "Đây là canvas duy nhất",
    canvasOnlyOneBody: "Không thể xóa canvas cuối cùng. Xóa toàn bộ nội dung thay vào đó?\n\nCanvas: {name}",
    canvasDeleteConfirmTitle: "Xóa canvas?",
    canvasDeleteConfirmBody: "Nút, dây nối và tệp trong canvas sẽ bị xóa tất cả và không thể khôi phục.\n\nCanvas: {name}",
    canvasDeleteFailed: "Xóa thất bại",
  },
  helpCenter: {
    title: 'Trung tâm trợ giúp',
    close: 'Đóng (Esc)',
    loading: 'Đang tải…',
    empty: 'Không có tài liệu trợ giúp nào',
    pickNode: 'Chọn một nút ở bên trái',
    groupNodes: 'Các loại nút',
    about: 'Giới thiệu về Finder+'
  },
  helpDialog: {
    title: 'Hướng dẫn',
    close: 'Đóng (Esc)'
  },
  nodeHeader: {
    dragHint: 'Drag node',
    helpTitle: 'Help'
  },
  minimap: {
    dragToMove: 'Kéo để di chuyển bản đồ nhỏ',
    expand: 'Mở rộng bản đồ nhỏ',
    collapse: 'Thu gọn bản đồ nhỏ',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    reset: 'Đặt lại'
  },
  palette: {
    addNode: 'Thêm nút',
    searchPlaceholder: 'Tìm nút…',
    noResult: 'Không có nút phù hợp',
    nodeHelp: 'Xem tài liệu về nút'
  },
  connection: {
    selfLoop: 'Không thể kết nối các cổng trên cùng một nút',
    failed: 'Kết nối thất bại: {reason}',
    alreadyBound: 'Hai cổng này đã được kết nối',
    kindNotAllowed: 'Không khớp loại: cổng đầu vào này không chấp nhận loại này',
    singlePortOccupied: 'Cổng đầu vào này chỉ chấp nhận một kết nối. Hãy ngắt kết nối hiện có trước'
  },
  valueKind: {
    bool: 'Boolean',
    number: 'Số',
    string: 'Chuỗi',
    json: 'JSON',
    file: 'Tệp',
    'txt-file': 'Tệp văn bản',
    'img-file': 'Tệp hình ảnh'
  },
  intro: {
    whatIs: {
      title: 'Đây là gì?',
      body: 'Finder+ là một ứng dụng máy tính để bàn {arch} được xây dựng bằng Electron + Vue 3. Kéo các loại nút khác nhau lên cảnh và nối chúng lại với nhau để tạo thành một đường ống luồng dữ liệu — dữ liệu chảy từ các nút thượng nguồn dọc theo các cạnh đến các nút hạ nguồn, và mỗi nút biến đổi, kiểm tra hoặc tạo ra giá trị tại vị trí của chính nó.',
      arch: 'dựa trên nút / dựa trên bảng'
    },
    concepts: {
      title: 'Các khái niệm cốt lõi',
      node: {
        name: 'Nút',
        desc: 'Một đơn vị chức năng trên cảnh. Mỗi nút có loại riêng (như {c1}, {c2}, {c3}), với các cổng đầu vào ở bên trái và cổng đầu ra ở bên phải. Các nút không thao tác trực tiếp trên cảnh — chúng chỉ quan tâm đến những giá trị nhận được và những giá trị tạo ra.'
      },
      port: {
        name: 'Cổng',
        desc: 'Các chấm nhỏ ở hai bên của một nút. {input} (bên trái) nhận giá trị từ thượng nguồn, {output} (bên phải) đẩy giá trị xuống hạ nguồn. Mỗi cổng có một ràng buộc loại ({c1}, {c2}, {c3}, v.v.), và loại được kiểm tra theo thời gian thực khi kết nối.',
        input: 'Cổng đầu vào',
        output: 'Cổng đầu ra'
      },
      edge: {
        name: 'Cạnh',
        desc: 'Một đường nối cổng đầu ra với cổng đầu vào. Các giá trị chảy dọc theo các cạnh từ trái sang phải. Kéo từ chấm của cổng đầu ra đến chấm cổng đầu vào của nút khác để tạo kết nối.'
      },
      scene: {
        name: 'Cảnh',
        desc: 'Vùng chứa tất cả các nút và cạnh trên cảnh. Nó xử lý việc thêm và xóa nút, liên kết và hủy liên kết cạnh, đồng thời phát các thay đổi đến lớp UI để làm mới.'
      }
    },
    quickStart: {
      title: 'Bắt đầu nhanh',
      step1: 'Nhấp vào {plus} ở góc trên bên trái để mở bảng nút, sau đó kéo một nút lên cảnh',
      step2: 'Thả một tệp sẽ tự động phát hiện loại của nó và tạo nút File tương ứng',
      step3: 'Kéo từ cổng đầu ra của một nút (chấm bên phải) đến cổng đầu vào của nút khác (chấm bên trái) để vẽ kết nối',
      step4: 'Nhấp đúp vào một nút, hoặc nhấp vào biểu tượng bánh răng trên đó, để cấu hình tham số của nút',
      step5: 'Nếu một nút đã cấu hình {help}, hãy nhấp vào biểu tượng dấu hỏi để xem hướng dẫn sử dụng chi tiết của nút đó'
    },
    nodeTypes: {
      title: 'Tổng quan về các loại nút',
      category: 'Danh mục',
      common: 'Nút phổ biến',
      sep: ', ',
      input: 'Đầu vào',
      process: 'Xử lý',
      output: 'Đầu ra / Hiển thị',
      container: 'Vùng chứa',
      footer: 'Danh sách "Trợ giúp nút" ở bên trái hiển thị các nút hiện có tài liệu trợ giúp được đăng ký. Nhấp vào một mục để xem hướng dẫn sử dụng chi tiết.'
    },
    gallery: {
      title: 'Xem nó có thể làm gì',
      caption: 'Kết nối các nút {imageGen}, {llm}, {code} và các nút khác để xây dựng quy trình làm việc tự động hoàn chỉnh. Dưới đây là một đường ống «trình tạo sách tranh» — nó chia văn bản thành các đoạn, tạo minh họa cho từng đoạn và tự động ghép các trang, tất cả bằng cách kéo và kết nối các nút trên khung vẽ.'
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
    sqlPort: 'SQL ports',
    sqlPortTitle: 'Manage SQL query ports',
    sqlPortDialogTitle: 'SQL Port Management',
    sqlPortSectionTitle: 'Added query ports',
    sqlPortEmpty: 'No SQL query ports yet',
    sqlPortAdd: '+ Add SQL port',
    sqlPortConfirmDelete: 'Delete query port {idx}?',
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
      time: 'Thời gian',
      date: 'Ngày'
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

export default vi
