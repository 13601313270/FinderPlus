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
    languageHint: 'Pilih bahasa antarmuka. Perubahan disimpan secara otomatis.'
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
  }
}

export default id
