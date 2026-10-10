# Finder+

A node-based visual automation canvas for macOS. Drag nodes onto an infinite canvas, wire their ports together, and data flows through the graph — turning text, images, LLM calls, HTTP requests and shell commands into a reusable pipeline you can see.

English · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## What it is

Finder+ is a desktop app for building **visual workflows**. Instead of writing a script, you place nodes on a canvas and connect an output port to an input port. Values propagate along the wires, and each node lights up with its result as soon as its inputs arrive.

Typical uses:

- Batch-process images: crop → compress → adjust quality → remove background
- Build prompt pipelines: text template → LLM → JSON display
- Generate images from a text prompt and drop the result into a folder
- Glue together HTTP APIs and local shell commands without writing a program

## Download

Latest release: **<https://github.com/13601313270/FinderPlus/releases>**

Open the `.dmg`, drag **Finder+** into the **Applications** folder, then eject the disk image.

### First launch on macOS

> **This build is not signed or notarized yet.** macOS will block it the first time with a message like *"Finder+ cannot be opened because the developer cannot be verified"* or *"Finder+ is damaged and can't be opened"*.

To open it anyway, pick one of:

- **Right-click** (or Control-click) the app icon → **Open** → **Open** again in the dialog.
- Or run this in Terminal, then launch normally:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- On macOS 15 (Sequoia) and later, if the right-click route is not offered, go to **System Settings → Privacy & Security** and click **Open Anyway**.

**Requirements:** macOS on Apple Silicon (arm64). Intel builds are not published yet.

## Nodes

| Node | Type | What it does |
| --- | --- | --- |
| Text Input | `text-input` | Emits a string |
| Number Input | `number-input` | Emits a number |
| Boolean Input | `bool-input` | Emits a boolean |
| Text File | `txt-file` | Created by dropping a `.txt` file onto the canvas |
| Image File | `img-file` | Created by dropping an image file onto the canvas |
| Any File | `any-file` | Created by dropping a file of any other type |
| File Info | `file-info` | Reads metadata from a file |
| Folder | `folder` | Container that collects incoming files as child nodes |
| Image Folder | `img-folder` | Container for a batch of images |
| Text Display | `text-display` | Previews incoming text |
| JSON Display | `json-display` | Pretty-prints JSON |
| Image Preview | `image-preview` | Previews an image and can save it to disk |
| String Concat | `string-concat` | Concatenates values using `$1 … $N` placeholders |
| Switch | `switch` | Conditional branching |
| Human Review | `human-review` | Queues values for manual review; outputs on **approve** or **reject** |
| LLM | `llm` | Chat completion against a configurable provider |
| Image Generation | `image-gen` | Text-to-image against a configurable provider |
| Image Crop | `image-crop` | Crops an image |
| Image Compress | `image-compress` | Compresses an image (WebAssembly) |
| Image Quality | `image-quality` | Adjusts encoding quality |
| Image Overlay | `image-overlay` | Overlays one image on another |
| Background Remove | `background-remove` | Removes the background (ONNX, on-device) |
| Code | `code` | Runs a JavaScript function body |
| Command | `command` | Runs a shell command |
| HTTP Request | `http-request` | Sends an HTTP/HTTPS request |

## Supported providers

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow, and others.

**Image generation** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

API keys are entered in the app's settings and stored **locally only**.

## Languages

The interface ships in 15 languages: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Where your data lives

- **Canvas files** (anything you drop onto the canvas) are copied into `~/Documents/CanvasDesk/我的画布`. The app keeps its own copy so it never depends on the original path.
- **Graphs, node positions and edges** are stored in a local SQLite database inside the app's user data directory.
- **API keys** live in local storage on your machine. Nothing is uploaded anywhere by the app itself.

## Security notes

Two nodes deliberately execute things on your behalf, so treat your canvas the way you would treat a script:

- **Command** — runs the command you write through your system shell, with your user privileges.
- **Code** — evaluates the JavaScript function body you write.

Only run canvases you wrote or have read yourself.

## Build from source

Requires Node.js 20+ and macOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## Tech stack

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

The graph engine (`src/main/engine/`) is pure logic with zero Electron dependencies, shared directly between the main process and the renderer.
