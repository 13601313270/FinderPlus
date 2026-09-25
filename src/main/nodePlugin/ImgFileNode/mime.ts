/** 图片后缀 → MIME 映射 */
const IMAGE_MIME_BY_EXT: Array<[RegExp, string]> = [
  [/\.jpe?g$/i, 'image/jpeg'],
  [/\.png$/i, 'image/png'],
  [/\.gif$/i, 'image/gif'],
  [/\.webp$/i, 'image/webp'],
  [/\.bmp$/i, 'image/bmp']
]

/** 从文件名后缀推断图片 MIME 类型；兜底返回 image/* */
export function inferImageMime(fileName: string): string {
  for (const [re, mime] of IMAGE_MIME_BY_EXT) {
    if (re.test(fileName)) return mime
  }
  return 'image/*'
}
