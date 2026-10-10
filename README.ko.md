# Finder+

macOS용 노드 기반 비주얼 자동화 캔버스입니다. 노드를 무한 캔버스에 드래그하고 포트를 서로 연결하면 데이터가 그래프를 따라 흐릅니다. 텍스트, 이미지, LLM 호출, HTTP 요청, 셸 명령이 눈에 보이는 재사용 가능한 파이프라인이 됩니다.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · 한국어 · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## 무엇인가

Finder+는 **비주얼 워크플로**를 만들기 위한 데스크톱 앱입니다. 스크립트를 작성하는 대신 노드를 캔버스에 놓고, 한 노드의 출력 포트를 다른 노드의 입력 포트에 연결합니다. 값은 연결선을 따라 전달되고, 상류의 결과가 도착하는 즉시 하류 노드가 밝혀집니다.

대표적인 용도:

- 이미지 일괄 처리: 자르기 → 압축 → 품질 조정 → 배경 제거
- 프롬프트 파이프라인 구성: 텍스트 템플릿 → LLM → JSON 표시
- 텍스트 프롬프트로 이미지를 생성해 폴더에 바로 저장
- 프로그램을 작성하지 않고 HTTP API와 로컬 셸 명령을 연결

## 다운로드

최신 릴리스: **<https://github.com/13601313270/FinderPlus/releases>**

`.dmg`를 열고 **Finder+**를 **Applications** 폴더로 드래그한 다음 디스크 이미지를 추출합니다.

### macOS 첫 실행

> **이 빌드는 아직 서명 및 공증되지 않았습니다.** 처음 실행할 때 macOS가 차단하며, *"개발자를 확인할 수 없기 때문에 Finder+을 열 수 없습니다"* 또는 *"Finder+이 손상되었기 때문에 열 수 없습니다"*와 같은 메시지를 표시합니다.

그래도 열려면 다음 중 하나를 선택합니다:

- 앱 아이콘을 **오른쪽 클릭**(또는 Control 키를 누른 채 클릭) → **열기** → 대화상자에서 **열기**를 다시 클릭합니다.
- 또는 터미널에서 다음을 실행한 뒤 정상적으로 실행합니다:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- macOS 15(Sequoia) 이상에서 오른쪽 클릭 방식이 제공되지 않으면 **시스템 설정 → 개인 정보 보호 및 보안**으로 이동하여 **확인 없이 열기**를 클릭합니다.

**요구 사항:** Apple Silicon(arm64)의 macOS. Intel 빌드는 아직 공개되지 않았습니다.

## 노드

| 노드 | 유형 | 하는 일 |
| --- | --- | --- |
| 텍스트 입력 | `text-input` | 문자열을 출력 |
| 숫자 입력 | `number-input` | 숫자를 출력 |
| 불리언 입력 | `bool-input` | 불리언을 출력 |
| 텍스트 파일 | `txt-file` | `.txt` 파일을 캔버스에 드롭하여 생성 |
| 이미지 파일 | `img-file` | 이미지 파일을 캔버스에 드롭하여 생성 |
| 임의 파일 | `any-file` | 그 밖의 다른 유형의 파일을 드롭하여 생성 |
| 파일 정보 | `file-info` | 파일의 메타데이터를 읽음 |
| 폴더 | `folder` | 들어오는 파일을 자식 노드로 모으는 컨테이너 |
| 이미지 폴더 | `img-folder` | 이미지 묶음을 담는 컨테이너 |
| 텍스트 표시 | `text-display` | 들어오는 텍스트를 미리 봄 |
| JSON 표시 | `json-display` | JSON을 보기 좋게 출력 |
| 이미지 미리보기 | `image-preview` | 이미지를 미리 보고 디스크에 저장 가능 |
| 문자열 연결 | `string-concat` | `$1 … $N` 자리 표시자로 값을 연결 |
| 스위치 | `switch` | 조건 분기 |
| 사람 검토 | `human-review` | 수동 검토를 위해 값을 대기열에 넣고 **승인** 또는 **거부** 시 출력 |
| LLM | `llm` | 설정 가능한 공급자에 대한 채팅 완성 |
| 이미지 생성 | `image-gen` | 설정 가능한 공급자에 대한 텍스트-이미지 생성 |
| 이미지 자르기 | `image-crop` | 이미지를 자름 |
| 이미지 압축 | `image-compress` | 이미지를 압축(WebAssembly) |
| 이미지 품질 | `image-quality` | 인코딩 품질을 조정 |
| 이미지 오버레이 | `image-overlay` | 한 이미지를 다른 이미지 위에 겹침 |
| 배경 제거 | `background-remove` | 배경을 제거(ONNX, 온디바이스) |
| 코드 | `code` | JavaScript 함수 본문을 실행 |
| 명령 | `command` | 셸 명령을 실행 |
| HTTP 요청 | `http-request` | HTTP/HTTPS 요청을 전송 |

## 지원 공급자

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow 등.

**이미지 생성** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

API 키는 앱 설정에서 입력하며 **로컬에만** 저장됩니다.

## 언어

인터페이스는 15개 언어를 제공합니다: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## 데이터가 저장되는 위치

- **캔버스 파일**(캔버스에 드롭한 모든 것)은 `~/Documents/CanvasDesk/我的画布`로 복사됩니다. 앱은 자체 복사본을 유지하므로 원본 경로에 의존하지 않습니다.
- **그래프, 노드 위치 및 간선**은 앱의 user data 디렉터리 안에 있는 로컬 SQLite 데이터베이스에 저장됩니다.
- **API 키**는 사용자 컴퓨터의 로컬 저장소에 있습니다. 앱 자체가 어디로도 업로드하지 않습니다.

## 보안 참고 사항

두 개의 노드는 의도적으로 사용자를 대신해 무언가를 실행하므로, 캔버스를 스크립트처럼 다루세요:

- **명령** — 작성한 명령을 사용자의 사용자 권한으로 시스템 셸을 통해 실행합니다.
- **코드** — 작성한 JavaScript 함수 본문을 평가합니다.

직접 작성했거나 직접 읽어 본 캔버스만 실행하세요.

## 소스에서 빌드

Node.js 20+ 및 macOS가 필요합니다.

```bash
npm install
npm run dev        # 개발 모드로 시작
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # dist/에 .dmg 생성
```

## 기술 스택

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

그래프 엔진(`src/main/engine/`)은 Electron 의존성이 전혀 없는 순수 로직이며, 메인 프로세스와 렌더러 간에 직접 공유됩니다.