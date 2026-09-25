/**
 * 轻量字符串 hash：djb2。32 位、同步、无依赖。
 *
 * 设计定位：变更检测的指纹前缀生成器（不是安全 hash，碰撞概率够用就行）。
 * - 用于文本内容的变更检测（直接对字符串 hash）
 * - 也可对 base64 字符串 hash —— base64 是文件字节的确定性编码，
 *   同一文件必然同一 base64，hash 自然稳定，等价于对原始字节做 hash。
 */
export function djb2(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}
