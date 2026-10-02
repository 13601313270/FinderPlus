import type { Language } from '../types'

/** Turkish messages */
const tr: Language = {
  app: {
    settings: 'Ayarlar',
    help: 'Yardım',
    fileMenu: 'Dosya'
  },
  settingsDialog: {
    title: 'Ayarlar',
    close: 'Kapat (Esc)',
    language: 'Dil',
    languageHint: 'Arayüz dilini seçin. Değişiklikler otomatik olarak kaydedilir.'
  },
  helpCenter: {
    title: 'Yardım Merkezi',
    close: 'Kapat (Esc)',
    loading: 'Yükleniyor…',
    empty: 'Kullanılabilir yardım belgesi yok',
    pickNode: 'Soldan bir düğüm seçin',
    groupNodes: 'Düğüm türleri',
    about: 'Finder+ Hakkında'
  },
  helpDialog: {
    title: 'Talimatlar',
    close: 'Kapat (Esc)'
  },
  minimap: {
    dragToMove: 'Mini haritayı taşımak için sürükleyin',
    expand: 'Mini haritayı genişlet',
    collapse: 'Mini haritayı daralt',
    zoomIn: 'Yakınlaştır',
    zoomOut: 'Uzaklaştır',
    reset: 'Sıfırla'
  },
  palette: {
    addNode: 'Düğüm ekle',
    searchPlaceholder: 'Düğüm ara…',
    noResult: 'Eşleşen düğüm yok',
    nodeHelp: 'Düğüm belgelerini görüntüle'
  },
  connection: {
    selfLoop: 'Aynı düğümdeki bağlantı noktaları birbirine bağlanamaz',
    failed: 'Bağlantı başarısız: {reason}',
    alreadyBound: 'Bu iki bağlantı noktası zaten bağlı',
    kindNotAllowed: 'Tür uyuşmazlığı: bu giriş bağlantı noktası bu türü kabul etmiyor',
    singlePortOccupied: 'Bu giriş bağlantı noktası yalnızca bir bağlantı kabul eder. Önce mevcut bağlantıyı kesin'
  },
  valueKind: {
    bool: 'Boole',
    number: 'Sayı',
    string: 'Dize',
    json: 'JSON',
    file: 'Dosya',
    'txt-file': 'Metin Dosyası',
    'img-file': 'Görsel Dosyası'
  },
  intro: {
    whatIs: {
      title: 'Bu nedir?',
      body: 'Finder+ Electron + Vue 3 ile oluşturulmuş {arch} bir masaüstü uygulamasıdır. Farklı düğüm türlerini tuvale sürükleyip birbirine bağlayarak bir veri akışı hattı oluşturun — veriler yukarı akış düğümlerinden kenarlar boyunca aşağı akış düğümlerine akar ve her düğüm kendi konumunda değerleri dönüştürür, denetler veya üretir.',
      arch: 'düğüm tabanlı / pano tabanlı'
    },
    concepts: {
      title: 'Temel kavramlar',
      node: {
        name: 'Düğüm',
        desc: 'Tuval üzerindeki işlevsel bir birim. Her düğümün kendi türü vardır (örneğin {c1}, {c2}, {c3}), solda giriş bağlantı noktaları ve sağda çıkış bağlantı noktaları bulunur. Düğümler doğrudan tuval üzerinde işlem yapmaz — yalnızca hangi değerleri aldıkları ve hangi değerleri ürettikleriyle ilgilenirler.'
      },
      port: {
        name: 'Bağlantı noktası',
        desc: 'Bir düğümün iki yanındaki küçük noktalar. {input} (sol) yukarı akıştan değer alır, {output} (sağ) değerleri aşağı akışa gönderir. Her bağlantı noktasının bir tür kısıtlaması vardır ({c1}, {c2}, {c3} vb.) ve bağlarken tür gerçek zamanlı olarak denetlenir.',
        input: 'Giriş bağlantı noktaları',
        output: 'Çıkış bağlantı noktaları'
      },
      edge: {
        name: 'Kenar',
        desc: 'Bir çıkış bağlantı noktasını bir giriş bağlantı noktasına bağlayan çizgi. Değerler kenarlar boyunca soldan sağa akar. Bağlantı oluşturmak için bir çıkış bağlantı noktasının noktasından başka bir düğümün giriş bağlantı noktasının noktasına sürükleyin.'
      },
      scene: {
        name: 'Sahne',
        desc: 'Tuvaldeki tüm düğümler ve kenarlar için kapsayıcı. Düğüm ekleme ve kaldırma, kenarları bağlama ve çözme işlemlerini yürütür ve değişiklikleri yenileme için UI katmanına yayınlar.'
      }
    },
    quickStart: {
      title: 'Hızlı başlangıç',
      step1: 'Düğüm paletini açmak için sol üstteki {plus} simgesine tıklayın, ardından bir düğümü tuvale sürükleyin',
      step2: 'Bir dosya bırakmak türünü otomatik olarak algılar ve ilgili File düğümünü oluşturur',
      step3: 'Bağlantı çizmek için bir düğümün çıkış bağlantı noktasından (sağ nokta) başka bir düğümün giriş bağlantı noktasına (sol nokta) sürükleyin',
      step4: 'Parametrelerini yapılandırmak için bir düğüme çift tıklayın veya üzerindeki dişli simgesine tıklayın',
      step5: 'Bir düğüm için {help} yapılandırılmışsa, o düğümün ayrıntılı kullanımını görmek için soru işareti simgesine tıklayın'
    },
    nodeTypes: {
      title: 'Düğüm türlerine genel bakış',
      category: 'Kategori',
      common: 'Yaygın düğümler',
      sep: ', ',
      input: 'Giriş',
      process: 'İşlem',
      output: 'Çıkış / Görünüm',
      container: 'Kapsayıcı',
      footer: 'Soldaki "Düğüm yardımı" listesi, şu anda yardım belgesi kayıtlı olan düğümleri gösterir. Ayrıntılı kullanımı görmek için birine tıklayın.'
    }
  }
}

export default tr
