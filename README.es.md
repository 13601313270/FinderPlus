# Finder+

Un lienzo de automatización visual basado en nodos para macOS. Arrastra nodos a un lienzo infinito, conecta sus puertos entre sí y los datos fluirán por el grafo, convirtiendo texto, imágenes, llamadas a LLM, peticiones HTTP y comandos de shell en un pipeline reutilizable que puedes ver.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · Español · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## Qué es

Finder+ es una aplicación de escritorio para crear **flujos de trabajo visuales**. En lugar de escribir un script, colocas nodos en un lienzo y conectas un puerto de salida con un puerto de entrada. Los valores se propagan por los cables, y cada nodo se ilumina con su resultado en cuanto llegan sus entradas.

Usos típicos:

- Procesar imágenes por lotes: recortar → comprimir → ajustar calidad → quitar el fondo
- Crear pipelines de prompts: plantilla de texto → LLM → visualización JSON
- Generar imágenes a partir de un prompt de texto y guardar el resultado en una carpeta
- Conectar API HTTP y comandos de shell locales sin escribir un programa

## Descarga

Última versión: **<https://github.com/13601313270/FinderPlus/releases>**

Abre el `.dmg`, arrastra **Finder+** a la carpeta **Aplicaciones** y luego expulsa la imagen de disco.

### Primer inicio en macOS

> **Esta compilación aún no está firmada ni notarizada.** macOS la bloqueará la primera vez con un mensaje como *"Finder+ no se puede abrir porque no se puede verificar el desarrollador"* o *"Finder+ está dañado y no se puede abrir"*.

Para abrirla de todos modos, elige una opción:

- **Haz clic derecho** (o Control-clic) en el icono de la app → **Abrir** → **Abrir** de nuevo en el diálogo.
- O ejecuta esto en la Terminal y luego ábrela con normalidad:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- En macOS 15 (Sequoia) y posteriores, si no se ofrece la opción del clic derecho, ve a **Ajustes del Sistema → Privacidad y seguridad** y haz clic en **Abrir igualmente**.

**Requisitos:** macOS en Apple Silicon (arm64). Las compilaciones para Intel aún no se publican.

## Nodos

| Nodo | Tipo | Qué hace |
| --- | --- | --- |
| Entrada de texto | `text-input` | Emite una cadena |
| Entrada de número | `number-input` | Emite un número |
| Entrada booleana | `bool-input` | Emite un valor booleano |
| Archivo de texto | `txt-file` | Se crea al arrastrar un archivo `.txt` al lienzo |
| Archivo de imagen | `img-file` | Se crea al arrastrar un archivo de imagen al lienzo |
| Cualquier archivo | `any-file` | Se crea al arrastrar un archivo de cualquier otro tipo |
| Información de archivo | `file-info` | Lee los metadatos de un archivo |
| Carpeta | `folder` | Contenedor que recoge los archivos entrantes como nodos hijos |
| Carpeta de imágenes | `img-folder` | Contenedor para un lote de imágenes |
| Visualización de texto | `text-display` | Previsualiza el texto entrante |
| Visualización de JSON | `json-display` | Muestra el JSON con formato legible |
| Vista previa de imagen | `image-preview` | Previsualiza una imagen y permite guardarla en disco |
| Concatenación de cadenas | `string-concat` | Concatena valores usando los marcadores `$1 … $N` |
| Bifurcación | `switch` | Bifurcación condicional |
| Revisión humana | `human-review` | Pone en cola valores para revisión manual; emite al **aprobar** o **rechazar** |
| LLM | `llm` | Completado de chat contra un proveedor configurable |
| Generación de imágenes | `image-gen` | Texto a imagen contra un proveedor configurable |
| Recorte de imagen | `image-crop` | Recorta una imagen |
| Compresión de imagen | `image-compress` | Comprime una imagen (WebAssembly) |
| Calidad de imagen | `image-quality` | Ajusta la calidad de codificación |
| Superposición de imágenes | `image-overlay` | Superpone una imagen sobre otra |
| Eliminación de fondo | `background-remove` | Elimina el fondo (ONNX, en el dispositivo) |
| Código | `code` | Ejecuta un cuerpo de función JavaScript |
| Comando | `command` | Ejecuta un comando de shell |
| Petición HTTP | `http-request` | Envía una petición HTTP/HTTPS |

## Proveedores compatibles

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow y otros.

**Generación de imágenes** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

Las claves de API se introducen en los ajustes de la app y se almacenan **solo en local**.

## Idiomas

La interfaz está disponible en 15 idiomas: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Dónde se guardan tus datos

- **Archivos del lienzo** (cualquier cosa que arrastres al lienzo) se copia a `~/Documents/CanvasDesk/我的画布`. La app guarda su propia copia para no depender nunca de la ruta original.
- **Grafos, posiciones de nodos y conexiones** se guardan en una base de datos SQLite local dentro del directorio de datos de usuario de la app.
- **Las claves de API** residen en el almacenamiento local de tu máquina. La app no sube nada a ningún sitio por sí misma.

## Notas de seguridad

Dos nodos ejecutan cosas deliberadamente en tu nombre, así que trata tu lienzo como tratarías un script:

- **Comando** — ejecuta el comando que escribes a través del shell de tu sistema, con tus privilegios de usuario.
- **Código** — evalúa el cuerpo de función JavaScript que escribes.

Ejecuta solo lienzos que hayas escrito tú o que hayas leído personalmente.

## Compilar desde el código fuente

Requiere Node.js 20+ y macOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## Stack tecnológico

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite vía WebAssembly) · onnxruntime-web · img-compressor-wasm

El motor de grafos (`src/main/engine/`) es lógica pura sin ninguna dependencia de Electron, compartida directamente entre el proceso principal y el renderer.