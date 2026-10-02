import type { Language } from '../types'

/** German messages */
const de: Language = {
  app: {
    settings: 'Einstellungen',
    help: 'Hilfe',
    fileMenu: 'Datei'
  },
  settingsDialog: {
    title: 'Einstellungen',
    close: 'Schließen (Esc)',
    language: 'Sprache',
    languageHint: 'Wähle die Oberflächensprache. Änderungen werden automatisch gespeichert.'
  },
  helpCenter: {
    title: 'Hilfe-Center',
    close: 'Schließen (Esc)',
    loading: 'Wird geladen…',
    empty: 'Keine Hilfedokumente verfügbar',
    pickNode: 'Wähle links einen Knoten aus',
    groupNodes: 'Knotentypen',
    about: 'Über Finder+'
  },
  helpDialog: {
    title: 'Anleitung',
    close: 'Schließen (Esc)'
  },
  minimap: {
    dragToMove: 'Ziehen, um die Minikarte zu verschieben',
    expand: 'Minikarte erweitern',
    collapse: 'Minikarte einklappen',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    reset: 'Zurücksetzen'
  },
  palette: {
    addNode: 'Knoten hinzufügen',
    searchPlaceholder: 'Knoten suchen…',
    noResult: 'Keine passenden Knoten',
    nodeHelp: 'Knotendokumentation ansehen'
  },
  connection: {
    selfLoop: 'Ports am selben Knoten können nicht verbunden werden',
    failed: 'Verbindung fehlgeschlagen: {reason}',
    alreadyBound: 'Diese beiden Ports sind bereits verbunden',
    kindNotAllowed: 'Typkonflikt: Dieser Eingabe-Port akzeptiert diesen Typ nicht',
    singlePortOccupied: 'Dieser Eingabe-Port akzeptiert nur eine Verbindung. Trenne zuerst die bestehende'
  },
  valueKind: {
    bool: 'Boolesch',
    number: 'Zahl',
    string: 'Zeichenkette',
    json: 'JSON',
    file: 'Datei',
    'txt-file': 'Textdatei',
    'img-file': 'Bilddatei'
  },
  intro: {
    whatIs: {
      title: 'Was ist das?',
      body: 'Finder+ ist eine {arch} Desktop-App, die mit Electron + Vue 3 erstellt wurde. Ziehe verschiedene Knotentypen auf die Leinwand und verbinde sie miteinander, um eine Datenfluss-Pipeline zu bilden — Daten fließen von vorgelagerten Knoten entlang der Kanten zu nachgelagerten Knoten, und jeder Knoten transformiert, prüft oder erzeugt Werte an seiner eigenen Position.',
      arch: 'knotenbasierte / boardbasierte'
    },
    concepts: {
      title: 'Kernkonzepte',
      node: {
        name: 'Knoten',
        desc: 'Eine funktionale Einheit auf der Leinwand. Jeder Knoten hat seinen eigenen Typ (wie {c1}, {c2}, {c3}), mit Eingabe-Ports links und Ausgabe-Ports rechts. Knoten arbeiten nicht direkt auf der Leinwand — sie kümmern sich nur darum, welche Werte sie empfangen und welche Werte sie erzeugen.'
      },
      port: {
        name: 'Port',
        desc: 'Die kleinen Punkte auf beiden Seiten eines Knotens. {input} (links) empfangen Werte von vorgelagerten Knoten, {output} (rechts) geben Werte an nachgelagerte Knoten weiter. Jeder Port hat eine Typbeschränkung ({c1}, {c2}, {c3} usw.), und der Typ wird beim Verbinden in Echtzeit geprüft.',
        input: 'Eingabe-Ports',
        output: 'Ausgabe-Ports'
      },
      edge: {
        name: 'Kante',
        desc: 'Eine Linie, die einen Ausgabe-Port mit einem Eingabe-Port verbindet. Werte fließen entlang der Kanten von links nach rechts. Ziehe vom Punkt eines Ausgabe-Ports zum Punkt eines Eingabe-Ports eines anderen Knotens, um eine Verbindung zu erstellen.'
      },
      scene: {
        name: 'Szene',
        desc: 'Der Container für alle Knoten und Kanten auf der Leinwand. Er übernimmt das Hinzufügen und Entfernen von Knoten, das Binden und Lösen von Kanten und überträgt Änderungen an die UI-Ebene zur Aktualisierung.'
      }
    },
    quickStart: {
      title: 'Schnellstart',
      step1: 'Klicke oben links auf {plus}, um die Knotenpalette zu öffnen, und ziehe dann einen Knoten auf die Leinwand',
      step2: 'Beim Ablegen einer Datei wird ihr Typ automatisch erkannt und der entsprechende File-Knoten erstellt',
      step3: 'Ziehe vom Ausgabe-Port eines Knotens (rechter Punkt) zum Eingabe-Port eines anderen Knotens (linker Punkt), um eine Verbindung zu zeichnen',
      step4: 'Doppelklicke auf einen Knoten oder klicke auf das Zahnradsymbol darauf, um seine Parameter zu konfigurieren',
      step5: 'Wenn für einen Knoten {help} konfiguriert ist, klicke auf das Fragezeichen-Symbol, um die detaillierte Verwendung dieses Knotens anzuzeigen'
    },
    nodeTypes: {
      title: 'Übersicht der Knotentypen',
      category: 'Kategorie',
      common: 'Häufige Knoten',
      sep: ', ',
      input: 'Eingabe',
      process: 'Verarbeitung',
      output: 'Ausgabe / Anzeige',
      container: 'Container',
      footer: 'Die Liste "Knotenhilfe" links zeigt die Knoten, für die derzeit Hilfedokumente registriert sind. Klicke auf einen, um die detaillierte Verwendung anzuzeigen.'
    }
  },
  fileDragGuide: {
    title: 'File nodes',
    whatIs: {
      title: 'What are file nodes?',
      body: 'File nodes are a special category of nodes in Finder+, including {txt}, {img}, {any}, and the container nodes {folder}, {imgfolder}. They are backed by real files — bring a file from disk onto the canvas, then pipe its contents through output ports to downstream nodes.'
    },
    palette: {
      title: 'Why aren\'t they in the palette?',
      body: 'File nodes are not listed in the {plus} palette in the top-left corner — because they are created differently from regular nodes. Regular nodes are "empty shells" that you fill with data manually; file nodes are bound directly to real files, so "drag file onto canvas" creates the node and imports the data in one step.'
    },
    howTo: {
      title: 'How to create them',
      step1: 'Open your system file manager (Finder on macOS, File Explorer on Windows)',
      step2: 'Select a file (or folder), then drag it into the Finder+ canvas while holding the left mouse button',
      step3: 'Release the mouse button — Finder+ automatically detects the file type and creates the matching node at the drop location',
      noteTitle: 'Tip',
      noteBody: 'You can drag multiple files at once; Finder+ creates an independent node for each one. If you drag a folder, a folder or img-folder container node is created automatically.'
    },
    mapping: {
      title: 'File type mapping',
      category: 'Category',
      fileType: 'File extension',
      nodeType: 'Created node type',
      txt: '.txt (plain text)',
      img: '.jpg / .jpeg / .png / .gif / .webp / .bmp',
      any: 'All other file types',
      folder: 'Regular folder',
      imgfolder: 'Image folder (folder containing images)',
      footer: 'Matching priority is top to bottom — specific types (txt, images) are matched first, anything else falls through to the any-file generic node.'
    },
    intoFolder: {
      title: 'Dropping into a folder container',
      body: 'If a {folder} or img-folder container node already exists on the canvas, drop the file inside its content area instead of the blank canvas. The file will not create a new top-level node — it will be "adopted" by the folder as a child node, with the correct file-node type determined automatically by its extension.'
    }
  },
  onboarding: {
    title: 'Welcome to Finder+',
    step1: {
      title: 'Step 1: Drag in a file',
      hint: 'Open Finder, pick any file, and drag it onto the canvas. Finder+ will automatically create a file node matching its type.',
      canvasLabel: 'Drop your file here'
    },
    step2: {
      title: 'Step 2: Add a File Info node and connect',
      hint: 'Click ＋ in the top-left, search for "File Info", and place it on the canvas. Then drag from the dot on the right side of the file node (output port) to the dot on the left side of File Info (input port).',
      paletteLabel: 'Open the palette and search File Info'
    },
    skip: 'Skip tutorial'
  }

}

export default de
