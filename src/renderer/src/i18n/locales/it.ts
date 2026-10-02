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
    addNode: 'Aggiungi nodo'
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
  }
}

export default it
