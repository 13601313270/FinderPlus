# Finder+

macOS için düğüm tabanlı görsel otomasyon tuvali. Düğümleri sonsuz bir tuvale sürükleyin, portlarını birbirine bağlayın; veriler grafik boyunca akar — metni, görselleri, LLM çağrılarını, HTTP isteklerini ve shell komutlarını, görebileceğiniz yeniden kullanılabilir bir iş akışına dönüştürür.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · Türkçe · [Italiano](README.it.md)

---

## Nedir

Finder+ **görsel iş akışları** oluşturmaya yönelik bir masaüstü uygulamasıdır. Bir betik yazmak yerine düğümleri bir tuvale yerleştirir ve bir çıkış portunu bir giriş portuna bağlarsınız. Değerler kablolar boyunca yayılır ve girdileri gelir gelmez her düğüm sonucuyla birlikte parlar.

Tipik kullanımlar:

- Görselleri toplu işleme: kırp → sıkıştır → kaliteyi ayarla → arka planı kaldır
- İstem (prompt) hatları kurma: metin şablonu → LLM → JSON gösterimi
- Bir metin isteminden görsel üretip sonucu bir klasöre bırakma
- Bir program yazmadan HTTP API'lerini ve yerel shell komutlarını birbirine bağlama

## İndirme

En son sürüm: **<https://github.com/13601313270/FinderPlus/releases>**

v0.1.0 için doğrudan bağlantı (Apple Silicon):

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

`.dmg` dosyasını açın, **Finder+** uygulamasını **Applications** klasörüne sürükleyin ve ardından disk imajını çıkarın.

### macOS'ta ilk başlatma

> **Bu derleme henüz imzalanmamış veya noter onayından geçmemiştir.** macOS onu ilk seferde *"Geliştirici doğrulanamadığı için Finder+ açılamıyor"* veya *"Finder+ hasarlı ve açılamıyor"* gibi bir mesajla engeller.

Yine de açmak için şu seçeneklerden birini uygulayın:

- Uygulama simgesine **sağ tıklayın** (veya Control tıklayın) → **Aç** → iletişim kutusunda tekrar **Aç**.
- Ya da Terminal'de şunu çalıştırıp uygulamayı normal şekilde başlatın:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- macOS 15 (Sequoia) ve sonrasında sağ tıklama yolu sunulmuyorsa **Sistem Ayarları → Gizlilik ve Güvenlik** bölümüne gidin ve **Yine de Aç** seçeneğine tıklayın.

**Gereksinimler:** Apple Silicon (arm64) üzerinde macOS. Intel derlemeleri henüz yayımlanmadı.

## Düğümler

| Düğüm | Tür | Ne yapar |
| --- | --- | --- |
| Metin Girdisi | `text-input` | Bir dize yayar |
| Sayı Girdisi | `number-input` | Bir sayı yayar |
| Mantıksal Girdi | `bool-input` | Bir mantıksal değer yayar |
| Metin Dosyası | `txt-file` | Tuvale bir `.txt` dosyası bırakılarak oluşturulur |
| Görsel Dosyası | `img-file` | Tuvale bir görsel dosyası bırakılarak oluşturulur |
| Herhangi Bir Dosya | `any-file` | Başka türde bir dosya bırakılarak oluşturulur |
| Dosya Bilgisi | `file-info` | Bir dosyadan üst veriyi okur |
| Klasör | `folder` | Gelen dosyaları alt düğüm olarak toplayan kapsayıcı |
| Görsel Klasörü | `img-folder` | Bir görsel topluluğu için kapsayıcı |
| Metin Gösterimi | `text-display` | Gelen metni önizler |
| JSON Gösterimi | `json-display` | JSON'u okunaklı biçimde yazdırır |
| Görsel Önizleme | `image-preview` | Bir görseli önizler ve diske kaydedebilir |
| Dize Birleştirme | `string-concat` | Değerleri `$1 … $N` yer tutucularıyla birleştirir |
| Anahtar | `switch` | Koşullu dallanma |
| İnsan İncelemesi | `human-review` | Değerleri elle incelemek üzere kuyruğa alır; **onayla** veya **reddet** ile çıktı verir |
| LLM | `llm` | Yapılandırılabilir bir sağlayıcıya karşı sohbet tamamlama |
| Görsel Üretimi | `image-gen` | Yapılandırılabilir bir sağlayıcıya karşı metinden görsele üretim |
| Görsel Kırpma | `image-crop` | Bir görseli kırpar |
| Görsel Sıkıştırma | `image-compress` | Bir görseli sıkıştırır (WebAssembly) |
| Görsel Kalitesi | `image-quality` | Kodlama kalitesini ayarlar |
| Görsel Kaplama | `image-overlay` | Bir görseli diğerinin üzerine bindirir |
| Arka Plan Kaldırma | `background-remove` | Arka planı kaldırır (ONNX, cihaz üzerinde) |
| Kod | `code` | Bir JavaScript fonksiyon gövdesini çalıştırır |
| Komut | `command` | Bir shell komutu çalıştırır |
| HTTP İsteği | `http-request` | Bir HTTP/HTTPS isteği gönderir |

## Desteklenen sağlayıcılar

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow ve diğerleri.

**Görsel üretimi** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

API anahtarları uygulamanın ayarlarında girilir ve **yalnızca yerel olarak** saklanır.

## Diller

Arayüz 15 dilde sunulur: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Verileriniz nerede tutulur

- **Tuval dosyaları** (tuvale bıraktığınız her şey) `~/Documents/CanvasDesk/我的画布` konumuna kopyalanır. Uygulama kendi kopyasını tutar, böylece hiçbir zaman özgün yola bağımlı kalmaz.
- **Grafikler, düğüm konumları ve bağlantılar** uygulamanın kullanıcı verisi dizinindeki yerel bir SQLite veritabanında saklanır.
- **API anahtarları** makinenizdeki yerel depolamada bulunur. Uygulamanın kendisi hiçbir şeyi hiçbir yere yüklemez.

## Güvenlik notları

İki düğüm kasıtlı olarak sizin adınıza bir şeyler yürütür; bu yüzden tuvalinize bir betiğe davranır gibi davranın:

- **Komut** — yazdığınız komutu sistem kabuğunuz üzerinden, kendi kullanıcı yetkilerinizle çalıştırır.
- **Kod** — yazdığınız JavaScript fonksiyon gövdesini değerlendirir.

Yalnızca kendi yazdığınız veya kendiniz okuduğunuz tuvalleri çalıştırın.

## Kaynaktan derleme

Node.js 20+ ve macOS gerektirir.

```bash
npm install
npm run dev        # geliştirme modunda başlat
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # dist/ içinde bir .dmg üretir
```

## Teknoloji yığını

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (WebAssembly ile SQLite) · onnxruntime-web · img-compressor-wasm

Grafik motoru (`src/main/engine/`) hiçbir Electron bağımlılığı olmayan saf mantıktır ve ana süreç ile işleyici arasında doğrudan paylaşılır.