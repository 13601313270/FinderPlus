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
    transferTitle: 'Migración de datos',
    transferHint: 'Exporta tu lienzo actual y todos los archivos como un zip, o importa desde una copia de seguridad en un equipo nuevo.',
    export: 'Exportar…',
    import: 'Importar…',
    exportSuccess: 'Exportación completada con éxito.',
    importSuccess: 'Importación completada con éxito. Reinicia la aplicación para volver a cargar tu lienzo.',
    exportKeyHint: 'Las claves API no se incluyen en la exportación por motivos de seguridad. Deberás volver a introducirlas en el equipo nuevo.',
    importConfirmTitle: 'La importación reemplazará todos los datos',
    importConfirmBody: 'La importación sobrescribirá tu lienzo actual, archivos y configuraciones con la copia de seguridad. Esto no se puede deshacer. ¿Continuar?',
    onboardingSection: 'Tutorial de bienvenida',
    onboardingHint: 'Vuelve a ver el inicio rápido de Finder+: arrastra un archivo y conecta nodos.',
    onboardingRestart: 'Mostrar tutorial nuevamente',
    clearSection: 'Lienzo',
    clearHint: 'Elimina todos los nodos y aristas del lienzo. Los archivos en el directorio del lienzo NO se eliminarán.',
    clearButton: 'Limpiar lienzo',
    clearConfirmTitle: '¿Limpiar el lienzo?',
    clearConfirmBody: 'Esto eliminará todos los nodos y aristas del lienzo y no se puede deshacer. Los archivos en el directorio del lienzo NO se eliminarán. ¿Continuar?',
    clearSuccess: 'Lienzo limpio.',
    clearAlreadyEmpty: 'El lienzo ya está vacío',

    groupGeneral: 'General',
    groupLLM: 'Ajustes de LLM',
    groupImage: 'Generación de imágenes',

    groupCanvases: "Mis lienzos",
    llmTitle: 'Clave API de LLM',
    llmHint: 'Configura aquí las claves API de cada proveedor. Cada nodo LLM puede elegir de forma independiente qué proveedor y modelo utilizar.',
    imageTitle: 'Clave API de generación de imágenes',
    imageHint: 'Configura aquí las claves API de cada proveedor de generación de imágenes. Cada nodo de imagen puede elegir de forma independiente qué proveedor y modelo utilizar.',
    save: 'Guardar',
    clear: 'Borrar',
    saved: 'Guardado',
    canvasesTitle: "Mis lienzos",
    canvasesHint: "Aquí se muestran todos los lienzos y su información básica. Haz clic en \"Abrir\" para abrir un lienzo en una ventana nueva; varias ventanas pueden funcionar en paralelo.",
    canvasesLoading: "Cargando…",
    canvasesEmpty: "Aún no hay lienzos. Usa el selector de lienzos en la parte superior para crear uno.",
    canvasBadgeDefault: "Predeterminado",
    canvasBadgeCurrent: "Actual",
    canvasNodeStat: "nodos",
    canvasEdgeStat: "aristas",
    canvasFileStat: "archivos",
    canvasLastModified: "Última modificación",
    canvasBtnOpen: "Abrir",
    canvasBtnOpenFolder: "Abrir carpeta",
    canvasBtnRename: "Renombrar",
    canvasBtnDelete: "Eliminar",
    canvasRenamePrompt: "Renombrar lienzo:",
    canvasRenameFailed: "Error al renombrar",
    canvasOnlyOneTitle: "Este es el único lienzo",
    canvasOnlyOneBody: "No se puede eliminar el último lienzo. ¿Vaciar todo el contenido en su lugar?\n\nLienzo: {name}",
    canvasDeleteConfirmTitle: "¿Eliminar lienzo?",
    canvasDeleteConfirmBody: "Los nodos, aristas y archivos del lienzo se eliminarán y no podrán recuperarse.\n\nLienzo: {name}",
    canvasDeleteFailed: "Error al eliminar",
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
    step2a: {
      title: 'Step 2: Add a File Info node',
      hint: 'Click ＋ in the top-left to open the palette, then pick the highlighted File Info tile.',
      paletteLabel: 'Open the palette and search File Info'
    },
    step2b: {
      title: 'Step 3: Place the node',
      hint: 'Move the mouse to an empty spot on the canvas and click — File Info will snap into place.',
      placeLabel: 'Click anywhere on the canvas to place it'
    },
    step3: {
      title: 'Step 4: Connect the nodes',
      hint: 'Press and hold on the dot on the right side of the file node (output port), drag a line to the dot on the left side of File Info (input port), and release.',
      connectLabel: 'Drag from the right dot of the file node to the left dot of File Info'
    },
    skip: 'Skip tutorial',
    celebration: {
      title: 'Tutorial complete!',
      desc: 'By combining different nodes and connecting them, you can build all kinds of automated workflows. Happy exploring!',
      start: 'Start exploring'
    }
  }

,
  table: {
    columnSettings: 'Column settings',
    sqlPort: '+ SQL port',
    sqlPortTitle: 'Add a pair of SQL query ports. Upstream StringValue writes a SELECT statement; use {table} in the SQL for the physical table name (e.g. SELECT * FROM {table})',
    addRow: '+ Add',
    search: 'Search',
    reset: 'Reset',
    headerOperations: 'Actions',
    emptyHint: 'No data yet — click "+ Add" at the top right to create the first row',
    loading: 'Loading…',
    totalRows: '{total} rows total',
    rowId: 'ID',
    edit: 'Edit',
    delete: 'Delete',
    submitFailed: 'Operation failed',
    deleteFailed: 'Delete failed',
    confirmDeleteRow: 'Delete row {id}?',
    confirmDeleteColumn: 'Delete column "{name}"? All data in this column will be permanently removed.',
    businessType: {
      text: 'Text',
      textarea: 'Long text',
      number: 'Number',
      boolean: 'Boolean',
      color: 'Color',
      time: 'Fecha',
      date: 'Fecha'
    },
    dialogTitleAdd: 'Add',
    dialogTitleEdit: 'Edit',
    dialogCancel: 'Cancel',
    dialogConfirm: 'OK',
    colSectionTitle: 'Current columns',
    colEmpty: 'No custom columns',
    colHeaderName: 'Name',
    colHeaderType: 'Type',
    colHeaderTitle: 'Title',
    colHeaderDefault: 'Default',
    colHeaderList: 'List',
    colHeaderSearch: 'Search',
    colHeaderCanUpdate: 'Editable',
    colHeaderCanSort: 'Sortable',
    colHeaderOperations: 'Actions',
    titlePlaceholder: 'Optional',
    colVisible: 'Visible in table',
    colHidden: 'Hidden in table',
    searchVisible: 'Visible in search',
    searchHidden: 'Hidden in search',
    canEditEnabled: 'Editable in edit dialog',
    canEditDisabled: 'Disabled in edit dialog',
    sortEnabled: 'Clickable sort',
    sortDisabled: 'Not sortable',
    addColumnTrigger: '+ Add column',
    close: 'Close',
    noCustomColumns: '(no custom columns)',
    addColTitle: 'Add column',
    addColNameLabel: 'Column name (SQL)',
    addColNamePlaceholder: 'e.g. email',
    addColTitleLabel: 'Display title',
    addColTitlePlaceholder: 'Optional, defaults to column name',
    addColBusinessTypeLabel: 'Business type',
    addColDefaultLabel: 'Default value',
    addColShowInListLabel: 'Show in list',
    addColShowInListTitle: 'Show this column in the table',
    addColShowInSearchLabel: 'Enable search',
    addColShowInSearchTitle: 'Show this column in the search bar',
    addColCanUpdateLabel: 'Editable',
    addColCanUpdateTitle: 'Allow editing in the edit dialog',
    addColCanSortLabel: 'Sortable',
    addColCanSortTitle: 'Allow clicking header to sort',
    addColCancel: 'Cancel',
    addColConfirm: 'Add',
    errorEmptyName: 'Please enter a column name',
    errorInvalidName: 'Column name must start with a letter or underscore, followed by letters, digits or underscores',
    errorDuplicateName: 'Column "{name}" already exists',
    resizeTooltip: 'Drag to resize',
    nodeFallback: 'Table'
  }
}

export default es