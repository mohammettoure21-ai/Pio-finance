# Préparation serveur approuvée, exécution non effectuée

Cible exclusive : 2.29.156.0. Ces fichiers sont des modèles pour l'administrateur
via Hermès, pas un installateur. Codex n'a ni accès SSH ni canal d'exécution Hermès.
L'accord du propriétaire autorise le démarrage du travail, sans inventer les éléments
manquants : domaine HTTPS, destination de backup, clé publique GPG et mécanisme
effectif d'exécution isolée des cinq rôles. Aucun secret dans le chat.

Le code prend désormais en charge une origine HTTPS exacte via PIO_ORIGIN, avec
cookie Secure au login/logout. Le proxy doit réécrire Host vers le loopback exact.
Le backend ignore les en-têtes Forwarded pour l'authentification. Ne pas écouter
sur une interface publique, désactiver CSRF ou utiliser des cookies humains pour MCP.

Ordre d'exécution par Hermès et l'administrateur, après résolution des prérequis :

1. Récupérer le commit de livraison exact de feat/hermes-holding-bridge dans une
   copie de développement propre ; vérifier son SHA et relancer verify. Le patch
   archivé est une alternative, pas une deuxième étape à appliquer sur ce commit.
   Ne pas écraser un checkout modifié.
2. Préparer les identités et le runtime partagé comme décrit dans CONNECTION-PLAN.
   Un compte pio-service est une identité technique, pas un sixième coordinateur.
   Aucune élévation fabi, aucun changement de default/WhatsApp/CRM/Life System.
3. Préparer une version de code en lecture seule sous /srv/pio/releases/<version>,
   sans donnée privée. Vérifier que pio-service ne peut pas modifier le code.
4. Protéger le dossier de base et préparer le mot de passe humain avec la CLI init,
   exécutée comme pio-service, hors Git. Ne pas imprimer le fichier. Ne pas importer
   encore le portefeuille. PIO_ORIGIN doit être l'origine HTTPS approuvée exacte.
5. Adapter le modèle d'unité ; l'administrateur valide sa syntaxe, ses permissions,
   son démarrage/reprise, sans modifier hermes-gateway. Ce modèle n'a pas été exercé
   sur le serveur cible. Ne pas l'annoncer actif à partir des seuls tests de code.
6. Adapter le proxy au domaine/certificat réellement disponible. Configurer l'accès
   privé convenu, vérifier la syntaxe avant activation ; ne pas ouvrir publiquement
   ce template par défaut. Ne recharger aucun service d'une autre application.
7. Tester HTTPS réel (certificat, cookie Secure, Origin/Host/CSRF), crash/reprise,
   reboot contrôlé et isolation complète des outils de chaque rôle sur fixtures.
8. Tester backup GPG à clé publique et restauration hors serveur sur fixtures.
   Avant remise en ligne d'une base restaurée, utiliser la nouvelle commande
   `node server/cli.mjs invalidate-sessions --data-dir <dossier-prive>` comme
   propriétaire de la base, puis révoquer/tourner séparément les clés restaurées.
   Cette commande invalide les sessions humaines, sans changer portefeuille ou
   attributions agents. Ne jamais réutiliser une sauvegarde pour annuler des données
   récentes sans examen humain. Aucune purge/suppression automatique.
9. Seulement après validation des étapes précédentes et accord de transfert privé :
   sauvegarder la source existante sur le PC, lire explicitement le serveur puis
   importer volontairement si réellement vide. Une erreur de lecture n'est pas un vide.
10. Exécuter un GET Holding authentifié, vérifier avec le propriétaire une donnée
    existante et la révision inchangée ; ne pas afficher la donnée dans le compte rendu.
    Vérifier les lectures filtrées des quatre autres rôles. Aucune mission de test
    dans le portefeuille réel. Activation d'une proposition seulement après confirmation
    précise du propriétaire ; une clé agent ne peut pas confirmer.

Rapport attendu d'Hermès : hôte, version de code/empreinte, services réellement
actifs, validation TLS, résultat d'isolation par rôle, backup hors serveur et
restauration, première lecture PIO et révision (sans contenu privé). Si une étape
échoue, arrêter la progression et rapporter le refus exact ; ne pas désactiver
une protection pour avancer. Pas de « connecté » avant une lecture réelle.
