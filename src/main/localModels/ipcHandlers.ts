/**
 * 本地模型 IPC handlers —— LLM + 文生图。
 *
 * ⚠️ 所有对 Runner / Downloader 的依赖都用运行时动态 import。
 * 原因：底层有原生 binding（node-llama-cpp、stable-diffusion-cpp-node-api），
 * 主进程启动时如果触发 import 链会导致卡住（esbuild/rollup 在 dev 模式解析
 * 平台子包时会阻塞）。懒加载确保只有用户真正调用相关功能时才加载原生引擎。
 */

import { ipcMain } from 'electron'

/** LLM 懒加载缓存 */
let _runner: typeof import('./LlmRunner') | null = null
/** 下载器——LLM + Image 共用 */
let _downloader: typeof import('./ModelDownloader') | null = null
/** 图片 Runner——只负责加载/生成/卸载，不负责下载 */
let _imgRunner: typeof import('./ImageRunner') | null = null

async function runner() {
  if (!_runner) _runner = await import(/* @vite-ignore */ './LlmRunner')
  return _runner
}
async function downloader() {
  if (!_downloader) _downloader = await import(/* @vite-ignore */ './ModelDownloader')
  return _downloader
}
async function imgRunner() {
  if (!_imgRunner) _imgRunner = await import(/* @vite-ignore */ './ImageRunner')
  return _imgRunner
}
export function registerLocalModelIpcHandlers(): void {
  // —— 推荐模型目录（给 UI 展示）——
  // 注意：RECOMMENDED_MODELS 也改成从 downloader 动态取，不让 vite 解析
  ipcMain.handle('local:recommendedModels', async () => {
    const { RECOMMENDED_MODELS } = await downloader()
    return RECOMMENDED_MODELS.map(m => ({
      id: m.id,
      label: m.label,
      sizeGb: m.sizeGb,
      ramGb: m.ramGb,
      fileName: m.fileName
    }))
  })

  // —— 本地已下载模型列表 ——
  ipcMain.handle('local:listModels', async () => {
    const r = await runner()
    const d = await downloader()
    const models = r.listLocalModels()
    return {
      // 多模型：返回已加载的模型文件名数组
      loaded: r.getLoadedModels(),
      busy: r.isAnyBusy(),
      models,
      activeDownloads: d.getActiveDownloads()
    }
  })

  // —— 加载一个模型到内存 ——
  ipcMain.handle('local:loadModel', async (_e, modelPath: string) => {
    if (!modelPath || typeof modelPath !== 'string') {
      return { ok: false, error: '模型路径无效' }
    }
    const r = await runner()
    return r.loadModel(modelPath)
  })

  // —— 卸载模型（不传 path 则卸载全部）——
  ipcMain.handle('local:unloadModel', async (_e, modelPath?: string) => {
    const r = await runner()
    r.unloadModel(modelPath)
    return { ok: true }
  })

  // —— 单轮对话（核心调用）——
  ipcMain.handle('local:chat', async (_e, args: { modelPath: string; system?: string; prompt: string }) => {
    if (!args || typeof args.prompt !== 'string') {
      return { ok: false, error: 'prompt 不能为空' }
    }
    if (!args.modelPath) {
      return { ok: false, error: '必须指定模型路径 modelPath' }
    }
    const r = await runner()
    return r.chat(args.modelPath, args.system ?? '', args.prompt)
  })

  // —— 中止当前正在进行的本地 LLM 推理 ——
  ipcMain.handle('local:cancelChat', async (_e, modelPath: string) => {
    if (!modelPath) return { ok: false }
    const r = await runner()
    r.abortChat(modelPath)
    return { ok: true }
  })

  // —— 下载模型（带进度回调 + 源选择）——
  ipcMain.handle(
    'local:downloadModel',
    async (event, args: { catalogId: string; source?: string }) => {
      const d = await downloader()
      const r = await runner()
      const catalog = d.RECOMMENDED_MODELS.find(m => m.id === args.catalogId)
      if (!catalog) {
        return { ok: false, error: `未找到模型：${args.catalogId}` }
      }
      const source = args.source === 'hf-official' ? 'hf-official' : 'hf-mirror'

      // 已存在就跳过
      const models = r.listLocalModels()
      if (models.some(m => m.name === catalog.fileName)) {
        return { ok: true, skipped: true, modelName: catalog.fileName }
      }

      return await d.downloadModel(catalog, source, (progress) => {
        event.sender.send('local:downloadProgress', {
          modelId: catalog.id,
          ...progress
        })
      })
    }
  )

  // —— 取消下载 ——
  ipcMain.handle('local:cancelDownload', async (_e, catalogId: string) => {
    const d = await downloader()
    return { ok: d.cancelDownload(catalogId) }
  })

  // —— 删除本地模型文件 ——
  ipcMain.handle('local:deleteModel', async (_e, modelName: string) => {
    if (!modelName || typeof modelName !== 'string') {
      return { ok: false, error: '模型名无效' }
    }
    const r = await runner()
    return r.deleteModel(modelName)
  })

  // ================ 图片模型 IPC ================

  // —— 推荐图片模型目录（从统一的 ModelDownloader 取）——
  ipcMain.handle('local:image:recommendedModels', async () => {
    const { RECOMMENDED_IMAGE_MODELS } = await downloader()
    return RECOMMENDED_IMAGE_MODELS.map(m => ({
      id: m.id,
      label: m.label,
      sizeGb: m.sizeGb,
      ramGb: m.ramGb,
      description: m.description,
      fileName: m.fileName
    }))
  })

  // —— 本地已下载图片模型列表 + 状态 ——
  ipcMain.handle('local:image:listModels', async () => {
    const r = await imgRunner()
    const d = await downloader()
    const models = r.listLocalImageModels()
    return {
      loaded: r.getLoadedImageModels(),
      busy: r.isAnyImageBusy(),
      models,
      activeDownloads: d.getActiveDownloads()   // 共用同一个下载队列
    }
  })

  // —— 加载图片模型 ——
  ipcMain.handle('local:image:loadModel', async (_e, modelPath: string) => {
    if (!modelPath || typeof modelPath !== 'string') {
      return { ok: false, error: '模型路径无效' }
    }
    const r = await imgRunner()
    return r.loadImageModel(modelPath)
  })

  // —— 卸载图片模型 ——
  ipcMain.handle('local:image:unloadModel', async (_e, modelPath?: string) => {
    const r = await imgRunner()
    r.unloadImageModel(modelPath)
    return { ok: true }
  })

  // —— 文生图（核心调用）——
  ipcMain.handle(
    'local:image:generate',
    async (event, args: {
      modelPath: string
      prompt: string
      width?: number
      height?: number
      steps?: number
      cfg?: number
      negativePrompt?: string
      seed?: number
    }) => {
      if (!args || typeof args.prompt !== 'string' || !args.prompt.trim()) {
        return { ok: false, error: 'prompt 不能为空' }
      }
      if (!args.modelPath) {
        return { ok: false, error: '必须指定 modelPath' }
      }

      const r = await imgRunner()

      // 包装 onProgress 回调——通过 IPC 推回渲染进程
      const result = await r.generateImage(args.modelPath, {
        prompt: args.prompt,
        width: args.width,
        height: args.height,
        steps: args.steps,
        cfg: args.cfg,
        negativePrompt: args.negativePrompt,
        seed: args.seed,
        onProgress: (step, steps) => {
          event.sender.send('local:image:progress', { step, steps })
        }
      })

      if ('ok' in result && result.ok) {
        // 把 RGB raw data 编码成 base64 给 IPC 传输
        // 图片引擎返回的是 raw RGB Buffer（没有 PNG 头），需要主进程编码
        const sharp = (await import(/* @vite-ignore */ 'sharp')).default
        const pngBuffer = await sharp(result.data, {
          raw: { width: result.width, height: result.height, channels: 3 }
        }).png().toBuffer()
        return {
          ok: true as const,
          width: result.width,
          height: result.height,
          base64: pngBuffer.toString('base64')
        }
      }
      return result
    }
  )

  // —— 中止图片生成 ——
  ipcMain.handle('local:image:cancelGenerate', async (_e, modelPath: string) => {
    if (!modelPath) return { ok: false }
    const r = await imgRunner()
    r.abortImage(modelPath)
    return { ok: true }
  })

  // —— 下载图片模型（复用统一的 ModelDownloader）——
  ipcMain.handle(
    'local:image:downloadModel',
    async (event, args: { catalogId: string; source?: string }) => {
      const d = await downloader()
      const r = await imgRunner()
      const catalog = d.RECOMMENDED_IMAGE_MODELS.find(m => m.id === args.catalogId)
      if (!catalog) {
        return { ok: false, error: `未找到模型：${args.catalogId}` }
      }
      const source = args.source === 'hf-official' ? 'hf-official' : 'hf-mirror'

      // 已存在就跳过
      const models = r.listLocalImageModels()
      if (models.some(m => m.name === catalog.fileName)) {
        return { ok: true, skipped: true, modelName: catalog.fileName }
      }

      return await d.downloadModel(catalog, source, (progress) => {
        event.sender.send('local:image:downloadProgress', {
          modelId: catalog.id,
          ...progress
        })
      })
    }
  )

  // —— 取消图片模型下载（共用同一个 cancelDownload）——
  ipcMain.handle('local:image:cancelDownload', async (_e, catalogId: string) => {
    const d = await downloader()
    return { ok: d.cancelDownload(catalogId) }
  })

  // —— 删除本地图片模型文件 ——
  ipcMain.handle('local:image:deleteModel', async (_e, modelName: string) => {
    if (!modelName || typeof modelName !== 'string') {
      return { ok: false, error: '模型名无效' }
    }
    const r = await imgRunner()
    return r.deleteImageModel(modelName)
  })
}

/** 应用退出时清理所有本地模型引擎 */
export async function cleanupLocalModels(): Promise<void> {
  if (_runner) {
    _runner.dispose()
    _runner = null
  }
  if (_imgRunner) {
    _imgRunner.disposeImage()
    _imgRunner = null
  }
}
