const express = require("express");
const { connectDB } = require("./db");
require("dotenv").config();
const livechatRoutes = require("./routes/livechatRoutes");
// Création d'une application Express pour gérer les requêtes HTTP et démarrer le serveur.

const app = express();
const PORT = process.env.PORT


app.use(express.json());
app.use("/api/livechat", livechatRoutes);



//Démarrage du serveur après avoir vérifié la connexion à la base de données. Si la connexion échoue, le serveur ne démarre pas et une erreur est affichée dans la console.

async function startServer() {
try {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur le port ${PORT}`);
    });
} catch (err) {
    console.error("Erreur au démarrage du serveur :", err.message);
}
}


startServer();