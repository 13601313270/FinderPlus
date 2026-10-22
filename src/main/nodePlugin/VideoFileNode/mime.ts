/** 视频后缀 → MIME 映射 */
const VIDEO_MIME_BY_EXT: Array<[RegExp, string]> = [
  [/\.mp4$/i, 'video/mp4'],
  [/\.webm$/i, 'video/webm'],
  [/\.ogg$/i, 'video/ogg'],
  [/\.mov$/i, 'video/quicktime'],
  [/\.m4v$/i, 'video/x-m4v'],
  [/\.avi$/i, 'video/x-msvideo'],
  [/\.mkv$/i, 'video/x-matroska'],
  [/\.flv$/i, 'video/x-flv'],
  [/\.wmv$/i, 'video/x-ms-wmv'],
  [/\.3gp$/i, 'video/3gpp'],
  [/\.ts$/i, 'video/mp2t'],
  [/\.mts$/i, 'video/mp2t'],
  [/\.m2ts$/i, 'video/mp2t'],
  [/\.hevc$/i, 'video/hevc']
]

/** 从文件名后缀推断视频 MIME 类型；兜底返回 video/mp4 */
export function inferVideoMime(fileName: string): string {
  for (const [re, mime] of VIDEO_MIME_BY_EXT) {
    if (re.test(fileName)) return mime
  }
  return 'video/mp4'
}
