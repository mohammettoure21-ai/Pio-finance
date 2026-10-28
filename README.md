# PIO × Finance

Carte interactive pour suivre ses entreprises et préparer une future holding. React 19, TypeScript et Vite. Aucun backend ni service externe connecté.

## Développer

Utiliser Node.js 24 (validé avec 24.19.0) et npm 11.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Le build de production est généré dans `dist`. Ce projet utilise le dépôt indépendant `pio-finance`. Il ne modifie pas le projet Life System.

## Fonctionnement

- **Portefeuille actuel** : les traits représentent uniquement les détenteurs explicitement renseignés. Les entreprises sans détenteur restent non reliées.
- **Structure cible — holding en préparation** : une projection indépendante, sans transfert juridique présumé. Cliquez sur la holding pour modifier son nom. Renseignez les liens envisagés dans Participation.
- Les fiches de FABI Immobilier, FABI Conciergerie et Afrodemy commencent sans montant ni pourcentage. Ajoutez entreprises, projets et filiales avec le bouton d’ajout.
- Cliquez sur un cercle pour modifier identité, statut justifié et daté, participation, finances, valorisation, actifs, dettes, expansion et notes. **Enregistrer** applique les modifications à la carte et à la sauvegarde locale. Les liens circulaires sont refusés dans les deux vues.
- Glissez le fond pour déplacer la carte, utilisez +/− pour zoomer et le bouton de recentrage pour revenir à la vue initiale. Sur téléphone, le zoom initial privilégie la lisibilité ; glissez pour accéder aux autres cercles ou utilisez la recherche.
- L’échéancier permet de créer, modifier, terminer et supprimer les tâches liées à une entreprise. Il affiche les retards et les jalons d’expansion datés. Les suppressions demandent confirmation ; supprimer une entreprise retire ses tâches et ses liens, mais conserve ses filiales.

## Données et confidentialité

Les données sont stockées dans le navigateur sous `pio-finance-v1`, sans transmission à un serveur. Les anciennes clés Life System restent intactes. Le site public contient uniquement les trois noms initiaux, sans données financières personnelles.

Ce prototype n’a pas d’authentification, de chiffrement local, de synchronisation ni de sauvegarde distante. Utilisez un navigateur/profil personnel. Les boutons d’export et d’import JSON permettent de sauvegarder et restaurer les données. L’import valide le schéma, les références et les cycles, puis demande confirmation avant de remplacer la sauvegarde. Les exports peuvent contenir des informations privées : ne les ajoutez jamais au dépôt.

Le chiffre d’affaires, le résultat, la trésorerie et les dividendes reçus sont des champs distincts. La valeur indicative d’une participation utilise uniquement la valeur des capitaux propres et votre pourcentage personnel effectif, avec devise, date et méthode obligatoires. Aucun total consolidé mère + filiales n’est calculé : il risquerait de compter deux fois les mêmes valeurs. Les biens gérés pour un client ont une nature explicite et ne sont pas présentés comme des actifs personnels.

## Vérifier

```sh
npm test
npm run build
# Première installation du navigateur de test, si nécessaire :
npx playwright install chromium
npm run dev -- --port 5173 --strictPort
# Dans un second terminal :
npm run test:e2e
```

Le test navigateur utilise un profil éphémère et des données fictives. Pour utiliser un Chromium déjà installé : `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`. Les captures et l’export de test sont écrits dans un dossier temporaire, jamais dans `dist`. Le test couvre ajout/modification, cycles, distinction actuel/cible, tâches, rechargement, export/import et validation mobile à 375 px.

## Vercel

Créer un nouveau projet Vercel `pio-finance` relié à ce dépôt GitHub, branche de production `main`, framework Vite, commande `npm run build`, sortie `dist`. `vercel.json` fixe ces valeurs et les en-têtes de sécurité. Aucune variable d’environnement n’est nécessaire pour cette version. Si l’intégration GitHub est active, un push sur `main` doit lancer le déploiement ; son succès doit être vérifié dans Vercel.

## Intégrations futures

PIO affiche **IA non connectée**, sans réponses simulées. WhatsApp et les rappels automatiques ne sont pas connectés ; aucun envoi externe n’est effectué. Les préférences de règles de suivi sont enregistrées mais ne changent pas le statut manuel.

`src/finance/integrations.ts` définit les contrats pour un futur service IA, de rappels et WhatsApp. Une connexion réelle exigera un backend authentifié, des secrets côté serveur et une validation des droits. Les propositions de modification IA devront être récapitulées puis confirmées avant toute application. La CSP actuelle limite les connexions au même domaine ; elle devra être adaptée uniquement aux services effectivement connectés.
