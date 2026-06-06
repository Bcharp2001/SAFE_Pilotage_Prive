# DEPLOY.md — Procédure de déploiement Vercel

> Document interne. Décrit les étapes obligatoires pour que la page `/livre.html`
> et la route serverless `/api/brevo-subscribe` fonctionnent en production.

---

## 1. Variables d'environnement à configurer dans Vercel

**Vercel → Settings → Environment Variables → Production** (et Preview si tu veux que les branches puissent tester aussi) :

| Variable | Obligatoire ? | Valeur recommandée |
|---|---|---|
| `BREVO_API_KEY` | **Oui** | La nouvelle clé Brevo (`xkeysib-…`) générée APRÈS révocation de l'ancienne |
| `BREVO_SENDER_EMAIL` | **Oui** | `contact@safe-pilotage-prive.fr` |
| `BREVO_SENDER_NAME` | non | `S.A.F.E. Pilotage Privé` |
| `BREVO_ADMIN_EMAIL` | non | `contact@safe-pilotage-prive.fr` |
| `BREVO_ADMIN_TPL_ID` | non | `5` (template notif admin existant) |
| `BREVO_CONFIRM_TPL_ID` | non | `2` (template confirmation démo existant) |
| `BREVO_BOOK_TPL_ID` | **À créer** | ID du template Brevo qui envoie le livre (voir §2) |
| `BREVO_LIST_DEMO` | non | `3` (liste des demandes de démo, déjà existante) |
| `BREVO_LIST_BOOK` | **À créer** | ID d'une nouvelle liste Brevo dédiée aux téléchargements livre |

⚠️ **Ne JAMAIS** mettre `BREVO_API_KEY` dans un fichier commité.

---

## 2. Templates et listes Brevo à créer

### 2.1 Nouvelle liste "Lead magnet — Livre"
1. Brevo → **Contacts → Listes → Nouvelle liste**
2. Nom : `Lead magnet — Livre Murmurait IA`
3. Récupérer l'ID dans l'URL ou la fiche liste → reporter dans `BREVO_LIST_BOOK`

### 2.2 Template "Livraison du livre" (à créer dans Brevo)
1. Brevo → **Campagnes → Modèles d'email → Créer un modèle**
2. Type : **Email transactionnel**
3. Nom : `Lead magnet — Livraison livre`
4. Sujet : `Voici votre livre + 3 prompts à tester ce soir`
5. Corps (variables Brevo) :
   - `{{params.PRENOM}}` → personnalisation
   - `{{params.DOWNLOAD_URL}}` → bouton de téléchargement principal
6. Reporter l'ID du template dans `BREVO_BOOK_TPL_ID`

Trame de contenu suggérée (à rédiger dans le visual builder Brevo) :
```
Bonjour {{params.PRENOM}},

Merci pour votre inscription. Voici le livre que vous avez demandé :

[BOUTON] → Télécharger le livre (PDF, 3 Mo)
          {{params.DOWNLOAD_URL}}

Avant que vous le lisiez, voici 3 prompts à tester ce soir
sur ChatGPT, Claude, ou n'importe quel LLM :

1. (...)
2. (...)
3. (...)

Dans 2 jours je vous envoie un retour terrain :
l'erreur n°1 que je vois chez les dirigeants qui utilisent ChatGPT
sans cadre. Soyez sur votre boîte.

Bonne lecture,
Bertrand Charpilloz
Fondateur, S.A.F.E. Pilotage Privé
```

### 2.3 Séquence email automatisée (à mettre en place après le 1er commit)
Voir la trame J+0 → J+14 fournie dans la conversation Telegram.
À configurer dans **Brevo → Automatisations → Workflow nouveau contact**
déclenché par l'entrée dans la liste `BREVO_LIST_BOOK`.

---

## 3. Vérifications avant push en prod

- [ ] Ancienne clé API Brevo `xkeysib-a7f9...893e` **révoquée** dans Brevo
- [ ] Nouvelle clé Brevo générée et collée **uniquement** dans `BREVO_API_KEY` Vercel
- [ ] Liste `BREVO_LIST_BOOK` créée dans Brevo, ID reporté
- [ ] Template `BREVO_BOOK_TPL_ID` créé dans Brevo, ID reporté
- [ ] Page `/livre.html` testée en local
- [ ] Aucun fichier HTML ne contient plus la chaîne `xkeysib-` (voir §4)

---

## 4. Purge de l'ancienne clé dans les HTML existants

Les fichiers suivants contiennent encore l'ancienne clé en clair
(à nettoyer **avant** le merge en main) :

```
index.html
nouveau_design.html
solutions/operations.html
solutions/rh-paie.html
solutions/direction-strategie.html
solutions/finance-comptabilite.html
solutions/commercial.html
solutions/achats-stock.html
solutions/juridique-compliance.html
professions/notaires.html
professions/avocats.html
professions/experts-comptables.html
```

Pour chacun, le formulaire actuel doit être rebranché sur la même route serverless
`/api/brevo-subscribe` (avec `type: "demo"`).

C'est l'étape **Phase 2** du chantier — non incluse dans le commit Phase 1
qui se concentre uniquement sur le lead magnet livre.

---

## 5. Workflow de déploiement

```
Local → branche feature/livre-lead-magnet
      → git commit
      → git push
Vercel : preview URL générée automatiquement
      → Bertrand teste la preview URL
      → Tout OK → merge PR vers main
      → Vercel déploie en prod sur safe-pilotage-prive.fr
```
