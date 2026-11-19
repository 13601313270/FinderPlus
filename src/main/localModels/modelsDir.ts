/**
 * 共享模型目录工具 —— LLM / 文生图 / 其他本地模型共用的根目录定位。
 *
 * 目录结构：
 *   ~/Library/Application Support/Finder+/models/
 *     ├── llm/       ← GGUF 大语言模型（node-llama-cpp）
 *     ├── image/     ← GGUF 文生图模型（stable-diffusion.cpp）
 *     └── ...        ← 将来可能扩展的 STT / TTS / 多模态等
 *
 * 注意：不在顶层 import electron —— renderer 会通过 nodePlugin import 链间接加载这个文件，
 * electron 是 CJS 包不提供 ESM 命名导出，vite dev server 解析时会炸。
 * 只在各子目录 getter 里用到，那里用 createRequire 同步获取 app。
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const requireElectron = createRequire(import.meta.url)

/** 根目录：.../userData/models */
let modelsRoot: string | null = null

/** 获取 models 根目录（首次调用时创建） */
export function getModelsRootDir(): string {
  if (modelsRoot) return modelsRoot
  const { app } = requireElectron('electron') as typeof import('electron')
  modelsRoot = join(app.getPath('userData'), 'models')
  if (!existsSync(modelsRoot)) {
    mkdirSync(modelsRoot, { recursive: true })
  }
  return modelsRoot
}

/** LLM GGUF 模型子目录 */
export function getLlmModelsDir(): string {
  const dir = join(getModelsRootDir(), 'llm')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** 图片 GGUF 模型子目录 */
export function getImageModelsDir(): string {
  const dir = join(getModelsRootDir(), 'image')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}
