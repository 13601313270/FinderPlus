import type { LocalizedText } from '../../../shared/language'

/**
 * PromiseAll 节点卡片内的全部文案。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node',
    ja: 'ノードをドラッグ',
    ko: '노드 드래그',
    es: 'Arrastrar nodo',
    ar: 'اسحب العقدة',
    fr: 'Glisser le nœud',
    pt: 'Arrastar nó',
    ru: 'Перетащить узел',
    hi: 'नोड खींचें',
    id: 'Seret node',
    de: 'Knoten ziehen',
    vi: 'Kéo nút',
    tr: 'Düğümü sürükle',
    it: 'Trascina nodo'
  },
  // 状态行："3 / 5 已就绪"
  statusTemplate: {
    // 占位符 {ready} 和 {total} 在渲染层替换
    zh: '{ready} / {total} 已就绪',
    en: '{ready} / {total} ready',
    ja: '{ready} / {total} 準備完了',
    ko: '{ready} / {total} 준비됨',
    es: '{ready} / {total} listo',
    ar: '{ready} / {total} جاهز',
    fr: '{ready} / {total} prêt',
    pt: '{ready} / {total} pronto',
    ru: '{ready} / {total} готово',
    hi: '{ready} / {total} तैयार',
    id: '{ready} / {total} siap',
    de: '{ready} / {total} bereit',
    vi: '{ready} / {total} sẵn sàng',
    tr: '{ready} / {total} hazır',
    it: '{ready} / {total} pronto'
  },
  // 「+」/「-」按钮 hover 提示
  addPort: {
    zh: '增加一组端口',
    en: 'Add port pair',
    ja: 'ポートペアを追加',
    ko: '포트 쌍 추가',
    es: 'Agregar par de puertos',
    ar: 'إضافة زوج من المنافذ',
    fr: 'Ajouter une paire de ports',
    pt: 'Adicionar par de portas',
    ru: 'Добавить пару портов',
    hi: 'पोर्ट जोड़ी जोड़ें',
    id: 'Tambahkan pasangan port',
    de: 'Portpaar hinzufügen',
    vi: 'Thêm cổng',
    tr: 'Port çifti ekle',
    it: 'Aggiungi coppia di porte'
  },
  removePort: {
    zh: '移除一组端口',
    en: 'Remove port pair',
    ja: 'ポートペアを削除',
    ko: '포트 쌍 제거',
    es: 'Eliminar par de puertos',
    ar: 'إزالة زوج من المنافذ',
    fr: 'Supprimer une paire de ports',
    pt: 'Remover par de portas',
    ru: 'Удалить пару портов',
    hi: 'पोर्ट जोड़ी हटाएं',
    id: 'Hapus pasangan port',
    de: 'Portpaar entfernen',
    vi: 'Xóa cổng',
    tr: 'Port çiftini kaldır',
    it: 'Rimuovi coppia di porte'
  },
  helpTitle: {
    zh: '查看帮助',
    en: 'Show help',
    ja: 'ヘルプを表示',
    ko: '도움말 보기',
    es: 'Ver ayuda',
    ar: 'عرض المساعدة',
    fr: 'Afficher l’aide',
    pt: 'Mostrar ajuda',
    ru: 'Показать справку',
    hi: 'सहायता दिखाएँ',
    id: 'Tampilkan bantuan',
    de: 'Hilfe anzeigen',
    vi: 'Xem trợ giúp',
    tr: 'Yardımı göster',
    it: 'Mostra aiuto'
  },
  helpDialogTitle: {
    zh: '汇合等待就绪',
    en: 'Wait All Ready',
    ja: 'すべて待ち完了',
    ko: '전부 대기 완료',
    es: 'Esperar Todos Listos',
    ar: 'انتظار جاهزية الجميع',
    fr: 'Attendre Tous Prêts',
    pt: 'Aguardar Todos Prontos',
    ru: 'Ожидание Готовности',
    hi: 'सभी तैयार होने की प्रतीक्षा',
    id: 'Tunggu Semua Siap',
    de: 'Auf Alle Bereit Warten',
    vi: 'Chờ Tất Cả Sẵn Sàng',
    tr: 'Hepsi Hazır Bekle',
    it: 'Attendi Tutti Pronti'
  },
  removePortDisabled: {
    zh: '至少保留 2 组端口',
    en: 'Minimum 2 port pairs',
    ja: '最低2ペア必要',
    ko: '최소 2쌍 필요',
    es: 'Mínimo 2 pares',
    ar: 'الحد الأدنى 2 أزواج',
    fr: 'Minimum 2 paires',
    pt: 'Mínimo 2 pares',
    ru: 'Минимум 2 пары',
    hi: 'न्यूनतम 2 जोड़ी',
    id: 'Minimal 2 pasangan',
    de: 'Mindestens 2 Paare',
    vi: 'Tối thiểu 2 cặp',
    tr: 'En az 2 çift',
    it: 'Minimo 2 coppie'
  }
} satisfies Record<string, LocalizedText>
