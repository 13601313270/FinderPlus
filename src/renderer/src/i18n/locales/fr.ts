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
    languageHint: 'Choisissez la langue de l\'interface. Les modifications sont enregistrées automatiquement.'
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
    addNode: 'Ajouter un nœud'
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
    }
  }
}

export default fr