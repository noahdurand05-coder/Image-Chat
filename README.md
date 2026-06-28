📡 Image Chat

Système d’overlay temps réel basé sur Discord permettant d’afficher des messages (texte, image, vidéo) directement sur un écran.

🎬 Aperçu

Image Chat transforme les messages Discord en overlays visuels affichés en temps réel.

Chaque message suit un flux simple :

envoyé via Discord
traité par le système
affiché en overlay sur l’écran
supprimé automatiquement après affichage
✨ Fonctionnalités
📩 Envoi de messages via Discord
🖼️ Support des images
🎥 Support des vidéos
👤 Affichage du pseudo + avatar utilisateur
🪟 Overlay en temps réel (always on top)
⏳ Messages éphémères (affichage unique)
📦 File d’attente des messages
🧹 Nettoyage automatique de la base de données
🧱 Architecture

Le système repose sur trois composants principaux :

🤖 Bot Discord → récupération des messages
🗄️ SQL Server → stockage temporaire des données
🖥️ Electron App → affichage des overlays
🔄 Fonctionnement

Le système fonctionne comme une pipeline de données :

Un message est envoyé sur Discord
Il est enregistré dans la base de données
L’application Electron récupère les messages
Le message est affiché en overlay
Il est marqué comme traité
Il disparaît du flux actif
⚙️ Gestion des données
Les messages sont stockés temporairement
Chaque message est affiché une seule fois
Les messages traités sont marqués comme “consommés”
Un nettoyage automatique supprime les anciens messages
🧠 Concept

Image Chat fonctionne comme une file de messages en temps réel :

Entrée → Discord
Traitement → SQL Server
Affichage → Electron
Sortie → suppression du flux actif
🚀 Objectif du projet

Ce projet a été conçu pour explorer :

les systèmes temps réel
les overlays desktop
l’intégration Discord + application desktop
la gestion de flux de données live
⚠️ Statut

Projet personnel / démonstration technique

Aucune installation publique disponible.

🔮 Améliorations futures
système temps réel sans polling
interface de configuration graphique
animations avancées des overlays
support multi-écran
personnalisation complète de l’interface
👨‍💻 Auteur

Développé par Noah
