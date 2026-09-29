import { ElectronAPI } from '@electron-toolkit/preload'
import type { ExposedApi, CanvasDeskDbApi, FileApi, CommandApi, CodeApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ExposedApi
    canvasDeskDb: CanvasDeskDbApi
    fileApi: FileApi
    commandApi: CommandApi
    codeApi: CodeApi
  }
}
