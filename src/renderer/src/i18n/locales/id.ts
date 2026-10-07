import type { Language } from '../types'

/** Indonesian messages */
const id: Language = {
  app: {
    settings: 'Pengaturan',
    help: 'Bantuan',
    fileMenu: 'Berkas'
  },
  settingsDialog: {
    title: 'Pengaturan',
    close: 'Tutup (Esc)',
    language: 'Bahasa',
    languageHint: 'Pilih bahasa antarmuka. Perubahan disimpan secara otomatis.',
    transferTitle: 'Migrasi data',
    transferHint: 'Ekspor kanvas Anda saat ini dan semua file sebagai zip, atau impor dari cadangan di komputer baru.',
    export: 'Ekspor…',
    import: 'Impor…',
    exportSuccess: 'Ekspor berhasil diselesaikan.',
    importSuccess: 'Impor berhasil diselesaikan. Silakan mulai ulang aplikasi untuk memuat ulang kanvas Anda.',
    exportKeyHint: 'Kunci API tidak termasuk dalam ekspor karena alasan keamanan. Anda harus memasukkannya kembali di komputer baru.',
    importConfirmTitle: 'Impor akan mengganti semua data',
    importConfirmBody: 'Mengimpor akan menimpa kanvas, file, dan pengaturan Anda saat ini dengan cadangan. Tindakan ini tidak dapat dibatalkan. Lanjutkan?',
    onboardingSection: 'Tutorial onboarding',
    onboardingHint: 'Tonton panduan cepat Finder+ lagi: seret file dan hubungkan simpul.',
    onboardingRestart: 'Tampilkan tutorial lagi',
    clearSection: 'Kanvas',
    clearHint: 'Hapus semua simpul dan tepi dari kanvas. File di direktori kanvas tidak akan dihapus.',
    clearButton: 'Bersihkan kanvas',
    clearConfirmTitle: 'Bersihkan kanvas?',
    clearConfirmBody: 'Ini akan menghapus semua simpul dan tepi dari kanvas dan tidak dapat dibatalkan. File di direktori kanvas tidak akan dihapus. Lanjutkan?',
    clearSuccess: 'Kanvas dibersihkan.',
    clearAlreadyEmpty: 'Kanvas sudah kosong',

    groupGeneral: 'Umum',
    groupLLM: 'Pengaturan LLM',
    groupImage: 'Pembuatan Gambar',

    groupCanvases: "Kanvas Saya",
    llmTitle: 'Kunci API LLM',
    llmHint: 'Konfigurasikan kunci API untuk setiap penyedia di sini. Setiap node LLM dapat memilih secara mandiri penyedia dan model yang digunakan.',
    imageTitle: 'Kunci API Pembuatan Gambar',
    imageHint: 'Konfigurasikan kunci API untuk setiap penyedia pembuatan gambar di sini. Setiap node gambar dapat memilih secara mandiri penyedia dan model yang digunakan.',
    save: 'Simpan',
    clear: 'Hapus',
    saved: 'Tersimpan',
    canvasesTitle: "Kanvas Saya",
    canvasesHint: "Semua kanvas dan informasi dasarnya tercantum di sini. Klik \"Buka\" untuk membuka kanvas di jendela baru; beberapa jendela dapat beroperasi secara paralel.",
    canvasesLoading: "Memuat…",
    canvasesEmpty: "Belum ada kanvas. Gunakan pemilih kanvas di bagian atas untuk membuatnya.",
    canvasBadgeDefault: "Default",
    canvasBadgeCurrent: "Saat ini",
    canvasNodeStat: "simpul",
    canvasEdgeStat: "garis",
    canvasFileStat: "file",
    canvasLastModified: "Terakhir diubah",
    canvasBtnOpen: "Buka",
    canvasBtnOpenFolder: "Buka Folder",
    canvasBtnRename: "Ubah Nama",
    canvasBtnDelete: "Hapus",
    canvasRenamePrompt: "Ubah nama kanvas:",
    canvasRenameFailed: "Gagal mengubah nama",
    canvasOnlyOneTitle: "Ini adalah satu-satunya kanvas",
    canvasOnlyOneBody: "Kanvas terakhir tidak dapat dihapus. Kosongkan semua isinya saja?\n\nKanvas: {name}",
    canvasDeleteConfirmTitle: "Hapus kanvas?",
    canvasDeleteConfirmBody: "Simpul, garis, dan file di kanvas akan semuanya dihapus dan tidak dapat dipulihkan.\n\nKanvas: {name}",
    canvasDeleteFailed: "Gagal menghapus",
  },
  helpCenter: {
    title: 'Pusat Bantuan',
    close: 'Tutup (Esc)',
    loading: 'Memuat…',
    empty: 'Tidak ada dokumen bantuan yang tersedia',
    pickNode: 'Pilih node di sebelah kiri',
    groupNodes: 'Jenis node',
    about: 'Tentang Finder+'
  },
  helpDialog: {
    title: 'Petunjuk',
    close: 'Tutup (Esc)'
  },
  minimap: {
    dragToMove: 'Seret untuk memindahkan minimap',
    expand: 'Perluas minimap',
    collapse: 'Perkecil minimap',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
    reset: 'Atur ulang'
  },
  palette: {
    addNode: 'Tambah node',
    searchPlaceholder: 'Cari node…',
    noResult: 'Tidak ada node yang cocok',
    nodeHelp: 'Lihat dokumentasi node'
  },
  connection: {
    selfLoop: 'Port pada node yang sama tidak dapat dihubungkan',
    failed: 'Koneksi gagal: {reason}',
    alreadyBound: 'Kedua port ini sudah terhubung',
    kindNotAllowed: 'Jenis tidak cocok: port masukan ini tidak menerima jenis ini',
    singlePortOccupied: 'Port masukan ini hanya menerima satu koneksi. Putuskan koneksi yang ada terlebih dahulu'
  },
  valueKind: {
    bool: 'Boolean',
    number: 'Angka',
    string: 'String',
    json: 'JSON',
    file: 'Berkas',
    'txt-file': 'Berkas Teks',
    'img-file': 'Berkas Gambar'
  },
  intro: {
    whatIs: {
      title: 'Apa ini?',
      body: 'Finder+ adalah aplikasi desktop {arch} yang dibangun dengan Electron + Vue 3. Seret berbagai jenis node ke kanvas dan hubungkan satu sama lain untuk membentuk pipeline aliran data — data mengalir dari node hulu di sepanjang tepi ke node hilir, dan setiap node mengubah, memeriksa, atau menghasilkan nilai pada posisinya sendiri.',
      arch: 'berbasis node / berbasis papan'
    },
    concepts: {
      title: 'Konsep inti',
      node: {
        name: 'Node',
        desc: 'Unit fungsional di kanvas. Setiap node memiliki jenisnya sendiri (seperti {c1}, {c2}, {c3}), dengan port masukan di sebelah kiri dan port keluaran di sebelah kanan. Node tidak beroperasi langsung pada kanvas — node hanya peduli pada nilai apa yang diterima dan nilai apa yang dihasilkan.'
      },
      port: {
        name: 'Port',
        desc: 'Titik-titik kecil di kedua sisi node. {input} (kiri) menerima nilai dari hulu, {output} (kanan) mendorong nilai ke hilir. Setiap port memiliki batasan jenis ({c1}, {c2}, {c3}, dll.), dan jenis diperiksa secara waktu nyata saat menghubungkan.',
        input: 'Port masukan',
        output: 'Port keluaran'
      },
      edge: {
        name: 'Tepi',
        desc: 'Garis yang menghubungkan port keluaran ke port masukan. Nilai mengalir di sepanjang tepi dari kiri ke kanan. Seret dari titik port keluaran ke titik port masukan node lain untuk membuat koneksi.'
      },
      scene: {
        name: 'Kanvas',
        desc: 'Wadah untuk semua node dan tepi di kanvas. Ini menangani penambahan dan penghapusan node, pengikatan dan pelepasan tepi, serta menyiarkan perubahan ke lapisan UI untuk penyegaran.'
      }
    },
    quickStart: {
      title: 'Mulai cepat',
      step1: 'Klik {plus} di kiri atas untuk membuka palet node, lalu seret node ke kanvas',
      step2: 'Menjatuhkan berkas secara otomatis mendeteksi jenisnya dan membuat node File yang sesuai',
      step3: 'Seret dari port keluaran node (titik kanan) ke port masukan node lain (titik kiri) untuk menggambar koneksi',
      step4: 'Klik ganda pada node, atau klik ikon gerigi di node, untuk mengonfigurasi parameternya',
      step5: 'Jika sebuah node memiliki {help} yang dikonfigurasi, klik ikon tanda tanya untuk melihat penggunaan terperinci node tersebut'
    },
    nodeTypes: {
      title: 'Ikhtisar jenis node',
      category: 'Kategori',
      common: 'Node umum',
      sep: ', ',
      input: 'Masukan',
      process: 'Proses',
      output: 'Keluaran / Tampilan',
      container: 'Wadah',
      footer: 'Daftar "Bantuan node" di sebelah kiri menampilkan node yang saat ini memiliki dokumen bantuan terdaftar. Klik salah satunya untuk melihat penggunaan terperinci.'
    },
    gallery: {
      title: 'Lihat apa yang bisa dilakukan',
      caption: 'Hubungkan {imageGen}, {llm}, {code} dan node lainnya untuk membangun alur kerja otomatis yang lengkap. Berikut adalah pipeline «generator buku bergambar» — membagi teks menjadi paragraf, membuat ilustrasi untuk masing-masing, dan merakit halaman secara otomatis, semuanya dengan menyeret dan menghubungkan node di kanvas.'
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
      time: 'Waktu',
      date: 'Tanggal'
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

export default id
