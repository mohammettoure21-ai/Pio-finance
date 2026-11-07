# Vérification de la livraison Hermès

Base : c57f9b7a536f5f4f96d34814caf02708cf139b18.
Exécution locale Codex du 7 novembre 2026, Node 24.19.0, Chromium système.
Commande : PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run verify.

Résultats : 40 tests unitaires/HTTP/MCP, 1 test navigateur (plusieurs scénarios),
aucun échec, aucun skip. TypeScript et build Vite réussis. Avertissement Vite
non bloquant sur la taille du chunk Three.js. Le test Host utilise node:http
pour envoyer effectivement un Host étranger, refusé par le backend.

Protections exercées : sauvegarde illisible/inaccessible, export brut sans
écrasement, lecture serveur échouée/incohérente, cookie Secure en mode HTTPS,
Origin/Host/CSRF, invalidation de sessions sans changement des droits agents,
périmètres, révocation/rotation, concurrence, idempotence et persistance SQLite.

Le patch a été appliqué à une extraction propre de la base ; la comparaison du
contenu de chaque fichier livré avec le code testé est identique.
Les modèles systemd/nginx ne sont pas exercés sur le serveur cible.
Aucun déploiement, TLS réel, reboot cible, isolation système des rôles,
sauvegarde hors serveur ni lecture du portefeuille réel n'est attesté par ces tests.
Les tests utilisent uniquement des fixtures et profils navigateur éphémères.
