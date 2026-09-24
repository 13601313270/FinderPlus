import { ElectronAPI } from '@electron-toolkit/preload'
import type { ExposedApi, CanvasDeskDbApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ExposedApi
    canvasDeskDb: CanvasDeskDbApi
  }
}
