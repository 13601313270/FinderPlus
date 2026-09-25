/**
 * base64 字符串 → Uint8Array 原始字节。
 *
 * 渲染进程（browser / preload 端）有 atob，这里假设调用方已经在渲染层环境。
 * 引擎纯逻辑层（engine/data）如果未来需要也能 import —— atob 在 Node.js 全局也有。
 */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** base64 + MIME → Blob（方便直接喂给 URL.createObjectURL） */
export function base64ToBlob(b64: string, mime: string): Blob {
  const bytes = base64ToBytes(b64)
  // 显式 slice 取纯 ArrayBuffer，避免 TS 5.x 把 Uint8Array<ArrayBufferLike> 卡在 Blob 构造上
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([ab], { type: mime })
}
