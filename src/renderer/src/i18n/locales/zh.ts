import type { Language } from '../types'

/**
 * 简体中文词条。
 *
 * 结构由 ../types 的 Language 契约强制约束（中文自己也不例外）：
 * 少 key / 多 key / 拼错 key 都会在 typecheck 阶段报错。
 */
const zh: Language = {
  app: {
    settings: '设置',
    help: '帮助',
    fileMenu: '文件'
  },
  settingsDialog: {
    title: '设置',
    close: '关闭（Esc）',
    language: '语言',
    languageHint: '选择界面语言，修改后自动保存。'
  },
  helpCenter: {
    title: '帮助中心',
    close: '关闭（Esc）',
    loading: '加载中…',
    empty: '暂无可查看的帮助文档',
    pickNode: '请从左侧选择一个节点',
    groupNodes: '节点类型介绍',
    about: '关于 Finder+'
  },
  helpDialog: {
    title: '使用说明',
    close: '关闭（Esc）'
  },
  minimap: {
    dragToMove: '拖动以移动小地图',
    expand: '展开小地图',
    collapse: '折叠小地图',
    zoomIn: '放大',
    zoomOut: '缩小',
    reset: '复位'
  },
  palette: {
    addNode: '添加节点',
    searchPlaceholder: '搜索节点…',
    noResult: '没有匹配的节点',
    nodeHelp: '查看该节点的使用说明'
  },
  connection: {
    selfLoop: '同一个节点的端口之间不能连线',
    failed: '连接失败：{reason}',
    alreadyBound: '这两个端口已经连上了',
    kindNotAllowed: '类型不匹配：这个输入端口不接受该类型',
    singlePortOccupied: '这个输入端口只接一条线，先断开原来那条'
  },
  valueKind: {
    bool: '布尔',
    number: '数字',
    string: '字符串',
    json: 'JSON',
    file: '文件',
    'txt-file': '文本文件',
    'img-file': '图片文件'
  },
  intro: {
    whatIs: {
      title: '这是什么？',
      body: 'Finder+ 是一个 {arch} 桌面应用，基于 Electron + Vue 3 构建。你可以在画布上拖入不同类型的节点，用连线把它们串起来，形成一条数据流管道——数据从上游节点沿边流向下游节点，每个节点在自己的位置做变换、检查或产出。',
      arch: '节点式 / 画板式'
    },
    concepts: {
      title: '核心概念',
      node: {
        name: '节点（Node）',
        desc: '画布上的一个功能单元。每个节点有自己的类型（如 {c1}、{c2}、{c3}），左侧有输入端口、右侧有输出端口。节点不直接操作画布，只管「接收什么值、产出什么值」。'
      },
      port: {
        name: '端口（Port）',
        desc: '节点两侧的小圆点。{input}（左侧）从上游接收值，{output}（右侧）向下游推送值。每个端口有类型约束（{c1}、{c2}、{c3} 等），连线时会实时校验类型是否匹配。',
        input: '输入端口',
        output: '输出端口'
      },
      edge: {
        name: '边（Edge）',
        desc: '连接输出端口到输入端口的一条线。值沿边从左向右流动。拖拽输出端口圆点到另一个节点的输入端口圆点即可创建连接。'
      },
      scene: {
        name: '场景（Scene）',
        desc: '画布上所有节点和边的容器。负责节点增删、边的绑定/解绑，以及把变更广播给 UI 层刷新。'
      }
    },
    quickStart: {
      title: '快速上手',
      step1: '点左上角 {plus} 打开节点调色板，选一个节点拖到画布上',
      step2: '拖入文件会自动识别类型并生成对应的 File 节点',
      step3: '从某个节点的输出端口（右侧圆点）拖拽连线到另一个节点的输入端口（左侧圆点）',
      step4: '双击节点或点节点上的齿轮图标配置参数',
      step5: '有节点配置好 {help} 的话，点问号图标查看该节点的详细用法'
    },
    nodeTypes: {
      title: '节点类型概览',
      category: '分类',
      common: '常见节点',
      /** 表格里并列代码标识符的分隔符（中文顿号，英文等用逗号） */
      sep: '、',
      input: '输入',
      process: '处理',
      output: '输出 / 展示',
      container: '容器',
      footer: '左侧「节点帮助」列表里列出了当前已注册帮助文档的节点，点击可查看详细用法。'
    }
  },
  fileDragGuide: {
    title: '文件类节点',
    whatIs: {
      title: '什么是文件类节点？',
      body: '文件类节点是 Finder+ 中一类特殊节点，包括 {txt}、{img}、{any} 以及容器节点 {folder}、{imgfolder}。它们以真实文件为载体，把磁盘上的文件引入画布，再通过端口把内容送给下游节点处理。'
    },
    palette: {
      title: '为什么调色板里找不到它们？',
      body: '文件类节点不在左上角 {plus} 调色板中列出——因为它们的创建方式和普通节点不同：普通节点是"空壳"，需要用户手动填数据；而文件类节点直接绑定真实文件，通过"拖拽文件进画布"一步完成创建和数据导入。'
    },
    howTo: {
      title: '如何创建',
      step1: '打开系统文件管理器（macOS Finder 或 Windows 资源管理器）',
      step2: '选中一个文件（或文件夹），按住鼠标左键拖入 Finder+ 的画布区域',
      step3: '松开鼠标，Finder+ 会根据文件类型自动识别并创建对应节点，节点会落在你松手的位置',
      noteTitle: '提示',
      noteBody: '支持一次拖入多个文件，Finder+ 会依次为每个文件创建一个独立节点。如果拖入的是文件夹，会自动创建 folder 或 img-folder 容器节点。'
    },
    mapping: {
      title: '文件类型映射表',
      category: '类别',
      fileType: '文件后缀',
      nodeType: '生成的节点类型',
      txt: '.txt（纯文本文件）',
      img: '.jpg / .jpeg / .png / .gif / .webp / .bmp',
      any: '其他所有文件类型',
      folder: '普通文件夹',
      imgfolder: '图片文件夹（含图片的文件夹）',
      footer: '映射优先级从上到下：具体类型（txt、图片）先匹配，匹配不到的归入 any-file 通用节点。'
    },
    intoFolder: {
      title: '拖入文件夹容器',
      body: '如果画布上已经有 {folder} 或 img-folder 容器节点，把文件拖入它的内容区域而不是空白画布——文件不会新建独立节点，而是会被文件夹"收养"为子节点，自动按后缀生成对应的文件节点类型。'
    }
  }
}

export default zh