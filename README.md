# 📡 Image Chat

> Système d’overlay temps réel basé sur Discord permettant d’afficher des messages (texte, image, vidéo) directement sur un écran.

---

## 🎬 Aperçu

Image Chat transforme les messages Discord en overlays affichés en temps réel.

Chaque message suit un flux simple :

→ Envoi via Discord  
→ Traitement du système  
→ Affichage en overlay  
→ Suppression automatique  

---

## ✨ Fonctionnalités

✔ Envoi de messages via Discord  
✔ Support images et vidéos  
✔ Affichage du pseudo + avatar utilisateur  
✔ Overlay toujours au-dessus des fenêtres  
✔ Messages éphémères (une seule apparition)  
✔ File d’attente des messages  
✔ Nettoyage automatique de la base de données  

---

## 🧱 Architecture

```text id="arch"
Discord Bot  →  SQL Server  →  Electron App  →  Overlay
