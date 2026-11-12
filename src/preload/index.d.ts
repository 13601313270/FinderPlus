import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  ExposedApi,
  CanvasDeskDbApi,
  FileApi,
  CommandApi,
  CodeApi,
  HttpApi,
  CrawlerApi,
  OssApi,
  WasmApi,
  SystemApi,
  AppMenuApi,
  DialogApi,
  TransferApi,
  NotificationApi,
  FeishuApi,
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
    crawlerApi: CrawlerApi
    ossApi: OssApi
    wasmApi: WasmApi
    /** 系统信息 API：硬件指纹等渲染进程拿不到的数据 */
    systemApi: SystemApi
    appMenuApi: AppMenuApi
    dialogApi: DialogApi
    transferApi: TransferApi
    /** 系统通知 API：发 macOS / Windows 系统级通知 */
    notificationApi: NotificationApi
    /** 飞书长连接 API：start/stop/status + onMessage 回调 */
    feishuApi: FeishuApi
    tableApi: TableApi
    /** 画布管理 API：list / create / rename / delete / openNewWindow */
    canvasApi: CanvasApi
    /** 返回当前窗口绑定的 canvasId（从 URL query 读，默认 'default'） */
    getCurrentCanvasId: GetCurrentCanvasId
    /** 返回启动模式：'picker'=画布选择器窗口，null=正常画布窗口 */
    getStartupMode: GetStartupMode
  }
}
