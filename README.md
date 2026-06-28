📡 Image Chat

Un système d’overlay temps réel permettant d’afficher des messages envoyés depuis Discord directement sur un écran sous forme de flux visuel éphémère.

🎬 Aperçu

Image Chat transforme les messages Discord en overlays dynamiques affichés en temps réel sur un écran.

Chaque message peut contenir du texte, une image ou une vidéo et apparaît de manière fluide avant de disparaître automatiquement.

✨ Fonctionnalités
Envoi de messages via Discord
Support des images et vidéos
Affichage du pseudo et de l’avatar utilisateur
Overlay en temps réel sur écran
Messages éphémères (affichage unique)
Système de file d’attente des messages
Nettoyage automatique des anciennes données
Affichage fluide et toujours au-dessus des autres fenêtres
🧱 Architecture

Le système repose sur trois composants principaux :

Un bot Discord qui reçoit les messages
Une base de données SQL Server pour le stockage temporaire
Une application Electron qui affiche les overlays
🖥️ Fonctionnement

Les messages suivent un flux simple :

Les messages sont envoyés depuis Discord
Ils sont stockés temporairement dans la base de données
L’application les récupère automatiquement
Ils sont affichés une seule fois en overlay
Ils disparaissent ensuite du flux actif

⚙️ Gestion des données

Le système fonctionne avec une logique de traitement des messages :

Stockage temporaire des messages entrants
Affichage unique de chaque message
Marquage des messages déjà affichés
Nettoyage automatique des anciennes données
🧠 Concept

Image Chat fonctionne comme une file d’attente de messages :

Les données arrivent depuis Discord
Elles sont consommées par l’application en temps réel
Chaque message est affiché puis retiré du flux actif
🚀 Objectif

Ce projet a été conçu pour explorer :

Les systèmes de communication temps réel
Les overlays interactifs
L’intégration Discord + application desktop
La gestion de flux de données live
⚠️ Statut

Projet personnel / démonstration technique.

Aucune installation publique n’est disponible.

🔮 Améliorations possibles
Système temps réel sans polling
Interface de configuration utilisateur
Animations avancées des overlays
Support multi-écran
Personnalisation complète de l’UI
👨‍💻 Auteur

Développé par Noah

📜 Licence

Projet personnel / démonstration technique.
