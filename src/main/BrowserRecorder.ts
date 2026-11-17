import { webContents, type NativeImage, type Rectangle } from 'electron'
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdtempSync, rmSync, statSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * BrowserNode 录制管理器：主进程侧负责把 webview 的 GPU 帧实时 pipe 给 ffmpeg。
 *
 * 每个 webview（通过 webContentsId 唯一标识）同一时刻只能有一个活跃录制；
 * 同一 BrowserNode 点停止后才能开始下一次。
 *
 * 关键设计：
 * - 帧源：webContents.beginFrameSubscription → NativeImage.toBitmap() → raw BGRA bytes
 * - 输出：ffmpeg stdin 直 pipe（-f rawvideo -pix_fmt bgra -s WxH -r fps -i pipe:0 -c:v libx264 -pix_fmt yuv420p output.mp4）
 * - 生命周期：start() → 订阅帧 + spawn ffmpeg → stop() → endFrameSubscription → stdin.end() → 等 exit → 返回文件路径
 */

const DEFAULT_FPS = 15

interface RecorderState {
  wcId: number
  width: number
  height: number
  fps: number
  startTime: number
  outputPath: string
  ffmpeg: ChildProcessWithoutNullStreams
  tmpDir: string
  /** ffmpeg 进程的 stderr 累积，stop 时异常时用来诊断 */
  ffmpegError: string
  /** 订阅句柄：endFrameSubscription 前必须先清掉，防止 Electron 崩 */
  cleanupSubscription: () => void
  /** 是否已结束（stop 被调用后标记 true，防止 endFrameSubscription + ffmpeg 双重收尾） */
  ended: boolean
}

const activeRecorders = new Map<number, RecorderState>()

/**
 * 同步探活 ffmpeg + libx264 编码器。
 * 用 spawnSync（阻塞）是因为只在 IPC handler 里查一次，耗时可忽略。
 */
export function checkFfmpeg(): { available: boolean; hasLibx264: boolean; installHint: string } {
  try {
    // 先查 ffmpeg 本体
    const versionResult = spawnSync('ffmpeg', ['-version'], { shell: true, windowsHide: true, timeout: 3000 })
    if (versionResult.status !== 0) {
      return { available: false, hasLibx264: false, installHint: '需要安装 ffmpeg：macOS 执行 brew install ffmpeg' }
    }
    // 再查 libx264 编码器
    const encodersResult = spawnSync('ffmpeg', ['-encoders'], { shell: true, windowsHide: true, timeout: 3000 })
    const encodersStdout = encodersResult.stdout == null ? '' : String(encodersResult.stdout)
    const hasLibx264 = encodersResult.status === 0 && encodersStdout.includes('libx264')
    return {
      available: true,
      hasLibx264,
      installHint: hasLibx264 ? '' : '需要 ffmpeg 带 libx264：brew reinstall ffmpeg'
    }
  } catch {
    return { available: false, hasLibx264: false, installHint: '需要安装 ffmpeg：macOS 执行 brew install ffmpeg' }
  }
}

export interface StartRecordArgs {
  /** webview 的 webContents id（renderer 通过 webview.getWebContentsId() 拿到的） */
  wcId: number
  /** webview 实际渲染宽度（px） */
  width: number
  /** webview 实际渲染高度（px） */
  height: number
  /** 帧率（可选，默认 15） */
  fps?: number
}

export type StartRecordResult =
  | { ok: true; recordId: number }
  | { ok: false; error: string }

export type StopRecordResult =
  | { ok: true; outputPath: string; fileSize: number; durationMs: number; base64: string }
  | { ok: false; error: string }

/**
 * 开始录制指定 webview。
 * 同一 wcId 上已有活跃录制时返回 ok:false；不同 wcId 可并行。
 */
export function startRecord(args: StartRecordArgs): StartRecordResult {
  const wcId = args.wcId

  // eslint-disable-next-line no-console
  console.log('[BrowserRecorder.startRecord] → wcId=', wcId, args)

  // 1. 防重入
  if (activeRecorders.has(wcId)) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserRecorder.startRecord] 已在录制中')
    return { ok: false, error: '该浏览器节点已在录制中' }
  }

  // 2. 校验 ffmpeg
  const ffmpegInfo = checkFfmpeg()
  if (!ffmpegInfo.available) {
    return { ok: false, error: ffmpegInfo.installHint }
  }
  if (!ffmpegInfo.hasLibx264) {
    return { ok: false, error: ffmpegInfo.installHint }
  }

  // 3. 校验 webContents 是否存在
  const wc = webContents.fromId(wcId)
  if (!wc || wc.isDestroyed()) {
    return { ok: false, error: `找不到 webview（id=${wcId}）` }
  }

  // 4. 准备参数
  // ★ 关键：ffmpeg/libx264 + yuv420p 要求宽高都是偶数（2x2 色度子采样）
  const width = (Math.max(100, Math.round(args.width || 0)) & ~1)   // 向下取偶数
  const height = (Math.max(100, Math.round(args.height || 0)) & ~1)
  const fps = Math.min(60, Math.max(1, args.fps ?? DEFAULT_FPS))
  const tmpDir = mkdtempSync(join(tmpdir(), 'canvasdesk-record-'))
  const outputPath = join(tmpDir, `browser-${wcId}-${Date.now()}.mp4`)
  // eslint-disable-next-line no-console
  console.log('[BrowserRecorder.startRecord] ffmpeg 输入配置：', width, 'x', height, '@', fps, 'fps')

  // 5. spawn ffmpeg（stdin 接收 raw BGRA 字节）
  const ffmpegArgs = [
    '-y', // 覆盖已有文件
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${width}x${height}`,
    '-r', String(fps),
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'veryfast',
    '-crf', '23',
    '-movflags', '+faststart',
    outputPath
  ]

  let ffmpeg: ChildProcessWithoutNullStreams
  try {
    ffmpeg = spawn('ffmpeg', ffmpegArgs, { shell: true, windowsHide: true })
    // eslint-disable-next-line no-console
    console.log('[BrowserRecorder.startRecord] ffmpeg spawn 成功，pid=', ffmpeg.pid)
  } catch (err) {
    rmSync(tmpDir, { recursive: true, force: true })
    // eslint-disable-next-line no-console
    console.error('[BrowserRecorder.startRecord] spawn ffmpeg 失败:', err)
    return { ok: false, error: `启动 ffmpeg 失败：${err instanceof Error ? err.message : String(err)}` }
  }

  // —— 关键：防 EPIPE 崩主进程 ——
  // Node.js 的 Writable stream 在 write 触发 EPIPE / ECONNRESET 时会 emit 'error' 事件。
  // 如果没有 listener，这个 error 会冒泡成未捕获异常，直接炸掉 Electron 主进程。
  // 我们显式监听并静默吞掉——这类错误都是 ffmpeg 端关闭管道导致的预期情况。
  ffmpeg.stdin?.on('error', (e) => { /* eslint-disable-next-line no-console */ console.warn('[BrowserRecorder] stdin error:', e) })
  // stdout 我们不读，但如果 ffmpeg 异常退出也可能触发 error
  ffmpeg.stdout?.on('error', () => { /* ignore */ })
  ffmpeg?.on('stderr', () => { /* ignore */ })

  // frame 计数 + 首帧诊断
  let frameCount = 0
  let firstFrameFired = false
  let firstFrameSize: { width: number; height: number; bytesPerRow: number } | null = null

  let ffmpegError = ''
  ffmpeg.stderr?.on('data', (buf: Buffer) => {
    const s = activeRecorders.get(wcId)
    const text = buf.toString('utf-8')
    if (s) { s.ffmpegError += text } else { ffmpegError += text }
  })
  ffmpeg.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[BrowserRecorder] ffmpeg process error:', err.message)
    const s = activeRecorders.get(wcId)
    if (s) { s.ffmpegError = err.message } else { ffmpegError = err.message }
  })

  // 6. 订阅帧 + 注册状态到 map（现在注册，让 frameCallback 里能拿到）
  const cleanupSubscription = (): void => {
    try { wc.endFrameSubscription() } catch { /* noop */ }
  }

  const frameCallback = (image: NativeImage, _dirtyRect: Rectangle): void => {
    const state = activeRecorders.get(wcId)
    if (!state || state.ended) return
    const stdin = ffmpeg.stdin
    if (!stdin || stdin.destroyed || !stdin.writable) return

    frameCount++
    if (!firstFrameFired) {
      firstFrameFired = true
      const size = image.getSize()
      const rowSize = typeof (image as any).getBitmapRowSize === 'function'
        ? (image as any).getBitmapRowSize()
        : size.width * 4
      firstFrameSize = { width: size.width, height: size.height, bytesPerRow: rowSize }
      const needResize = size.width !== width || size.height !== height
      // eslint-disable-next-line no-console
      console.log('[BrowserRecorder] ★ 第一帧到！NativeImage=', size.width, 'x', size.height,
        '→ ffmpeg 期望', width, 'x', height, needResize ? '★ 需要 resize' : '✓ 尺寸匹配')
    }

    try {
      // ★ 关键：把 NativeImage resize 到 ffmpeg 期望的尺寸。
      // HiDPI/Retina 上 beginFrameSubscription 返回设备像素尺寸（如 1044x628），
      // 而我们希望视频输出是 CSS 像素尺寸（如 582x348）。
      // 如果不 resize，pipe 的字节数就跟 ffmpeg 期望的不匹配，ffmpeg 会解读错位，
      // libx264 再加上奇数尺寸 → Invalid argument → EPIPE → 零帧。
      const actualSize = image.getSize()
      let img = image
      if (actualSize.width !== width || actualSize.height !== height) {
        img = image.resize({ width, height, quality: 'better' })
      }
      const buf = img.toBitmap()
      stdin.write(buf)
    } catch {
      // 单帧丢了没关系
    }
  }

  try {
    wc.beginFrameSubscription(frameCallback)
    // eslint-disable-next-line no-console
    console.log('[BrowserRecorder.startRecord] beginFrameSubscription 成功，订阅已激活')
  } catch (err) {
    ffmpeg.kill('SIGTERM')
    rmSync(tmpDir, { recursive: true, force: true })
    // eslint-disable-next-line no-console
    console.error('[BrowserRecorder.startRecord] beginFrameSubscription 失败:', err)
    return { ok: false, error: `订阅帧失败：${err instanceof Error ? err.message : String(err)}` }
  }

  // 7. 注册状态
  activeRecorders.set(wcId, {
    wcId,
    width,
    height,
    fps,
    startTime: Date.now(),
    outputPath,
    ffmpeg,
    tmpDir,
    ffmpegError: '',
    cleanupSubscription,
    ended: false
  })

  // 8. 把 frameCount 暴露给 stopRecord 的 ffmpeg exit 诊断
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(activeRecorders.get(wcId) as any).__frameCountRef = { get count() { return frameCount }, get first() { return firstFrameSize } }

  return { ok: true, recordId: wcId }
}

/**
 * 停止录制指定 webview，等 ffmpeg 写完文件后返回。
 * 未在录制中时返回 ok:false。
 *
 * 注意：stopRecord 里不再主动 kill ffmpeg——只 endFrameSubscription + stdin.end()。
 * ffmpeg 读到 stdin EOF 后会自动 flush buffer 并 exit。
 * 如果 ffmpeg 已经因为 EPIPE 等原因先挂了，close 事件可能在我们之前就 fire 过了，
 * 所以必须用「已 resolve 锁」保证只 resolve 一次。
 */
export function stopRecord(wcId: number): Promise<StopRecordResult> {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-console
    console.log('[BrowserRecorder.stopRecord] → wcId=', wcId)
    const state = activeRecorders.get(wcId)
    if (!state) {
      // eslint-disable-next-line no-console
      console.warn('[BrowserRecorder.stopRecord] 未在录制中（map 里找不到）')
      resolve({ ok: false, error: '未在录制中' })
      return
    }

    if (state.ended) {
      // eslint-disable-next-line no-console
      console.warn('[BrowserRecorder.stopRecord] state.ended=true，已结束')
      resolve({ ok: false, error: '录制已结束' })
      return
    }

    state.ended = true
    const durationMs = Date.now() - state.startTime
    // eslint-disable-next-line no-console
    console.log('[BrowserRecorder.stopRecord] 标记 ended=true，duration=', durationMs, 'ms')

    // —— resolve 锁：保证 close 事件和 timeout 只 resolve 一次 ——
    let resolved = false
    const doResolve = (result: StopRecordResult): void => {
      if (resolved) return
      resolved = true
      activeRecorders.delete(wcId)
      resolve(result)
    }

    // 1. 先停帧订阅（别再给 ffmpeg 喂数据了）
    state.cleanupSubscription()
    // eslint-disable-next-line no-console
    console.log('[BrowserRecorder.stopRecord] endFrameSubscription 调用完毕')

    // 2. 关 ffmpeg stdin → ffmpeg 读完 pipe 里剩下的数据后自动 exit
    try {
      if (state.ffmpeg.stdin && !state.ffmpeg.stdin.destroyed && state.ffmpeg.stdin.writable) {
        state.ffmpeg.stdin.end()
        // eslint-disable-next-line no-console
        console.log('[BrowserRecorder.stopRecord] stdin.end() 调用完毕，等待 ffmpeg close...')
      } else {
        // eslint-disable-next-line no-console
        console.warn('[BrowserRecorder.stopRecord] stdin 已销毁/不可写，直接等 close')
      }
    } catch { /* stdin 可能已经关了（EPIPE），忽略 */ }

    // —— ffmpeg 退出处理：统一函数，既给 exit 事件也给预检查用 ——
    const handleFfmpegExit = (code: number | null, _signal: NodeJS.Signals | null): void => {
      // eslint-disable-next-line no-console
      const fc = (state as any).__frameCountRef
      // eslint-disable-next-line no-console
      console.log('[BrowserRecorder.stopRecord] ffmpeg exit 事件，code=', code,
        '总帧数=', fc?.count ?? '?', '首帧尺寸=', fc?.first ?? '无')
      if (code !== 0 && code !== null) {
        try { rmSync(state.tmpDir, { recursive: true, force: true }) } catch { /* noop */ }
        const tail = state.ffmpegError || ''
        const lastLines = tail.split('\n').slice(-5).join('\n')
        // eslint-disable-next-line no-console
        console.error('[BrowserRecorder] ffmpeg 异常退出 code=', code, lastLines)
        doResolve({ ok: false, error: `ffmpeg 退出码 ${code}：${lastLines}` })
        return
      }

      // 检查输出文件
      try {
        const stat = statSync(state.outputPath)
        // eslint-disable-next-line no-console
        console.log('[BrowserRecorder] ffmpeg exit 0，输出:', state.outputPath, '大小:', stat.size, '时长:', durationMs, 'ms')
        if (stat.size === 0) {
          try { rmSync(state.tmpDir, { recursive: true, force: true }) } catch { /* noop */ }
          doResolve({ ok: false, error: '输出文件为空（可能录制时间太短或页面没有渲染帧）' })
          return
        }

        // ★ 关键：读 base64 → 清临时目录 → 返回。
        // 以前返回绝对路径让 renderer 再去读，但系统临时目录会堆积 mp4。
        // 现在主进程直接读进返回值，renderer 拿到就能用，临时目录立刻清。
        let base64 = ''
        try {
          base64 = readFileSync(state.outputPath, 'base64')
          // eslint-disable-next-line no-console
          console.log('[BrowserRecorder] base64 读取成功，长度:', base64.length)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[BrowserRecorder] readFileSync 失败:', err)
          doResolve({ ok: false, error: `读取输出文件失败：${err instanceof Error ? err.message : String(err)}` })
          return
        } finally {
          // 无论成功失败，临时目录的 mp4 都该清了——renderer 要么拿到 base64 要么拿到 error
          try { rmSync(state.tmpDir, { recursive: true, force: true }) } catch { /* noop */ }
        }

        doResolve({ ok: true, outputPath: state.outputPath, fileSize: stat.size, durationMs, base64 })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[BrowserRecorder] statSync 失败:', err)
        doResolve({ ok: false, error: `读取输出文件失败：${err instanceof Error ? err.message : String(err)}` })
      }
    }

    // 3. 等 ffmpeg 退出
    // ★ 关键：先查一下是否已经退出（exitCode/signalCode !== null 说明已经退了）
    // 如果已经退出，close/exit 事件永远不会再 fire——直接处理！
    if (state.ffmpeg.exitCode !== null || state.ffmpeg.signalCode !== null) {
      // eslint-disable-next-line no-console
      console.warn('[BrowserRecorder.stopRecord] ffmpeg 已在 stopRecord 之前退出，exitCode=', state.ffmpeg.exitCode)
      handleFfmpegExit(state.ffmpeg.exitCode, state.ffmpeg.signalCode)
    } else {
      // exit 事件比 close 更可靠（close 要等所有 stdio 关完，exit 进程一死就 fire）
      state.ffmpeg.once('exit', handleFfmpegExit)
    }

    // 保险：10 秒超时后 SIGKILL 强杀（stdin.end 后 ffmpeg 应该很快退出）
    setTimeout(() => {
      // 如果已经 resolved（close 正常回来），doResolve 里的 resolved 锁会挡住
      if (!resolved) {
        try { state.ffmpeg.kill('SIGKILL') } catch { /* noop */ }
        // 等 kill 触发 close
        setTimeout(() => {
          if (!resolved) {
            try { rmSync(state.tmpDir, { recursive: true, force: true }) } catch { /* noop */ }
            doResolve({ ok: false, error: 'ffmpeg 超时未退出，已强制终止' })
          }
        }, 1500)
      }
    }, 10000)
  })
}

/** 查询指定 webview 是否在录制中 */
export function isRecording(wcId: number): boolean {
  return activeRecorders.has(wcId) && !activeRecorders.get(wcId)?.ended
}
