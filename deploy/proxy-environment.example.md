# Variables à configurer après accord, aucune valeur secrète fournie

Vercel : `PIO_BACKEND_ORIGIN=https://2-29-156-0.sslip.io` et `PIO_PROXY_KEY` générée séparément (32 octets aléatoires en base64url). Variables serveur uniquement, jamais préfixées VITE_. La fonction native `api/pio/[...path].js` remplace la réécriture externe statique ; ne pas appliquer l'ancien fragment de rewrite.

Caddy : même `PIO_PROXY_KEY` dans `/etc/pio-finance/proxy.env`, propriétaire root et mode 0600, chargé par EnvironmentFile de sa seule unité système. Aucune valeur réelle dans Git ou dans les commandes/logs. Une clé absente/vide est refusée par les matchers Caddy. Ne pas activer access-log d'en-têtes privés.

Origin du backend : `PIO_ORIGIN=https://pio-finance.vercel.app`, fichier `/etc/pio-finance/origin.conf` non secret. Backend système pio-service uniquement, pas de gestionnaire utilisateur/linger. Le login reste exposé via Vercel et protégé par authentification/CSRF/limitation applicative ; ce dispositif n'est pas un VPN.

Après validation : vérifier le binaire Caddy et sa syntaxe sans journaliser sa configuration résolue, le routage Functions Vercel/Vite, les quotas de compte, TLS public et le parcours complet sur fixtures. Aucun de ces contrôles distants n'est prétendu fait localement.
