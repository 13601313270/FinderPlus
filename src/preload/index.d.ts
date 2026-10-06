import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ExposedApi,
  CanvasDeskDbApi,
  FileApi,
  CommandApi,
  CodeApi,
  HttpApi,
  WasmApi,
  AppMenuApi,
  DialogApi,
  TransferApi,
  TableApi,
  CanvasApi,
  GetCurrentCanvasId,
  GetStartupMode
} from './index'

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
    dialogApi: DialogApi
    transferApi: TransferApi
    tableApi: TableApi
    /** 画布管理 API：list / create / rename / delete / openNewWindow */
    canvasApi: CanvasApi
    /** 返回当前窗口绑定的 canvasId（从 URL query 读，默认 'default'） */
    getCurrentCanvasId: GetCurrentCanvasId
    /** 返回启动模式：'picker'=画布选择器窗口，null=正常画布窗口 */
    getStartupMode: GetStartupMode
  }
}
