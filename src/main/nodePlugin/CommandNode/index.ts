import type { NodePluginManifest } from '../manifest'
import { CommandNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: CommandNode.TYPE,
  nodeClass: CommandNode,
  title: { zh: '命令行', en: 'Command' },
  render,
  help: () => import('./CommandHelpDialog.vue')
}

export default manifest