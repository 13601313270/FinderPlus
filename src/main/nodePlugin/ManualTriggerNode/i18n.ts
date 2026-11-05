import type { LocalizedText } from '../../../shared/language'

export const messages = {
  noInputValue: {
    zh: '(无输入值，输出 null)',
    en: '(no input, output null)',
    ja: '(入力なし、null を出力)',
    ko: '(입력 없음, null 출력)',
    es: '(sin entrada, salida null)',
    ar: '(لا إدخال، إخراج null)',
    fr: '(pas d\'entrée, sortie null)',
    pt: '(sem entrada, saída null)',
    ru: '(нет входа, вывод null)',
    hi: '(कोई इनपुट नहीं, आउटपुट null)',
    id: '(tidak ada input, output null)',
    de: '(kein Eingang, Ausgabe null)',
    vi: '(không có đầu vào, xuất null)',
    tr: '(giriş yok, çıkış null)',
    it: '(nessun input, output null)'
  }
} satisfies Record<string, LocalizedText>
