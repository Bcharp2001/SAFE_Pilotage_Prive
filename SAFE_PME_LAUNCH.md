# SAFE PME — guide de lancement

## Pages

- Offre canonique : `/landing/safe-pme-10-jours`
- Variante A — diagnostic : `/landing/safe-pme-consultation`
- Variante B — SAFE Scan : `/landing/safe-pme-scan`

Les variantes sont servies à partir du même fichier pour éviter les divergences. La page détecte le chemin avant le premier rendu et adapte les CTA. La variante SAFE Scan est marquée `noindex` côté navigateur et conserve la page principale comme URL canonique.

## Décision de conversion

Pour un trafic de recherche froid, la conversion principale est un diagnostic de 30 minutes. Un déploiement à partir de 4 900 € HT nécessite de qualifier le corpus, les utilisateurs et l’architecture avant engagement.

Le test transactionnel porte donc sur un produit borné :

- SAFE Scan : 790 € HT ;
- atelier de 90 minutes ;
- cartographie des usages et risques ;
- cas d’usage priorisé ;
- préconisation d’architecture ;
- plan d’action et budget indicatif ;
- prix déduit du pilote si celui-ci est signé sous 30 jours.

Ne pas envoyer de trafic sur la variante SAFE Scan avant la validation des CGV, de la TVA et du lien Stripe.

## Configuration Vercel

Variables nécessaires :

```text
BREVO_API_KEY=
BREVO_LIST_ID=
CONTACT_SENDER_EMAIL=contact@safe-pilotage-prive.fr
CONTACT_SENDER_NAME=S.A.F.E. Pilotage Privé
CONTACT_NOTIFY_EMAIL=bertrand@safe-pilotage-prive.fr
STRIPE_SAFE_SCAN_PAYMENT_LINK=
```

Le lien Stripe doit commencer par `https://buy.stripe.com/` ou `https://checkout.stripe.com/`. S’il est absent, le parcours revient vers le formulaire avec un message explicatif.

Le formulaire :

- notifie Bertrand par e-mail ;
- envoie un accusé transactionnel au prospect ;
- ajoute le contact à la liste Brevo uniquement lorsque le consentement marketing facultatif est coché ;
- conserve les paramètres UTM, GCLID, GBRAID et WBRAID dans la notification interne ;
- utilise un honeypot, un délai minimal, une limite de taille, une vérification d’origine et une limitation de fréquence de premier niveau.

Avant la production, authentifier le domaine d’envoi dans Brevo : SPF, DKIM et DMARC.

## Groupes Google Ads initiaux

### 1. Assistant documentaire

- assistant documentaire IA entreprise
- assistant IA documents entreprise
- interroger documents entreprise IA
- chatbot interne documents
- base de connaissances IA entreprise
- solution RAG entreprise

### 2. IA privée et souveraine

- IA privée PME
- assistant IA privé entreprise
- solution IA souveraine entreprise
- IA hébergée en France entreprise
- ChatGPT privé entreprise
- alternative ChatGPT entreprise sécurisé

### 3. Déploiement et accompagnement

- intégrateur IA PME
- déployer IA entreprise
- prestataire IA entreprise
- consultant IA PME
- audit IA entreprise
- accompagnement IA entreprise

### 4. Gouvernance

- gouvernance IA PME
- conformité AI Act entreprise
- charte IA entreprise
- RGPD IA générative entreprise
- sécuriser usage IA entreprise

Commencer en correspondances exactes et expressions. Exclure notamment : gratuit, tutoriel, cours, emploi, stage, étudiant, image, vidéo, générateur, APK, crack, Python, LangChain, Hugging Face, Raspberry Pi, GPU, Ollama et installer soi-même.

Ne pas inventer de volumes ou de CPC. Le fichier `dataforseo_result.json` déjà présent a été généré à partir de requêtes centrées sur l’emploi et ne permet pas de dimensionner cette campagne. Les identifiants DataForSEO ne sont pas présents dans l’environnement actuel. Une fois connectés, lancer les mots-clés ci-dessus sur Google Ads Search Volume avec `location_name=France` et `language_code=fr`, puis utiliser Keywords For Keywords pour l’expansion.

## Mesure

Les événements sont poussés dans `window.dataLayer` sans charger d’outil publicitaire :

- `landing_view`
- `hero_diagnostic`, `hero_scan`, `hero_demo`
- `form_start`
- `form_submit_success`
- `booking_start`
- `checkout_start`
- `faq_open`

Avant d’ajouter GA4 ou Google Ads : installer une CMP conforme, appliquer Consent Mode v2 et garder les stockages publicitaires et analytiques refusés par défaut. La conversion d’optimisation doit évoluer du formulaire vers le rendez-vous qualifié puis vers le chiffre d’affaires.

Test A/B recommandé : utiliser deux campagnes ou un Google Ads Experiment avec une URL par variante. Évaluer le coût par rendez-vous tenu, le taux de qualification, le taux de proposition et le revenu par clic — pas seulement le taux de clic du bouton.

## Prérequis avant trafic payant

- vérifier la boîte `bertrand@safe-pilotage-prive.fr` ;
- vérifier l’expéditeur Brevo ;
- tester notification, accusé et prise de rendez-vous ;
- valider les CGV et la politique d’annulation du SAFE Scan ;
- configurer Stripe et tester le paiement ;
- créer les identifiants GA4 / Google Ads et la CMP ;
- valider toutes les affirmations d’hébergement selon l’architecture réellement vendue ;
- produire une démonstration vidéo courte dès que le premier environnement réel est disponible.

À ce jour, aucune plateforme publicitaire OpenAI en libre-service n’a été confirmée pour ce plan. Traiter les visiteurs provenant d’assistants IA comme un canal de recommandation mesurable, sans budgéter « OpenAI Ads » avant disponibilité et accès vérifiés.
