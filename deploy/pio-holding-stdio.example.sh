#!/bin/sh
# MODELE INERTE: commande forcée administrativement, exécutée comme pio-holding.
# Pas de shell arbitraire ni arguments contrôlés par le client.
# Node partagé doit être exécutable sans accès au HOME fabi.
set -eu
[ "$(id -un)" = pio-holding ] || exit 1
export PIO_API_URL=http://127.0.0.1:8787/api/pio
export PIO_AGENT_TOKEN_FILE=/var/lib/pio-roles/holding/private/pio.token
exec /opt/pio/runtime/node /srv/pio/current/server/mcp.mjs
