# Finder+

Eine knotenbasierte visuelle Automatisierungsfläche für macOS. Ziehe Knoten auf eine unendliche Arbeitsfläche, verbinde ihre Ports miteinander, und Daten fließen durch den Graphen — und verwandeln Text, Bilder, LLM-Aufrufe, HTTP-Anfragen und Shell-Befehle in eine wiederverwendbare Pipeline, die du sehen kannst.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Français](README.fr.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · Deutsch · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## Was es ist

Finder+ ist eine Desktop-App zum Erstellen **visueller Workflows**. Statt ein Skript zu schreiben, platzierst du Knoten auf einer Arbeitsfläche und verbindest einen Ausgangs-Port mit einem Eingangs-Port. Werte breiten sich entlang der Verbindungen aus, und jeder Knoten leuchtet mit seinem Ergebnis auf, sobald seine Eingaben eintreffen.

Typische Anwendungen:

- Bilder stapelweise verarbeiten: zuschneiden → komprimieren → Qualität anpassen → Hintergrund entfernen
- Prompt-Pipelines bauen: Textvorlage → LLM → JSON-Anzeige
- Bilder aus einem Text-Prompt generieren und das Ergebnis in einen Ordner legen
- HTTP-APIs und lokale Shell-Befehle kombinieren, ohne ein Programm zu schreiben

## Download

Neueste Version: **<https://github.com/13601313270/FinderPlus/releases>**

Öffne die `.dmg`, ziehe **Finder+** in den Ordner **Applications** und wirf anschließend das Disk-Image aus.

### Erster Start unter macOS

> **Dieser Build ist noch nicht signiert oder notarisiert.** macOS blockiert ihn beim ersten Mal mit einer Meldung wie *„Finder+ kann nicht geöffnet werden, da der Entwickler nicht verifiziert werden kann"* oder *„Finder+ ist beschädigt und kann nicht geöffnet werden"*.

Um ihn trotzdem zu öffnen, wähle eine der folgenden Möglichkeiten:

- **Rechtsklick** (oder Strg-Klick) auf das App-Symbol → **Öffnen** → im Dialog erneut **Öffnen**.
- Oder führe dies im Terminal aus und starte die App dann normal:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- Unter macOS 15 (Sequoia) und neuer: Wenn die Rechtsklick-Variante nicht angeboten wird, gehe zu **Systemeinstellungen → Datenschutz & Sicherheit** und klicke auf **Dennoch öffnen**.

**Voraussetzungen:** macOS auf Apple Silicon (arm64). Intel-Builds sind noch nicht veröffentlicht.

## Knoten

| Knoten | Typ | Was er macht |
| --- | --- | --- |
| Texteingabe | `text-input` | Gibt eine Zeichenkette aus |
| Zahleneingabe | `number-input` | Gibt eine Zahl aus |
| Boolesche Eingabe | `bool-input` | Gibt einen booleschen Wert aus |
| Textdatei | `txt-file` | Wird erstellt, indem eine `.txt`-Datei auf die Arbeitsfläche gezogen wird |
| Bilddatei | `img-file` | Wird erstellt, indem eine Bilddatei auf die Arbeitsfläche gezogen wird |
| Beliebige Datei | `any-file` | Wird erstellt, indem eine Datei eines anderen Typs abgelegt wird |
| Dateiinfo | `file-info` | Liest Metadaten aus einer Datei |
| Ordner | `folder` | Container, der eintreffende Dateien als untergeordnete Knoten sammelt |
| Bildordner | `img-folder` | Container für einen Stapel Bilder |
| Textanzeige | `text-display` | Zeigt eintreffenden Text als Vorschau an |
| JSON-Anzeige | `json-display` | Gibt JSON lesbar formatiert aus |
| Bildvorschau | `image-preview` | Zeigt ein Bild als Vorschau an und kann es auf der Festplatte speichern |
| Zeichenkettenverkettung | `string-concat` | Verkettet Werte mithilfe der Platzhalter `$1 … $N` |
| Weiche | `switch` | Bedingte Verzweigung |
| Manuelle Prüfung | `human-review` | Reiht Werte zur manuellen Prüfung ein; Ausgabe bei **Genehmigen** oder **Ablehnen** |
| LLM | `llm` | Chat-Vervollständigung über einen konfigurierbaren Anbieter |
| Bilderzeugung | `image-gen` | Text-zu-Bild über einen konfigurierbaren Anbieter |
| Bildzuschnitt | `image-crop` | Schneidet ein Bild zu |
| Bildkompression | `image-compress` | Komprimiert ein Bild (WebAssembly) |
| Bildqualität | `image-quality` | Passt die Kodierungsqualität an |
| Bildüberlagerung | `image-overlay` | Legt ein Bild über ein anderes |
| Hintergrundentfernung | `background-remove` | Entfernt den Hintergrund (ONNX, lokal auf dem Gerät) |
| Code | `code` | Führt einen JavaScript-Funktionskörper aus |
| Befehl | `command` | Führt einen Shell-Befehl aus |
| HTTP-Anfrage | `http-request` | Sendet eine HTTP/HTTPS-Anfrage |

## Unterstützte Anbieter

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow und andere.

**Bilderzeugung** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

API-Schlüssel werden in den Einstellungen der App eingegeben und **nur lokal** gespeichert.

## Sprachen

Die Oberfläche ist in 15 Sprachen verfügbar: English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Wo deine Daten liegen

- **Arbeitsflächen-Dateien** (alles, was du auf die Arbeitsfläche ziehst) werden nach `~/Documents/CanvasDesk/我的画布` kopiert. Die App behält ihre eigene Kopie, damit sie nie vom ursprünglichen Pfad abhängt.
- **Graphen, Knotenpositionen und Verbindungen** werden in einer lokalen SQLite-Datenbank im Benutzerdatenverzeichnis der App gespeichert.
- **API-Schlüssel** liegen im lokalen Speicher deines Rechners. Die App selbst lädt nichts irgendwohin hoch.

## Sicherheitshinweise

Zwei Knoten führen bewusst Dinge in deinem Namen aus; behandle deine Arbeitsfläche daher so, wie du ein Skript behandeln würdest:

- **Befehl** — führt den von dir geschriebenen Befehl über die System-Shell mit deinen Benutzerrechten aus.
- **Code** — wertet den von dir geschriebenen JavaScript-Funktionskörper aus.

Führe nur Arbeitsflächen aus, die du selbst geschrieben oder selbst gelesen hast.

## Aus dem Quellcode erstellen

Erfordert Node.js 20+ und macOS.

```bash
npm install
npm run dev        # im Entwicklungsmodus starten
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # erzeugt eine .dmg in dist/
```

## Technologie-Stack

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite über WebAssembly) · onnxruntime-web · img-compressor-wasm

Die Graph-Engine (`src/main/engine/`) ist reine Logik ohne jegliche Electron-Abhängigkeiten und wird direkt zwischen Hauptprozess und Renderer geteilt.