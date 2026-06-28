📡 Image Chat

Système d’overlay temps réel basé sur Discord permettant d’afficher des messages (texte, image, vidéo) directement sur un écran.
---
🎬 Aperçu

Image Chat transforme les messages Discord en overlays visuels affichés en temps réel.

Chaque message est :

envoyé via Discord
traité par le système
affiché en overlay sur écran
supprimé automatiquement après affichage
---

✨ Fonctionnalités

📩 Envoi de messages via Discord
🖼️ Support des images
🎥 Support des vidéos
👤 Affichage du pseudo + avatar
🪟 Overlay en temps réel (always on top)
⏳ Messages éphémères (affichage unique)
📦 File d’attente des messages
🧹 Nettoyage automatique de la base de données
---

🧱 Architecture

Le système est composé de 3 parties :

🤖 Bot Discord → récupère les messages
🗄️ SQL Server → stocke temporairement les données
🖥️ Electron App → affiche les overlays
---

🔄 Fonctionnement

Le flux est simple :

Un message est envoyé sur Discord
Il est stocké dans la base de données
L’application Electron le récupère
Il est affiché en overlay
Il est marqué comme traité
Il disparaît du flux actif
---

⚙️ Gestion des données
Les messages sont stockés temporairement
Chaque message est affiché une seule fois
Les messages déjà affichés sont marqués comme traités
Un nettoyage automatique supprime les anciens messages
---

🧠 Concept

Image Chat fonctionne comme une file de messages en temps réel :

entrée (Discord)
traitement (SQL)
affichage (Electron)
suppression du flux actif
---

🚀 Objectif

Ce projet sert à explorer :

les systèmes temps réel
les overlays desktop
l’intégration Discord + desktop app
la gestion de flux de données
---
⚠️ Statut

Projet personnel / démonstration technique
Aucune installation publique disponible
---

🔮 Améliorations futures

système temps réel sans polling
interface de configuration
animations d’overlay
multi-écran
personnalisation complète
---

👨‍💻 Auteur

Développé par Noah
