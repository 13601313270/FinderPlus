/**
 * 把开发态 Electron.app 的显示名改成应用名（Finder+）。
 *
 * 背景：macOS 顶部菜单栏第一个菜单的标题**永远**取自定义应用 bundle 的
 * Info.plist（CFBundleName / CFBundleDisplayName），JS 里给菜单项设的 label
 * 会被系统忽略；开发态跑的是 node_modules 里的 Electron.app，它的 bundle 名
 * 就是 "Electron"，所以开发态菜单栏一直显示 Electron。app.setName() 也改不动它
 * （Electron 文档：setName 不影响 OS 层的名字）。
 *
 * 唯一能让开发态也显示 Finder+ 的办法，就是直接改这个 Info.plist。
 * 该文件属于 node_modules，重装依赖后会丢失，所以挂在 postinstall 里自动执行。
 * 只改 bundle 名，不动 package.json 的 name，因此开发态 userData 目录不变、数据不受影响。
 *
 * 仅 macOS 生效；其他平台、文件缺失、依赖未安装时静默跳过，绝不让安装失败。
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

/** 要显示的应用名 */
const APP_NAME = 'Finder+'

function main() {
  if (process.platform !== 'darwin') return

  let electronDir
  try {
    electronDir = path.dirname(require.resolve('electron/package.json'))
  } catch {
    // electron 未安装（例如仅安装生产依赖）——跳过
    return
  }

  const appBundle = path.join(electronDir, 'dist', 'Electron.app')
  const plistPath = path.join(appBundle, 'Contents', 'Info.plist')
  if (!fs.existsSync(plistPath)) return

  const original = fs.readFileSync(plistPath, 'utf8')

  // 只替换 CFBundleDisplayName / CFBundleName 两个 key 对应的 <string> 值
  const patched = original
    .replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)([^<]*)(<\/string>)/,
      `$1${APP_NAME}$3`
    )
    .replace(
      /(<key>CFBundleName<\/key>\s*<string>)([^<]*)(<\/string>)/,
      `$1${APP_NAME}$3`
    )

  if (patched === original) {
    console.log(`[patch-electron-name] Electron.app 已是「${APP_NAME}」，跳过`)
    return
  }

  fs.writeFileSync(plistPath, patched)

  // 改动 bundle 会让原代码签名失效，做一次 ad-hoc 重签名，避免启动时被判定为「已损坏」
  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appBundle], { stdio: 'ignore' })
  } catch {
    // 重签名失败不致命，忽略（本地开发通常仍可正常启动）
  }

  // 刷新 bundle 修改时间，促使 LaunchServices 重新读取名称缓存
  try {
    const now = new Date()
    fs.utimesSync(appBundle, now, now)
  } catch {
    // 忽略
  }

  console.log(`[patch-electron-name] 开发态 Electron.app 名称已改为「${APP_NAME}」`)
}

main()