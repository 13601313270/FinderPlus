import type { Language } from '../types'

/** Italian messages */
const it: Language = {
  app: {
    settings: 'Impostazioni',
    help: 'Guida',
    fileMenu: 'File'
  },
  settingsDialog: {
    title: 'Impostazioni',
    close: 'Chiudi (Esc)',
    language: 'Lingua',
    languageHint: 'Scegli la lingua dell’interfaccia. Le modifiche vengono salvate automaticamente.'
  },
  helpCenter: {
    title: 'Centro assistenza',
    close: 'Chiudi (Esc)',
    loading: 'Caricamento…',
    empty: 'Nessun documento di assistenza disponibile',
    pickNode: 'Seleziona un nodo a sinistra',
    groupNodes: 'Tipi di nodo',
    about: 'Informazioni su Finder+'
  },
  helpDialog: {
    title: 'Istruzioni',
    close: 'Chiudi (Esc)'
  },
  minimap: {
    dragToMove: 'Trascina per spostare la mini-mappa',
    expand: 'Espandi mini-mappa',
    collapse: 'Comprimi mini-mappa',
    zoomIn: 'Ingrandisci',
    zoomOut: 'Riduci',
    reset: 'Reimposta'
  },
  palette: {
    addNode: 'Aggiungi nodo',
    searchPlaceholder: 'Cerca nodi…',
    noResult: 'Nessun nodo corrispondente',
    nodeHelp: 'Visualizza la documentazione del nodo'
  },
  connection: {
    selfLoop: 'Le porte sullo stesso nodo non possono essere collegate',
    failed: 'Connessione non riuscita: {reason}',
    alreadyBound: 'Queste due porte sono già collegate',
    kindNotAllowed: 'Tipo non corrispondente: questa porta di input non accetta questo tipo',
    singlePortOccupied: 'Questa porta di input accetta una sola connessione. Disconnetti prima quella esistente'
  },
  valueKind: {
    bool: 'Booleano',
    number: 'Numero',
    string: 'Stringa',
    json: 'JSON',
    file: 'File',
    'txt-file': 'File di testo',
    'img-file': 'File immagine'
  },
  intro: {
    whatIs: {
      title: 'Che cos’è questo?',
      body: 'Finder+ è un’app desktop {arch} creata con Electron + Vue 3. Trascina diversi tipi di nodi sulla scena e collegali tra loro per formare una pipeline di flusso di dati — i dati fluiscono dai nodi a monte lungo gli archi verso i nodi a valle, e ogni nodo trasforma, verifica o produce valori nella propria posizione.',
      arch: 'basata su nodi / su board'
    },
    concepts: {
      title: 'Concetti fondamentali',
      node: {
        name: 'Nodo',
        desc: 'Un’unità funzionale sulla scena. Ogni nodo ha il proprio tipo (come {c1}, {c2}, {c3}), con porte di input a sinistra e porte di output a destra. I nodi non operano direttamente sulla scena — si occupano solo di quali valori ricevono e quali valori producono.'
      },
      port: {
        name: 'Porta',
        desc: 'I piccoli punti su entrambi i lati di un nodo. Gli {input} (a sinistra) ricevono valori da monte, gli {output} (a destra) inviano valori a valle. Ogni porta ha un vincolo di tipo ({c1}, {c2}, {c3} ecc.) e il tipo viene verificato in tempo reale durante il collegamento.',
        input: 'Porte di input',
        output: 'Porte di output'
      },
      edge: {
        name: 'Arco',
        desc: 'Una linea che collega una porta di output a una porta di input. I valori fluiscono lungo gli archi da sinistra a destra. Trascina dal punto di una porta di output al punto di una porta di input di un altro nodo per creare un collegamento.'
      },
      scene: {
        name: 'Scena',
        desc: 'Il contenitore di tutti i nodi e gli archi sulla scena. Gestisce l’aggiunta e la rimozione di nodi, il collegamento e lo scollegamento degli archi e trasmette le modifiche al livello UI per l’aggiornamento.'
      }
    },
    quickStart: {
      title: 'Avvio rapido',
      step1: 'Fai clic su {plus} in alto a sinistra per aprire la tavolozza dei nodi, poi trascina un nodo sulla scena',
      step2: 'Il rilascio di un file ne rileva automaticamente il tipo e crea il nodo File corrispondente',
      step3: 'Trascina dalla porta di output di un nodo (punto a destra) alla porta di input di un altro nodo (punto a sinistra) per tracciare un collegamento',
      step4: 'Fai doppio clic su un nodo, o clic sull’icona a forma di ingranaggio su di esso, per configurarne i parametri',
      step5: 'Se un nodo ha {help} configurato, fai clic sull’icona del punto interrogativo per visualizzare l’uso dettagliato di quel nodo'
    },
    nodeTypes: {
      title: 'Panoramica dei tipi di nodo',
      category: 'Categoria',
      common: 'Nodi comuni',
      sep: ', ',
      input: 'Input',
      process: 'Elaborazione',
      output: 'Output / Visualizzazione',
      container: 'Contenitore',
      footer: 'L’elenco "Guida dei nodi" a sinistra mostra i nodi per cui è attualmente registrata una documentazione di assistenza. Fai clic su uno per visualizzarne l’uso dettagliato.'
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

export default it
