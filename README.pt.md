# Finder+

Uma tela de automação visual baseada em nós para macOS. Arraste nós para uma tela infinita, conecte suas portas entre si e os dados fluirão pelo grafo — transformando texto, imagens, chamadas a LLM, requisições HTTP e comandos de shell em um pipeline reutilizável que você pode ver.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · Português · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## O que é

Finder+ é um aplicativo de desktop para construir **fluxos de trabalho visuais**. Em vez de escrever um script, você coloca nós em uma tela e conecta uma porta de saída a uma porta de entrada. Os valores se propagam pelos fios, e cada nó se acende com seu resultado assim que suas entradas chegam.

Usos típicos:

- Processar imagens em lote: recortar → comprimir → ajustar qualidade → remover o fundo
- Montar pipelines de prompt: modelo de texto → LLM → exibição JSON
- Gerar imagens a partir de um prompt de texto e colocar o resultado em uma pasta
- Colar APIs HTTP e comandos de shell locais sem escrever um programa

## Download

Versão mais recente: **<https://github.com/13601313270/FinderPlus/releases>**

Abra o `.dmg`, arraste o **Finder+** para a pasta **Aplicativos** e depois ejete a imagem de disco.

### Primeira execução no macOS

> **Esta compilação ainda não está assinada nem notarizada.** O macOS vai bloqueá-la na primeira vez com uma mensagem como *"Finder+ não pode ser aberto porque o desenvolvedor não pode ser verificado"* ou *"Finder+ está danificado e não pode ser aberto"*.

Para abri-lo mesmo assim, escolha uma opção:

- **Clique com o botão direito** (ou Control-clique) no ícone do app → **Abrir** → **Abrir** de novo na caixa de diálogo.
- Ou execute isto no Terminal e depois inicie normalmente:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- No macOS 15 (Sequoia) e posteriores, se a opção do clique com o botão direito não for oferecida, vá em **Ajustes do Sistema → Privacidade e Segurança** e clique em **Abrir Mesmo Assim**.

**Requisitos:** macOS em Apple Silicon (arm64). Compilações para Intel ainda não são publicadas.

## Nós

| Nó | Tipo | O que faz |
| --- | --- | --- |
| Entrada de texto | `text-input` | Emite uma string |
| Entrada de número | `number-input` | Emite um número |
| Entrada booleana | `bool-input` | Emite um booleano |
| Arquivo de texto | `txt-file` | Criado ao arrastar um arquivo `.txt` para a tela |
| Arquivo de imagem | `img-file` | Criado ao arrastar um arquivo de imagem para a tela |
| Qualquer arquivo | `any-file` | Criado ao arrastar um arquivo de qualquer outro tipo |
| Informações do arquivo | `file-info` | Lê os metadados de um arquivo |
| Pasta | `folder` | Contêiner que recolhe os arquivos recebidos como nós filhos |
| Pasta de imagens | `img-folder` | Contêiner para um lote de imagens |
| Exibição de texto | `text-display` | Pré-visualiza o texto recebido |
| Exibição de JSON | `json-display` | Exibe o JSON formatado |
| Pré-visualização de imagem | `image-preview` | Pré-visualiza uma imagem e pode salvá-la em disco |
| Concatenação de strings | `string-concat` | Concatena valores usando os marcadores `$1 … $N` |
| Bifurcação | `switch` | Ramificação condicional |
| Revisão humana | `human-review` | Enfileira valores para revisão manual; emite ao **aprovar** ou **rejeitar** |
| LLM | `llm` | Conclusão de chat com um provedor configurável |
| Geração de imagens | `image-gen` | Texto para imagem com um provedor configurável |
| Recorte de imagem | `image-crop` | Recorta uma imagem |
| Compressão de imagem | `image-compress` | Comprime uma imagem (WebAssembly) |
| Qualidade de imagem | `image-quality` | Ajusta a qualidade de codificação |
| Sobreposição de imagem | `image-overlay` | Sobrepõe uma imagem sobre outra |
| Remoção de fundo | `background-remove` | Remove o fundo (ONNX, no dispositivo) |
| Código | `code` | Executa um corpo de função JavaScript |
| Comando | `command` | Executa um comando de shell |
| Requisição HTTP | `http-request` | Envia uma requisição HTTP/HTTPS |

## Provedores compatíveis

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow e outros.

**Geração de imagens** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

As chaves de API são inseridas nas configurações do app e armazenadas **apenas localmente**.

## Idiomas

A interface está disponível em 15 idiomas: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Onde seus dados ficam

- **Arquivos da tela** (qualquer coisa que você arraste para a tela) são copiados para `~/Documents/CanvasDesk/我的画布`. O app mantém sua própria cópia para nunca depender do caminho original.
- **Grafos, posições dos nós e conexões** são armazenados em um banco de dados SQLite local dentro do diretório de dados do usuário do app.
- **As chaves de API** ficam no armazenamento local da sua máquina. O app em si não envia nada para lugar nenhum.

## Notas de segurança

Dois nós executam coisas deliberadamente em seu nome, então trate sua tela como trataria um script:

- **Comando** — executa o comando que você escreve através do shell do seu sistema, com seus privilégios de usuário.
- **Código** — avalia o corpo de função JavaScript que você escreve.

Execute apenas telas que você mesmo escreveu ou leu por conta própria.

## Compilar a partir do código-fonte

Requer Node.js 20+ e macOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## Stack de tecnologia

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

O motor de grafos (`src/main/engine/`) é lógica pura, sem nenhuma dependência de Electron, compartilhada diretamente entre o processo principal e o renderer.