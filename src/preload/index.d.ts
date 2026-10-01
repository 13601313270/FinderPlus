import { ElectronAPI } from '@electron-toolkit/preload'
import type { ExposedApi, CanvasDeskDbApi, FileApi, CommandApi, CodeApi, HttpApi, WasmApi, AppMenuApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ExposedApi
    canvasDeskDb: CanvasDeskDbApi
    fileApi: FileApi
    commandApi: CommandApi
    codeApi: CodeApi
    httpApi: HttpApi
    wasmApi: WasmApi
    appMenuApi: AppMenuApi
  }
}
