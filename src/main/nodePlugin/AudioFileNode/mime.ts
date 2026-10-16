/** 音频后缀 → MIME 映射 */
const AUDIO_MIME_BY_EXT: Array<[RegExp, string]> = [
  [/\.mp3$/i, 'audio/mpeg'],
  [/\.wav$/i, 'audio/wav'],
  [/\.ogg$/i, 'audio/ogg'],
  [/\.m4a$/i, 'audio/mp4'],
  [/\.flac$/i, 'audio/flac'],
  [/\.aac$/i, 'audio/aac'],
  [/\.webm$/i, 'audio/webm'],
  [/\.opus$/i, 'audio/opus']
]

/** 从文件名后缀推断音频 MIME 类型；兜底返回 audio/* */
export function inferAudioMime(fileName: string): string {
  for (const [re, mime] of AUDIO_MIME_BY_EXT) {
    if (re.test(fileName)) return mime
  }
  return 'audio/*'
}
