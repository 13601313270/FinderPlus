# Finder+

macOS 上的节点式可视化自动化画布。把节点拖到无限画布上，用端口连线，数据就会沿着连线流动——文本、图片、大模型、HTTP 请求、Shell 命令都能变成一条看得见的流水线。

[English](README.md) · 简体中文 · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## 这是什么

Finder+ 是一个用来搭**可视化工作流**的桌面应用。你不用写脚本，而是把节点摆在画布上，把一个节点的输出端口连到另一个节点的输入端口。值会沿着连线传递，上游一有结果，下游节点立刻亮起来。

常见用法：

- 批量处理图片：裁剪 → 压缩 → 调质量 → 抠背景
- 搭提示词流水线：文本模板 → 大模型 → JSON 展示
- 用一段提示词生成图片，直接落进文件夹
- 把 HTTP 接口和本地 shell 命令串起来，不用写程序

## 下载

最新版本：**<https://github.com/13601313270/FinderPlus/releases>**

v0.1.0 直链（Apple Silicon）：

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

打开 `.dmg`，把 **Finder+** 拖进 **Applications**，然后推出磁盘映像即可。

### macOS 首次打开

> **当前版本尚未签名和公证。** 第一次打开时 macOS 会拦截，提示"无法验证开发者"或"应用已损坏，无法打开"。

想打开的话，任选一种：

- **右键**（或 Control + 点击）应用图标 → **打开** → 弹窗里再点一次 **打开**。
- 或者先在终端执行下面这条命令，之后正常双击启动：

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- macOS 15（Sequoia）及以后，如果右键方式不生效，去 **系统设置 → 隐私与安全性**，点 **仍要打开**。

**运行要求：** Apple Silicon（arm64）的 macOS。Intel 版本暂未发布。

## 节点一览

| 节点 | type | 作用 |
| --- | --- | --- |
| 文本输入 | `text-input` | 输出一个字符串 |
| 数字输入 | `number-input` | 输出一个数字 |
| 布尔输入 | `bool-input` | 输出一个布尔值 |
| 文本文件 | `txt-file` | 把 `.txt` 文件拖到画布上生成 |
| 图片文件 | `img-file` | 把图片文件拖到画布上生成 |
| 任意文件 | `any-file` | 把其他类型的文件拖到画布上生成 |
| 文件信息 | `file-info` | 读取文件的元信息 |
| 文件夹 | `folder` | 容器，把收到的文件收养为子节点 |
| 图片文件夹 | `img-folder` | 承载一批图片的容器 |
| 文本展示 | `text-display` | 预览上游传来的文本 |
| JSON 展示 | `json-display` | 格式化展示 JSON |
| 图片预览 | `image-preview` | 预览图片，可保存到磁盘 |
| 字符串拼接 | `string-concat` | 用 `$1 … $N` 占位符拼接输入值 |
| 条件分支 | `switch` | 条件分流 |
| 人工审阅 | `human-review` | 排队等待人工审核，按「通过 / 驳回」两条分支输出 |
| 大模型 | `llm` | 调用可配置服务商的对话接口 |
| 图片生成 | `image-gen` | 调用可配置服务商的文生图接口 |
| 图片裁剪 | `image-crop` | 裁剪图片 |
| 图片压缩 | `image-compress` | 压缩图片（WebAssembly） |
| 图片质量 | `image-quality` | 调整编码质量 |
| 图片叠加 | `image-overlay` | 把一张图叠到另一张上 |
| 背景移除 | `background-remove` | 抠背景（ONNX，本地推理） |
| 代码 | `code` | 执行一段 JavaScript 函数体 |
| 命令行 | `command` | 执行一条 Shell 命令 |
| HTTP 请求 | `http-request` | 发送 HTTP/HTTPS 请求 |

## 支持的服务商

**大模型** —— DeepSeek、OpenAI、Kimi（Moonshot）、通义千问（DashScope）、智谱 GLM、MiniMax、Groq、Mistral AI、硅基流动，以及其他兼容 OpenAI 协议的服务。

**图片生成** —— 硅基流动、OpenAI（DALL·E / GPT-Image）、智谱（CogView）、阿里云百炼（通义千问 / 万相）。

API Key 在应用内的设置里填写，**只存在本地**。

## 界面语言

内置 15 种语言：English、简体中文、日本語、한국어、Español、العربية、Français、Português、Русский、हिन्दी、Bahasa Indonesia、Deutsch、Tiếng Việt、Türkçe、Italiano。

## 数据存在哪

- **画布文件**（你拖到画布上的文件）会被复制到 `~/Documents/CanvasDesk/我的画布`。应用持有自己的一份副本，不依赖文件的原始路径。
- **画布结构、节点位置和连线**存在本地 SQLite 数据库里，位于应用的 user data 目录。
- **API Key** 保存在本机的 localStorage。应用本身不会把它们上传到任何地方。

## 安全提示

有两个节点会按你的意图执行代码，请像对待脚本一样对待画布：

- **命令行** —— 通过系统 shell 执行你写的命令，用的是你的用户权限。
- **代码** —— 执行你写的 JavaScript 函数体。

只运行你自己写的、或者你逐行读过的画布。

## 从源码构建

需要 Node.js 20+ 和 macOS。

```bash
npm install
npm run dev        # 开发模式启动
npm run typecheck  # tsc + vue-tsc 类型检查
npm run build:mac  # 打包出 dist/ 下的 .dmg
```

## 技术栈

Electron 44 · Vue 3 · TypeScript · Vite（electron-vite）· Less · vue-i18n · sql.js（WebAssembly 版 SQLite）· onnxruntime-web · img-compressor-wasm

图引擎（`src/main/engine/`）是纯逻辑、零 Electron 依赖，主进程与渲染进程直接共享同一份实现。
