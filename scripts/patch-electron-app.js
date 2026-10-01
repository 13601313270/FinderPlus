/**
 * 把开发态 Electron.app 的「身份」同步成应用自己的：显示名、版本号、图标。
 *
 * 背景一（名字）：macOS 顶部菜单栏第一个菜单的标题**永远**取自定义应用 bundle 的
 * Info.plist（CFBundleName / CFBundleDisplayName），JS 里给菜单项设的 label
 * 会被系统忽略；开发态跑的是 node_modules 里的 Electron.app，它的 bundle 名
 * 就是 "Electron"，所以开发态菜单栏一直显示 Electron。app.setName() 也改不动它
 * （Electron 文档：setName 不影响 OS 层的名字）。
 *
 * 背景二（版本号）：「关于」面板显示的是 bundle 的 CFBundleShortVersionString（左值）
 * 和 CFBundleVersion（括号里），压根不读 package.json 的 version，于是开发态一直
 * 显示 Electron 自己的版本（如 44.4.3）。
 *
 * 背景三（图标）：Dock 和「关于」面板的图标同样来自 bundle（CFBundleIconFile 指向的
 * electron.icns），不换就一直是 Electron 的默认图标。setAboutPanelOptions 的
 * iconPath 在 macOS 上无效，只能替换这个文件。
 *
 * 这三样在打包态都由 electron-builder 按 package.json 和 build 目录写好，只有开发态
 * 需要手工补。要改的 Info.plist 和 electron.icns 都在 node_modules 里，重装依赖后
 * 会丢失，所以挂在 postinstall 里自动执行。
 *
 * 只改 bundle 里的这几个键和一个图标文件，不动 package.json 的 name，
 * 因此开发态 userData 目录不变、数据不受影响。
 *
 * 仅 macOS 生效；其他平台、文件缺失、依赖未安装时静默跳过，绝不让安装失败。
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const pkg = require('../package.json')

/** 要显示的应用名 */
const APP_NAME = 'Finder+'
/** 要显示的应用版本，跟随 package.json，避免两处对不上 */
const APP_VERSION = pkg.version
/** 图标源文件（打包态 electron-builder 也认这个路径） */
const ICON_PATH = path.join(__dirname, '..', 'build', 'icon.icns')

/**
 * 替换 Info.plist 里的名称/版本键。
 * @returns 是否真的改动了内容
 */
function patchPlist(plistPath) {
  if (!fs.existsSync(plistPath)) return false

  const original = fs.readFileSync(plistPath, 'utf8')

  /** 替换某个 key 后面的 <string> 值 */
  const setString = (plist, key, value) =>
    plist.replace(new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`), `$1${value}$3`)

  // 名字两个键 + 版本两个键（「关于」面板左值取 ShortVersionString、括号里取 Version）
  let patched = original
  for (const [key, value] of [
    ['CFBundleDisplayName', APP_NAME],
    ['CFBundleName', APP_NAME],
    ['CFBundleShortVersionString', APP_VERSION],
    ['CFBundleVersion', APP_VERSION]
  ]) {
    patched = setString(patched, key, value)
  }

  if (patched === original) return false

  fs.writeFileSync(plistPath, patched)
  return true
}

/**
 * 用 build/icon.icns 覆盖 bundle 里的 electron.icns。
 * Info.plist 的 CFBundleIconFile 本来就指向这个文件名，所以只换文件、不用改键。
 * @returns 是否真的替换了
 */
function patchIcon(appBundle) {
  if (!fs.existsSync(ICON_PATH)) {
    console.warn(`[patch-electron-app] 找不到 ${ICON_PATH}，跳过图标替换`)
    return false
  }

  const target = path.join(appBundle, 'Contents', 'Resources', 'electron.icns')
  if (fs.existsSync(target) && fs.readFileSync(target).equals(fs.readFileSync(ICON_PATH))) {
    return false
  }

  fs.copyFileSync(ICON_PATH, target)
  return true
}

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
  if (!fs.existsSync(appBundle)) return

  const plistChanged = patchPlist(path.join(appBundle, 'Contents', 'Info.plist'))
  const iconChanged = patchIcon(appBundle)

  if (!plistChanged && !iconChanged) {
    console.log(`[patch-electron-app] Electron.app 已是「${APP_NAME} ${APP_VERSION}」且图标同源，跳过`)
    return
  }

  // 改动 bundle 会让原代码签名失效，做一次 ad-hoc 重签名，避免启动时被判定为「已损坏」
  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appBundle], { stdio: 'ignore' })
  } catch {
    // 重签名失败不致命，忽略（本地开发通常仍可正常启动）
  }

  // 刷新 bundle 修改时间，促使 LaunchServices 重新读取名称/图标缓存
  try {
    const now = new Date()
    fs.utimesSync(appBundle, now, now)
  } catch {
    // 忽略
  }

  console.log(`[patch-electron-app] 开发态 Electron.app 已同步为「${APP_NAME} ${APP_VERSION}」+ 自定义图标`)
}

main()