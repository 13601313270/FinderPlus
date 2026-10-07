import type { Language } from '../types'

/** French messages */
const fr: Language = {
  app: {
    settings: 'Paramètres',
    help: 'Aide',
    fileMenu: 'Fichier'
  },
  settingsDialog: {
    title: 'Paramètres',
    close: 'Fermer (Échap)',
    language: 'Langue',
    languageHint: 'Choisissez la langue de l\'interface. Les modifications sont enregistrées automatiquement.',
    transferTitle: 'Migration des données',
    transferHint: 'Exportez votre canevas actuel et tous les fichiers au format zip, ou importez depuis une sauvegarde sur un nouvel ordinateur.',
    export: 'Exporter…',
    import: 'Importer…',
    exportSuccess: 'Exportation terminée avec succès.',
    importSuccess: "Importation terminée avec succès. Veuillez redémarrer l'application pour recharger votre canevas.",
    exportKeyHint: "Les clés API ne sont pas incluses dans l'exportation pour des raisons de sécurité. Vous devrez les ressaisir sur le nouvel ordinateur.",
    importConfirmTitle: "L'importation remplacera toutes les données",
    importConfirmBody: "L'importation écrasera votre canevas actuel, vos fichiers et vos paramètres par la sauvegarde. Cette action est irréversible. Continuer ?",
    onboardingSection: 'Tutoriel de bienvenue',
    onboardingHint: 'Revoyez le démarrage rapide de Finder+ : faites glisser un fichier et connectez des nœuds.',
    onboardingRestart: 'Afficher à nouveau le tutoriel',
    clearSection: 'Canevas',
    clearHint: 'Supprime tous les nœuds et arêtes du canevas. Les fichiers du répertoire du canevas ne seront PAS supprimés.',
    clearButton: 'Vider le canevas',
    clearConfirmTitle: 'Vider le canevas ?',
    clearConfirmBody: 'Cela supprimera tous les nœuds et arêtes du canevas et est irréversible. Les fichiers du répertoire du canevas ne seront PAS supprimés. Continuer ?',
    clearSuccess: 'Canevas vidé.',
    clearAlreadyEmpty: 'Le canevas est déjà vide',

    groupGeneral: 'Général',
    groupLLM: 'Paramètres des LLM',
    groupImage: "Génération d'images",
    groupCanvases: 'Mes toiles',
    llmTitle: 'Clé API LLM',
    llmHint: 'Configurez ici les clés API de chaque fournisseur. Chaque nœud LLM peut choisir indépendamment le fournisseur et le modèle à utiliser.',
    imageTitle: "Clé API de génération d'images",
    imageHint: "Configurez ici les clés API de chaque fournisseur de génération d'images. Chaque nœud d'image peut choisir indépendamment le fournisseur et le modèle à utiliser.",
    save: 'Enregistrer',
    clear: 'Effacer',
    saved: 'Enregistré',
    canvasesTitle: "Mes toiles",
    canvasesHint: "Toutes les toiles et leurs informations de base sont listées ici. Cliquez sur \"Ouvrir\" pour ouvrir une toile dans une nouvelle fenêtre ; plusieurs fenêtres peuvent fonctionner en parallèle.",
    canvasesLoading: "Chargement…",
    canvasesEmpty: "Aucune toile pour le moment. Utilisez le sélecteur de toiles en haut pour en créer une.",
    canvasBadgeDefault: "Par défaut",
    canvasBadgeCurrent: "Actuelle",
    canvasNodeStat: "nœuds",
    canvasEdgeStat: "arêtes",
    canvasFileStat: "fichiers",
    canvasLastModified: "Dernière modification",
    canvasBtnOpen: "Ouvrir",
    canvasBtnOpenFolder: "Ouvrir le dossier",
    canvasBtnRename: "Renommer",
    canvasBtnDelete: "Supprimer",
    canvasRenamePrompt: "Renommer la toile :",
    canvasRenameFailed: "Échec du renommage",
    canvasOnlyOneTitle: "Ceci est la seule toile",
    canvasOnlyOneBody: "La dernière toile ne peut pas être supprimée. Vider tout le contenu à la place ?\n\nToile : {name}",
    canvasDeleteConfirmTitle: "Supprimer la toile ?",
    canvasDeleteConfirmBody: "Les nœuds, arêtes et fichiers de la toile seront supprimés et ne pourront pas être récupérés.\n\nToile : {name}",
    canvasDeleteFailed: "Échec de la suppression",
  },
  helpCenter: {
    title: 'Centre d\'aide',
    close: 'Fermer (Échap)',
    loading: 'Chargement…',
    empty: 'Aucun document d\'aide disponible',
    pickNode: 'Sélectionnez un nœud à gauche',
    groupNodes: 'Présentation des types de nœuds',
    about: 'À propos de Finder+'
  },
  helpDialog: {
    title: 'Instructions',
    close: 'Fermer (Échap)'
  },
  minimap: {
    dragToMove: 'Faire glisser pour déplacer la mini-carte',
    expand: 'Développer la mini-carte',
    collapse: 'Réduire la mini-carte',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    reset: 'Réinitialiser'
  },
  palette: {
    addNode: 'Ajouter un nœud',
    searchPlaceholder: 'Rechercher des nœuds…',
    noResult: 'Aucun nœud correspondant',
    nodeHelp: 'Voir la documentation du nœud'
  },
  connection: {
    selfLoop: 'Les ports d\'un même nœud ne peuvent pas être reliés',
    failed: 'Échec de la connexion : {reason}',
    alreadyBound: 'Ces deux ports sont déjà reliés',
    kindNotAllowed: 'Type incompatible : ce port d\'entrée n\'accepte pas ce type',
    singlePortOccupied: 'Ce port d\'entrée n\'accepte qu\'une seule connexion. Déconnectez d\'abord celle existante'
  },
  valueKind: {
    bool: 'Booléen',
    number: 'Nombre',
    string: 'Chaîne',
    json: 'JSON',
    file: 'Fichier',
    'txt-file': 'Fichier texte',
    'img-file': 'Fichier image'
  },
  intro: {
    whatIs: {
      title: 'Qu\'est-ce que c\'est ?',
      body: 'Finder+ est une application de bureau {arch} construite avec Electron + Vue 3. Vous pouvez faire glisser différents types de nœuds sur le canevas et les relier par des lignes pour former un pipeline de flux de données : les données circulent des nœuds amont le long des arêtes vers les nœuds aval, et chaque nœud effectue une transformation, une vérification ou une production à sa propre position.',
      arch: 'basée sur les nœuds / sur tableau'
    },
    concepts: {
      title: 'Concepts clés',
      node: {
        name: 'Nœud (Node)',
        desc: 'Une unité fonctionnelle sur le canevas. Chaque nœud a son propre type (comme {c1}, {c2}, {c3}), avec des ports d\'entrée à gauche et des ports de sortie à droite. Les nœuds n\'agissent pas directement sur le canevas ; ils gèrent uniquement les valeurs reçues et produites.'
      },
      port: {
        name: 'Port (Port)',
        desc: 'Les petits points de part et d\'autre d\'un nœud. Les {input} (à gauche) reçoivent les valeurs de l\'amont, les {output} (à droite) les transmettent à l\'aval. Chaque port a une contrainte de type ({c1}, {c2}, {c3}, etc.), et le type est vérifié en temps réel lors de la connexion.',
        input: 'Ports d\'entrée',
        output: 'Ports de sortie'
      },
      edge: {
        name: 'Arête (Edge)',
        desc: 'Une ligne reliant un port de sortie à un port d\'entrée. Les valeurs circulent le long des arêtes de gauche à droite. Faites glisser depuis le point d\'un port de sortie jusqu\'au point d\'un port d\'entrée d\'un autre nœud pour créer une connexion.'
      },
      scene: {
        name: 'Scène (Scene)',
        desc: 'Le conteneur de tous les nœuds et arêtes du canevas. Il gère l\'ajout et la suppression de nœuds, la liaison et la déliaison des arêtes, et diffuse les modifications à la couche UI pour actualisation.'
      }
    },
    quickStart: {
      title: 'Prise en main rapide',
      step1: 'Cliquez sur {plus} en haut à gauche pour ouvrir la palette de nœuds, puis faites glisser un nœud sur le canevas',
      step2: 'Déposer un fichier détecte automatiquement son type et crée le nœud File correspondant',
      step3: 'Faites glisser depuis le port de sortie d\'un nœud (point à droite) jusqu\'au port d\'entrée d\'un autre nœud (point à gauche) pour tracer une connexion',
      step4: 'Double-cliquez sur un nœud, ou cliquez sur l\'icône d\'engrenage du nœud, pour configurer ses paramètres',
      step5: 'Si un nœud dispose d\'une {help} configurée, cliquez sur l\'icône point d\'interrogation pour consulter son utilisation détaillée'
    },
    nodeTypes: {
      title: 'Aperçu des types de nœuds',
      category: 'Catégorie',
      common: 'Nœuds courants',
      sep: ', ',
      input: 'Entrée',
      process: 'Traitement',
      output: 'Sortie / Affichage',
      container: 'Conteneur',
      footer: 'La liste « Aide des nœuds » à gauche répertorie les nœuds pour lesquels une documentation d\'aide est enregistrée. Cliquez sur l\'un d\'eux pour consulter son utilisation détaillée.'
    },
    gallery: {
      title: "Voyez ce qu'il peut faire",
      caption: "Reliez les nœuds {imageGen}, {llm}, {code} et d'autres pour créer des workflows automatisés complets. Voici un pipeline de « générateur de livres illustrés » — il divise le texte en paragraphes, génère une illustration pour chacun et assemble les pages automatiquement, le tout en faisant glisser et connectant des nœuds sur le canevas."
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
      time: 'Date',
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

export default fr