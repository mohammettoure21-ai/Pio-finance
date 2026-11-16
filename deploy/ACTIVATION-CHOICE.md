# Choix unique, non exécuté

Backend : pio-finance.service.example (unité système pio-service).
TLS : caddy-pio.system.service.example + Caddyfile.example, clé serveur dans EnvironmentFile privé.
Frontend : Vercel existant + api/pio/[...path].js ; aucune rewrite externe directe.
MCP : stdio restreint sous pio-holding, un seul outil initial pio_read_context.

Ne pas activer simultanément les variantes utilisateur ou les anciens fragments.
Les fichiers ne créent ni clé, ni base, ni compte, ni service, ni déploiement.

Gates avant données réelles : accord sur l'exposition authentifiée, validation
Caddy/ACME et Vercel sur fixtures, lancement/confinement réel par rôle, transport
SSH dédié compatible avec les shells existants, restart/reboot, sauvegarde hors
serveur/restauration et copie de récupération indépendante de Windows.
