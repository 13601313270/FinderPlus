# Finder+

Un canevas d'automatisation visuelle basé sur des nœuds pour macOS. Faites glisser des nœuds sur un canevas infini, reliez leurs ports entre eux, et les données circulent à travers le graphe — transformant texte, images, appels LLM, requêtes HTTP et commandes shell en une pipeline réutilisable que vous pouvez voir.

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [العربية](README.ar.md) · Français · [Português](README.pt.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Italiano](README.it.md)

---

## Ce que c'est

Finder+ est une application de bureau pour construire des **flux de travail visuels**. Au lieu d'écrire un script, vous placez des nœuds sur un canevas et reliez un port de sortie à un port d'entrée. Les valeurs se propagent le long des fils, et chaque nœud s'illumine avec son résultat dès que ses entrées arrivent.

Usages typiques :

- Traiter des images par lots : recadrage → compression → ajustement de la qualité → suppression de l'arrière-plan
- Construire des pipelines de prompts : modèle de texte → LLM → affichage JSON
- Générer des images à partir d'un prompt texte et déposer le résultat dans un dossier
- Assembler des API HTTP et des commandes shell locales sans écrire de programme

## Téléchargement

Dernière version : **<https://github.com/13601313270/FinderPlus/releases>**

Lien direct pour la v0.1.0 (Apple Silicon) :

```
https://github.com/13601313270/FinderPlus/releases/download/0.1.0/Finder+-0.1.0-arm64.dmg
```

Ouvrez le `.dmg`, faites glisser **Finder+** dans le dossier **Applications**, puis éjectez l'image disque.

### Premier lancement sur macOS

> **Cette version n'est ni signée ni notariée.** macOS la bloquera la première fois avec un message du type *« Finder+ ne peut pas être ouvert car le développeur ne peut pas être vérifié »* ou *« Finder+ est endommagé et ne peut pas être ouvert »*.

Pour l'ouvrir malgré tout, choisissez l'une de ces options :

- **Clic droit** (ou Control-clic) sur l'icône de l'application → **Ouvrir** → **Ouvrir** de nouveau dans la boîte de dialogue.
- Ou exécutez ceci dans le Terminal, puis lancez l'application normalement :

  ```bash
  xattr -dr com.apple.quarantine /Applications/Finder+.app
  ```

- Sur macOS 15 (Sequoia) et versions ultérieures, si l'option du clic droit n'est pas proposée, allez dans **Réglages Système → Confidentialité et sécurité** et cliquez sur **Ouvrir quand même**.

**Configuration requise :** macOS sur Apple Silicon (arm64). Les versions Intel ne sont pas encore publiées.

## Nœuds

| Nœud | Type | Ce qu'il fait |
| --- | --- | --- |
| Entrée texte | `text-input` | Émet une chaîne |
| Entrée nombre | `number-input` | Émet un nombre |
| Entrée booléenne | `bool-input` | Émet un booléen |
| Fichier texte | `txt-file` | Créé en déposant un fichier `.txt` sur le canevas |
| Fichier image | `img-file` | Créé en déposant un fichier image sur le canevas |
| Fichier quelconque | `any-file` | Créé en déposant un fichier de tout autre type |
| Infos fichier | `file-info` | Lit les métadonnées d'un fichier |
| Dossier | `folder` | Conteneur qui recueille les fichiers entrants comme nœuds enfants |
| Dossier d'images | `img-folder` | Conteneur pour un lot d'images |
| Affichage texte | `text-display` | Prévisualise le texte entrant |
| Affichage JSON | `json-display` | Affiche le JSON de façon lisible |
| Aperçu image | `image-preview` | Prévisualise une image et peut l'enregistrer sur le disque |
| Concaténation de chaînes | `string-concat` | Concatène les valeurs à l'aide des espaces réservés `$1 … $N` |
| Interrupteur | `switch` | Branchement conditionnel |
| Revue humaine | `human-review` | Met des valeurs en file d'attente pour une revue manuelle ; sortie sur **approbation** ou **rejet** |
| LLM | `llm` | Complétion de chat auprès d'un fournisseur configurable |
| Génération d'images | `image-gen` | Texte-vers-image auprès d'un fournisseur configurable |
| Recadrage d'image | `image-crop` | Recadre une image |
| Compression d'image | `image-compress` | Compresse une image (WebAssembly) |
| Qualité d'image | `image-quality` | Ajuste la qualité d'encodage |
| Superposition d'image | `image-overlay` | Superpose une image sur une autre |
| Suppression d'arrière-plan | `background-remove` | Supprime l'arrière-plan (ONNX, en local) |
| Code | `code` | Exécute un corps de fonction JavaScript |
| Commande | `command` | Exécute une commande shell |
| Requête HTTP | `http-request` | Envoie une requête HTTP/HTTPS |

## Fournisseurs pris en charge

**LLM** — DeepSeek, OpenAI, Kimi (Moonshot), Qwen (DashScope), Zhipu GLM, MiniMax, Groq, Mistral AI, SiliconFlow, et d'autres.

**Génération d'images** — SiliconFlow, OpenAI (DALL·E / GPT-Image), Zhipu (CogView), Alibaba Cloud Bailian (Qwen-Image / Wan).

Les clés API sont saisies dans les réglages de l'application et stockées **uniquement en local**.

## Langues

L'interface est disponible en 15 langues : English, 简体中文, 日本語, 한국어, Español, العربية, Français, Português, Русский, हिन्दी, Bahasa Indonesia, Deutsch, Tiếng Việt, Türkçe, Italiano.

## Où sont stockées vos données

- **Fichiers du canevas** (tout ce que vous déposez sur le canevas) sont copiés dans `~/Documents/CanvasDesk/我的画布`. L'application conserve sa propre copie afin de ne jamais dépendre du chemin d'origine.
- **Graphes, positions des nœuds et liaisons** sont stockés dans une base de données SQLite locale, au sein du répertoire de données utilisateur de l'application.
- **Clés API** résident dans le stockage local de votre machine. L'application elle-même n'envoie rien nulle part.

## Notes de sécurité

Deux nœuds exécutent délibérément des choses en votre nom ; traitez donc votre canevas comme vous traiteriez un script :

- **Commande** — exécute la commande que vous écrivez via le shell de votre système, avec vos privilèges utilisateur.
- **Code** — évalue le corps de fonction JavaScript que vous écrivez.

N'exécutez que des canevas que vous avez écrits ou que vous avez vous-même lus.

## Compiler depuis les sources

Nécessite Node.js 20+ et macOS.

```bash
npm install
npm run dev        # démarre en mode développement
npm run typecheck  # tsc + vue-tsc
npm run build:mac  # produit un .dmg dans dist/
```

## Stack technique

Electron 44 · Vue 3 · TypeScript · Vite (electron-vite) · Less · vue-i18n · sql.js (SQLite via WebAssembly) · onnxruntime-web · img-compressor-wasm

Le moteur de graphe (`src/main/engine/`) est de la pure logique, sans aucune dépendance à Electron, partagé directement entre le processus principal et le processus de rendu.