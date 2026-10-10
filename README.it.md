# Finder+

Una tela di automazione visuale basata su nodi per macOS. Trascina i nodi su una tela infinita, collega le loro porte tra loro e i dati scorreranno attraverso il grafo, trasformando testo, immagini, chiamate a LLM, richieste HTTP e comandi shell in una pipeline riutilizzabile che puoi vedere.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · Italiano

---

## Che cos'è

Finder+ è un'app desktop per costruire **flussi di lavoro visuali**. Invece di scrivere uno script, disponi i nodi su una tela e colleghi una porta di uscita a una porta di ingresso. I valori si propagano lungo i fili e ogni nodo si illumina con il suo risultato non appena arrivano i suoi input.

Usi tipici:

- Elaborare immagini in batch: ritaglia → comprimi → regola la qualità → rimuovi lo sfondo
- Costruire pipeline di prompt: modello di testo → LLM → visualizzazione JSON
- Generare immagini da un prompt di testo e inserire il risultato in una cartella
- Collegare API HTTP e comandi shell locali senza scrivere un programma

## Download

Ultima versione: **<https://github.com/13601313270/FinderPlus/releases>**

Apri il `.dmg`, trascina **Finder+** nella cartella **Applicazioni** e poi espelli l'immagine disco.

### Primo avvio su macOS

> **Questa build non è ancora firmata né notarizzata.** macOS la bloccherà la prima volta con un messaggio come *"Finder+ non può essere aperto perché lo sviluppatore non può essere verificato"* o *"Finder+ è danneggiato e non può essere aperto"*.

Per aprirla comunque, scegli una delle opzioni:

- **Fai clic con il tasto destro** (o Control-clic) sull'icona dell'app → **Apri** → **Apri** di nuovo nella finestra di dialogo.
- Oppure esegui questo nel Terminale, poi avvia normalmente:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- Su macOS 15 (Sequoia) e successivi, se l'opzione del clic con il tasto destro non è disponibile, vai su **Impostazioni di Sistema → Privacy e sicurezza** e fai clic su **Apri comunque**.

**Requisiti:** macOS su Apple Silicon (arm64). Le build per Intel non sono ancora pubblicate.

## Nodi

| Nodo | Tipo | Cosa fa |
| --- | --- | --- |
| Input di testo | `text-input` | Emette una stringa |
| Input numerico | `number-input` | Emette un numero |
| Input booleano | `bool-input` | Emette un valore booleano |
| File di testo | `txt-file` | Creato trascinando un file `.txt` sulla tela |
| File immagine | `img-file` | Creato trascinando un file immagine sulla tela |
| Qualsiasi file | `any-file` | Creato trascinando un file di qualsiasi altro tipo |
| Informazioni file | `file-info` | Legge i metadati di un file |
| Cartella | `folder` | Contenitore che raccoglie i file in arrivo come nodi figli |
| Cartella immagini | `img-folder` | Contenitore per un lotto di immagini |
| Visualizzazione testo | `text-display` | Mostra in anteprima il testo in arrivo |
| Visualizzazione JSON | `json-display` | Mostra il JSON formattato |
| Anteprima immagine | `image-preview` | Mostra l'anteprima di un'immagine e può salvarla su disco |
| Concatenazione stringhe | `string-concat` | Concatena valori usando i segnaposto `$1 … $N` |
| Biforcazione | `switch` | Diramazione condizionale |
| Revisione umana | `human-review` | Mette in coda i valori per la revisione manuale; emette su **approva** o **rifiuta** |
| LLM | `llm` | Completamento chat con un provider configurabile |
| Generazione immagini | `image-gen` | Da testo a immagine con un provider configurabile |
| Ritaglio immagine | `image-crop` | Ritaglia un'immagine |
| Compressione immagine | `image-compress` | Comprime un'immagine (WebAssembly) |
| Qualità immagine | `image-quality` | Regola la qualità di codifica |
| Sovrapposizione immagini | `image-overlay` | Sovrappone un'immagine a un'altra |
| Rimozione sfondo | `background-remove` | Rimuove lo sfondo (ONNX, sul dispositivo) |
| Codice | `code` | Esegue il corpo di una funzione JavaScript |
| Comando | `command` | Esegue un comando della shell |
| Richiesta HTTP | `http-request` | Invia una richiesta HTTP/HTTPS |

## Provider supportati

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow e altri.

**Generazione immagini** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

Le chiavi API vengono inserite nelle impostazioni dell'app e memorizzate **solo in locale**.

## Lingue

L'interfaccia è disponibile in 15 lingue: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Dove risiedono i tuoi dati

- **I file della tela** (qualunque cosa tu trascini sulla tela) vengono copiati in `~/Documents/CanvasDesk/我的画布`. L'app conserva una propria copia per non dipendere mai dal percorso originale.
- **Grafi, posizioni dei nodi e connessioni** sono archiviati in un database SQLite locale all'interno della directory dei dati utente dell'app.
- **Le chiavi API** risiedono nell'archivio locale della tua macchina. L'app stessa non carica nulla da nessuna parte.

## Note di sicurezza

Due nodi eseguono deliberatamente qualcosa per tuo conto, quindi tratta la tela come tratteresti uno script:

- **Comando** — esegue il comando che scrivi tramite la shell di sistema, con i tuoi privilegi utente.
- **Codice** — valuta il corpo della funzione JavaScript che scrivi.

Esegui solo tele che hai scritto tu o che hai letto personalmente.

## Compila dai sorgenti

Richiede Node.js 20+ e macOS.

```bash
npm install
npm run dev        # start in development mode
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produce a .dmg in dist/
```

## Stack tecnologico

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

Il motore del grafo (`src/main/engine/`) è pura logica senza alcuna dipendenza da Electron, condivisa direttamente tra il processo principale e il renderer.