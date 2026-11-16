# Livraison locale intégrée — aucune publication/activation

## Sources et périmètre

- main/AZQAR : `457901275d68b73020edec1f60f7bb1265c7ccc1`.
- feat/hermes-holding-bridge : `22d8d8200ec09fa2c340e111d254bfd7f0de8a5b`.
- Clone indépendant durable : `C:/Users/hp/AppData/Local/hermes/workspaces/fabi-holding/pio-deployment-candidate`.
- Branche uniquement locale : `candidate/main-holding-integration` ; aucun push.
- Le checkout `.../pio-finance` n'a pas été modifié. Aucun profil, serveur,
  navigateur propriétaire, compte réel, clé réelle ni donnée financière consulté.
- Ce document remplace les hypothèses de déploiement historiques des autres guides.

## Intégration et preuves

Les cinq conflits de fusion concernent package.json, App.tsx, SecureConnection.tsx,
secure.css et secure.ts. Les composants/flux de main sont conservés : accueil AZQAR,
Procolore bleu, migrations et sauvegarde avant AZQAR, connexion guidée explicite,
validation du rôle propriétaire, refus des redirections. Le backend et les outils
HTTP/MCP de bridge sont ajoutés sans retirer les droits de proposition existants.

Un seul complément comportemental : conserver l'export brut de secours du bridge
avec le chargement AZQAR de main. Le test navigateur a d'abord échoué sur cet
export absent, puis est passé après ajout de `raw` au résultat de loadPortfolio et
bouton d'export dans l'écran bloqué. Aucun portefeuille de remplacement n'est affiché
ou transmis en cas d'erreur, aucune réparation automatique du stockage invalide.
Les attentes des tests navigateur bridge suivent maintenant le panneau guidé réel
et les libellés main, au lieu d'ajouter un deuxième panneau de connexion.

`verification/red-initial-merge.json`, `red-initial-merge-browser.log` et
`red-raw-export.log` conservent les échecs observés. `verification/results.json`
et les logs par étape contiennent la vérification finale réelle. La commande est :

```sh
TMPDIR='C:/Users/hp/AppData/Local/hermes/cache/scratch' \
TMP='C:/Users/hp/AppData/Local/hermes/cache/scratch' \
TEMP='C:/Users/hp/AppData/Local/hermes/cache/scratch' npm run verify
```

Environnement exercé : Node v26.7.0, npm 12.0.2 ; dépendances existantes copiées dans
le candidat, sans jonction ni modification de l'ancien checkout, sans installation.
`npm ls --depth=0` a réussi. Le runner couvre aussi maintenant AZQAR, connexion,
Holding, restauration et proxy TLS. Total TAP final : 56 passés, 0 échec,
0 annulé, 0 ignoré ; 50 unitaires/HTTP/MCP, 1 navigateur réel avec backend,
5 pour la suite principale navigateur (4 scénarios feuilles + son conteneur TAP).
TypeScript et Vite build : codes 0. `dist/` est l'artefact de production local.
Avertissement Vite non bloquant conservé : chunk robot3d de 523,49 kB (>500 kB),
sans modification de Three.js ni abaissement artificiel du seuil.

Vérifications synthétiques : rejet non authentifié ; rôle propriétaire/agent ;
lecture Holding du groupe exact sans mutation d'état ; refus d'écriture/confirmation
et gestion des droits ; périmètres société par ID ; idempotence ; CAS et conflits ;
révocation et races ; lecture/appel MCP réels ; redémarrage SQLite ; consentement,
initialisation explicite, examen/édition et confirmation unique, copie locale de
secours, blocage du stockage illisible/inaccessible. Holding peut toujours proposer
une mission non appliquée : « lecture seule » ne signifie pas suppression de cet
outil existant. Aucune mission effective sans confirmation humaine.

Les quatre scripts navigateur de main passent : connexion guidée sans API à
l'ouverture et service absent, AZQAR/mobile/migration/sauvegarde/Procolore, opérations
portefeuille/export/import, campus/robots/rapports/suggestions. Profils Chromium
éphémères uniquement. Les captures de test sont dans le scratch indiqué par les logs.

## Persistance, sauvegarde et restauration réellement testées

`tests/backup-restore.test.mjs` : portefeuille AZQAR fictif, base arrêtée et fermée,
archive tar, SHA-256, chiffrement GPG avec trousseau et clé éphémères exclusivement
créés dans le scratch, déchiffrement, checksum identique, extraction dans un autre
dossier, checksum SQLite identique, `PRAGMA integrity_check=ok`, réouverture et état
exact (portefeuille, révision, historique, autorisations). Puis commandes CLI réelles
`invalidate-sessions` et `revoke --agent holding`, refus HTTP 401 des anciens accès,
nouvelle authentification propriétaire et relecture intacte. Le trousseau de test est
supprimé ; aucune clé de production n'a été créée/lue. Ce n'est ni une sauvegarde du
portefeuille réel ni une copie hors serveur vérifiée.

## HTTPS : support existant, sans relâcher CORS/CSP/CSRF

Le dernier bridge accepte déjà une origine HTTPS EXACTE ; aucune adaptation
production supplémentaire n'était nécessaire. `server/http.mjs` impose Host
loopback, Origin exact pour les écritures humaines et CSRF ; les cookies sont
HttpOnly, SameSite=Strict, Secure si PIO_ORIGIN est HTTPS. Les en-têtes Forwarded
ne sont pas une autorisation. Aucune configuration CORS à credentials n'est fournie.
Le client utilise `credentials: same-origin` et des chemins `/api/pio` relatifs.
CSP `connect-src 'self'` conservée, sans URL backend dans le bundle.

Conséquence : ne pas faire appeler sslip.io directement par le navigateur Vercel.
Cela demanderait un changement de client/CSP/CORS et rencontrerait les cookies
cross-site. Proposition : navigateur sur `https://pio-finance.vercel.app`, rewrite
externe Vercel `/api/pio/:path*` vers
`https://2-29-156-0.sslip.io/api/pio/:path*`, puis Caddy TLS → `127.0.0.1:8787`.
PIO_ORIGIN reste `https://pio-finance.vercel.app`, PAS le domaine du backend.
Caddy doit réécrire Host vers `127.0.0.1:8787`, conserver Origin et Set-Cookie.
Le fragment JSON n'est PAS appliqué à vercel.json ; les règles SPA existantes et
la CSP doivent être préservées et l'API placée avant le repli SPA.

`tests/https-proxy.test.mjs` exerce un VRAI proxy TLS local Node avec certificat
fixture OpenSSL, CA explicitement approuvée par le client (aucun TLS désactivé),
Host réécrit, Origin Vercel, cookie Secure, CSRF/logout et rejet origine sslip.io.
C'est une preuve du contrat HTTP/TLS local, pas de Vercel, Caddy, DNS, certificat
public, réplication du cookie dans un navigateur HTTPS distant ou réseau réel.

## Modèles strictement inertes et verrou production

- `deploy/pio-finance.user.service.example` : service utilisateur sous pio-service,
  port 8787, origine Vercel. Aucun User= dans une unité utilisateur. Le user-manager
  et linger de CETTE identité ne sont pas prouvés. Ne pas utiliser le manager fabi.
- `deploy/pio-finance.service.example` : variante système préexistante, ne pas
  activer les deux. L'administrateur choisit la variante et exerce les protections.
- `deploy/caddy-pio.system.service.example` : unité créée administrativement,
  processus non-root caddy, capacité CAP_NET_BIND_SERVICE limitée au service pour
  ports privilégiés (80 pour ACME/443 TLS), aucun nouveau droit accordé à fabi.
- `deploy/Caddyfile.example` : API seulement, loopback upstream, accès refusé par
  défaut : l'allowlist TEST-NET `192.0.2.1/32` est volontairement INUTILISABLE en réel.
- `deploy/vercel-api-rewrite.fragment.json` : proposition non appliquée.

Le pont était prévu derrière accès PRIVÉ approuvé. L'authentification applicative
ne vaut pas accord d'exposition Internet. Une rewrite externe Vercel nécessite un
backend joignable par Vercel ; elle n'apporte pas à elle seule un contrôle d'accès
privé. Origin/Host ne sont pas une authentification du proxy. Ne pas remplacer
l'allowlist documentaire par toutes les IP Vercel ni par 0.0.0.0/0. La méthode
exacte de contrôle réseau/proxy, sa compatibilité avec le plan Vercel existant et
son test doivent être validés séparément avant l'ouverture. Le modèle bloque tant
que ce choix manque. Aucun secret embarqué dans Git/JSON ni nouvelle plateforme.

Caddy/systemd ne sont pas installés/exécutés ici ; aucune validation `caddy validate`
ou `systemd-analyze verify` sur la cible n'est prétendue. La récupération du guide
Caddy via TLS local a échoué (certificat expiré) : TLS n'a pas été désactivé pour
contourner ce refus. Vérification admin du binaire, schéma, TLS/ACME, pare-feu,
liens/volumes, renouvellement, restart et reboot toujours requise.

## Préparations serveur rapportées par le parent, non réinventoriées ici

Cible personnelle 2.29.156.0, Node v26.12.1 au chemin
`/home/fabi/.hermes/tools/node-26.12.1-linux-x64/bin/node` (node:sqlite confirmé par
le parent). `/opt/pio/runtime/node` existe mais son exécution sous comptes techniques
reste à vérifier. Comptes pio-service et pio-{holding,immobilier,conciergerie,afrodemy,mbtg}
EXISTANTS, shell nologin. `/var/lib/pio-finance/private` existe, contenu non lu.
`/srv/pio` absent, pas de backend actif ni unité PIO système. Ne pas recréer comptes,
ni initialiser/écraser une base à l'aveugle. Aucun runtime Hermes actif rapporté,
manager utilisateur fabi inactif. Ce sont les constats du parent, pas les tests locaux.

## Bootstrap propriétaire (à exécuter ultérieurement après approbation)

Sous pio-service seulement, après vérification de l'état privé, runtime partagé et
code immuable :

```sh
/opt/pio/runtime/node /srv/pio/current/server/cli.mjs status --data-dir /var/lib/pio-finance/private
# init UNIQUEMENT si état réellement neuf validé ; pas de mot de passe argv/env/chat :
/opt/pio/runtime/node /srv/pio/current/server/cli.mjs init --data-dir /var/lib/pio-finance/private --password-file /var/lib/pio-finance/owner-bootstrap/password.txt
```

La CLI crée un mot de passe aléatoire dans le fichier privé hors dépôt, ne l'imprime
pas et refuse une base déjà initialisée. Le propriétaire doit obtenir personnellement
ce fichier par le canal privé approuvé et saisir le mot de passe dans le site ;
il ne faut ni l'envoyer au chat ni laisser les rôles accéder à ce répertoire.
Attention : `status` ouvre/crée aussi le stockage ; ce n'est pas une sonde sans effet
sur un dossier inexistant. Faire d'abord l'inventaire fichiers sans lire leur contenu.
Le login `POST /api/pio/session/login` crée une session de 8 h ; `/session/me` fournit
le CSRF propriétaire. Lire volontairement `/portfolio` ; seule réponse authentifiée
`revision=0, portfolio=null` prouve un serveur vide. L'initialisation exige consentement,
révision attendue et idempotencyKey ; aucun transfert privé autorisé par ce guide.

L'attribution agent relève uniquement de l'opérateur via CLI, pas d'un outil MCP.
Après import approuvé, récupérer les vrais IDs avec status ; aucune attribution par
nom. Holding groupe utilise `grant --agent holding --token-file <fichier-prive>`.
Ne pas exécuter ce grant avant cloisonnement/approbation ; ne pas écraser une clé
existante. Sauvegarde, révocation, permissions, récupération et rotation restent requis.

## MCP Holding sur les DEUX runtimes existants, sans configuration modifiée

Binding personnel : Desktop default `HERMES_HOME=C:/Users/hp/AppData/Local/hermes` ;
serveur personnel default `HERMES_HOME=/home/fabi/.hermes`. `fabi-holding` est l'ancien
serveur partagé EXCLU ; la phrase historique « jamais à default » ne s'applique
PAS à ces deux Holding. Aucun autre profil n'est créé.

Le serveur MCP est STDIO, non HTTP/MCP distant : `PIO_API_URL` doit rester
`http://127.0.0.1:8787/api/pio`, `PIO_AGENT_TOKEN_FILE` fichier privé sous l'identité
pio-holding. HTTPS distant est explicitement REFUSÉ par server/mcp.mjs. Outils
pio_read_context et pio_propose_mission seulement, sampling désactivé, aucune
confirmation ni administration, aucun cookie/mot de passe propriétaire.

Modèles `hermes-holding-desktop.example.json` et
`hermes-holding-personal-default.example.json` : SSH stdio vers une commande
forcée qui exécute `pio-holding-stdio.example.sh` sous pio-holding, pas root/fabi.
Clés SSH dédiées par origine, clé hôte épinglée, aucun port forward, aucun shell
arbitraire. Pas de copie du bearer vers Windows. Les chemins PRIVATE-PIO sont des
placeholders, pas des clés créées. Le shell nologin existant PEUT bloquer cette
route SSH : son fonctionnement exige un lanceur/commande forcée administrativement
validé ; changer le shell ou des droits n'est PAS autorisé par cette préparation.
Aucun SSH de ce modèle n'a été essayé. Le modèle distant utilise 127.0.0.1, dont la
clé hôte et l'acceptation sshd pour cette identité sont également à valider.

Profils partageant le même UID fabi ne constituent PAS un sandbox. Une clé SSH
stockée sous ce même UID peut être lue/utilisée par ses autres processus ; une
commande forcée limite la commande, pas la confidentialité face au même UID.
L'exécution du connecteur sous pio-holding ne prouve pas le confinement de tous
les outils des cinq rôles. Pas de clés réelles ni activation privée avant résolution.

Les JSON décrivent la forme mcp_servers, ce ne sont pas des configurations actives.
Une inscription ultérieure doit utiliser la gestion MCP supportée et additive de
CHAQUE runtime après approbation, sans remplacer sa config ni ses autres serveurs.
Découverte outils, appel authentifié réel et lecture du portefeuille approuvé sont
à vérifier séparément ; les tests MCP locaux ne prouvent pas cette inscription.

Références documentaires consultées : documentation native MCP Hermes et réécritures
Vercel (copies de consultation dans verification/, hors artefact publié). Aucune
configuration distante, publication Git ou modification du site n'a été réalisée.
