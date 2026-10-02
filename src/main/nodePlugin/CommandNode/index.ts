import type { NodePluginManifest } from '../manifest'
import { CommandNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: CommandNode.TYPE,
  nodeClass: CommandNode,
  title: {
    zh: '命令行',
    en: 'Command',
    ja: 'コマンド',
    ko: '명령',
    es: 'Comando',
    ar: 'أمر',
    fr: 'Commande',
    pt: 'Comando',
    ru: 'Команда',
    hi: 'कमांड',
    id: 'Perintah',
    de: 'Befehl',
    vi: 'Lệnh',
    tr: 'Komut',
    it: 'Comando'
  },
  render,
  help: () => import('./CommandHelpDialog.vue')
}

export default manifest