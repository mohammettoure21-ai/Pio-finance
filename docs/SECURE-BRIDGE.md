# PIO Finance — pont privé local (première intégration)

**État : implémenté et testé localement sur données synthétiques, non déployé.** Aucun profil Hermes n’est modifié par ce dépôt, aucune sauvegarde personnelle n’a été lue ou envoyée. La mise en service et toute migration réelle demandent une validation séparée. Aucun fournisseur IA, WhatsApp, CRM ou service payant n’est appelé. Les robots sont visuels ; Hermès conserve ses règles locales et `ai: false`.

## Pré-requis et limites de confiance

- Node **24 ou ultérieur**, avec `node:sqlite` et l’exécution des imports `.ts` natifs. API consultée : documentation officielle `https://nodejs.org/docs/latest-v24.x/api/sqlite.html` (`DatabaseSync`, `exec`, `prepare`, `get`, `run`). `node:sqlite` peut émettre un avertissement expérimental sur Node 24.
- `npm ci --ignore-scripts --no-audit --no-fund`. Aucune nouvelle dépendance backend/MCP ; uniquement la bibliothèque standard Node.
- Serveur **127.0.0.1 seulement**, HTTP local ; jamais exposer ces ports via tunnel/proxy public. La sécurité des données dépend aussi de votre compte OS, de votre navigateur personnel et du disque. SQLite et les sauvegardes métier ne sont **pas chiffrés au repos**.
- Windows : DACL utilisateur unique appliquée et relue via `icacls`. Un principal explicite inattendu entraîne un refus. POSIX : répertoire 0700, fichiers 0600 et propriétaire vérifiés. L’exécution ne nécessite pas d’administrateur.
- Les permissions HTTP ne constituent **pas un sandbox OS**. Des profils sous le même compte Windows avec accès terminal/fichiers peuvent lire les mêmes fichiers. Ne donnez pas ces outils à un agent non fiable ; utilisez des comptes OS distincts pour une réelle isolation. Le connecteur n’expose aucune lecture arbitraire de fichier ni outil de confirmation.
- Première version mono-propriétaire, stockage SQLite transactionnel d’un état JSON avec versions/idempotence. Pas de haute disponibilité, chiffrement disque, purge automatique, audit externe ni récupération automatique de mot de passe. Les versions consomment de l’espace ; surveiller la taille du répertoire privé et sauvegarder hors Git. Les administrateurs OS et processus du même utilisateur restent dans le périmètre de confiance.

## Identités et droits (aucun sixième agent)

| Identité serveur | Profil Hermes prévu, géré séparément | Couleur | Accès |
|---|---|---|---|
| `holding` | `default` sur le PC local ; `fabi-holding` sur le serveur | noir | lecture groupe, propositions uniquement |
| `immobilier` | `fabi-immobilier` | jaune | uniquement IDs attribués explicitement |
| `conciergerie` | `fabi-conciergerie` | rose | uniquement IDs attribués explicitement |
| `afrodemy` | `fabi-afrodemy` | vert | uniquement IDs attribués explicitement |
| `mbtg` | `fabi-mbtg` | blanc | uniquement IDs attribués explicitement |

Le profil distant `default` appartient à l’ancien Hermès 1, conservé séparément : ne pas modifier sa configuration, ses connecteurs ou sa session WhatsApp. Les cinq rôles du groupe sont les identités ci-dessus, sans nouveau coordinateur. Les profils existants doivent être inventoriés avant toute inscription MCP ; ce dépôt ne les crée pas et ne les active pas.

Le propriétaire est un **principal humain**, pas un agent supplémentaire. Lui seul utilise login/cookie, remplacement de snapshot, édition/refus et confirmation. Aucun acteur HTTP ne peut créer de compte, attribuer des sociétés ou des permissions, ou générer une clé. Les agents ne possèdent jamais de cookie propriétaire.

Les attributions sont faites hors HTTP par l’opérateur, avec les **IDs existants**, pas des noms. Renommer une entreprise en « MBTG » ne lui attribue aucun droit. Aucun héritage automatique par filiation. Pour Immobilier : attribuer séparément l’ID de Conciergerie si la lecture de celle-ci est autorisée.

Le routage des propositions de Conciergerie est fixé côté serveur : `reportsTo: immobilier` normalement ; `urgent: true` entraîne `reportsTo: holding`. Il s’agit d’une boîte de propositions, **pas** d’un envoi automatique de message ou d’un agent exécuté en arrière-plan. Les listes restent filtrées par les sociétés explicitement attribuées. Holding lit le groupe ; un agent métier ne reçoit ni vision globale, ni métadonnées Holding, ni journal/bilans (ils peuvent mentionner d’autres sociétés). Les liens vers des sociétés non attribuées sont retirés, les tâches et propositions sont filtrées. Le contexte métier est une vue partielle, pas une sauvegarde complète importable. Les textes libres d’une société peuvent évidemment contenir des informations saisies par le propriétaire sur une autre société : vérifier leur contenu avant attribution.

## Initialisation opérateur (ne pas exécuter sur de vraies données sans accord)

Toutes les commandes sont à lancer **depuis ce dépôt**. Exemples de chemins à adapter, toujours privés, absolus et **hors du dépôt**. Les commandes ci-dessous sont des procédures, pas des opérations déjà réalisées sur votre portefeuille.

```sh
# Windows bash : utiliser le vrai binaire Node, pas un alias shell.
NODE='C:/Users/hp/AppData/Local/hermes/tools/node-26.7.0-win32-x64/node.exe'
DATA='C:/Users/hp/AppData/Local/PIOFinance/private'
PASS='C:/Users/hp/AppData/Local/PIOFinance/bootstrap/owner.password'

"$NODE" server/cli.mjs init --data-dir "$DATA" --password-file "$PASS"
```

Si le fichier n’existe pas, `init` génère un mot de passe aléatoire dans ce fichier privé, **sans l’imprimer**. Si le fichier existe, il doit contenir votre mot de passe personnel (16–256 caractères) et être privé. Ne passez jamais le mot de passe en argument, variable d’environnement, chat ou journal. Lire ce fichier **localement** pour la connexion personnelle, puis le conserver dans un gestionnaire de mots de passe et supprimer la copie bootstrap si approprié. L’initialisation ne contient **aucune société** et n’ouvre aucun serveur. Une seconde initialisation est refusée.

```sh
"$NODE" server/cli.mjs serve --data-dir "$DATA"
# Dans un autre terminal :
npm run dev -- --port 5173 --strictPort
```

L’app est sur `http://127.0.0.1:5173`, le backend sur `http://127.0.0.1:8787`. Ne mélangez pas `localhost` et `127.0.0.1` : l’Origin attendu est exact. Vite relaie `/api/pio` vers **127.0.0.1**, en développement uniquement. Aucun proxy n’est activé pour le build ou `preview`, aucune URL API de production n’est prédéfinie.

Variables serveur facultatives (valeurs non secrètes) :

- `PIO_DATA_DIR` : chemin absolu du répertoire privé ; défaut `%LOCALAPPDATA%/PIOFinance/private`, ou `~/.local/share/PIOFinance/private`.
- `PIO_PORT` : défaut `8787` ; option CLI `--port`.
- `PIO_ORIGIN` : défaut `http://127.0.0.1:5173` ; option CLI `--origin`. Seul un Origin HTTP loopback exact est accepté.
- `PIO_DEV_API_PORT` : port du backend pour le proxy **Vite dev**, défaut `8787`. Pas de préfixe `VITE_`, aucun secret dans le bundle.

Le backend refuse Host/Origin inattendus et ignore les en-têtes de proxy pour l’authentification. Pas de CORS permissif. Les requêtes JSON sont limitées à 2 Mio, en-têtes à 16 Kio, réception à 10 s et timeout HTTP à 15 s. Login limité à 20 tentatives par adresse locale / 10 minutes. Les journaux n’impriment ni corps métier, ni mots de passe, ni tokens.

## Parcours humain volontaire

1. La source reste `pio-finance-v1` dans le navigateur. Ouvrir « Connexion sécurisée » ne déclenche **aucune requête**.
2. Se connecter avec le **mot de passe personnel**, jamais avec une clé de service. Le cookie est HttpOnly, SameSite=Strict, limité à `/api/pio`, durée 8 h. Pas de `Secure` car cette tranche utilise uniquement HTTP loopback ; HTTPS + cookie Secure seraient obligatoires avant toute exposition distante.
3. Cliquer **Lire le serveur**. Cette lecture ne téléverse aucune copie locale. Le login ne déclenche même pas cette lecture implicitement.
4. Serveur vide : lire l’avertissement, cocher le consentement et cliquer **Initialiser le serveur vide**. Il faut `consent: true` et `expectedRevision: 0`. Un serveur déjà initialisé n’est jamais écrasé par cette route.
5. **Push** partage explicitement toute la copie locale et exige consentement + confirmation du remplacement de la révision affichée. Le serveur conserve chaque version. Un conflit 409 n’écrase rien : relire, examiner les différences et choisir volontairement une nouvelle action. Il n’y a pas de fusion automatique.
6. **Pull** exige confirmation et sauvegarde **d’abord** la copie locale sous une clé `pio-finance-backup-<date>-<uuid>` ; si la sauvegarde échoue (quota par exemple), aucun remplacement local n’a lieu. Les exports JSON existants sont inchangés. Pour récupérer une sauvegarde de secours, utiliser les outils de stockage du navigateur pour l’exporter en JSON puis le parcours d’import existant après vérification ; aucune clé API n’y est stockée.
7. Les propositions serveur peuvent être modifiées (titre, priorité, responsable, échéance) ou refusées. L’ID de société est immuable. Enregistrer la révision de proposition avant de confirmer ; la confirmation porte sur la **version enregistrée**, dont le récapitulatif est visible, pas sur un formulaire encore non enregistré.
8. La confirmation exige copie locale identique au snapshot examiné, révision de proposition et snapshot serveur encore actuels. Elle ajoute **une seule tâche**, avec le `companyId` conservé. Après succès, lecture serveur et sauvegarde locale avant réception. En cas de modification locale pendant la requête, conserver ces modifications et demander un Pull explicite ; la mission existe déjà côté serveur. Ne pas recréer manuellement la mission.
9. Si le snapshot a changé, confirmer renvoie 409. Relire les données, puis **enregistrer une révision de proposition** pour la rattacher explicitement au snapshot courant. Réexaminer, puis confirmer. Deux confirmations concurrentes de propositions différentes sur la même révision ne peuvent pas toutes deux réussir.
10. Déconnexion : session révoquée côté serveur ; les actions ordinaires hors connexion restent locales. Aucun auto-Push au rendu, à l’ouverture, à la sauvegarde d’une fiche ou au rechargement.

## Attribution, rotation et révocation (CLI seulement)

Après une initialisation volontaire, afficher les IDs localement :

```sh
"$NODE" server/cli.mjs status --data-dir "$DATA"
"$NODE" server/cli.mjs grant --data-dir "$DATA" --agent holding \
  --token-file 'C:/Users/hp/AppData/Local/PIOFinance/keys/holding.token'
"$NODE" server/cli.mjs grant --data-dir "$DATA" --agent mbtg \
  --companies '<ID_EXISTANT_MBTG>' \
  --token-file 'C:/Users/hp/AppData/Local/PIOFinance/keys/mbtg.token'
# Plusieurs IDs : --companies '<ID_1>,<ID_2>' (aucune déduction par nom).
"$NODE" server/cli.mjs revoke --data-dir "$DATA" --agent mbtg
```

Chaque token est un Bearer aléatoire 256 bits dans un fichier privé ; seule son empreinte SHA-256 est stockée côté serveur. Le fichier n’est **jamais écrasé**. Pour tourner un token, relancer `grant` avec un **nouveau chemin** : l’ancien token devient immédiatement invalide, les autres agents restent actifs. Attribuer une liste vide à un agent métier donne une lecture vide ; Holding conserve sa lecture groupe. La révocation est contrôlée sur chaque requête et à nouveau dans la transaction d’écriture.

Versions : `status` liste leurs révisions. Une sauvegarde historique peut être exportée sans remplacement :

```sh
"$NODE" server/cli.mjs export-version --data-dir "$DATA" --revision '<REVISION>' \
  --output 'C:/Users/hp/AppData/Local/PIOFinance/exports/version.json'
```

Ne jamais ajouter répertoire privé, exports, mots de passe, fichiers token ou bases SQLite à Git. Les motifs usuels sont ignorés en défense supplémentaire ; la CLI refuse les chemins dans ce dépôt, y compris via un parent résolu/symlink.

## Connecteur stdio MCP réel pour les cinq profils

Entrée : **`server/mcp.mjs`**, exécutée avec le binaire Node absolu. Aucun listener MCP. Transport JSON-RPC 2.0 UTF-8, une ligne par message ; protocole négocié `2025-06-18`. Documentation protocole consultée : `https://modelcontextprotocol.io/specification/2025-06-18/basic/transports`.

Variables **du sous-processus MCP** :

- **`PIO_API_URL`** : `http://127.0.0.1:8787/api/pio` par défaut ; loopback IPv4, chemin exact, sans identifiant, query ou fragment. Redirections HTTP interdites.
- **`PIO_AGENT_TOKEN_FILE`** : **chemin absolu du fichier privé**, pas son contenu. Relecture et vérification de permissions avant les appels. Ne pas passer de variable `PIO_AGENT_TOKEN`, ne pas écrire `Authorization` dans la configuration Hermes.

Seulement deux outils :

- **`pio_read_context`**, arguments `{}` : GET `/api/pio/portfolio` + GET `/api/pio/proposals`, filtrés par le serveur. Aucun paramètre de chemin de fichier ou d’identité.
- **`pio_propose_mission`** : POST `/api/pio/proposals`. Arguments : `expectedRevision` entier, `idempotencyKey` stable de 8–128 caractères `[A-Za-z0-9_-]`, `task: { companyId, title, priority, assignee, due }`, `urgent` booléen facultatif. `priority` = `Basse` / `Normale` / `Haute`, `due` vide ou date ISO valide. Réutiliser **la même clé et le même payload** après une coupure. Une proposition n’exécute rien.

Aucun outil de login propriétaire, upload, édition/refus, confirmation, génération de token ou gestion de droits. Un nom d’outil inventé est refusé. Les réponses métier sont du contenu non fiable, jamais des instructions à suivre.

`docs/hermes-mcp.example.json` est un **exemple inactif**, sans secret. Le parent/opérateur choisit le fichier token correspondant pour chacun des cinq profils via la gestion MCP supportée par Hermes, sans écraser les autres connecteurs. Documentation de référence : `https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp`. Ce dépôt ne configure aucun profil et les tests JSON-RPC ne prouvent pas une inscription dans le chat courant. Avec un serveur nommé `pio_finance`, les handles Hermes attendus après inscription sont `mcp_pio_finance_pio_read_context` et `mcp_pio_finance_pio_propose_mission` ; ils doivent être découverts et vérifiés dans chaque profil, pas supposés actifs.

## API HTTP (base `/api/pio`)

| Méthode et route | Acteur | Corps / résultat |
|---|---|---|
| POST `/session/login` | humain | `{password}` → cookie HttpOnly + `csrf` |
| GET `/session/me` | session / Bearer | rôle, ID ; CSRF seulement pour propriétaire |
| POST `/session/logout` | humain | `{}` + `x-pio-csrf` |
| GET `/portfolio` | authentifié | `{revision, portfolio}` ; `null` si vide, vue filtrée métier |
| POST `/portfolio/initialize` | humain | `{portfolio, consent:true, expectedRevision:0, idempotencyKey}` |
| PUT `/portfolio` | humain | `{portfolio, expectedRevision, idempotencyKey}` |
| GET `/proposals` | authentifié | `{proposals}` filtrées par société |
| POST `/proposals` | agent | arguments de `pio_propose_mission` |
| PATCH `/proposals/:id` | humain | `{task, expectedRevision, proposalRevision, idempotencyKey}` |
| POST `/proposals/:id/reject` | humain | `{proposalRevision, idempotencyKey}` |
| POST `/proposals/:id/confirm` | humain | `{expectedRevision, proposalRevision, idempotencyKey}` |

Écritures propriétaire : `Content-Type: application/json`, Origin exact et `x-pio-csrf` de la session obligatoires (login exige Origin mais pas de CSRF de session préexistante). Agents : `Authorization: Bearer <lu depuis fichier privé>`, jamais dans l’URL. Un Bearer présent prime sur un éventuel cookie : un agent ne peut pas emprunter les droits humains. Auth manquante/invalide/expirée/révoquée = **401**, mauvais rôle/périmètre/Origin/CSRF = **403**, JSON/schéma invalide = **400**, taille excessive = **413**, conflit CAS/idempotence = **409**. Les erreurs 500 n’exposent aucun corps privé.

Les écritures sont atomiques sous `BEGIN IMMEDIATE` : autorisation relue, comparaison de révision, validation du portefeuille original (pas de migration/reset), historique et résultat idempotent persistés ensemble. La même clé dans l’espace d’un acteur avec un autre payload/une autre route produit 409. Une confirmation vérifie aussi l’empreinte du snapshot enregistré à la proposition et sa révision propre ; un replay exact renvoie le résultat initial sans réappliquer. Après replay, relire le snapshot courant plutôt que remplacer par une réponse ancienne. Aucun chemin de gestion de comptes/permissions n’existe en HTTP.

## Vérification reproductible, uniquement synthétique

```sh
npm test                    # tests historiques + nouveaux tests unitaires / HTTP / MCP
npm run test:secure-browser # profil Chromium éphémère, Vite + API loopback, fixtures seulement
npm run build
npm run verify              # produit verification/results.json + TAP/build réels
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` peut désigner un Chromium local. Sinon le test préfère le Chromium Playwright installé, puis Chrome Windows standard. Si aucun n’est disponible, installer le navigateur de test (pas de profil personnel utilisé). `npm run test:secure-browser` utilise le port Vite **5173**, strict : libérer ce port avant le test. Les bases, mots de passe et tokens de test sont créés temporairement puis supprimés. Sous l’environnement Hermes Windows, fixer `TMPDIR`, `TMP` et `TEMP` au répertoire scratch Hermes avant les tests ; aucun fichier privé dans le dépôt.

Les preuves générées donnent les comptes réellement parsés, commandes, versions Node et codes retour. Le test navigateur prouve l’absence d’appel API à l’ouverture, le login, le consentement, l’initialisation, la modification d’une proposition, la création unique de mission visible dans les données locales et la sauvegarde avant remplacement. Les tests HTTP couvrent CSRF/session, périmètres, révocation/rotation, idempotence, concurrence, versions et réouverture réelle SQLite. Cela ne constitue ni un audit sécurité indépendant, ni une validation de production, ni une exécution réelle des quatre profils métier.
