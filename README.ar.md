# Finder+

لوحة أتمتة مرئية قائمة على العقد لنظام macOS. اسحب العقد إلى لوحة لا نهائية، وصِل منافذها ببعضها، فتتدفق البيانات عبر المخطط — محوّلًا النصوص والصور واستدعاءات نماذج اللغة وطلبات HTTP وأوامر الطرفية إلى خط أنابيب مرئي قابل لإعادة الاستخدام.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · العربية · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## ما هو

Finder+ تطبيق سطح مكتب لبناء **مسارات عمل مرئية**. فبدلًا من كتابة سكربت، تضع العقد على اللوحة وتربط منفذ إخراج بمنفذ إدخال. تنتقل القيم عبر الوصلات، وتضيء كل عقدة بنتيجتها بمجرد وصول مدخلاتها.

الاستخدامات المعتادة:

- معالجة الصور على دفعات: قص → ضغط → ضبط الجودة → إزالة الخلفية
- بناء خطوط أنابيب التوجيه: قالب نصي → نموذج لغوي → عرض JSON
- توليد صورة من وصف نصي وإسقاط النتيجة في مجلد
- ربط واجهات HTTP وأوامر shell المحلية دون كتابة برنامج

## التنزيل

أحدث إصدار: **<https://github.com/13601313270/FinderPlus/releases>**

رابط مباشر للإصدار v0.1.0 (Apple Silicon):

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

افتح ملف `.dmg`، واسحب **Finder+** إلى مجلد **Applications**، ثم أخرج صورة القرص.

### أول تشغيل على macOS

> **لم تُوقَّع هذه النسخة أو تُوثَّق بعد.** سيحجبها macOS في المرة الأولى برسالة مثل *"تعذّر فتح Finder+ لأن المطوّر غير موثّق"* أو *"Finder+ تالف ولا يمكن فتحه"*.

لفتحه على أي حال، اختر أحد الخيارات:

- **انقر بزر الفأرة الأيمن** (أو Control + نقر) على أيقونة التطبيق → **فتح** → ثم **فتح** مرة أخرى في مربع الحوار.
- أو نفّذ ما يلي في الطرفية، ثم شغّل التطبيق عادةً:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- على macOS 15 (Sequoia) وأحدث، إذا لم يتوفر خيار النقر بزر الفأرة الأيمن، فانتقل إلى **إعدادات النظام → الخصوصية والأمان** وانقر على **فتح على أي حال**.

**المتطلبات:** نظام macOS على Apple Silicon (arm64). لم تُنشر نسخ Intel بعد.

## العقد

| العقدة | النوع | الوظيفة |
| --- | --- | --- |
| Text Input | `text-input` | يُخرج سلسلة نصية |
| Number Input | `number-input` | يُخرج رقمًا |
| Boolean Input | `bool-input` | يُخرج قيمة منطقية |
| Text File | `txt-file` | يُنشَأ بإسقاط ملف `.txt` على اللوحة |
| Image File | `img-file` | يُنشَأ بإسقاط ملف صورة على اللوحة |
| Any File | `any-file` | يُنشَأ بإسقاط ملف من أي نوع آخر |
| File Info | `file-info` | يقرأ البيانات الوصفية من ملف |
| Folder | `folder` | حاوية تجمع الملفات الواردة كعقد فرعية |
| Image Folder | `img-folder` | حاوية لمجموعة من الصور |
| Text Display | `text-display` | يعاين النص الوارد |
| JSON Display | `json-display` | يعرض JSON بتنسيق مرتّب |
| Image Preview | `image-preview` | يعاين الصورة ويمكنه حفظها على القرص |
| String Concat | `string-concat` | يدمج القيم باستخدام عناصر نائبة `$1 … $N` |
| Switch | `switch` | تفرّع شرطي |
| Human Review | `human-review` | يضع القيم في قائمة انتظار للمراجعة اليدوية؛ ويُخرج عند **الموافقة** أو **الرفض** |
| LLM | `llm` | إكمال محادثة عبر مزوّد قابل للتهيئة |
| Image Generation | `image-gen` | توليد صورة من نص عبر مزوّد قابل للتهيئة |
| Image Crop | `image-crop` | يقصّ صورة |
| Image Compress | `image-compress` | يضغط صورة (WebAssembly) |
| Image Quality | `image-quality` | يضبط جودة الترميز |
| Image Overlay | `image-overlay` | يضع صورة فوق صورة أخرى |
| Background Remove | `background-remove` | يزيل الخلفية (ONNX، على الجهاز) |
| Code | `code` | ينفّذ جسم دالة JavaScript |
| Command | `command` | ينفّذ أمر shell |
| HTTP Request | `http-request` | يرسل طلب HTTP/HTTPS |

## المزوّدون المدعومون

**نماذج اللغة (LLM)** — DeepSeek، OpenAI، Kimi (Moonshot)، Qwen (DashScope)، Zhipu GLM، MiniMax، Groq، Mistral AI، SiliconFlow، وغيرها.

**توليد الصور** — SiliconFlow، OpenAI (DALL·E / GPT-Image)، Zhipu (CogView)، Alibaba Cloud Bailian (Qwen-Image / Wan).

تُدخَل مفاتيح API في إعدادات التطبيق وتُخزَّن **محليًا فقط**.

## اللغات

تأتي الواجهة بـ 15 لغة: English، 简体中文، 日本語، 한국어، Español، العربية، Français، Português، Русский، हिन्दी، Bahasa Indonesia، Deutsch، Tiếng Việt، Türkçe، Italiano.

## أين تُحفَظ بياناتك

- **ملفات اللوحة** (أي شيء تُسقطه على اللوحة) تُنسخ إلى `~/Documents/CanvasDesk/我的画布`. يحتفظ التطبيق بنسخته الخاصة فلا يعتمد أبدًا على المسار الأصلي.
- **المخططات ومواضع العقد والوصلات** تُخزَّن في قاعدة بيانات SQLite محلية داخل مجلد بيانات المستخدم الخاص بالتطبيق.
- **مفاتيح API** تُحفَظ في التخزين المحلي على جهازك. ولا يرفع التطبيق نفسه أي شيء إلى أي مكان.

## ملاحظات أمنية

ثمّة عقدتان تنفّذان أشياء نيابةً عنك عن قصد، لذا تعامل مع لوحتك كما تتعامل مع سكربت:

- **Command** — ينفّذ الأمر الذي تكتبه عبر shell النظام بصلاحيات مستخدمك.
- **Code** — ينفّذ جسم دالة JavaScript الذي تكتبه.

لا تشغّل إلا اللوحات التي كتبتها بنفسك أو قرأتها بالكامل.

## البناء من المصدر

يتطلب Node.js 20+ وmacOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## حزمة التقنيات

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite عبر WebAssembly) · onnxruntime-web · img-compressor-wasm

محرّك المخططات (`src/main/engine/`) منطق خالص بلا أي اعتماد على Electron، ويُشارَك مباشرةً بين العملية الرئيسية وعملية العرض.