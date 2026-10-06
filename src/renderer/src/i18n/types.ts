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
    /** 数据迁移 section */
    transferTitle: string
    transferHint: string
    export: string
    import: string
    /** 导出成功后的 toast */
    exportSuccess: string
    /** 导入成功后的 toast（含"请重启应用"提示） */
    importSuccess: string
    /** 导出时因为要排除 API Key 给出的提示 */
    exportKeyHint: string
    /** 导入前的警告弹窗：会覆盖现有数据 */
    importConfirmTitle: string
    importConfirmBody: string
    /** 新手引导 section */
    onboardingSection: string
    onboardingHint: string
    onboardingRestart: string
    /** 清空画布 section（危险操作） */
    clearSection: string
    clearHint: string
    clearButton: string
    clearConfirmTitle: string
    clearConfirmBody: string
    clearSuccess: string
    clearAlreadyEmpty: string
    /** 侧边栏分类 */
    groupGeneral: string
    groupLLM: string
    groupImage: string
    groupCanvases: string
    /** LLM / 文生图 section 标题与提示（原硬编码） */
    llmTitle: string
    llmHint: string
    imageTitle: string
    imageHint: string
    /** 按钮（原硬编码） */
    save: string
    clear: string
    saved: string
    /** 我的画布 section */
    canvasesTitle: string
    canvasesHint: string
    canvasesLoading: string
    canvasesEmpty: string
    canvasBadgeDefault: string
    canvasBadgeCurrent: string
    canvasNodeStat: string
    canvasEdgeStat: string
    canvasFileStat: string
    canvasLastModified: string
    canvasBtnOpen: string
    canvasBtnOpenFolder: string
    canvasBtnRename: string
    canvasBtnDelete: string
    canvasRenamePrompt: string
    canvasRenameFailed: string
    canvasOnlyOneTitle: string
    canvasOnlyOneBody: string
    canvasDeleteConfirmTitle: string
    canvasDeleteConfirmBody: string
    canvasDeleteFailed: string
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
    step2a: {
      /** 步骤标题：选择 File Info 节点（调色板高亮） */
      title: string
      hint: string
      /** 调色板按钮虚线框旁边的短提示文案（如"打开调色板选择文件信息"） */
      paletteLabel: string
    }
    step2b: {
      /** 步骤标题：放置节点（节点跟随鼠标，提示点击放下） */
      title: string
      hint: string
      /** 画布上的放置提示文案（如"在画布上点一下把节点放下"） */
      placeLabel: string
    }
    step3: {
      /** 步骤标题：连线 */
      title: string
      hint: string
      /** 画布上端口位置的短提示文案（如"从文件节点右侧圆点拖线"） */
      connectLabel: string
    }
    /** 跳过按钮 */
    skip: string
    /** 引导完成后的庆祝提示 */
    celebration: {
      title: string
      desc: string
      start: string
    }
  }
  /** 数据表（TableNode）组件的所有 UI 文案 */
  table: {
    /** 头部按钮 */
    columnSettings: string
    sqlPort: string
    sqlPortTitle: string
    addRow: string

    /** 搜索栏 */
    search: string
    reset: string

    /** 表格 */
    headerOperations: string
    emptyHint: string
    loading: string
    /** 分页总数，占位符 {total} */
    totalRows: string
    rowId: string

    /** 行操作 */
    edit: string
    delete: string
    submitFailed: string
    deleteFailed: string
    /** 确认删除行，占位符 {id} */
    confirmDeleteRow: string
    /** 确认删除列，占位符 {name} */
    confirmDeleteColumn: string

    /** 业务类型的中文描述（<option> 里 "type（描述）" 的括号部分） */
    businessType: {
      text: string
      textarea: string
      number: string
      boolean: string
      color: string
    }

    /** 新增/编辑弹窗 */
    dialogTitleAdd: string
    dialogTitleEdit: string
    dialogCancel: string
    dialogConfirm: string

    /** 列设置弹窗 */
    colSectionTitle: string
    colEmpty: string
    colHeaderName: string
    colHeaderType: string
    colHeaderTitle: string
    colHeaderDefault: string
    colHeaderList: string
    colHeaderSearch: string
    colHeaderCanUpdate: string
    colHeaderCanSort: string
    colHeaderOperations: string
    titlePlaceholder: string
    colVisible: string
    colHidden: string
    searchVisible: string
    searchHidden: string
    canEditEnabled: string
    canEditDisabled: string
    sortEnabled: string
    sortDisabled: string
    addColumnTrigger: string
    close: string
    /** 列表视图里没有自定义列时的提示（确保物理表时用） */
    noCustomColumns: string

    /** 添加列弹窗 */
    addColTitle: string
    addColNameLabel: string
    addColNamePlaceholder: string
    addColTitleLabel: string
    addColTitlePlaceholder: string
    addColBusinessTypeLabel: string
    addColDefaultLabel: string
    addColShowInListLabel: string
    addColShowInListTitle: string
    addColShowInSearchLabel: string
    addColShowInSearchTitle: string
    addColCanUpdateLabel: string
    addColCanUpdateTitle: string
    addColCanSortLabel: string
    addColCanSortTitle: string
    addColCancel: string
    addColConfirm: string

    /** 列名校验错误 */
    errorEmptyName: string
    errorInvalidName: string
    /** 占位符 {name} */
    errorDuplicateName: string

    /** resize 手柄 tooltip */
    resizeTooltip: string

    /** 节点标题 fallback（新建时还没取到 manifest） */
    nodeFallback: string
  }
}