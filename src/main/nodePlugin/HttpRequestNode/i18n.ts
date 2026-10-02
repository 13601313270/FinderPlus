import type { LocalizedText } from '../../../shared/language'

/**
 * HttpRequest 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
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
    ru: 'Перетащить узел'
  },
  collapseConfig: {
    zh: '收起配置',
    en: 'Collapse settings',
    ja: '設定を折りたたむ',
    ko: '설정 접기',
    es: 'Contraer ajustes',
    ar: 'طيّ الإعدادات',
    fr: 'Réduire les réglages',
    pt: 'Recolher configurações',
    ru: 'Свернуть настройки'
  },
  expandConfig: {
    zh: '展开配置',
    en: 'Expand settings',
    ja: '設定を展開',
    ko: '설정 펼치기',
    es: 'Expandir ajustes',
    ar: 'توسيع الإعدادات',
    fr: 'Développer les réglages',
    pt: 'Expandir configurações',
    ru: 'Развернуть настройки'
  },
  collapse: {
    zh: '收起',
    en: 'Collapse',
    ja: '折りたたむ',
    ko: '접기',
    es: 'Contraer',
    ar: 'طيّ',
    fr: 'Réduire',
    pt: 'Recolher',
    ru: 'Свернуть'
  },
  expand: {
    zh: '展开',
    en: 'Expand',
    ja: '展開',
    ko: '펼치기',
    es: 'Expandir',
    ar: 'توسيع',
    fr: 'Développer',
    pt: 'Expandir',
    ru: 'Развернуть'
  },
  helpHint: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  urlEmptyHint: {
    zh: '（展开后填写 URL）',
    en: '(Expand to enter a URL)',
    ja: '（展開して URL を入力）',
    ko: '(펼쳐서 URL 입력)',
    es: '(Expande para introducir una URL)',
    ar: '(وسّع لإدخال URL)',
    fr: '(Développez pour saisir une URL)',
    pt: '(Expanda para inserir uma URL)',
    ru: '(Разверните, чтобы ввести URL)'
  },
  headersSummary: {
    zh: 'headers: {n} 条',
    en: 'headers: {n}',
    ja: 'headers: {n} 件',
    ko: 'headers: {n}개',
    es: 'headers: {n}',
    ar: 'headers: {n}',
    fr: 'headers : {n}',
    pt: 'headers: {n}',
    ru: 'headers: {n}'
  },
  bodySet: {
    zh: '已设置',
    en: 'Set',
    ja: '設定済み',
    ko: '설정됨',
    es: 'Definido',
    ar: 'مُعيَّن',
    fr: 'Défini',
    pt: 'Definido',
    ru: 'Задано'
  },
  bodyNone: {
    zh: '无',
    en: 'None',
    ja: 'なし',
    ko: '없음',
    es: 'Ninguno',
    ar: 'لا شيء',
    fr: 'Aucun',
    pt: 'Nenhum',
    ru: 'Нет'
  },
  bodyNotSent: {
    zh: '{method} 不带',
    en: '{method} not sent',
    ja: '{method} は送信しません',
    ko: '{method}은(는) 전송 안 함',
    es: '{method} no se envía',
    ar: '{method} لا يُرسَل',
    fr: '{method} non envoyé',
    pt: '{method} não é enviado',
    ru: '{method} не отправляется'
  },
  portSummary: {
    zh: '$端口: {n}',
    en: '$ports: {n}',
    ja: '$ポート: {n}',
    ko: '$포트: {n}',
    es: '$puertos: {n}',
    ar: '$منافذ: {n}',
    fr: '$ports : {n}',
    pt: '$portas: {n}',
    ru: '$порты: {n}'
  },
  labelMethod: {
    zh: '方法',
    en: 'Method',
    ja: 'メソッド',
    ko: '메서드',
    es: 'Método',
    ar: 'الطريقة',
    fr: 'Méthode',
    pt: 'Método',
    ru: 'Метод'
  },
  headersLabel: {
    zh: 'Headers（KV）',
    en: 'Headers (KV)',
    ja: 'Headers（KV）',
    ko: 'Headers (KV)',
    es: 'Headers (KV)',
    ar: 'Headers (KV)',
    fr: 'Headers (KV)',
    pt: 'Headers (KV)',
    ru: 'Headers (KV)'
  },
  deleteHeaderHint: {
    zh: '删除这条 header',
    en: 'Remove this header',
    ja: 'この header を削除',
    ko: '이 header 삭제',
    es: 'Eliminar este header',
    ar: 'إزالة هذا header',
    fr: 'Supprimer cet header',
    pt: 'Remover este header',
    ru: 'Удалить этот header'
  },
  addHeader: {
    zh: '+ 添加 Header',
    en: '+ Add Header',
    ja: '+ Header を追加',
    ko: '+ Header 추가',
    es: '+ Añadir Header',
    ar: '+ إضافة Header',
    fr: '+ Ajouter Header',
    pt: '+ Adicionar Header',
    ru: '+ Добавить Header'
  },
  bodyLabelOptional: {
    zh: 'Body（可选）',
    en: 'Body (Optional)',
    ja: 'Body（任意）',
    ko: 'Body (선택 사항)',
    es: 'Body (opcional)',
    ar: 'Body (اختياري)',
    fr: 'Body (facultatif)',
    pt: 'Body (opcional)',
    ru: 'Body (необязательно)'
  },
  bodyLabelDisabled: {
    zh: 'Body（{method} 无 body）',
    en: 'Body ({method} has no body)',
    ja: 'Body（{method} は body なし）',
    ko: 'Body ({method}은(는) body 없음)',
    es: 'Body ({method} no tiene body)',
    ar: 'Body ({method} بلا body)',
    fr: 'Body ({method} n’a pas de body)',
    pt: 'Body ({method} não tem body)',
    ru: 'Body ({method} без body)'
  },
  bodyPlaceholder: {
    zh: '请求体',
    en: 'Request body',
    ja: 'リクエスト本文',
    ko: '요청 본문',
    es: 'Cuerpo de la solicitud',
    ar: 'جسم الطلب',
    fr: 'Corps de la requête',
    pt: 'Corpo da requisição',
    ru: 'Тело запроса'
  },
  bodyPlaceholderDisabled: {
    zh: '{method} 请求不发送 body',
    en: '{method} requests do not send a body',
    ja: '{method} リクエストは body を送信しません',
    ko: '{method} 요청은 body를 보내지 않습니다',
    es: 'Las solicitudes {method} no envían body',
    ar: 'طلبات {method} لا ترسل body',
    fr: 'Les requêtes {method} n’envoient pas de body',
    pt: 'Requisições {method} não enviam body',
    ru: 'Запросы {method} не отправляют body'
  },
  timeoutLabel: {
    zh: '超时(ms)',
    en: 'Timeout (ms)',
    ja: 'タイムアウト(ms)',
    ko: '타임아웃(ms)',
    es: 'Tiempo de espera (ms)',
    ar: 'المهلة (ms)',
    fr: 'Délai d’expiration (ms)',
    pt: 'Tempo limite (ms)',
    ru: 'Тайм-аут (ms)'
  },
  portsCount: {
    zh: '输入端口：{n} 个（$1…$N 引用到 URL 模板）',
    en: 'Input ports: {n} (reference as $1…$N in the URL template)',
    ja: '入力ポート：{n} 個（URL テンプレートで $1…$N として参照）',
    ko: '입력 포트: {n}개 (URL 템플릿에서 $1…$N으로 참조)',
    es: 'Puertos de entrada: {n} (referencia como $1…$N en la plantilla de URL)',
    ar: 'منافذ الإدخال: {n} (أشِر إليها بـ $1…$N في قالب URL)',
    fr: 'Ports d’entrée : {n} (référencez-les par $1…$N dans le gabarit d’URL)',
    pt: 'Portas de entrada: {n} (referencie como $1…$N no modelo de URL)',
    ru: 'Входные порты: {n} (ссылайтесь как $1…$N в шаблоне URL)'
  },
  requesting: {
    zh: '请求中…',
    en: 'Requesting…',
    ja: 'リクエスト中…',
    ko: '요청 중…',
    es: 'Solicitando…',
    ar: 'جارٍ الطلب…',
    fr: 'Requête en cours…',
    pt: 'Solicitando…',
    ru: 'Запрос…'
  },
  networkError: {
    zh: '网络错误',
    en: 'Network error',
    ja: 'ネットワークエラー',
    ko: '네트워크 오류',
    es: 'Error de red',
    ar: 'خطأ الشبكة',
    fr: 'Erreur réseau',
    pt: 'Erro de rede',
    ru: 'Сетевая ошибка'
  },
  statusCode: {
    zh: '状态码：{code}',
    en: 'Status: {code}',
    ja: 'ステータスコード：{code}',
    ko: '상태 코드: {code}',
    es: 'Código de estado: {code}',
    ar: 'رمز الحالة: {code}',
    fr: 'Code d’état : {code}',
    pt: 'Código de status: {code}',
    ru: 'Код состояния: {code}'
  },
  noResponseBody: {
    zh: '（响应无 body）',
    en: '(Response has no body)',
    ja: '（レスポンスに body なし）',
    ko: '(응답에 body 없음)',
    es: '(La respuesta no tiene body)',
    ar: '(الاستجابة بلا body)',
    fr: '(La réponse n’a pas de body)',
    pt: '(A resposta não tem body)',
    ru: '(У ответа нет body)'
  },
  clickToSend: {
    zh: '（点击「发送」执行请求）',
    en: '(Click "Send" to execute the request)',
    ja: '（「送信」をクリックしてリクエストを実行）',
    ko: '(“전송”을 클릭하여 요청 실행)',
    es: '(Haz clic en “Enviar” para ejecutar la solicitud)',
    ar: '(انقر على «إرسال» لتنفيذ الطلب)',
    fr: '(Cliquez sur « Envoyer » pour exécuter la requête)',
    pt: '(Clique em “Enviar” para executar a requisição)',
    ru: '(Нажмите «Отправить» для выполнения запроса)'
  },
  sendHint: {
    zh: '发送请求',
    en: 'Send request',
    ja: 'リクエストを送信',
    ko: '요청 전송',
    es: 'Enviar solicitud',
    ar: 'إرسال الطلب',
    fr: 'Envoyer la requête',
    pt: 'Enviar requisição',
    ru: 'Отправить запрос'
  },
  sendHintNoUrl: {
    zh: '请先填写 URL',
    en: 'Please enter a URL first',
    ja: '先に URL を入力してください',
    ko: '먼저 URL을 입력하세요',
    es: 'Introduce primero una URL',
    ar: 'أدخل URL أولًا',
    fr: 'Saisissez d’abord une URL',
    pt: 'Insira primeiro uma URL',
    ru: 'Сначала введите URL'
  },
  sending: {
    zh: '发送中…',
    en: 'Sending…',
    ja: '送信中…',
    ko: '전송 중…',
    es: 'Enviando…',
    ar: 'جارٍ الإرسال…',
    fr: 'Envoi…',
    pt: 'Enviando…',
    ru: 'Отправка…'
  },
  send: {
    zh: '发送',
    en: 'Send',
    ja: '送信',
    ko: '전송',
    es: 'Enviar',
    ar: 'إرسال',
    fr: 'Envoyer',
    pt: 'Enviar',
    ru: 'Отправить'
  },
  helpTitle: {
    zh: 'HTTP 请求节点使用说明',
    en: 'HTTP Request Node Guide',
    ja: 'HTTP リクエストノードの使い方',
    ko: 'HTTP 요청 노드 사용 설명',
    es: 'Guía del nodo Solicitud HTTP',
    ar: 'دليل عقدة طلب HTTP',
    fr: 'Guide du nœud Requête HTTP',
    pt: 'Guia do nó Requisição HTTP',
    ru: 'Справка по узлу «HTTP-запрос»'
  }
} satisfies Record<string, LocalizedText>
