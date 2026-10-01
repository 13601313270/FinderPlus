import type { LocalizedText } from '../../../shared/language'

/**
 * ImageOverlay 节点卡片（左面板 + 画布预览 + 尺寸弹窗）内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  layerLabel: {
    zh: '图层 {n}',
    en: 'Layer {n}'
  },
  portSummary: {
    zh: '{total} 端口 · {connected} 已连',
    en: '{total} ports · {connected} connected'
  },
  canvasSizeTitle: {
    zh: '画布尺寸设置',
    en: 'Canvas size settings'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help'
  },
  removeLayerHint: {
    zh: '删除此图层（仅尾部可删）',
    en: 'Remove this layer (only the last one)'
  },
  notConnected: {
    zh: '未连接',
    en: 'Not connected'
  },
  addLayerHint: {
    zh: '添加图层',
    en: 'Add layer'
  },
  addLayer: {
    zh: '＋ 添加图层',
    en: '＋ Add layer'
  },
  emptyHint: {
    zh: '连接端口或点击左侧 ＋ 添加图层',
    en: 'Connect a port or click ＋ on the left to add a layer'
  },
  pngTransparent: {
    zh: 'PNG透明',
    en: 'PNG transparent'
  },
  createNode: {
    zh: '生成图片文件节点',
    en: 'Create image file node'
  },
  canvasSizeDialogTitle: {
    zh: '画布尺寸',
    en: 'Canvas size'
  },
  modeLabel: {
    zh: '模式',
    en: 'Mode'
  },
  modeAuto: {
    zh: '自动（按图层边界）',
    en: 'Auto (fit layer bounds)'
  },
  modeFixed: {
    zh: '固定尺寸',
    en: 'Fixed size'
  },
  widthLabel: {
    zh: '宽',
    en: 'Width'
  },
  heightLabel: {
    zh: '高',
    en: 'Height'
  },
  resetAuto: {
    zh: '恢复自动',
    en: 'Reset to auto'
  },
  cancel: {
    zh: '取消',
    en: 'Cancel'
  },
  confirm: {
    zh: '确定',
    en: 'OK'
  },
  resizeNodeHint: {
    zh: '拖拽调整节点大小（最小 400×400）',
    en: 'Drag to resize the node (min 400×400)'
  },
  helpDialogTitle: {
    zh: '图片叠加节点使用说明',
    en: 'Image overlay node help'
  }
} satisfies Record<string, LocalizedText>