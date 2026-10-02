import type { Language } from '../types'

/** Spanish messages */
const es: Language = {
  app: {
    settings: 'Ajustes',
    help: 'Ayuda',
    fileMenu: 'Archivo'
  },
  settingsDialog: {
    title: 'Ajustes',
    close: 'Cerrar (Esc)',
    language: 'Idioma',
    languageHint: 'Elige el idioma de la interfaz. Los cambios se guardan automáticamente.',
    transferTitle: 'Data Migration',
    transferHint: 'Export your current canvas and all files as a zip, or import from a backup on a new computer.',
    export: 'Export…',
    import: 'Import…',
    exportSuccess: 'Export completed successfully.',
    importSuccess: 'Import completed successfully. Please restart the app to reload your canvas.',
    exportKeyHint: 'API keys are not included in the export for security reasons. You will need to re-enter them on the new computer.',
    importConfirmTitle: 'Import will replace all data',
    importConfirmBody: 'Importing will overwrite your current canvas, files and settings with the backup. This cannot be undone. Continue?',
    onboardingSection: 'Onboarding tutorial',
    onboardingHint: 'Watch the Finder+ quick start again: drag in a file and connect nodes.',
    onboardingRestart: 'Show tutorial again'
  },
  helpCenter: {
    title: 'Centro de ayuda',
    close: 'Cerrar (Esc)',
    loading: 'Cargando…',
    empty: 'No hay documentos de ayuda disponibles',
    pickNode: 'Selecciona un nodo a la izquierda',
    groupNodes: 'Introducción a los tipos de nodo',
    about: 'Acerca de Finder+'
  },
  helpDialog: {
    title: 'Instrucciones',
    close: 'Cerrar (Esc)'
  },
  minimap: {
    dragToMove: 'Arrastra para mover el minimapa',
    expand: 'Expandir minimapa',
    collapse: 'Contraer minimapa',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    reset: 'Restablecer'
  },
  palette: {
    addNode: 'Añadir nodo',
    searchPlaceholder: 'Buscar nodos…',
    noResult: 'No hay nodos coincidentes',
    nodeHelp: 'Ver la documentación del nodo'
  },
  connection: {
    selfLoop: 'No se pueden conectar puertos del mismo nodo',
    failed: 'Error de conexión: {reason}',
    alreadyBound: 'Estos dos puertos ya están conectados',
    kindNotAllowed: 'Tipo incompatible: este puerto de entrada no acepta este tipo',
    singlePortOccupied: 'Este puerto de entrada solo admite una conexión. Desconecta primero la existente'
  },
  valueKind: {
    bool: 'Booleano',
    number: 'Número',
    string: 'Cadena',
    json: 'JSON',
    file: 'Archivo',
    'txt-file': 'Archivo de texto',
    'img-file': 'Archivo de imagen'
  },
  intro: {
    whatIs: {
      title: '¿Qué es esto?',
      body: 'Finder+ es una aplicación de escritorio {arch} creada con Electron + Vue 3. Puedes arrastrar distintos tipos de nodos al lienzo y conectarlos con líneas para formar una tubería de flujo de datos: los datos fluyen desde los nodos de origen a lo largo de las aristas hacia los nodos de destino, y cada nodo transforma, comprueba o genera valores en su propia posición.',
      arch: 'basada en nodos / en tablero'
    },
    concepts: {
      title: 'Conceptos clave',
      node: {
        name: 'Nodo (Node)',
        desc: 'Una unidad funcional del lienzo. Cada nodo tiene su propio tipo (como {c1}, {c2}, {c3}), con puertos de entrada a la izquierda y puertos de salida a la derecha. Los nodos no operan directamente sobre el lienzo; solo se encargan de qué valores reciben y qué valores producen.'
      },
      port: {
        name: 'Puerto (Port)',
        desc: 'Los pequeños círculos a ambos lados de un nodo. Los {input} (izquierda) reciben valores del origen y los {output} (derecha) los envían al destino. Cada puerto tiene una restricción de tipo ({c1}, {c2}, {c3}, etc.) y el tipo se valida en tiempo real al conectar.',
        input: 'Puertos de entrada',
        output: 'Puertos de salida'
      },
      edge: {
        name: 'Arista (Edge)',
        desc: 'Una línea que conecta un puerto de salida con un puerto de entrada. Los valores fluyen por las aristas de izquierda a derecha. Arrastra desde el círculo de un puerto de salida hasta el círculo de un puerto de entrada de otro nodo para crear una conexión.'
      },
      scene: {
        name: 'Escena (Scene)',
        desc: 'El contenedor de todos los nodos y aristas del lienzo. Se encarga de añadir y eliminar nodos, enlazar y desenlazar aristas, y notificar los cambios a la capa de UI para que se actualice.'
      }
    },
    quickStart: {
      title: 'Inicio rápido',
      step1: 'Haz clic en {plus} en la esquina superior izquierda para abrir la paleta de nodos y arrastra un nodo al lienzo',
      step2: 'Al soltar un archivo se detecta su tipo automáticamente y se crea el nodo File correspondiente',
      step3: 'Arrastra desde el puerto de salida de un nodo (círculo derecho) hasta el puerto de entrada de otro (círculo izquierdo) para trazar una conexión',
      step4: 'Haz doble clic en un nodo, o clic en el icono de engranaje del nodo, para configurar sus parámetros',
      step5: 'Si un nodo tiene {help} configurado, haz clic en el icono de interrogación para ver el uso detallado de ese nodo'
    },
    nodeTypes: {
      title: 'Resumen de tipos de nodo',
      category: 'Categoría',
      common: 'Nodos comunes',
      sep: ', ',
      input: 'Entrada',
      process: 'Procesamiento',
      output: 'Salida / Visualización',
      container: 'Contenedor',
      footer: 'La lista "Ayuda de nodos" de la izquierda muestra los nodos que tienen documentación de ayuda registrada. Haz clic en uno para ver su uso detallado.'
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

export default es