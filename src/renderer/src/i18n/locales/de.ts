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
  }
}

export default de
