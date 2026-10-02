import type { Language } from '../types'

/** Russian messages */
const ru: Language = {
  app: {
    settings: 'Настройки',
    help: 'Справка',
    fileMenu: 'Файл'
  },
  settingsDialog: {
    title: 'Настройки',
    close: 'Закрыть (Esc)',
    language: 'Язык',
    languageHint: 'Выберите язык интерфейса. Изменения сохраняются автоматически.'
  },
  helpCenter: {
    title: 'Центр справки',
    close: 'Закрыть (Esc)',
    loading: 'Загрузка…',
    empty: 'Нет доступных справочных документов',
    pickNode: 'Выберите узел слева',
    groupNodes: 'Обзор типов узлов',
    about: 'О Finder+'
  },
  helpDialog: {
    title: 'Инструкция',
    close: 'Закрыть (Esc)'
  },
  minimap: {
    dragToMove: 'Перетащите, чтобы переместить миникарту',
    expand: 'Развернуть миникарту',
    collapse: 'Свернуть миникарту',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    reset: 'Сбросить'
  },
  palette: {
    addNode: 'Добавить узел',
    searchPlaceholder: 'Поиск узлов…',
    noResult: 'Нет подходящих узлов',
    nodeHelp: 'Открыть справку по узлу'
  },
  connection: {
    selfLoop: 'Порты одного узла нельзя соединить между собой',
    failed: 'Не удалось подключиться: {reason}',
    alreadyBound: 'Эти два порта уже соединены',
    kindNotAllowed: 'Несовпадение типов: этот входной порт не принимает данный тип',
    singlePortOccupied: 'Этот входной порт принимает только одно соединение. Сначала отключите существующее'
  },
  valueKind: {
    bool: 'Логический',
    number: 'Число',
    string: 'Строка',
    json: 'JSON',
    file: 'Файл',
    'txt-file': 'Текстовый файл',
    'img-file': 'Файл изображения'
  },
  intro: {
    whatIs: {
      title: 'Что это?',
      body: 'Finder+ — это {arch} десктопное приложение на Electron + Vue 3. Вы можете перетаскивать на холст узлы разных типов и соединять их линиями, образуя конвейер потока данных: данные идут от узлов-источников по рёбрам к узлам-приёмникам, а каждый узел выполняет преобразование, проверку или вывод на своей позиции.',
      arch: 'узловое / доскообразное'
    },
    concepts: {
      title: 'Основные понятия',
      node: {
        name: 'Узел (Node)',
        desc: 'Функциональная единица на холсте. У каждого узла есть свой тип (например, {c1}, {c2}, {c3}), слева — входные порты, справа — выходные. Узлы не управляют холстом напрямую, а лишь отвечают за то, какие значения получают и какие выдают.'
      },
      port: {
        name: 'Порт (Port)',
        desc: 'Небольшие точки по обе стороны узла. {input} (слева) принимают значения от источника, {output} (справа) передают значения дальше. У каждого порта есть ограничение по типу ({c1}, {c2}, {c3} и т. д.), и при соединении тип проверяется в реальном времени.',
        input: 'Входные порты',
        output: 'Выходные порты'
      },
      edge: {
        name: 'Ребро (Edge)',
        desc: 'Линия, соединяющая выходной порт с входным. Значения текут по рёбрам слева направо. Перетащите точку выходного порта к точке входного порта другого узла, чтобы создать соединение.'
      },
      scene: {
        name: 'Сцена (Scene)',
        desc: 'Контейнер для всех узлов и рёбер на холсте. Он отвечает за добавление и удаление узлов, привязку и отвязку рёбер, а также за передачу изменений в слой UI для обновления.'
      }
    },
    quickStart: {
      title: 'Быстрый старт',
      step1: 'Нажмите {plus} в левом верхнем углу, чтобы открыть палитру узлов, и перетащите узел на холст',
      step2: 'При перетаскивании файла его тип определяется автоматически и создаётся соответствующий узел File',
      step3: 'Перетащите от выходного порта узла (правая точка) к входному порту другого узла (левая точка), чтобы провести соединение',
      step4: 'Дважды щёлкните по узлу или нажмите значок шестерёнки на узле, чтобы настроить его параметры',
      step5: 'Если у узла настроена {help}, нажмите значок вопроса, чтобы посмотреть подробное описание работы этого узла'
    },
    nodeTypes: {
      title: 'Обзор типов узлов',
      category: 'Категория',
      common: 'Обычные узлы',
      sep: ', ',
      input: 'Вход',
      process: 'Обработка',
      output: 'Вывод / Отображение',
      container: 'Контейнер',
      footer: 'В списке «Справка по узлам» слева перечислены узлы, для которых зарегистрированы справочные документы. Нажмите на любой, чтобы посмотреть подробное описание.'
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
      title: 'Dropping into a {folder} container',
      body: 'If a {folder} or img-folder container node already exists on the canvas, drop the file inside its content area instead of the blank canvas. The file will not create a new top-level node — it will be "adopted" by the folder as a child node, with the correct file-node type determined automatically by its extension.'
    }
  }

}

export default ru