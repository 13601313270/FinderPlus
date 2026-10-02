# Finder+

Kanvas otomasi visual berbasis node untuk macOS. Seret node ke kanvas tak terbatas, hubungkan portnya satu sama lain, dan data mengalir melalui graf — mengubah teks, gambar, panggilan LLM, permintaan HTTP, dan perintah shell menjadi pipeline yang bisa Anda lihat dan pakai ulang.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · Bahasa Indonesia · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## Apa itu

Finder+ adalah aplikasi desktop untuk membangun **alur kerja visual**. Alih-alih menulis skrip, Anda menempatkan node di kanvas dan menghubungkan port keluaran ke port masukan. Nilai merambat sepanjang kabel, dan setiap node menyala dengan hasilnya begitu masukannya tiba.

Penggunaan umum:

- Memproses gambar secara batch: pangkas → kompres → sesuaikan kualitas → hapus latar belakang
- Membangun pipeline prompt: templat teks → LLM → tampilan JSON
- Menghasilkan gambar dari prompt teks lalu meletakkan hasilnya ke folder
- Menyatukan API HTTP dan perintah shell lokal tanpa menulis program

## Unduh

Rilis terbaru: **<https://github.com/13601313270/FinderPlus/releases>**

Tautan langsung untuk v0.1.0 (Apple Silicon):

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

Buka `.dmg`, seret **Finder+** ke folder **Applications**, lalu keluarkan disk image.

### Peluncuran pertama di macOS

> **Build ini belum ditandatangani atau dinotarisasi.** macOS akan memblokirnya saat pertama kali dengan pesan seperti *"Finder+ tidak dapat dibuka karena developer tidak dapat diverifikasi"* atau *"Finder+ rusak dan tidak dapat dibuka"*.

Untuk tetap membukanya, pilih salah satu:

- **Klik kanan** (atau Control-klik) ikon aplikasi → **Buka** → **Buka** lagi di dialog.
- Atau jalankan ini di Terminal, lalu luncurkan seperti biasa:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- Pada macOS 15 (Sequoia) dan versi setelahnya, jika opsi klik kanan tidak tersedia, buka **Pengaturan Sistem → Privasi & Keamanan** dan klik **Tetap Buka**.

**Persyaratan:** macOS pada Apple Silicon (arm64). Build Intel belum diterbitkan.

## Node

| Node | Tipe | Fungsinya |
| --- | --- | --- |
| Masukan Teks | `text-input` | Menghasilkan string |
| Masukan Angka | `number-input` | Menghasilkan angka |
| Masukan Boolean | `bool-input` | Menghasilkan boolean |
| File Teks | `txt-file` | Dibuat dengan menyeret file `.txt` ke kanvas |
| File Gambar | `img-file` | Dibuat dengan menyeret file gambar ke kanvas |
| File Apa Pun | `any-file` | Dibuat dengan menyeret file jenis lain |
| Info File | `file-info` | Membaca metadata dari sebuah file |
| Folder | `folder` | Wadah yang mengumpulkan file masuk sebagai node anak |
| Folder Gambar | `img-folder` | Wadah untuk sekumpulan gambar |
| Tampilan Teks | `text-display` | Menampilkan pratinjau teks yang masuk |
| Tampilan JSON | `json-display` | Mencetak JSON dengan rapi |
| Pratinjau Gambar | `image-preview` | Menampilkan pratinjau gambar dan dapat menyimpannya ke disk |
| Gabung String | `string-concat` | Menggabungkan nilai menggunakan placeholder `$1 … $N` |
| Percabangan | `switch` | Percabangan bersyarat |
| Tinjauan Manusia | `human-review` | Mengantrekan nilai untuk tinjauan manual; keluaran saat **setujui** atau **tolak** |
| LLM | `llm` | Penyelesaian chat terhadap penyedia yang dapat dikonfigurasi |
| Pembuatan Gambar | `image-gen` | Teks-ke-gambar terhadap penyedia yang dapat dikonfigurasi |
| Pangkas Gambar | `image-crop` | Memangkas gambar |
| Kompres Gambar | `image-compress` | Mengompres gambar (WebAssembly) |
| Kualitas Gambar | `image-quality` | Menyesuaikan kualitas pengodean |
| Overlay Gambar | `image-overlay` | Menumpuk satu gambar di atas gambar lain |
| Hapus Latar Belakang | `background-remove` | Menghapus latar belakang (ONNX, di perangkat) |
| Kode | `code` | Menjalankan badan fungsi JavaScript |
| Perintah | `command` | Menjalankan perintah shell |
| Permintaan HTTP | `http-request` | Mengirim permintaan HTTP/HTTPS |

## Penyedia yang didukung

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow, dan lainnya.

**Pembuatan gambar** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

Kunci API dimasukkan di pengaturan aplikasi dan disimpan **hanya secara lokal**.

## Bahasa

Antarmuka tersedia dalam 15 bahasa: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Di mana data Anda disimpan

- **File kanvas** (apa pun yang Anda seret ke kanvas) disalin ke `~/Documents/CanvasDesk/我的画布`. Aplikasi menyimpan salinannya sendiri sehingga tidak pernah bergantung pada jalur asli.
- **Graf, posisi node, dan koneksi** disimpan dalam database SQLite lokal di dalam direktori user data aplikasi.
- **Kunci API** tersimpan di penyimpanan lokal pada mesin Anda. Aplikasi sendiri tidak mengunggah apa pun ke mana pun.

## Catatan keamanan

Dua node sengaja menjalankan sesuatu atas nama Anda, jadi perlakukan kanvas Anda seperti Anda memperlakukan sebuah skrip:

- **Perintah** — menjalankan perintah yang Anda tulis melalui shell sistem Anda, dengan hak istimewa pengguna Anda.
- **Kode** — mengevaluasi badan fungsi JavaScript yang Anda tulis.

Hanya jalankan kanvas yang Anda tulis sendiri atau sudah Anda baca sendiri.

## Build dari sumber

Memerlukan Node.js 20+ dan macOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## Tumpukan teknologi

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

Mesin graf (`src/main/engine/`) adalah logika murni tanpa ketergantungan Electron, dibagikan langsung antara proses utama dan renderer.