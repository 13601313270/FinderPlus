import type { Language } from '../types'

/** English messages */
const en: Language = {
  app: {
    settings: 'Settings',
    help: 'Help',
    fileMenu: 'File'
  },
  settingsDialog: {
    title: 'Settings',
    close: 'Close (Esc)',
    language: 'Language',
    languageHint: 'Choose the interface language. Changes are saved automatically.',
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
    onboardingRestart: 'Show tutorial again',
    clearSection: 'Canvas',
    clearHint: 'Remove all nodes and edges from the canvas. Files in the canvas directory will NOT be deleted.',
    clearButton: 'Clear Canvas',
    clearConfirmTitle: 'Clear the canvas?',
    clearConfirmBody: 'This will remove all nodes and edges from the canvas and cannot be undone. Files in the canvas directory will NOT be deleted. Continue?',
    clearSuccess: 'Canvas cleared.',
    clearAlreadyEmpty: 'The canvas is already empty',

    // Sidebar groups
    groupGeneral: 'General',
    groupLLM: 'LLM Settings',
    groupImage: 'Image Generation',

    groupCanvases: "My Canvases",

    // LLM / Image section titles and hints (previously hardcoded)
    llmTitle: 'LLM API Key',
    llmHint: 'Configure API keys for each provider here. Each LLM node can independently choose which provider and model to use.',
    imageTitle: 'Image Generation API Key',
    imageHint: 'Configure API keys for each image generation provider. Each image node can independently choose which provider and model to use.',

    // Buttons (previously hardcoded)
    save: 'Save',
    clear: 'Clear',
    saved: 'Saved',
    canvasesTitle: "My Canvases",
    canvasesHint: "All canvases and their basic info are listed here. Click \"Open\" to open a canvas in a new window; multiple windows can run in parallel.",
    canvasesLoading: "Loading…",
    canvasesEmpty: "No canvases yet. Use the canvas selector at the top to create one.",
    canvasBadgeDefault: "Default",
    canvasBadgeCurrent: "Current",
    canvasNodeStat: "nodes",
    canvasEdgeStat: "edges",
    canvasFileStat: "files",
    canvasLastModified: "Last modified",
    canvasBtnOpen: "Open",
    canvasBtnOpenFolder: "Open Folder",
    canvasBtnRename: "Rename",
    canvasBtnDelete: "Delete",
    canvasRenamePrompt: "Rename canvas:",
    canvasRenameFailed: "Rename failed",
    canvasOnlyOneTitle: "This is the only canvas",
    canvasOnlyOneBody: "The last canvas cannot be deleted. Clear all content instead?\n\nCanvas: {name}",
    canvasDeleteConfirmTitle: "Delete canvas?",
    canvasDeleteConfirmBody: "Nodes, edges, and files in the canvas will all be deleted and cannot be recovered.\n\nCanvas: {name}",
    canvasDeleteFailed: "Delete failed",
  },
  helpCenter: {
    title: 'Help Center',
    close: 'Close (Esc)',
    loading: 'Loading…',
    empty: 'No help documents available',
    pickNode: 'Select a node on the left',
    groupNodes: 'Node types',
    about: 'About Finder+'
  },
  helpDialog: {
    title: 'Instructions',
    close: 'Close (Esc)'
  },
  nodeHeader: {
    dragHint: 'Drag node',
    helpTitle: 'Help'
  },
  minimap: {
    dragToMove: 'Drag to move the minimap',
    expand: 'Expand minimap',
    collapse: 'Collapse minimap',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset'
  },
  palette: {
    addNode: 'Add node',
    searchPlaceholder: 'Search nodes…',
    noResult: 'No matching nodes',
    nodeHelp: 'View node documentation'
  },
  connection: {
    selfLoop: 'Ports on the same node cannot be connected',
    failed: 'Connection failed: {reason}',
    alreadyBound: 'These two ports are already connected',
    kindNotAllowed: 'Type mismatch: this input port does not accept this type',
    singlePortOccupied: 'This input port accepts only one connection. Disconnect the existing one first'
  },
  valueKind: {
    bool: 'Boolean',
    number: 'Number',
    string: 'String',
    json: 'JSON',
    file: 'File',
    'txt-file': 'Text File',
    'img-file': 'Image File'
  },
  intro: {
    whatIs: {
      title: 'What is this?',
      body: 'Finder+ is a {arch} desktop app built with Electron + Vue 3. Drag different types of nodes onto the canvas and wire them together to form a data-flow pipeline — data flows from upstream nodes along edges to downstream nodes, and each node transforms, checks, or produces values at its own position.',
      arch: 'node-based / board-based'
    },
    concepts: {
      title: 'Core concepts',
      node: {
        name: 'Node',
        desc: 'A functional unit on the canvas. Each node has its own type (such as {c1}, {c2}, {c3}), with input ports on the left and output ports on the right. Nodes do not operate on the canvas directly — they only care about what values they receive and what values they produce.'
      },
      port: {
        name: 'Port',
        desc: 'The small dots on either side of a node. {input} (left) receive values from upstream, {output} (right) push values downstream. Each port has a type constraint ({c1}, {c2}, {c3}, etc.), and the type is checked in real time when connecting.',
        input: 'Input ports',
        output: 'Output ports'
      },
      edge: {
        name: 'Edge',
        desc: 'A line connecting an output port to an input port. Values flow along edges from left to right. Drag from an output port dot to another node\'s input port dot to create a connection.'
      },
      scene: {
        name: 'Scene',
        desc: 'The container for all nodes and edges on the canvas. It handles adding and removing nodes, binding and unbinding edges, and broadcasting changes to the UI layer for refresh.'
      }
    },
    quickStart: {
      title: 'Quick start',
      step1: 'Click {plus} at the top left to open the node palette, then drag a node onto the canvas',
      step2: 'Dropping in a file automatically detects its type and creates the corresponding File node',
      step3: 'Drag from a node\'s output port (right dot) to another node\'s input port (left dot) to draw a connection',
      step4: 'Double-click a node, or click the gear icon on it, to configure its parameters',
      step5: 'If a node has {help} configured, click the question-mark icon to view detailed usage for that node'
    },
    nodeTypes: {
      title: 'Node types overview',
      category: 'Category',
      common: 'Common nodes',
      sep: ', ',
      input: 'Input',
      process: 'Process',
      output: 'Output / Display',
      container: 'Container',
      footer: 'The "Node help" list on the left shows the nodes that currently have help documents registered. Click one to view detailed usage.'
    },
    gallery: {
      title: 'See what it can do',
      caption: 'Wire up {imageGen}, {llm}, {code} and other nodes to build complete automated workflows. Below is a "picture-book generator" pipeline — it splits text into paragraphs, generates an illustration for each, and auto-assembles pages, all by dragging and connecting nodes on the canvas.'
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
      title: 'Step 2: Pick File Info',
      hint: 'Click ＋ in the top-left to open the palette, then pick the highlighted File Info tile.',
      paletteLabel: 'Open the palette and pick File Info'
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
  },
  table: {
    columnSettings: 'Column settings',
    sqlPort: 'SQL ports',
    sqlPortTitle: 'Manage SQL query ports',
    sqlPortDialogTitle: 'SQL Port Management',
    sqlPortSectionTitle: 'Added query ports',
    sqlPortEmpty: 'No SQL query ports yet',
    sqlPortAdd: '+ Add SQL port',
    sqlPortConfirmDelete: 'Delete query port {idx}?',
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
      time: 'Time',
      date: 'Date'
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

export default en