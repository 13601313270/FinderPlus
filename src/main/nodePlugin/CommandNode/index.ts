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
  iconPaths: ['m5 7 5 5-5 5', 'M13 17h6'],
  category: 'flow',
  help: () => import('./CommandHelpDialog.vue')
}

export default manifest