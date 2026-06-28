📡 Image Chat

Système d’overlay temps réel basé sur Discord permettant d’afficher des messages (texte, image, vidéo) directement sur un écran.

🎬 Aperçu

Image Chat transforme les messages Discord en overlays visuels affichés en temps réel.

Chaque message passe par un flux simple :

Envoi via Discord
Traitement par le système
Affichage en overlay
Suppression automatique après affichage
✨ Fonctionnalités
📩 Envoi de messages via Discord
🖼️ Support des images
🎥 Support des vidéos
👤 Affichage du pseudo + avatar utilisateur
🪟 Overlay toujours au-dessus des fenêtres
⏳ Messages éphémères (une seule apparition)
📦 Gestion de file d’attente
🧹 Nettoyage automatique de la base de données
🧱 Architecture

Le système est composé de 3 blocs :

🤖 Bot Discord
→ Récupère les messages utilisateurs

🗄️ SQL Server
→ Stocke temporairement les messages

🖥️ Electron App
→ Affiche les overlays à l’écran

🔄 Fonctionnement
Un message est envoyé sur Discord
Il est enregistré dans la base de données
L’application récupère les messages
Le message est affiché en overlay
Il est marqué comme traité
Il disparaît du flux
⚙️ Gestion des données
Stockage temporaire des messages
Affichage unique de chaque message
Marquage des messages déjà consommés
Nettoyage automatique des anciennes données
🧠 Concept

Le système fonctionne comme une pipeline de données :

Discord → SQL → Electron → Affichage → Suppression

🚀 Objectif

Ce projet a été conçu pour explorer :

Les systèmes temps réel
Les overlays desktop
L’intégration Discord + application desktop
La gestion de flux de données live
⚠️ Statut

Projet personnel / démonstration technique

Aucune installation publique disponible.

🔮 Améliorations futures
Système temps réel sans polling
Interface de configuration utilisateur
Animations d’overlay avancées
Support multi-écran
Personnalisation complète
👨‍💻 Auteur

Noah
