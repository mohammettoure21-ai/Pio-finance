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
- Les fiches de FABI Immobilier, FABI Conciergerie, Afrodemy et MBTG commencent sans montant ni pourcentage. Ajoutez entreprises, projets et filiales avec le bouton d’ajout.
- Cliquez sur un cercle : les onglets **Identité**, **Participation**, **Finances**, **Valorisation**, **Actifs & dettes**, **Expansion**, **Tâches** et **Notes** détaillent la fiche. **Enregistrer** applique les modifications à la carte et à la sauvegarde locale. Les liens circulaires sont refusés dans les deux vues.
- Glissez le fond pour déplacer la carte, utilisez +/− pour zoomer et le bouton de recentrage pour revenir à la vue initiale. Sur téléphone, le zoom initial privilégie la lisibilité ; glissez pour accéder aux autres cercles ou utilisez la recherche.
- L’écran **Tâches des entreprises** permet de créer, modifier, terminer et supprimer les tâches liées à une entreprise. Il affiche les retards et les jalons d’expansion datés. Les suppressions demandent confirmation ; supprimer une entreprise retire ses tâches et ses liens, mais conserve ses filiales.

## Données et confidentialité

Les données sont stockées dans le navigateur sous `pio-finance-v1`, sans transmission à un serveur. Les anciennes clés Life System restent intactes. Le site public contient uniquement les quatre noms initiaux, sans données financières personnelles.

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

Hermès affiche **IA non connectée**, sans réponses simulées. WhatsApp et les rappels automatiques ne sont pas connectés ; aucun envoi externe n’est effectué. Les alertes de suivi sont maintenant calculées à partir des tâches ; les anciens champs de statut manuel restent conservés dans les sauvegardes mais ne commandent plus les couleurs de la carte.

`src/finance/integrations.ts` définit les contrats pour un futur service IA, de rappels et WhatsApp. Une connexion réelle exigera un backend authentifié, des secrets côté serveur et une validation des droits. Les propositions de modification IA devront être récapitulées puis confirmées avant toute application. Les notes peuvent déjà être ajoutées manuellement depuis Hermès, avec aperçu et confirmation. La CSP actuelle limite les connexions au même domaine ; elle devra être adaptée uniquement aux services effectivement connectés.

## Carte et suivi V2

L’accueil ouvre la structure cible : **FABI Holding** en préparation, au-dessus des quatre entreprises, reliées par des intentions de détention. Cela ne change aucun détenteur actuel. Le lien métier entre FABI Immobilier et FABI Conciergerie est étiqueté séparément et ne représente aucune détention.

La migration locale ajoute MBTG (Modern Business Tech Group) et les liens cibles de ces entreprises une seule fois. Elle préserve les identifiants, notes, tâches, chiffres et liens déjà renseignés ; les suppressions ou changements suivants ne sont pas annulés au rechargement.

L’interface est noire et blanche, sauf les alertes de tâches :

- Orange : au moins une tâche d’urgence **Haute** non terminée, ou une tâche en retard.
- Rouge : au moins **deux** tâches d’urgence Haute non terminées, ou **trois** tâches en retard.
- Neutre / à jour : aucune tâche urgente ou en retard. Sans tâche renseignée, le statut indique « Aucune tâche ».

Une tâche en retard est une tâche non terminée dont l’échéance est antérieure à la date locale du jour. Terminer, supprimer ou modifier une tâche recalcule l’alerte. Une baisse du chiffre d’affaires ne change pas les couleurs. Les compteurs en haut montrent entreprises, tâches ouvertes, urgentes et retards ; aucune consolidation financière risquant de compter deux fois les filiales n’est affichée.

L’ancien écran « Chaque action compte / Échéancier / Hermès, votre suivi » devient **Tâches des entreprises**. Les tâches sont regroupées par entreprise, filtrables par entreprise et par état, avec les tâches à faire affichées par défaut. WhatsApp, les rappels automatiques et l’IA ne sont toujours pas connectés : aucune notification n’est envoyée. La saisie de notes dans Hermès fonctionne localement, sans simuler de conversation IA.

## Périodes financières et fiches détaillées

L’onglet Finances conserve plusieurs périodes indépendantes par entreprise. Chaque période peut avoir un nom (exercice 2025, trimestre, mois…), des dates, une devise, un chiffre d’affaires, des charges, un résultat, une trésorerie et des dividendes reçus. Ajouter un exercice ne remplace pas les précédents. Le changement de période ne sauvegarde pas la fiche : le bouton **Enregistrer** confirme l’ensemble des modifications.

Les anciens champs financiers restent intacts dans les sauvegardes ; ils alimentent la première période tant qu’aucun historique n’a été saisi. Ensuite, `financialRecords` contient les données détaillées. Une liste explicitement vidée ne fait pas réapparaître les anciens chiffres. Les exports/imports JSON conservent tout l’historique ; la suppression d’une période demande confirmation.

Les fiches expliquent les différences entre revenus de la société, résultat, trésorerie et dividendes personnellement reçus. La valorisation reste séparée, datée et associée à une devise, une méthode et un pourcentage personnel effectif. Aucun cumul de périodes, devises ou sociétés n’est présenté comme une consolidation fiable.

Le lien métier FABI utilise un court trait en tirets entre les cercles, sans flèche ; les liens de détention issus de FABI Holding restent continus. Les règles de couleurs restent disponibles sous « Comprendre les alertes de la carte » dans les tâches, sans occuper la liste principale. Hermès conserve son bouton séparé ; il ne donne plus son nom aux tâches des entreprises.

## Structure cible à trois pôles

FABI Holding regroupe trois pôles : FABI Immobilier, Afrodemy et MBTG. FABI Conciergerie apparaît sous Immobilier dans la projection cible, sans modifier les détentions actuelles. La migration V3 adapte une seule fois le lien cible par défaut de Conciergerie ; elle conserve les identifiants, données financières, notes, tâches et liens personnalisés, et évite les cycles. Les modifications ultérieures restent conservées.

Les cinq robots sont noir (Holding), jaune (Immobilier), rose (Conciergerie), vert (Afrodemy) et blanc (MBTG). Seuls les tirets des connexions défilent ; la position de l’arbre reste fixe. La préférence système de réduction des animations est respectée.

## Mon monde — campus interactif

L’accueil ouvre maintenant un campus tech interactif. Les bâtiments et robots sont cliquables : sélectionnez un quartier pour ouvrir la fiche existante, donner une mission, consulter les tâches ou porter un rapport. La carte des participations reste accessible dans la navigation. Le campus est une représentation de travail, pas une déclaration de détention juridique.

Les robots réagissent aux données locales :

- **En veille** : aucune mission ni activité récente, ou trois jours sans action enregistrée. Les yeux se ferment et des « Z » apparaissent.
- **Au travail** : tâches ouvertes et activité récente (le début du suivi sert de repère pour les tâches préexistantes).
- **À jour** : activité récente et aucune tâche ouverte.
- **Débordé** : au moins six tâches ouvertes ou trois retards. Le robot montre sa fatigue et des gouttes de sueur. Cet état prévaut sur la veille.

Terminer une mission depuis le campus déclenche une livraison animée avec un rapport papier. Le bouton « Porter un rapport » permet aussi de l’envoyer manuellement. Le robot suit les détenteurs envisagés renseignés avant Holding ; Conciergerie passe donc par Immobilier dans la structure par défaut. La réception est enregistrée à l’arrivée, sans terminer d’autres tâches ni modifier les finances. Une seule livraison est montrée à la fois ; quitter le monde interrompt une livraison en cours. La réduction des animations est respectée, avec réception immédiate. Sur mobile, faites défiler le campus horizontalement pour découvrir les autres quartiers.

Hermès est accessible au poste de pilotage : synthèse factuelle de la charge, états des robots, priorités, tâches et notes. Aucune IA externe n’est connectée.

Un journal daté est ajouté aux sauvegardes existantes sans inventer les dates des anciennes actions. Il est exporté et importé avec les autres données ; les anciens fichiers restent compatibles. Les imports remplacent les données après confirmation et ne sont pas comptés comme des actions productives. Les suppressions, modifications de fiches et changements de tâches alimentent le journal.

**Bilans hebdomadaires** : à partir du lundi, à l’ouverture du site (ou lors du contrôle chaque minute s’il est ouvert), Holding archive une seule fois la dernière semaine complète écoulée. Les périodes antérieures manquées ne sont pas reconstituées. Le bilan indique les tâches distinctes marquées terminées, les créations et les actions datées de la semaine ; la charge ouverte et les retards sont photographiés au moment de sa préparation, pas rétroactivement au dimanche. Un avertissement distingue les semaines partiellement suivies. Ces indicateurs mesurent le suivi des tâches, pas la rentabilité ; aucun total financier consolidé n’est inventé. Le journal conserve 20 000 événements et les 104 derniers bilans.

Le fonctionnement reste local au navigateur : pas d’exécution lorsque le site est fermé, pas de notification ou d’envoi externe automatique. Pour un vrai envoi programmé ou une IA conversationnelle, il faudra un backend authentifié et des services configurés.

```sh
npm test # 14 tests portefeuille + 4 tests du monde
npm run build
npm run dev -- --port 5173 --strictPort
# Dans un autre terminal :
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:world
```
