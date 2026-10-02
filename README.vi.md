# Finder+

Canvas tự động hóa trực quan dựa trên node cho macOS. Kéo node lên canvas vô hạn, nối các cổng của chúng lại với nhau, và dữ liệu chảy qua đồ thị — biến văn bản, hình ảnh, lệnh gọi LLM, yêu cầu HTTP và lệnh shell thành một pipeline có thể tái sử dụng mà bạn nhìn thấy được.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · Tiếng Việt · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## Đây là gì

Finder+ là một ứng dụng desktop để xây dựng **quy trình trực quan**. Thay vì viết script, bạn đặt các node lên canvas và nối cổng đầu ra với cổng đầu vào. Giá trị lan truyền dọc theo các đường nối, và mỗi node sáng lên với kết quả ngay khi đầu vào của nó đến.

Các cách dùng phổ biến:

- Xử lý ảnh hàng loạt: cắt → nén → chỉnh chất lượng → xóa nền
- Xây dựng pipeline prompt: mẫu văn bản → LLM → hiển thị JSON
- Tạo ảnh từ một prompt văn bản rồi thả kết quả vào một thư mục
- Ghép nối các API HTTP và lệnh shell cục bộ mà không cần viết chương trình

## Tải xuống

Bản phát hành mới nhất: **<https://github.com/13601313270/FinderPlus/releases>**

Liên kết trực tiếp cho v0.1.0 (Apple Silicon):

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

Mở tệp `.dmg`, kéo **Finder+** vào thư mục **Applications**, rồi đẩy (eject) ảnh đĩa ra.

### Lần khởi chạy đầu tiên trên macOS

> **Bản dựng này chưa được ký hoặc công chứng.** macOS sẽ chặn nó trong lần đầu tiên với thông báo như *"Finder+ không thể mở vì không xác minh được nhà phát triển"* hoặc *"Finder+ đã hỏng và không thể mở"*.

Để mở nó bằng cách khác, hãy chọn một trong các cách sau:

- **Nhấp chuột phải** (hoặc Control-nhấp) vào biểu tượng ứng dụng → **Mở** → **Mở** lần nữa trong hộp thoại.
- Hoặc chạy lệnh này trong Terminal, rồi khởi chạy bình thường:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- Trên macOS 15 (Sequoia) và mới hơn, nếu không có tùy chọn nhấp chuột phải, vào **Cài đặt Hệ thống → Quyền riêng tư & Bảo mật** và nhấp **Vẫn mở**.

**Yêu cầu:** macOS trên Apple Silicon (arm64). Bản dựng cho Intel chưa được phát hành.

## Node

| Node | Loại | Chức năng |
| --- | --- | --- |
| Nhập Văn bản | `text-input` | Phát ra một chuỗi |
| Nhập Số | `number-input` | Phát ra một số |
| Nhập Boolean | `bool-input` | Phát ra một giá trị boolean |
| Tệp Văn bản | `txt-file` | Được tạo khi kéo tệp `.txt` lên canvas |
| Tệp Hình ảnh | `img-file` | Được tạo khi kéo tệp hình ảnh lên canvas |
| Tệp Bất kỳ | `any-file` | Được tạo khi kéo tệp thuộc loại khác lên canvas |
| Thông tin Tệp | `file-info` | Đọc siêu dữ liệu từ một tệp |
| Thư mục | `folder` | Vùng chứa gom các tệp đến thành các node con |
| Thư mục Ảnh | `img-folder` | Vùng chứa cho một loạt ảnh |
| Hiển thị Văn bản | `text-display` | Xem trước văn bản đến |
| Hiển thị JSON | `json-display` | In JSON ra một cách gọn gàng |
| Xem trước Ảnh | `image-preview` | Xem trước ảnh và có thể lưu vào đĩa |
| Ghép Chuỗi | `string-concat` | Ghép các giá trị bằng placeholder `$1 … $N` |
| Rẽ nhánh | `switch` | Rẽ nhánh có điều kiện |
| Duyệt Thủ công | `human-review` | Xếp hàng các giá trị để duyệt thủ công; xuất ra khi **chấp thuận** hoặc **từ chối** |
| LLM | `llm` | Hoàn thành hội thoại với nhà cung cấp có thể cấu hình |
| Tạo Ảnh | `image-gen` | Văn bản thành hình ảnh với nhà cung cấp có thể cấu hình |
| Cắt Ảnh | `image-crop` | Cắt ảnh |
| Nén Ảnh | `image-compress` | Nén ảnh (WebAssembly) |
| Chất lượng Ảnh | `image-quality` | Điều chỉnh chất lượng mã hóa |
| Phủ Ảnh | `image-overlay` | Phủ một ảnh lên một ảnh khác |
| Xóa Nền | `background-remove` | Xóa nền (ONNX, chạy trên thiết bị) |
| Mã | `code` | Chạy một thân hàm JavaScript |
| Lệnh | `command` | Chạy một lệnh shell |
| Yêu cầu HTTP | `http-request` | Gửi một yêu cầu HTTP/HTTPS |

## Nhà cung cấp được hỗ trợ

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow, và các nhà cung cấp khác.

**Tạo hình ảnh** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

Khóa API được nhập trong phần cài đặt của ứng dụng và **chỉ được lưu cục bộ**.

## Ngôn ngữ

Giao diện có sẵn trong 15 ngôn ngữ: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Dữ liệu của bạn được lưu ở đâu

- **Tệp canvas** (bất cứ thứ gì bạn kéo lên canvas) được sao chép vào `~/Documents/CanvasDesk/我的画布`. Ứng dụng giữ bản sao riêng nên không bao giờ phụ thuộc vào đường dẫn gốc.
- **Đồ thị, vị trí node và các kết nối** được lưu trong cơ sở dữ liệu SQLite cục bộ bên trong thư mục user data của ứng dụng.
- **Khóa API** nằm trong bộ nhớ cục bộ trên máy của bạn. Bản thân ứng dụng không tải bất cứ thứ gì lên bất cứ đâu.

## Lưu ý bảo mật

Hai node cố ý thực thi mọi thứ thay bạn, nên hãy đối xử với canvas của bạn như cách bạn đối xử với một script:

- **Lệnh** — chạy lệnh bạn viết thông qua shell hệ thống của bạn, với quyền người dùng của bạn.
- **Mã** — đánh giá thân hàm JavaScript bạn viết.

Chỉ chạy những canvas do bạn viết hoặc đã tự đọc qua.

## Xây dựng từ mã nguồn

Yêu cầu Node.js 20+ và macOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## Ngăn xếp công nghệ

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

Engine đồ thị (`src/main/engine/`) là logic thuần túy không có phụ thuộc Electron, được chia sẻ trực tiếp giữa tiến trình chính và renderer.