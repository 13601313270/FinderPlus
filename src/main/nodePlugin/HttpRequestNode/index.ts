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
  help: () => import('./HttpRequestHelpDialog.vue')
}

export default manifest
