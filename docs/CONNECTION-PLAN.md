# PIO → Hermès : dispositif soumis à validation

> Document historique : voir [la livraison locale intégrée](../docs/LOCAL-CANDIDATE.md) pour les sources testées, les bindings default personnels, les préparations serveur existantes et les modèles inertes. Aucune activation autorisée par ce fichier.

Le propriétaire a validé le dispositif et demandé le démarrage de sa préparation.
Codex prépare les éléments locaux ; Hermès et l’administrateur assurent l’exécution
distante selon les prérequis. Aucun transfert privé ni
connexion réelle PIO démontrés. Cible unique : **2.29.156.0**. L'ancien serveur
46.62.133.137 est exclu. Base du code : c57f9b7a536f5f4f96d34814caf02708cf139b18,
avec les correctifs livrés dans la branche feat/hermes-holding-bridge.

## Faits et prérequis

Inventaire rapporté par Hermès, 7 novembre 2026 à 21:09 UTC : 68 Go libres,
7 % d'occupation, 3 266 Mio de RAM disponibles, aucun swap. Node 26.12.1 avec
node:sqlite à /home/fabi/.hermes/tools/node-26.12.1-linux-x64/bin/node ; Python,
Git, curl, OpenSSL, GPG disponibles. systemd 259, AppArmor, namespaces et seccomp
présents. Pas de proxy HTTPS ni de maintien utilisateur après déconnexion démontré.
Pas de Docker, Podman ou Bubblewrap trouvé dans le PATH inspecté. Les cinq profils
partagent fabi, UID 1000 : ils ne sont pas isolés. Aucun backup PIO hors serveur
ni restauration démontré. Codex n'a pas effectué cet inventaire SSH.

La clé SSH reste sur l'ordinateur d'Hermès, avec contrôle strict de la clé hôte.
Ne jamais transmettre clé, mot de passe, token, export ou base à Codex/Git/chat.
Ne pas déduire une authentification PIO des tests IA 5/5.

## Architecture retenue pour proposition

Le confinement complet des cinq rôles n'est pas disponible aujourd'hui : ne pas
émettre de clés réelles tant qu'il n'est pas établi. Choix proposé : identités Unix
séparées, provisionnées par l'administrateur dans une opération distincte et approuvée.
Fabi ne reçoit aucun nouveau droit, ne lance pas sudo et ne crée pas les comptes.
Si cette intervention n'est pas autorisée/disponible, le déploiement reste bloqué.

Identités techniques proposées (ce ne sont pas de nouveaux profils d'agents) :
- `pio-service` : backend uniquement, propriétaire de la base ;
- `pio-holding`, `pio-immobilier`, `pio-conciergerie`, `pio-afrodemy`, `pio-mbtg` :
  chacun exécute son rôle existant et ses outils sous sa propre identité.

L'administrateur prépare un runtime Node compatible, vérifié et lisible/exécutable
par ces identités, hors /home/fabi (par exemple /opt/pio/runtime/node). Ne pas ouvrir
le HOME fabi en changeant son mode 700. Le code du backend/connecteur est commun,
en lecture seule, sous /srv/pio/releases/<version> ; /srv/pio/current sélectionne la
version activée. Le frontend est compilé hors serveur, pas de Vite de développement
en production. Ne pas copier node_modules natifs d'un autre système.

État : /var/lib/pio-finance/private/pio.sqlite, répertoire 0700 et fichiers 0600,
propriété pio-service. Clés propres à chaque rôle dans son HOME privé 0700,
fichier 0600, jamais sous le répertoire du code ou dans une variable contenant la clé.
Le mot de passe humain et les sauvegardes ne sont montés dans aucun rôle.
Vérifier le chiffrement du volume ; SQLite n'est pas chiffré par l'application.
Si un chiffrement au repos est requis mais indisponible, pas d'import privé.

## Exécution permanente et isolation

Préparer une unité système dédiée `pio-finance.service`, User=pio-service,
WorkingDirectory=/srv/pio/current, avec le Node absolu vérifié exécutant
`server/cli.mjs serve --data-dir /var/lib/pio-finance/private`.
Paramètres proposés : Restart=on-failure, RestartSec=5, UMask=0077,
NoNewPrivileges=yes, ProtectSystem=strict, ProtectHome=yes, PrivateTmp=yes,
ReadWritePaths limité à l'état PIO, et arrêt SIGTERM gracieux.
Les paramètres doivent être exercés avec Node/SQLite sur fixtures avant activation.
L'unité système démarre au boot sans dépendre du linger de fabi. Seul l'administrateur
pourra créer/activer cette unité après approbation ; aucune commande sudo pour fabi.
Tester reprise après panne et après reboot contrôlé avant les vraies données.

Chaque rôle existant doit réellement s'exécuter sous son identité propre, sans shell,
outil fichier, navigateur ou exécuteur distant capable de revenir sous fabi.
Les services de rôles doivent avoir systèmes de fichiers restreints, pas de groupes
partagés donnant accès aux secrets, pas de sockets SSH/gateway/conteneurs ou bus
utilisateur fabi, pas de capacité ptrace ou namespace permettant un retour hôte.
Les processus MCP héritent de cette même séparation et ne lisent que leur clé.
Cette réorganisation des cinq rôles exige une revue du lancement/gateway existant :
ne pas modifier les profils ou leur lancement pour improviser une solution.
AppArmor/systemd seuls ne sont pas une preuve d'isolation tant que les accès par
terminal, fichiers, navigateur, MCP et processus n'ont pas été testés.

Si les rôles restent lancés librement sous fabi, l'accès persistant au vrai portefeuille
est bloqué, même si les tests HTTP de périmètre réussissent.

## HTTPS et surface réseau

Backend sur 127.0.0.1:8787 uniquement. Connecteurs MCP stdio sur le même serveur,
PIO_API_URL=http://127.0.0.1:8787/api/pio ; une clé dédiée lue depuis son fichier privé.
Pas de listener MCP public. Pas d'ouverture publique du pont HTTP actuel.

Un nom HTTPS sur un domaine déjà détenu reste à désigner. Après approbation,
l'administrateur configure le proxy TLS et le renouvellement du certificat, sans
souscription payante. Aucun proxy n'est actuellement démontré ; installation/configuration
nécessitent une opération administrative distincte. Si une terminaison TLS extérieure
existe, vérifier son routage et la protection du lien jusqu'au backend.

Servir exclusivement dist/ (repli SPA), relayer /api/pio/ sur le backend loopback,
limiter JSON à 2 Mio, désactiver le cache API ; ne jamais servir bases, clés ou code
serveur. Restreindre l'accès au réseau privé ou contrôle d'accès existant approuvé.
Le backend accepte désormais une origine HTTPS exacte, avec cookies Secure,
et conserve Host loopback et CSRF. Les tests HTTP de ces règles sont exécutés
localement ; le certificat et le proxy TLS restent à exercer sur la cible.
Ne pas autoriser CORS global ni faire confiance aux en-têtes proxy d'un client.
La livraison contient cette adaptation HTTPS et des modèles sous deploy/, mais
aucune isolation de production installée ni configuration TLS activée.

## Droits et consentement

Exactement cinq rôles : Holding noir (lecture groupe), Immobilier jaune, Conciergerie
rose, Afrodemy vert, MBTG blanc (lecture des IDs explicitement attribués seulement).
Aucun héritage automatique depuis nom ou filiation ; l'ID Conciergerie doit être
attribué explicitement à Immobilier si approuvé. Aucun sixième coordinateur.
Conciergerie → Immobilier → Holding conservé, avec exception urgente vers Holding
préexistante. Le routage d'une proposition n'est pas une délégation de droits.

Clé aléatoire distincte par rôle, révocable et remplaçable avec la CLI existante ;
seule son empreinte est en base. Lecture permanente autorisée dans son périmètre,
proposition possible, aucune activation ni modification effective sans confirmation
humaine précise de la société, du titre, de la priorité, du responsable, de l'échéance
et des révisions affichées. Les agents n'ont ni mot de passe ni cookie propriétaire.
La session humaine expire ; la clé agent permet la continuité sans utiliser cette session.
Default, WhatsApp, FABI CRM, Life System et les autres connecteurs sont exclus.

## Backup, restauration et retour arrière

Destination proposée : PC personnel/support déjà détenu par le propriétaire,
à confirmer. GPG disponible sert au chiffrement à clé publique : seule la clé publique
validée est sur le serveur, la clé privée de restauration reste chez le propriétaire.
Aucune génération de clé ni configuration réalisée. Tester la récupération de cette
clé avant de dépendre du backup ; ne jamais fournir sa valeur en chat.

Backup cohérent : arrêter uniquement PIO, attendre fermeture SQLite, copier l'état
dans un nouveau dossier privé, calculer SHA-256, chiffrer, puis relancer PIO.
Ne pas copier la base active par simple copie. Les clés de rôle restent séparées.
Hermès transfère l'archive chiffrée vers le support approuvé via SSH authentifié ;
vérifier empreinte et présence hors serveur. Un backup local seul ne suffit pas.
Proposer 7 quotidiennes et 4 hebdomadaires ; aucune purge automatique tant que la
rétention et les suppressions ne sont pas explicitement approuvées.

Tester sur fixtures : déchiffrer et restaurer dans un dossier distinct, vérifier
PRAGMA integrity_check, schéma/portefeuille, révisions, lecture authentifiée et périmètres.
Restauration d'incident : préserver l'état incident, valider la révision à restaurer
et la perte éventuelle de changements avant bascule ; révoquer/tourner les clés et
invalider les sessions restaurées. La CLI fournit désormais `invalidate-sessions` pour invalider toutes les sessions
humaines ; l'opérateur doit l'utiliser avant remise en ligne d'une base restaurée.
La rotation des clés reste une action distincte.
Retour arrière du code seulement si la version précédente est compatible avec la base ;
jamais remplacer automatiquement une base récente par un backup ancien.

## Étapes proposées, à valider avant exécution distante

1. Appliquer et tester le patch dans une copie de développement du commit de base,
   hors production. Il contient les correctifs locaux, pas un déploiement complet.
2. Valider séparément le besoin d'intervention administrative : identités, runtime
   partagé, unités système, TLS/réseau et chiffrement du volume. Aucun nouveau droit fabi.
3. Exercer l’adaptation HTTPS livrée et concevoir/tester le lancement isolé des rôles ; produire
   un artefact identifié avant installation. Une inscription MCP est additive et
   limitée aux bindings approuvés : default est Holding sur le PC et le serveur personnel ; fabi-holding appartient uniquement à l’ancien serveur partagé exclu.
4. Sur fixtures exclusivement, prouver refus de fichiers/processus voisins, filtrage
   HTTP, refus de proposition hors périmètre, révocation/rotation, refus de confirmation
   agent même avec cookie humain, confirmation humaine et absence de doublons.
   Tester reboot et backup chiffré hors serveur/restauration.
5. Localiser l'origine/navigateur contenant réellement pio-finance-v1 avec le propriétaire ;
   sauvegarder la source brute localement. Une lecture illisible ou inaccessible bloque
   l'interface et toutes les écritures. Une erreur réseau/401/403/JSON ne signifie jamais
   serveur vide : seul GET authentifié valide revision=0, portfolio=null le prouve.
6. Après accord distinct pour le transfert privé, lire d'abord le serveur ; s'il possède
   déjà des données, examiner les différences sans écrasement. S'il est vide, import
   volontaire sauvegardé, pas d'invention de portefeuille ni de mission de test réelle.
7. Premier succès : GET authentifié Holding du portefeuille existant, révision inchangée,
   vérification locale par le propriétaire d'une donnée qu'il reconnaît ; rapporter succès
   et révision sans donnée privée. Vérifier ensuite les lectures filtrées par rôle.

Ne jamais annoncer une connexion réelle avant cette lecture authentifiée. Aucun
export privé, fichier .env, secret, base ou sauvegarde dans le patch ou dans Git.
