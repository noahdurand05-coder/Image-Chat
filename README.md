# 📡 Image Chat

Système d’overlay temps réel basé sur Discord permettant d’afficher des messages (texte, image, vidéo) directement sur un écran.

---

# 🎬 Aperçu

Image Chat transforme les messages Discord en overlays affichés en temps réel.

Chaque message suit ce flux :

- Envoi depuis Discord  
- Traitement par le système  
- Affichage en overlay  
- Suppression automatique après affichage  

---

# ✨ Fonctionnalités

- Envoi de messages via Discord  
- Support images et vidéos  
- Affichage pseudo + avatar utilisateur  
- Overlay toujours au-dessus des fenêtres  
- Messages éphémères (une seule apparition)  
- File d’attente des messages  
- Nettoyage automatique de la base de données  

---

# 🧱 Architecture

Le système est composé de trois parties :

- Bot Discord (réception des messages)  
- Base de données SQL Server (stockage temporaire)  
- Application Electron (affichage overlay)  

---

# 🔄 Fonctionnement

1. Un message est envoyé sur Discord  
2. Il est enregistré dans la base de données  
3. L’application Electron récupère les messages  
4. Le message est affiché en overlay  
5. Il est marqué comme traité  
6. Il est supprimé du flux actif  

---

# ⚙️ Gestion des données

- Les messages sont stockés temporairement  
- Chaque message est affiché une seule fois  
- Les messages déjà traités sont marqués  
- Un nettoyage automatique supprime les anciens messages  

---

# 🧠 Concept

Discord → SQL Server → Electron → Overlay → Suppression

---

# 🚀 Objectif

Ce projet a été conçu pour explorer :

- les systèmes temps réel  
- les overlays desktop  
- l’intégration Discord + application desktop  
- la gestion de flux de données live  

---

# ⚠️ Statut

Projet personnel / démonstration technique  
Aucune installation publique disponible

---

# 🔮 Améliorations futures

- système temps réel sans polling  
- interface de configuration  
- animations d’overlay  
- support multi-écran  
- personnalisation de l’interface  

---

# 👨‍💻 Auteur

Noah
