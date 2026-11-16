# Liaison Holding choisie, non executee

Compte pio-holding existant. Commande forcee root-owned
/usr/local/libexec/pio-holding-stdio (contenu pio-holding-stdio.example.sh),
code immutable /srv/pio/current, fichier token propre au compte.
Fragment sshd-holding.example.conf : authentification cle publique uniquement,
commande imposee, aucun shell arbitraire/TTY/forwarding/environnement utilisateur.
Cle publique en fichier root-owned /etc/ssh/authorized_keys/pio-holding,
cle privee dediee et protegee sur chaque origine approuvee, pas la cle root.
L'administrateur devra adapter le shell nologin en /bin/sh uniquement pour ce
compte de transport et verifier l'acceptation effective sans activer mot de passe.
Aucune de ces operations effectuee dans cette preparation.

Refus obligatoires sur fixtures avant donnee reelle : commande SSH arbitraire,
forwarding, lecture d'un token voisin, acces a base privee et privilege proprietaire.
Une commande forcee ne separe PAS deux profils partageant le meme compte source :
le confinement complet des outils de chaque role demeure un prerequis distinct.
Ne pas pretendre l'avoir resolu par ce seul fragment SSH.
