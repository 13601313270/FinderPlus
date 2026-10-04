import type { Language } from '../types'

/** Hindi messages */
const hi: Language = {
  app: {
    settings: 'सेटिंग्स',
    help: 'सहायता',
    fileMenu: 'फ़ाइल'
  },
  settingsDialog: {
    title: 'सेटिंग्स',
    close: 'बंद करें (Esc)',
    language: 'भाषा',
    languageHint: 'इंटरफ़ेस की भाषा चुनें। बदलाव स्वतः सहेजे जाते हैं।',
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
    title: 'सहायता केंद्र',
    close: 'बंद करें (Esc)',
    loading: 'लोड हो रहा है…',
    empty: 'कोई सहायता दस्तावेज़ उपलब्ध नहीं है',
    pickNode: 'बाईं ओर एक नोड चुनें',
    groupNodes: 'नोड प्रकार',
    about: 'Finder+ के बारे में'
  },
  helpDialog: {
    title: 'निर्देश',
    close: 'बंद करें (Esc)'
  },
  minimap: {
    dragToMove: 'मिनीमैप ले जाने के लिए खींचें',
    expand: 'मिनीमैप फैलाएँ',
    collapse: 'मिनीमैप संकुचित करें',
    zoomIn: 'ज़ूम इन',
    zoomOut: 'ज़ूम आउट',
    reset: 'रीसेट'
  },
  palette: {
    addNode: 'नोड जोड़ें',
    searchPlaceholder: 'नोड खोजें…',
    noResult: 'कोई मेल खाता नोड नहीं',
    nodeHelp: 'नोड दस्तावेज़ देखें'
  },
  connection: {
    selfLoop: 'एक ही नोड के पोर्ट आपस में जोड़े नहीं जा सकते',
    failed: 'कनेक्शन विफल: {reason}',
    alreadyBound: 'ये दोनों पोर्ट पहले से जुड़े हुए हैं',
    kindNotAllowed: 'प्रकार बेमेल: यह इनपुट पोर्ट इस प्रकार को स्वीकार नहीं करता',
    singlePortOccupied: 'यह इनपुट पोर्ट केवल एक कनेक्शन स्वीकार करता है। पहले मौजूदा कनेक्शन डिस्कनेक्ट करें'
  },
  valueKind: {
    bool: 'बूलियन',
    number: 'संख्या',
    string: 'स्ट्रिंग',
    json: 'JSON',
    file: 'फ़ाइल',
    'txt-file': 'टेक्स्ट फ़ाइल',
    'img-file': 'छवि फ़ाइल'
  },
  intro: {
    whatIs: {
      title: 'यह क्या है?',
      body: 'Finder+ एक {arch} डेस्कटॉप ऐप है जो Electron + Vue 3 से बनाया गया है। विभिन्न प्रकार के नोड्स को कैनवास पर खींचकर और उन्हें आपस में जोड़कर एक डेटा-फ़्लो पाइपलाइन बनाएँ — डेटा अपस्ट्रीम नोड्स से किनारों के साथ डाउनस्ट्रीम नोड्स तक बहता है, और प्रत्येक नोड अपनी स्थिति पर मानों को रूपांतरित, जाँच या उत्पन्न करता है।',
      arch: 'नोड-आधारित / बोर्ड-आधारित'
    },
    concepts: {
      title: 'मुख्य अवधारणाएँ',
      node: {
        name: 'नोड',
        desc: 'कैनवास पर एक कार्यात्मक इकाई। प्रत्येक नोड का अपना प्रकार होता है (जैसे {c1}, {c2}, {c3}), बाईं ओर इनपुट पोर्ट और दाईं ओर आउटपुट पोर्ट। नोड सीधे कैनवास पर कार्य नहीं करते — वे केवल इस बात पर ध्यान देते हैं कि कौन-से मान प्राप्त होते हैं और कौन-से मान उत्पन्न होते हैं।'
      },
      port: {
        name: 'पोर्ट',
        desc: 'नोड के दोनों ओर छोटे बिंदु। {input} (बाएँ) अपस्ट्रीम से मान प्राप्त करते हैं, {output} (दाएँ) मानों को डाउनस्ट्रीम भेजते हैं। प्रत्येक पोर्ट पर एक प्रकार बाधा होती है ({c1}, {c2}, {c3} आदि), और कनेक्ट करते समय प्रकार की वास्तविक समय में जाँच होती है।',
        input: 'इनपुट पोर्ट',
        output: 'आउटपुट पोर्ट'
      },
      edge: {
        name: 'किनारा',
        desc: 'एक आउटपुट पोर्ट को एक इनपुट पोर्ट से जोड़ने वाली रेखा। मान किनारों के साथ बाएँ से दाएँ बहते हैं। कनेक्शन बनाने के लिए एक आउटपुट पोर्ट के बिंदु से दूसरे नोड के इनपुट पोर्ट के बिंदु तक खींचें।'
      },
      scene: {
        name: 'दृश्य',
        desc: 'कैनवास पर सभी नोड्स और किनारों का कंटेनर। यह नोड्स को जोड़ने और हटाने, किनारों को बाँधने और खोलने, तथा रीफ़्रेश के लिए परिवर्तनों को UI परत तक प्रसारित करने का कार्य संभालता है।'
      }
    },
    quickStart: {
      title: 'त्वरित शुरुआत',
      step1: 'नोड पैलेट खोलने के लिए ऊपर बाईं ओर {plus} पर क्लिक करें, फिर कैनवास पर एक नोड खींचें',
      step2: 'फ़ाइल छोड़ने पर उसका प्रकार स्वतः पहचाना जाता है और संबंधित File नोड बन जाता है',
      step3: 'कनेक्शन बनाने के लिए एक नोड के आउटपुट पोर्ट (दायाँ बिंदु) से दूसरे नोड के इनपुट पोर्ट (बायाँ बिंदु) तक खींचें',
      step4: 'पैरामीटर कॉन्फ़िगर करने के लिए किसी नोड पर डबल-क्लिक करें, या उस पर गियर आइकन पर क्लिक करें',
      step5: 'यदि किसी नोड के लिए {help} कॉन्फ़िगर किया गया है, तो उस नोड के विस्तृत उपयोग को देखने के लिए प्रश्नवाचक चिह्न आइकन पर क्लिक करें'
    },
    nodeTypes: {
      title: 'नोड प्रकारों का अवलोकन',
      category: 'श्रेणी',
      common: 'सामान्य नोड',
      sep: ', ',
      input: 'इनपुट',
      process: 'प्रक्रिया',
      output: 'आउटपुट / प्रदर्शन',
      container: 'कंटेनर',
      footer: 'बाईं ओर की "नोड सहायता" सूची उन नोड्स को दिखाती है जिनके लिए वर्तमान में सहायता दस्तावेज़ पंजीकृत हैं। विस्तृत उपयोग देखने के लिए किसी एक पर क्लिक करें।'
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
      time: 'समय'
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

export default hi
