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
    languageHint: 'Choose the interface language. Changes are saved automatically.'
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
    }
  }
}

export default en