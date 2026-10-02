# Finder+

macOS 向けのノードベースのビジュアル自動化キャンバスです。ノードを無限キャンバスにドラッグし、ポート同士を配線すると、データがグラフを流れていきます。テキスト、画像、LLM 呼び出し、HTTP リクエスト、シェルコマンドが、目に見える再利用可能なパイプラインになります。

[English](README.md) · [简体中文](README.zh-CN.md) · 日本語 · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## これは何か

Finder+ は**ビジュアルワークフロー**を組み立てるためのデスクトップアプリです。スクリプトを書く代わりに、ノードをキャンバスに置き、あるノードの出力ポートを別のノードの入力ポートに接続します。値は配線に沿って伝わり、上流の結果が届きしだい、下流のノードがすぐに点灯します。

よくある用途:

- 画像の一括処理: 切り抜き → 圧縮 → 品質調整 → 背景除去
- プロンプトパイプラインの構築: テキストテンプレート → LLM → JSON 表示
- テキストプロンプトから画像を生成し、そのままフォルダへ保存
- HTTP API とローカルのシェルコマンドを、プログラムを書かずにつなぐ

## ダウンロード

最新リリース: **<https://github.com/13601313270/FinderPlus/releases>**

v0.1.0 の直リンク（Apple Silicon）:

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

`.dmg` を開き、**Finder+** を **Applications** フォルダにドラッグしてから、ディスクイメージを排出します。

### macOS での初回起動

> **このビルドはまだ署名も公証もされていません。** 初回起動時に macOS がブロックし、*「開発元を確認できないため、Finder+ を開けません」* または *「Finder+ は壊れているため開けません」* といったメッセージが表示されます。

それでも開くには、次のいずれかを行います:

- アプリのアイコンを**右クリック**（または Control キーを押しながらクリック）→ **開く** → ダイアログでもう一度 **開く**。
- またはターミナルで次を実行してから、通常どおり起動します:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- macOS 15（Sequoia）以降で、右クリックの方法が表示されない場合は、**システム設定 → プライバシーとセキュリティ** に進み、**このまま開く** をクリックします。

**動作要件:** Apple Silicon（arm64）の macOS。Intel ビルドはまだ公開されていません。

## ノード

| ノード | タイプ | できること |
| --- | --- | --- |
| テキスト入力 | `text-input` | 文字列を出力する |
| 数値入力 | `number-input` | 数値を出力する |
| 真偽値入力 | `bool-input` | 真偽値を出力する |
| テキストファイル | `txt-file` | `.txt` ファイルをキャンバスにドロップして作成 |
| 画像ファイル | `img-file` | 画像ファイルをキャンバスにドロップして作成 |
| 任意ファイル | `any-file` | その他の種類のファイルをキャンバスにドロップして作成 |
| ファイル情報 | `file-info` | ファイルのメタデータを読み取る |
| フォルダ | `folder` | 受け取ったファイルを子ノードとして収集するコンテナ |
| 画像フォルダ | `img-folder` | 画像のバッチを保持するコンテナ |
| テキスト表示 | `text-display` | 受け取ったテキストをプレビューする |
| JSON 表示 | `json-display` | JSON を整形して表示する |
| 画像プレビュー | `image-preview` | 画像をプレビューし、ディスクに保存できる |
| 文字列連結 | `string-concat` | `$1 … $N` プレースホルダーで値を連結する |
| スイッチ | `switch` | 条件分岐 |
| 人手レビュー | `human-review` | 手動レビューのために値をキューに並べ、**承認**または**却下**で出力する |
| LLM | `llm` | 設定可能なプロバイダーに対するチャット補完 |
| 画像生成 | `image-gen` | 設定可能なプロバイダーに対するテキストからの画像生成 |
| 画像切り抜き | `image-crop` | 画像を切り抜く |
| 画像圧縮 | `image-compress` | 画像を圧縮する（WebAssembly） |
| 画像品質 | `image-quality` | エンコード品質を調整する |
| 画像オーバーレイ | `image-overlay` | ある画像を別の画像に重ねる |
| 背景除去 | `background-remove` | 背景を除去する（ONNX、オンデバイス） |
| コード | `code` | JavaScript の関数本体を実行する |
| コマンド | `command` | シェルコマンドを実行する |
| HTTP リクエスト | `http-request` | HTTP/HTTPS リクエストを送信する |

## 対応プロバイダー

**LLM** — DeepSeek、OpenAI、Kimi (Moonshot)、Qwen (DashScope)、Zhipu GLM、MiniMax、Groq、Mistral AI、SiliconFlow など。

**画像生成** — SiliconFlow、OpenAI (DALL·E / GPT-Image)、Zhipu (CogView)、Alibaba Cloud Bailian (Qwen-Image / Wan)。

API キーはアプリの設定で入力し、**ローカルにのみ**保存されます。

## 言語

インターフェースは 15 言語で提供されます: English、简体中文、日本語、한국어、Español、العربية、Français、Português、Русский、हिन्दी、Bahasa Indonesia、Deutsch、Tiếng Việt、Türkçe、Italiano。

## データの保存場所

- **キャンバスファイル**（キャンバスにドロップしたもの）は `~/Documents/CanvasDesk/我的画布` にコピーされます。アプリは独自のコピーを保持するため、元のパスに依存しません。
- **グラフ、ノードの位置、エッジ**は、アプリのユーザーデータディレクトリ内のローカル SQLite データベースに保存されます。
- **API キー**はお使いのマシンのローカルストレージに保存されます。アプリ自体がどこかへアップロードすることはありません。

## セキュリティに関する注意

2 つのノードは意図的にあなたに代わって何かを実行するため、キャンバスはスクリプトと同じように扱ってください:

- **コマンド** — あなたが書いたコマンドを、あなたのユーザー権限でシステムシェル経由で実行します。
- **コード** — あなたが書いた JavaScript の関数本体を評価します。

自分で書いたか、自分で読んだキャンバスだけを実行してください。

## ソースからのビルド

Node.js 20+ と macOS が必要です。

```bash
npm install
npm run dev        # 開発モードで起動
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # dist/ に .dmg を生成
```

## 技術スタック

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

グラフエンジン（`src/main/engine/`）は Electron 依存ゼロの純粋なロジックで、メインプロセスとレンダラープロセスの間で直接共有されます。