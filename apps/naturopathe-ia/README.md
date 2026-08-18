# NaturopatheIA

Assistant documentaire pour naturopathes professionnels : analyse de comptes rendus, protocoles de phytothérapie et fiches de conseils imprimables.

Réécriture complète de l'application Google AI Studio d'origine. Le prompt métier et l'idée de la fiche imprimable ont été conservés ; l'architecture ne l'a pas été.

---

## Ce qui change par rapport à la version AI Studio

| | AI Studio | Ici |
|---|---|---|
| Clé API | inlinée dans le bundle par `vite.config.ts`, lisible par tout visiteur | jamais exposée — tous les appels passent par des routes serveur |
| Session vocale | clé API transmise au navigateur | jeton éphémère à usage unique, périmètre verrouillé côté serveur |
| Fournisseur | Gemini en dur | interface `LLMProvider`, bascule par variable d'environnement |
| Documents | images uniquement, alors que le prompt promettait PDF et TXT | PDF, JPEG, PNG, WebP, TXT — avec extraction texte pour les modèles non multimodaux |
| Réponses | attente complète, sans rendu Markdown | streaming SSE, Markdown structuré |
| Export | `window.print()` dans une fenêtre surgissante | PDF composé côté serveur, paginé, avec mention légale |
| Historique | perdu au changement d'onglet, sans avertissement | état remonté dans le conteneur, persistance locale |
| Vocabulaire | « ordonnance », « patient », praticien prérempli à « NaturopatheIA » | fiche de conseils, personne accompagnée, praticien à renseigner |
| Audio | `ScriptProcessorNode` déprécié, micro renvoyé vers les haut-parleurs | `AudioWorklet`, aucune boucle de retour |
| Qualité | pas de types stricts au build, aucun test | `strict`, lint et 47 tests en intégration continue |

Deux fonctionnalités ont été retirées : la génération d'images (Imagen) et de vidéos (Veo). Elles n'ont pas d'usage en cabinet, coûtent cher, et reposaient sur un modèle *preview*.

---

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner AI_PROVIDER et la clé correspondante
npm run dev                  # http://localhost:3000
```

Vérifications :

```bash
npm run check    # typecheck + lint + tests
npm run build
```

---

## Configuration

Aucune variable n'est préfixée `NEXT_PUBLIC_` : toutes restent côté serveur.

| Variable | Rôle |
|---|---|
| `AI_PROVIDER` | `gemini` ou `mistral` |
| `GEMINI_API_KEY` | clé Google AI Studio |
| `GEMINI_TEXT_MODEL` | défaut `gemini-2.5-flash` |
| `GEMINI_REASONING_MODEL` | défaut `gemini-2.5-pro`, utilisé par « Analyse approfondie » |
| `GEMINI_LIVE_MODEL` | modèle audio temps réel |
| `MISTRAL_API_KEY` | clé Mistral (traitement UE) |
| `MISTRAL_MODEL` | défaut `mistral-large-latest` |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` | limitation par IP, défaut 20 / 60 s |

### Choisir le fournisseur

`gemini` apporte le multimodal natif (PDF et images lus directement), la recherche web sourcée et la conversation vocale, mais le traitement a lieu **hors Union européenne**.

`mistral` traite en **France**. En contrepartie : pas de recherche sourcée, pas de vocal, et les PDF passent par une extraction de texte serveur — les scans sans couche texte sont refusés explicitement plutôt qu'analysés à vide.

L'interface s'adapte : les onglets indisponibles affichent la raison, et un bandeau indique en permanence où partent les données.

---

## Architecture

```
src/
├── app/
│   ├── api/chat            flux SSE, conversation et analyse documentaire
│   ├── api/search          flux SSE, recherche sourcée
│   ├── api/realtime/token  jeton éphémère pour la session vocale
│   ├── api/fiche/pdf       composition du PDF
│   └── api/config          capacités du fournisseur, exposées au client
├── lib/
│   ├── ai/                 interface LLMProvider + implémentations
│   ├── extract.ts          adaptation des pièces jointes aux capacités du modèle
│   ├── fiche.ts            découpage Markdown → sections, exports texte
│   ├── prompt.ts           instruction système et mention légale
│   ├── pdf/                composition du document
│   ├── stream.ts           protocole SSE, serveur et client
│   ├── rate-limit.ts       limitation par IP
│   └── validation.ts       schémas Zod des routes
└── components/             AppShell + trois panneaux + dialogue de fiche
```

### Ajouter un fournisseur

Implémenter `LLMProvider` (`src/lib/ai/types.ts`), l'enregistrer dans `src/lib/ai/index.ts`. `streamChat` est le seul membre obligatoire ; `streamGroundedSearch` et `createRealtimeToken` sont facultatifs et déclarés par `capabilities`. Aucune route ni aucun composant n'a besoin d'être modifié.

---

## Protection des données

- **Rien n'est stocké côté serveur.** Aucune base, aucune journalisation du contenu. Les consultations restent dans le `localStorage` du navigateur ; les pièces jointes ne sont jamais persistées, seuls leurs noms le sont.
- **Consentement explicite** au premier lancement, réaffiché si le fournisseur change, indiquant la région de traitement.
- **CSP stricte** : aucun CDN, aucune police distante. Les polices sont auto-hébergées au build. Le seul appel sortant depuis le navigateur est le WebSocket vocal, authentifié par jeton éphémère.
- **En-têtes** : `no-store` sur toutes les réponses, `nosniff`, `frame-ancestors 'none'`, micro restreint à l'origine.

**Limite à connaître** : la limitation de débit est en mémoire, donc locale à l'instance sur une plateforme serverless. Pour une exposition publique, brancher un magasin partagé (Vercel KV, Upstash).

**Avant tout usage réel sur des données de santé**, quel que soit le fournisseur : vérifier la base légale, le contrat de sous-traitance, la durée de conservation et l'information des personnes concernées. Le code minimise et n'archive rien, mais il ne remplace pas ce cadre.

---

## Cadre d'usage

L'application s'adresse à un praticien, jamais directement à une personne accompagnée. L'instruction système proscrit le diagnostic, le vocabulaire médical réglementé (« ordonnance », « prescription », « patient », « traitement »), et impose une section « Précautions et interactions » sur chaque protocole.

Quand une situation relève d'une prise en charge clinique, le modèle émet une ligne `> ⚠️ ALERTE MÉDICALE — …`. L'interface la détecte et l'affiche en encadré, en tête de réponse **et** en tête du PDF.

Les documents exportés portent la mention légale sur chaque page.

---

## Déploiement

Application Next.js standard, testée sur Vercel.

1. Racine du projet : `apps/naturopathe-ia`
2. Variables d'environnement : celles du tableau ci-dessus
3. Les routes `/api/chat` et `/api/search` déclarent `maxDuration = 60` — vérifier que le plan le permet

---

## Notes d'implémentation

Deux pièges rencontrés, verrouillés par des tests :

- **`lineHeight` sur le style de `Page`** (`@react-pdf/renderer`) empêche silencieusement le rendu des enfants `position: absolute` + `fixed`. Le pied de page — mention légale et pagination — disparaissait du PDF sans erreur. L'interlignage est donc porté par les styles de texte. Voir `tests/pdf.test.ts`.
- **Le découpage réseau d'un flux SSE** ne respecte pas les frontières d'événements : `readStreamEvents` conserve le fragment résiduel entre deux lectures. Voir `tests/stream.test.ts`.
