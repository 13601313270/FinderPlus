/**
 * 本地 LLM 模型 IPC handlers。
 *
 * ⚠️ 所有对 LlmRunner / ModelDownloader 的依赖都用运行时动态 import。
 * 原因：LlmRunner 里有 node-llama-cpp 的原生 binding，主进程启动时如果触发
 * import 链会导致卡住（esbuild/rollup 在 dev 模式解析 node-llama-cpp 内部的
 * 平台子包时会阻塞）。懒加载确保只有用户真正调用 LLM 功能时才加载原生引擎。
 */

import { ipcMain } from 'electron'

/** 懒加载缓存 */
let _runner: typeof import('./LlmRunner') | null = null
let _downloader: typeof import('./ModelDownloader') | null = null
async function runner() {
  if (!_runner) _runner = await import(/* @vite-ignore */ './LlmRunner')
  return _runner
}
async function downloader() {
  if (!_downloader) _downloader = await import(/* @vite-ignore */ './ModelDownloader')
  return _downloader
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
      loaded: r.getLoadedModel(),
      busy: r.isBusy(),
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

  // —— 卸载当前模型 ——
  ipcMain.handle('local:unloadModel', async () => {
    const r = await runner()
    r.unloadModel()
    return { ok: true }
  })

  // —— 单轮对话（核心调用）——
  ipcMain.handle('local:chat', async (_e, args: { system?: string; prompt: string }) => {
    if (!args || typeof args.prompt !== 'string') {
      return { ok: false, error: 'prompt 不能为空' }
    }
    const r = await runner()
    return r.chat(args.system ?? '', args.prompt)
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
}

/** 应用退出时清理引擎 */
export async function cleanupLocalModels(): Promise<void> {
  if (_runner) {
    _runner.dispose()
    _runner = null
  }
}
