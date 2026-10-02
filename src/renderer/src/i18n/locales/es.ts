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
    languageHint: 'Elige el idioma de la interfaz. Los cambios se guardan automáticamente.'
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
  }
}

export default es