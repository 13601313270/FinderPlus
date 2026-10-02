import type { BuiltinValueKind } from '../../../main/engine/data/Value'

/**
 * 词条契约类型：所有语言词条（locales/*.ts）都必须满足这个结构。
 *
 * 这是**唯一的结构事实来源**，中文词条也不例外——zh.ts 同样写成 `const zh: Language = {...}`。
 * 所以新增 / 重命名 / 删除任何一个 key，全部语言会一起在 typecheck 阶段报错，
 * 不会出现「某个语言悄悄少了 settingsDialog.languageHint」这种漂移。
 *
 * 用 `type` 而非 `interface` 是有意的：type alias 自带隐式索引签名，
 * 能直接满足 vue-i18n createI18n 的 messages 选项类型（interface 不行）。
 */
export type Language = {
  app: {
    settings: string
    help: string
    /** 主进程非 macOS 平台「File」菜单的标题（macOS 的 role 菜单项由系统自动本地化） */
    fileMenu: string
  }
  settingsDialog: {
    title: string
    close: string
    language: string
    languageHint: string
  }
  helpCenter: {
    title: string
    close: string
    loading: string
    empty: string
    pickNode: string
    groupNodes: string
    about: string
  }
  helpDialog: {
    title: string
    close: string
  }
  minimap: {
    dragToMove: string
    expand: string
    collapse: string
    zoomIn: string
    zoomOut: string
    reset: string
  }
  palette: {
    addNode: string
    /** 调色板搜索框的占位符 */
    searchPlaceholder: string
    /** 搜索无匹配节点时的提示 */
    noResult: string
    /** 瓦片角上「?」帮助入口的提示文案 */
    nodeHelp: string
  }
  connection: {
    /** 端口自环 */
    selfLoop: string
    /** 引擎给出未知 reason 时的兜底文案，占位符 {reason} */
    failed: string
    alreadyBound: string
    kindNotAllowed: string
    singlePortOccupied: string
  }
  /**
   * 端口类型标签（port-label__kinds 上的小胶囊，如 string / txt-file）的文案。
   *
   * 键就是引擎内置的类型标签名，来自 main/engine/data/Value.ts 的 BUILTIN_VALUE_KINDS；
   * 用 Record<BuiltinValueKind, string> 约束，新增内置类型时全部语言会被强制补齐。
   * 插件自定义的类型不在契约内，UI 侧遇到时原样显示标识符（见 NodePort.vue 的 kindLabel）。
   */
  valueKind: Record<BuiltinValueKind, string>
  intro: {
    whatIs: {
      title: string
      /** 占位符 {arch}，插值内容是加粗的 whatIs.arch */
      body: string
      arch: string
    }
    concepts: {
      title: string
      node: {
        name: string
        /** 占位符 {c1} {c2} {c3}，插值内容是行内代码 */
        desc: string
      }
      port: {
        name: string
        /** 占位符 {input} {output} 为加粗词，{c1} {c2} {c3} 为行内代码 */
        desc: string
        input: string
        output: string
      }
      edge: {
        name: string
        desc: string
      }
      scene: {
        name: string
        desc: string
      }
    }
    quickStart: {
      title: string
      /** 占位符 {plus}，插值内容是行内代码 */
      step1: string
      step2: string
      step3: string
      step4: string
      /** 占位符 {help}，插值内容是行内代码 */
      step5: string
    }
    nodeTypes: {
      title: string
      category: string
      common: string
      /** 表格里并列代码标识符的分隔符（中文顿号，英文等用逗号） */
      sep: string
      input: string
      process: string
      output: string
      container: string
      footer: string
    }
  }
  /** 「文件类节点」帮助文章，讲解通过拖拽文件进画布创建节点的方式 */
  fileDragGuide: {
    title: string
    whatIs: {
      title: string
      /** 占位符 {txt} {img} {any} {folder} {imgfolder}，均为行内代码 */
      body: string
    }
    palette: {
      title: string
      /** 占位符 {plus}，行内代码 */
      body: string
    }
    howTo: {
      title: string
      /** 占位符 {finder}，行内代码 */
      step1: string
      step2: string
      step3: string
      noteTitle: string
      noteBody: string
    }
    mapping: {
      title: string
      category: string
      fileType: string
      nodeType: string
      txt: string
      img: string
      any: string
      folder: string
      imgfolder: string
      footer: string
    }
    intoFolder: {
      title: string
      /** 占位符 {folder}，行内代码 */
      body: string
    }
  }
  /** 首次启动的新手引导 */
  onboarding: {
    /** 卡片顶部的整体标题 */
    title: string
    step1: {
      /** 步骤标题：拖拽文件 */
      title: string
      hint: string
      /** 画布虚线框旁边的短提示文案（如"把文件拖到这里"） */
      canvasLabel: string
    }
    step2: {
      /** 步骤标题：添加 File Info 节点并连线 */
      title: string
      hint: string
      /** 调色板虚线框旁边的短提示文案（如"打开调色板搜索 File Info"） */
      paletteLabel: string
    }
    /** 跳过按钮 */
    skip: string
  }
}