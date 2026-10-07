import type { LocalizedText } from '../../../shared/language'

/**
 * PromiseAll 节点卡片内的全部文案。
 */
export const messages = {
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
  },
  // 手动触发按钮 tooltip
  forceTrigger: {
    zh: '强制推送当前就绪数据',
    en: 'Force push ready data',
    ja: '準備完了データを強制送信',
    ko: '준비된 데이터 강제 전송',
    es: 'Forzar datos listos',
    ar: 'إجبار البيانات الجاهزة',
    fr: 'Forcer les données prêtes',
    pt: 'Forçar dados prontos',
    ru: 'Принудительная отправка готовых',
    hi: 'तैयार डेटा ज़बरदस्ती भेजें',
    id: 'Paksa data siap',
    de: 'Bereite Daten erzwingen',
    vi: 'Ép dữ liệu đã sẵn sàng',
    tr: 'Hazır veriyi zorla gönder',
    it: 'Forza dati pronti'
  },
  // 二次确认文案，占位符 {ready} {total} {missing} 渲染层替换
  forceTriggerConfirm: {
    zh: '当前 {ready} / {total} 已就绪，{missing} 个端口未就绪，手动触发将跳过它们继续推送。\n是否确认执行？',
    en: '{ready} / {total} ready, {missing} port(s) not ready. Force pushing will skip them.\nAre you sure?',
    ja: '{ready} / {total} 準備完了、{missing} ポートが未準備です。強制送信は未準備ポートをスキップします。\n実行しますか？',
    ko: '{ready} / {total} 준비됨, {missing} 포트 미준비. 강제 전송은 미준비 포트를 건너뜁니다.\n실행하시겠습니까?',
    es: '{ready} / {total} listo, {missing} puerto(s) no listo. Forzar saltará los no listos.\n¿Confirmar?',
    ar: '{ready} / {total} جاهز، {missing} منفذ غير جاهز. الإجبار سيتجاهل غير الجاهز.\nهل تؤكد؟',
    fr: '{ready} / {total} prêt, {missing} port(s) non prêt. Forcer sautera les non prêts.\nConfirmer ?',
    pt: '{ready} / {total} pronto, {missing} porta(s) não pronta. Forçar pulará as não prontas.\nConfirmar?',
    ru: '{ready} / {total} готово, {missing} порт(ов) не готово. Принудительная отправка пропустит неготовые.\nПодтвердить?',
    hi: '{ready} / {total} तैयार, {missing} पोर्ट तैयार नहीं। ज़बरदस्ती भेजने से तैयार नहीं पोर्ट छूट जाएंगे।\nपुष्टि करें?',
    id: '{ready} / {total} siap, {missing} port belum siap. Paksa akan melewati yang belum siap.\nKonfirmasi?',
    de: '{ready} / {total} bereit, {missing} Port(s) nicht bereit. Erzwingen überspringt nicht bereit.\nBestätigen?',
    vi: '{ready} / {total} sẵn sàng, {missing} cổng chưa sẵn sàng. Ép sẽ bỏ qua cổng chưa sẵn sàng.\nXác nhận?',
    tr: '{ready} / {total} hazır, {missing} port hazır değil. Zorla göndermek hazır olmayanları atlar.\nOnaylıyor musun?',
    it: '{ready} / {total} pronto, {missing} porte non pronte. Forzare saltando le non pronte.\nConfermi?'
  }
} satisfies Record<string, LocalizedText>
