import type { Language } from '../types'

/** Portuguese messages */
const pt: Language = {
  app: {
    settings: 'Configurações',
    help: 'Ajuda',
    fileMenu: 'Arquivo'
  },
  settingsDialog: {
    title: 'Configurações',
    close: 'Fechar (Esc)',
    language: 'Idioma',
    languageHint: 'Escolha o idioma da interface. As alterações são salvas automaticamente.'
  },
  helpCenter: {
    title: 'Central de Ajuda',
    close: 'Fechar (Esc)',
    loading: 'Carregando…',
    empty: 'Nenhum documento de ajuda disponível',
    pickNode: 'Selecione um nó à esquerda',
    groupNodes: 'Introdução aos tipos de nó',
    about: 'Sobre o Finder+'
  },
  helpDialog: {
    title: 'Instruções',
    close: 'Fechar (Esc)'
  },
  minimap: {
    dragToMove: 'Arraste para mover o minimapa',
    expand: 'Expandir minimapa',
    collapse: 'Recolher minimapa',
    zoomIn: 'Ampliar',
    zoomOut: 'Reduzir',
    reset: 'Redefinir'
  },
  palette: {
    addNode: 'Adicionar nó'
  },
  connection: {
    selfLoop: 'As portas do mesmo nó não podem ser conectadas',
    failed: 'Falha na conexão: {reason}',
    alreadyBound: 'Estas duas portas já estão conectadas',
    kindNotAllowed: 'Tipo incompatível: esta porta de entrada não aceita este tipo',
    singlePortOccupied: 'Esta porta de entrada aceita apenas uma conexão. Desconecte primeiro a existente'
  },
  intro: {
    whatIs: {
      title: 'O que é isto?',
      body: 'Finder+ é um aplicativo de desktop {arch} criado com Electron + Vue 3. Você pode arrastar diferentes tipos de nós para a tela e conectá-los com linhas para formar um pipeline de fluxo de dados: os dados fluem dos nós de origem ao longo das arestas até os nós de destino, e cada nó transforma, verifica ou gera valores em sua própria posição.',
      arch: 'baseado em nós / em quadro'
    },
    concepts: {
      title: 'Conceitos principais',
      node: {
        name: 'Nó (Node)',
        desc: 'Uma unidade funcional na tela. Cada nó tem seu próprio tipo (como {c1}, {c2}, {c3}), com portas de entrada à esquerda e portas de saída à direita. Os nós não operam diretamente na tela; eles lidam apenas com quais valores recebem e quais valores produzem.'
      },
      port: {
        name: 'Porta (Port)',
        desc: 'Os pequenos pontos em ambos os lados de um nó. As {input} (à esquerda) recebem valores da origem e as {output} (à direita) os enviam ao destino. Cada porta tem uma restrição de tipo ({c1}, {c2}, {c3} etc.), e o tipo é validado em tempo real ao conectar.',
        input: 'Portas de entrada',
        output: 'Portas de saída'
      },
      edge: {
        name: 'Aresta (Edge)',
        desc: 'Uma linha que conecta uma porta de saída a uma porta de entrada. Os valores fluem pelas arestas da esquerda para a direita. Arraste do ponto de uma porta de saída até o ponto de uma porta de entrada de outro nó para criar uma conexão.'
      },
      scene: {
        name: 'Cena (Scene)',
        desc: 'O contêiner de todos os nós e arestas da tela. Ele cuida de adicionar e remover nós, associar e desassociar arestas e transmitir as alterações à camada de UI para atualização.'
      }
    },
    quickStart: {
      title: 'Início rápido',
      step1: 'Clique em {plus} no canto superior esquerdo para abrir a paleta de nós e arraste um nó para a tela',
      step2: 'Ao soltar um arquivo, o tipo é detectado automaticamente e o nó File correspondente é criado',
      step3: 'Arraste da porta de saída de um nó (ponto à direita) até a porta de entrada de outro nó (ponto à esquerda) para traçar uma conexão',
      step4: 'Dê um duplo clique em um nó, ou clique no ícone de engrenagem do nó, para configurar seus parâmetros',
      step5: 'Se um nó tiver {help} configurada, clique no ícone de interrogação para ver o uso detalhado desse nó'
    },
    nodeTypes: {
      title: 'Visão geral dos tipos de nó',
      category: 'Categoria',
      common: 'Nós comuns',
      sep: ', ',
      input: 'Entrada',
      process: 'Processamento',
      output: 'Saída / Exibição',
      container: 'Contêiner',
      footer: 'A lista "Ajuda do nó" à esquerda mostra os nós que atualmente têm documentação de ajuda registrada. Clique em um deles para ver o uso detalhado.'
    }
  }
}

export default pt