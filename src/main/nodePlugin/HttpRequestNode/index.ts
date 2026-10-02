import type { NodePluginManifest } from '../manifest'
import { HttpRequestNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: HttpRequestNode.TYPE,
  nodeClass: HttpRequestNode,
  title: {
    zh: 'HTTP 请求',
    en: 'HTTP Request',
    ja: 'HTTP リクエスト',
    ko: 'HTTP 요청',
    es: 'Solicitud HTTP',
    ar: 'طلب HTTP',
    fr: 'Requête HTTP',
    pt: 'Requisição HTTP',
    ru: 'HTTP-запрос',
    hi: 'HTTP अनुरोध',
    id: 'Permintaan HTTP',
    de: 'HTTP-Anfrage',
    vi: 'Yêu cầu HTTP',
    tr: 'HTTP İsteği',
    it: 'Richiesta HTTP'
  },
  render,
  iconPaths: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
  help: () => import('./HttpRequestHelpDialog.vue')
}

export default manifest
