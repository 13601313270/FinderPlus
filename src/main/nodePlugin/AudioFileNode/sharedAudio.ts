/**
 * 进程共享的 AudioContext 单例。
 *
 * 为什么需要单例：Web Audio API 的 AudioContext 数量有限制（Chromium 约 6 个），
 * 如果 AudioFolderNode 里 20 个 AudioFileNode 同时 setContent → 同时 new AudioContext()
 * 解码时长 → 浏览器超出硬限制，就报 "AudioContext encountered an error from
 * the audio device or the WebAudio renderer"。
 *
 * 使用方式：任何需要 AudioContext 的节点调 getSharedAudioContext() 即可拿到同一个 ctx，
 * 用完不用 close（进程生命周期内一直存活）。
 */

let sharedCtx: AudioContext | null = null

export function getSharedAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext()
  }
  return sharedCtx
}
