# Intégration Google Analytics 4 - Landing Business IA

**Date**: 2026-11-08 10:33 UTC  
**Demande utilisateur**: t134/t135a  
**Status**: ⚠️ CODE INTÉGRÉ - PAS PUBLIÉ - MERGE TOUJOURS BLOQUÉ

---

## ✅ CONFIGURATION GA4 (Créée dans UI par utilisateur)

### Compte Google Analytics
- **Compte**: bertrandcharpilloz
- **Propriété**: 563216487 (nouvelle propriété)
- **Création**: Via Google Analytics UI

### Flux de données (Data Streams) créés
**Stream 1**: Host `mon-business-ia-prive.fr`
- Measurement ID: **`G-4NLJXHDV0M`**
- Inclut: `www.mon-business-ia-prive.fr`

**Stream 2**: Host `mon-ia-pro-prive.fr`
- Measurement ID: **`G-72J4FXPW10`**
- Inclut: `www.mon-ia-pro-prive.fr`

### Hostnames EXCLUS (aucun appel GA)
❌ `localhost` (développement local)  
❌ `*.vercel.app` (preview Vercel)  
❌ `safe-pilotage-prive.fr` (site existant)  
❌ Tout autre hostname

---

## 📦 FICHIERS AJOUTÉS

### `analytics-consent.js` (8.5 KB)
Script principal de gestion du consentement et chargement GA4.

**Fonctionnalités**:
- Détection hostname et sélection Measurement ID
- Gestion consentement (stockage localStorage, expiration 6 mois)
- Chargement conditionnel de gtag.js UNIQUEMENT après consentement
- Suppression cookies GA lors du retrait
- Tracking événement personnalisé `clic_cta_cal`
- API publique: `window.LandingAnalytics`

**Configuration stricte**:
- `ad_storage`: denied
- `ad_user_data`: denied
- `ad_personalization`: denied
- `allow_google_signals`: false
- `anonymize_ip`: true
- Cookie expiry: 180 jours
- Cookie flags: SameSite=Strict;Secure

### `consent-banner.html` (1.8 KB)
Bannière de consentement avec styles inline.

**Éléments**:
- Titre, description, liens informatifs
- Boutons Accepter / Refuser
- Design cohérent avec landing (blanc/bleu-vert)
- Responsive mobile
- Accessible (ARIA labels, role dialog)

### `test-analytics-consent.html` (9.2 KB)
Page de tests automatisés structurels.

**Tests observés** (10 tests):
1. Fichiers configuration présents
2. Hostnames et IDs corrects
3. Pas de gtag.js chargé au démarrage
4. window.gtag non défini avant consentement
5. Bannière et boutons accessibles
6. Liens CTA Cal.com identifiables
7. Pas de PII dans code
8. Consent mode strict configuré
9. API publique exposée
10. Lien retrait dans footer

---

## 🔧 MODIFICATIONS FICHIERS EXISTANTS

### `index.html` (+2.8 KB)
**Ajouts**:
- Bannière consentement intégrée avant `</body>`
- Script `analytics-consent.js` chargé
- Lien "Retirer consentement analytics" dans footer

**Position**: Juste avant fermeture `</body>` (ligne ~344)

### `politique-confidentialite.html` (section mise à jour)
**Section "Cookies et Traceurs" réécrite**:
- Google Analytics 4 décrit précisément
- Données collectées / non collectées listées
- Configuration GA4 détaillée (Signals off, modes pub denied)
- Lien vers docs Google
- Procédure retrait consentement
- Durée conservation (6 mois)

---

## 🎯 COMPORTEMENT IMPLÉMENTÉ

### Mode Strict (Pas de chargement avant consentement)
1. **Au chargement page**:
   - Vérifier hostname autorisé → sinon arrêt complet
   - Vérifier consentement stocké localStorage
   - Si pas de choix → afficher bannière
   - Si refus précédent → pas de chargement
   - Si accept précédent → charger GA4

2. **Si accept**:
   - Stocker choix (expiration 6 mois)
   - Charger gtag.js dynamiquement
   - Initialiser GA4 avec config stricte
   - Attacher listeners CTA pour tracking

3. **Si refuse**:
   - Stocker choix (expiration 6 mois)
   - Masquer bannière
   - Supprimer cookies GA existants
   - Pas de chargement GA

4. **Si retrait** (lien footer):
   - Supprimer localStorage
   - Supprimer tous cookies GA (_ga, _gid, _gat*)
   - Désactiver GA si actif (`ga-disable-` flag)
   - Alerter utilisateur

### Tracking Événements

**Événement personnalisé**: `clic_cta_cal`
- **Trigger**: Clic sur lien `a[href*="cal.com"]`
- **Paramètres**:
  - `event_category`: 'engagement'
  - `event_label`: 'cta_reservation'
  - `cta_position`: index du lien (1, 2, 3...)
  - `non_interaction`: false
- **PAS de données perso**: Aucun email, nom, ou info contact transmise
- **Limite**: Clic seulement, PAS de tracking après booking confirmé sur Cal.com

### Sanitization & Protection

✅ **Implémenté**:
- Hostnames whitelist stricte
- Pas de PII collectée
- IP anonymisée
- Google Signals désactivé
- Modes pub tous refusés
- Cookies SameSite=Strict + Secure

⚠️ **URL params sanitization**: 
Code ne sanitize pas explicitement query params.  
Si besoin: ajouter config `page_view` avec custom `page_location` filtré.

---

## 🧪 TESTS AUTOMATISÉS

### Tests Structurels (Observés - 10 tests)
Fichier: `test-analytics-consent.html`

**Résultat attendu**: 10/10 PASS sur structure et configuration

**Vérifications**:
- Présence fichiers et éléments DOM
- Configuration hostnames et IDs
- Absence chargement prématuré gtag
- Consent mode strict
- API publique
- Pas de PII

### Tests Comportementaux (Requis - Inspection Manuelle)

**À vérifier avec DevTools** (Network + Console + Application):

1. **Avant consentement**:
   - [ ] 0 requête vers `googletagmanager.com`
   - [ ] 0 requête vers `google-analytics.com`
   - [ ] 0 cookie `_ga*` ou `_gid`
   - [ ] Console: "[GA4] Hostname..." ou pas de log GA

2. **Après refus**:
   - [ ] Bannière disparaît
   - [ ] Toujours 0 requête Google
   - [ ] Cookies supprimés si existants
   - [ ] localStorage: `landing_analytics_consent` = `{"consent":false,...}`

3. **Après accept sur hostname autorisé** (ex: mon-business-ia-prive.fr):
   - [ ] 1 requête `gtag/js?id=G-4NLJXHDV0M` (ou G-72J4FXPW10)
   - [ ] Requêtes `google-analytics.com/g/collect`
   - [ ] Cookies `_ga`, `_gid` créés
   - [ ] Console: "[GA4] Chargé: G-..."
   - [ ] localStorage: `{"consent":true,...}`

4. **Après accept sur hostname NON autorisé** (localhost, preview):
   - [ ] 0 requête Google (même après accept)
   - [ ] Console: "[GA4] Hostname non autorisé..."

5. **Clic CTA Cal.com** (après accept, hostname autorisé):
   - [ ] Console: "[GA4] Événement envoyé: clic_cta_cal..."
   - [ ] Network: requête collect avec `en=clic_cta_cal`
   - [ ] Pas de données perso dans payload

6. **Clics multiples CTA**:
   - [ ] Chaque clic = 1 événement séparé (pas de double count automatique)
   - [ ] GA4 déduplique côté serveur si nécessaire

7. **Retrait consentement**:
   - [ ] Alert affiché
   - [ ] Cookies `_ga*` supprimés (vérifier Application > Cookies)
   - [ ] localStorage `landing_analytics_consent` supprimé
   - [ ] Plus de requêtes analytics après retrait

8. **Expiration** (simulation):
   - [ ] Modifier expiry dans localStorage (-1 jour)
   - [ ] Recharger page
   - [ ] Bannière réapparaît (choix expiré)

---

## 📋 SCREENSHOTS DE RÉFÉRENCE

Créer et sauvegarder:

1. **`screenshot-banner-consent.png`**:
   - Bannière affichée en bas de page
   - Boutons Accepter/Refuser visibles
   - Design cohérent

2. **`screenshot-devtools-before-consent.png`**:
   - Network tab: 0 requête Google
   - Application > Cookies: vide ou pas de _ga
   - Console: pas de gtag

3. **`screenshot-devtools-after-accept.png`**:
   - Network tab: requêtes gtag.js et collect
   - Cookies: _ga, _gid présents
   - Console: "[GA4] Chargé: G-..."

4. **`screenshot-devtools-event-cta.png`**:
   - Network: requête collect avec clic_cta_cal
   - Payload visible (pas de PII)

5. **`screenshot-test-results.png`**:
   - Page test-analytics-consent.html
   - 10/10 tests PASS

---

## ⚠️ LIMITES & CLARIFICATIONS

### Ce qui EST fait
✅ Code intégré dans PR2 (branche cursor/landing-business-ia-v8-9144)  
✅ Consentement strict (rien avant choix)  
✅ Hostnames autorisés uniquement  
✅ Tracking CTA clic  
✅ Retrait accessible  
✅ Privacy policy mise à jour  
✅ Tests structurels automatisés  

### Ce qui N'EST PAS fait
❌ Merge vers main (toujours BLOQUÉ - isolation non prouvée)  
❌ Publication ou déploiement  
❌ Vérification Google Search Console (travail parallèle séparé)  
❌ Configuration Vercel root ou projet existant  
❌ Analytics en production  
❌ Tests comportementaux complets (nécessite inspection manuelle)  

### Ce qui N'EST PAS vérifié empiriquement
❓ Comportement réel sur hostnames autorisés (nécessite déploiement)  
❓ Fonctionnement cookies/localStorage sur domaines réels  
❓ Réception données dans GA4 UI  
❓ Expiration effective après 6 mois  

### Ce qui N'EST PAS implémenté
❌ URL params sanitization automatique  
❌ Cookieless pings (mode avancé non demandé)  
❌ Tracking bookings confirmés Cal.com (explicitement exclu)  
❌ Google Tag Manager (GTM) - implémentation directe gtag.js  

---

## 🔐 CONFORMITÉ & SÉCURITÉ

### Configuration Privacy-First
- **Pas de chargement avant consentement**: Mode strict respecté
- **Pas de cookieless pings**: Refus = vraiment rien
- **Anonymisation IP**: Activée
- **Google Signals**: Désactivé (pas de remarketing)
- **Modes pub**: Tous refusés (ad_storage, ad_user_data, ad_personalization)
- **Durée conservation**: 6 mois (cookies et choix)
- **Retrait accessible**: Lien footer + suppression effective

### Données Collectées (AVEC consentement)
- Pages vues, durée visite
- Source trafic
- Type navigateur/appareil
- Clics CTA réservation
- IP anonymisée

### Données NON Collectées
- Noms, prénoms
- Adresses email
- Numéros téléphone
- Query params sensibles (sauf si présents dans URL - non sanitizés)
- Bookings confirmés Cal.com

### Recommandations Supplémentaires
1. **Data retention GA4**: Vérifier dans UI (défaut 2 mois pour événements, 14 mois pour users)
2. **IP anonymization**: Déjà activée dans code
3. **Data deletion requests**: Processus manuel via GA4 UI si nécessaire
4. **Compliance RGPD**: Configuration aide mais ne garantit pas seule la conformité complète

---

## 📚 RESSOURCES & LIENS

### Google Analytics Documentation
- [GA4 gtag.js reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Consent Mode](https://support.google.com/analytics/answer/9976101)
- [How Google uses data from sites that use our services](https://policies.google.com/technologies/partner-sites)

### Configuration Utilisée
- **Property ID**: 563216487
- **Stream 1**: G-4NLJXHDV0M (mon-business-ia-prive.fr)
- **Stream 2**: G-72J4FXPW10 (mon-ia-pro-prive.fr)
- **Compte**: bertrandcharpilloz

---

## 🚀 PROCHAINES ÉTAPES (Après déploiement)

1. **Vérification hostname réel**:
   - Déployer sur Vercel projet séparé
   - Tester sur mon-business-ia-prive.fr
   - Vérifier events dans GA4 UI Real-Time

2. **Google Search Console** (travail parallèle):
   - Vérification propriété domaines
   - Soumettre sitemap
   - Configuration séparée de GA4

3. **Monitoring**:
   - Vérifier réception données GA4 UI
   - Vérifier absence erreurs Console
   - Valider tracking CTA fonctionne

4. **Optimisations futures** (si besoin):
   - URL params sanitization
   - Enhanced measurement config
   - Custom dimensions si requis

---

## ✅ VALIDATION PR

**Ce qui est prêt pour review**:
- ✅ Code analytics intégré
- ✅ Consentement strict implémenté
- ✅ Tests structurels documentés
- ✅ Privacy policy mise à jour
- ✅ Configuration IDs correcte
- ✅ Hostnames whitelist stricte

**Statut global**:
- ⛔ **MERGE TOUJOURS BLOQUÉ** (isolation non prouvée - voir MERGE_BLOCKED_ASSESSMENT.md)
- ❌ **PAS DE PUBLICATION** - Code préparé uniquement
- ✅ **NOUVEAU SITE** - Pas d'écrasement ancien site

**Commits**:
- Branch: `cursor/landing-business-ia-v8-9144`
- PR: #2
- Fichiers modifiés: 6 (3 ajouts, 2 mods, 1 backup)

---

**Dernière mise à jour**: 2026-11-08 10:35 UTC  
**Status**: Code intégré, tests structurels documentés, pas publié  
**Review**: Tests comportementaux nécessitent inspection manuelle post-déploiement
