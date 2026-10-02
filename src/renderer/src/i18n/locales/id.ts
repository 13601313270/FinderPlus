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
    transferTitle: 'Data Migration',
    transferHint: 'Export your current canvas and all files as a zip, or import from a backup on a new computer.',
    export: 'Export…',
    import: 'Import…',
    exportSuccess: 'Export completed successfully.',
    importSuccess: 'Import completed successfully. Please restart the app to reload your canvas.',
    exportKeyHint: 'API keys are not included in the export for security reasons. You will need to re-enter them on the new computer.',
    importConfirmTitle: 'Import will replace all data',
    importConfirmBody: 'Importing will overwrite your current canvas, files and settings with the backup. This cannot be undone. Continue?'

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
    step2: {
      title: 'Step 2: Add a File Info node and connect',
      hint: 'Click ＋ in the top-left, search for "File Info", and place it on the canvas. Then drag from the dot on the right side of the file node (output port) to the dot on the left side of File Info (input port).',
      paletteLabel: 'Open the palette and search File Info'
    },
    skip: 'Skip tutorial'
  }

}

export default id
